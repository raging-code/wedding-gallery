/**
 * GET /api/list?type=photo|video
 *
 * Lists objects from the two relevant B2 buckets (via S3-compat ListObjectsV2)
 * and returns a JSON array of { key, url, size, uploaded } objects.
 *
 * Results are merged from both buckets and sorted newest-first.
 * Keys are never exposed to the browser (only public CDN URLs).
 */

const PHOTO_BUCKETS = [
  { keyId: 'B2_PHOTO1_KEY_ID', appKey: 'B2_PHOTO1_APP_KEY', bucketName: 'B2_PHOTO1_BUCKET_NAME', endpoint: 'B2_PHOTO1_ENDPOINT' },
  { keyId: 'B2_PHOTO2_KEY_ID', appKey: 'B2_PHOTO2_APP_KEY', bucketName: 'B2_PHOTO2_BUCKET_NAME', endpoint: 'B2_PHOTO2_ENDPOINT' },
];

const VIDEO_BUCKETS = [
  { keyId: 'B2_VIDEO1_KEY_ID', appKey: 'B2_VIDEO1_APP_KEY', bucketName: 'B2_VIDEO1_BUCKET_NAME', endpoint: 'B2_VIDEO1_ENDPOINT' },
  { keyId: 'B2_VIDEO2_KEY_ID', appKey: 'B2_VIDEO2_APP_KEY', bucketName: 'B2_VIDEO2_BUCKET_NAME', endpoint: 'B2_VIDEO2_ENDPOINT' },
];

export async function onRequestGet(context) {
  const { request, env } = context;
  const url  = new URL(request.url);
  const type = url.searchParams.get('type') || 'photo';

  if (!['photo', 'video'].includes(type))
    return Response.json({ error: 'type must be photo or video' }, { status: 400 });

  const pool = type === 'photo' ? PHOTO_BUCKETS : VIDEO_BUCKETS;

  try {
    const results = await Promise.all(pool.map(slot => listBucket(slot, env, type)));
    const merged  = results.flat().sort((a, b) => b.uploaded - a.uploaded);
    return Response.json({ items: merged });
  } catch (err) {
    console.error('list error:', err);
    return Response.json({ error: 'Failed to list media' }, { status: 502 });
  }
}

async function listBucket(slot, env, type) {
  const keyId      = env[slot.keyId];
  const appKey     = env[slot.appKey];
  const bucketName = env[slot.bucketName];
  const endpoint   = env[slot.endpoint];

  if (!keyId || !appKey || !bucketName || !endpoint) return [];

  const prefix   = `${type}s/`;
  const region   = endpoint.split('.')[1] || 'us-west-004';
  const host     = endpoint;
  const service  = 's3';
  const now      = new Date();
  const amzDate  = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const queryParams = new URLSearchParams({
    'list-type':  '2',
    'prefix':     prefix,
    'max-keys':   '1000',
  });
  queryParams.sort();

  const canonicalUri     = `/${bucketName}/`;
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders    = 'host;x-amz-date';
  const payloadHash      = await sha256hex('');
  const canonicalRequest = [
    'GET', canonicalUri, queryParams.toString(),
    canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const strToSign = [
    'AWS4-HMAC-SHA256', amzDate, credScope,
    await sha256hex(canonicalRequest),
  ].join('\n');

  const sigKey = await deriveSigningKey(appKey, dateStamp, region, service);
  const sigHex = await hmacHex(sigKey, strToSign);

  const fetchUrl = `https://${host}${canonicalUri}?${queryParams}&X-Amz-Signature=${sigHex}`;
  const resp = await fetch(fetchUrl, {
    headers: {
      'Host':        host,
      'x-amz-date':  amzDate,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${keyId}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sigHex}`,
    },
  });

  if (!resp.ok) {
    console.error('B2 list failed', resp.status, await resp.text());
    return [];
  }

  const xml   = await resp.text();
  const items = [];
  const re    = /<Contents>([\s\S]*?)<\/Contents>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block       = m[1];
    const key         = tag(block, 'Key');
    const lastMod     = tag(block, 'LastModified');
    const size        = parseInt(tag(block, 'Size'), 10);
    if (!key) continue;
    items.push({
      key,
      url:      `https://${host}/${bucketName}/${key}`,
      size,
      uploaded: lastMod ? new Date(lastMod).getTime() : 0,
    });
  }
  return items;
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)<\/${name}>`));
  return m ? m[1].trim() : '';
}

// ── Crypto helpers (duplicated here — Pages Functions don't share modules) ────
function toAmzDate(d) {
  return d.toISOString().replace(/[:-]/g, '').replace(/\.\d+/, '');
}

async function sha256hex(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return hex(buf);
}

async function hmacHex(key, msg) {
  const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return hex(buf);
}

async function hmacKey(key, msg) {
  const rawKey = typeof key === 'string'
    ? new TextEncoder().encode(key)
    : key instanceof ArrayBuffer ? key : new Uint8Array(key);
  const k = await crypto.subtle.importKey('raw', rawKey,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
}

async function deriveSigningKey(secret, date, region, service) {
  const kDate    = await hmacKey('AWS4' + secret, date);
  const kRegion  = await hmacKey(kDate,   region);
  const kService = await hmacKey(kRegion, service);
  return hmacKey(kService, 'aws4_request');
}

function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
