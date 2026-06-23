// __PATCH_CF_MEDIA_PROXY_V1__
/**
 * GET /api/media?key=<fileKey>&btype=<photo|video>&bidx=<0|1>
 *
 * Transparent proxy: re-signs a B2 S3-compat GET request server-side and
 * streams the response body to the browser.
 *
 * WHY: Cloudflare <-> Backblaze B2 egress is free (CF partner bandwidth).
 * Browser -> CF -> B2 costs nothing on either side.
 * Browser -> B2 directly counts against B2 download quota.
 *
 * Cache:  photos cached 24 h at CF edge; videos not cached (range-request-friendly).
 * Range:  Range header forwarded to B2 so video seeking works without re-download.
 */

const PHOTO_BUCKETS = [
  { keyId: 'B2_PHOTO1_KEY_ID', appKey: 'B2_PHOTO1_APP_KEY', bucketName: 'B2_PHOTO1_BUCKET_NAME', endpoint: 'B2_PHOTO1_ENDPOINT' },
  { keyId: 'B2_PHOTO2_KEY_ID', appKey: 'B2_PHOTO2_APP_KEY', bucketName: 'B2_PHOTO2_BUCKET_NAME', endpoint: 'B2_PHOTO2_ENDPOINT' },
];
const VIDEO_BUCKETS = [
  { keyId: 'B2_VIDEO1_KEY_ID', appKey: 'B2_VIDEO1_APP_KEY', bucketName: 'B2_VIDEO1_BUCKET_NAME', endpoint: 'B2_VIDEO1_ENDPOINT' },
  { keyId: 'B2_VIDEO2_KEY_ID', appKey: 'B2_VIDEO2_APP_KEY', bucketName: 'B2_VIDEO2_BUCKET_NAME', endpoint: 'B2_VIDEO2_ENDPOINT' },
];

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
}

export async function onRequestHead(context) { return handleRequest(context, true);  }
export async function onRequestGet(context)  { return handleRequest(context, false); }

async function handleRequest(context, headOnly) {
  const { request, env } = context;
  const url   = new URL(request.url);
  const key   = url.searchParams.get('key');   // e.g. "photos/1716000000000_g_abc.jpg"
  const btype = url.searchParams.get('btype'); // "photo" | "video"
  const bidx  = parseInt(url.searchParams.get('bidx') || '0', 10); // 0 | 1

  if (!key || !btype)
    return new Response('Missing key or btype', { status: 400 });
  if (!['photo', 'video'].includes(btype))
    return new Response('btype must be photo or video', { status: 400 });
  if (bidx !== 0 && bidx !== 1)
    return new Response('bidx must be 0 or 1', { status: 400 });

  const pool       = btype === 'photo' ? PHOTO_BUCKETS : VIDEO_BUCKETS;
  const slot       = pool[bidx];
  const keyId      = env[slot.keyId];
  const appKey     = env[slot.appKey];
  const bucketName = env[slot.bucketName];
  const endpoint   = env[slot.endpoint];

  if (!keyId || !appKey || !bucketName || !endpoint) {
    console.error('media proxy: missing env vars for btype=%s bidx=%d', btype, bidx);
    return new Response('Server configuration error', { status: 500 });
  }

  let b2Url;
  try {
    b2Url = await buildPresignedGet({ keyId, appKey, endpoint, bucketName, fileKey: key, expiresIn: 300 });
  } catch (err) {
    console.error('media proxy: presign error', err);
    return new Response('Failed to sign request', { status: 500 });
  }

  // Forward Range header so video seeking works
  const rangeHeader = request.headers.get('Range');
  const fetchHeaders = {};
  if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

  let b2Resp;
  try {
    b2Resp = await fetch(b2Url, { method: headOnly ? 'HEAD' : 'GET', headers: fetchHeaders });
  } catch (err) {
    console.error('media proxy: fetch error', err);
    return new Response('Upstream fetch failed', { status: 502 });
  }

  if (!b2Resp.ok && b2Resp.status !== 206) {
    console.error('media proxy: B2 returned', b2Resp.status, 'for key', key);
    return new Response('Media not found', { status: b2Resp.status === 404 ? 404 : 502 });
  }

  const isVideo     = btype === 'video';
  const respHeaders = new Headers();
  for (const h of ['Content-Type','Content-Length','Content-Range','Accept-Ranges','Last-Modified','ETag']) {
    const v = b2Resp.headers.get(h);
    if (v) respHeaders.set(h, v);
  }
  respHeaders.set('Cache-Control', isVideo
    ? 'no-store'
    : 'public, max-age=86400, stale-while-revalidate=3600');
  respHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(headOnly ? null : b2Resp.body, {
    status: b2Resp.status,
    headers: respHeaders,
  });
}

// AWS SigV4 presigned GET — short-lived (300s), used only server-side by this proxy
async function buildPresignedGet({ keyId, appKey, endpoint, bucketName, fileKey, expiresIn }) {
  const region        = endpoint.split('.')[1] || 'us-west-004';
  const service       = 's3';
  const host          = endpoint;
  const now           = new Date();
  const amzDate       = toAmzDate(now);
  const dateStamp     = amzDate.slice(0, 8);
  const credScope     = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = 'host';
  const canonicalUri  = `/${bucketName}/${encodeURIComponent(fileKey).replace(/%2F/g, '/')}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':    `${keyId}/${credScope}`,
    'X-Amz-Date':          amzDate,
    'X-Amz-Expires':       String(expiresIn),
    'X-Amz-SignedHeaders': signedHeaders,
  });
  queryParams.sort();

  const canonicalRequest = [
    'GET', canonicalUri, queryParams.toString(),
    `host:${host}\n`, signedHeaders, 'UNSIGNED-PAYLOAD',
  ].join('\n');

  const strToSign = [
    'AWS4-HMAC-SHA256', amzDate, credScope,
    await sha256hex(canonicalRequest),
  ].join('\n');

  const sigKey = await deriveSigningKey(appKey, dateStamp, region, service);
  const sigHex = await hmacHex(sigKey, strToSign);
  queryParams.set('X-Amz-Signature', sigHex);
  return `https://${host}${canonicalUri}?${queryParams.toString()}`;
}

// Crypto helpers (same pattern as list.js / upload.js)
function toAmzDate(d) {
  return d.toISOString().replace(/[:-]/g, '').replace(/\.\d+/, '');
}
async function sha256hex(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return hex(buf);
}
async function hmacHex(key, msg) {
  const rawKey = key instanceof ArrayBuffer ? key : new Uint8Array(key);
  const k = await crypto.subtle.importKey('raw', rawKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const buf = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return hex(buf);
}
async function hmacKey(key, msg) {
  const rawKey = typeof key === 'string'
    ? new TextEncoder().encode(key)
    : key instanceof ArrayBuffer ? key : new Uint8Array(key);
  const k = await crypto.subtle.importKey('raw', rawKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
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
