/**
 * POST /api/upload
 * Body (JSON): { type: "photo"|"video", filename: string, contentType: string, sizeBytes: number }
 *
 * Returns: { uploadUrl, fileKey, publicUrl }
 *
 * The browser then does: PUT uploadUrl  (body = raw file bytes)
 *
 * KEY DESIGN — zero key exposure:
 *   - B2 Application Keys never leave this server-side Function
 *   - We issue a short-lived pre-signed URL (valid 1 hour)
 *   - The browser uploads directly to B2 (no bandwidth proxied)
 *
 * BUCKET ROUTING (round-robin overflow):
 *   photos → Account1 bucket  OR  Account2 bucket  (based on simple hash of filename)
 *   videos → Account3 bucket  OR  Account4 bucket
 */

const PHOTO_BUCKETS = [
  {
    keyId:      'B2_PHOTO1_KEY_ID',
    appKey:     'B2_PHOTO1_APP_KEY',
    bucketId:   'B2_PHOTO1_BUCKET_ID',
    bucketName: 'B2_PHOTO1_BUCKET_NAME',
    endpoint:   'B2_PHOTO1_ENDPOINT',   // e.g. s3.us-west-004.backblazeb2.com
  },
  {
    keyId:      'B2_PHOTO2_KEY_ID',
    appKey:     'B2_PHOTO2_APP_KEY',
    bucketId:   'B2_PHOTO2_BUCKET_ID',
    bucketName: 'B2_PHOTO2_BUCKET_NAME',
    endpoint:   'B2_PHOTO2_ENDPOINT',
  },
];

const VIDEO_BUCKETS = [
  {
    keyId:      'B2_VIDEO1_KEY_ID',
    appKey:     'B2_VIDEO1_APP_KEY',
    bucketId:   'B2_VIDEO1_BUCKET_ID',
    bucketName: 'B2_VIDEO1_BUCKET_NAME',
    endpoint:   'B2_VIDEO1_ENDPOINT',
  },
  {
    keyId:      'B2_VIDEO2_KEY_ID',
    appKey:     'B2_VIDEO2_APP_KEY',
    bucketId:   'B2_VIDEO2_BUCKET_ID',
    bucketName: 'B2_VIDEO2_BUCKET_NAME',
    endpoint:   'B2_VIDEO2_ENDPOINT',
  },
];

// Limits
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;   // 10 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;  // 200 MB
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { type, filename, contentType, sizeBytes } = body;

  // ── Validation ──────────────────────────────────────────────────────────
  if (!['photo', 'video'].includes(type))
    return jsonError('type must be "photo" or "video"', 400);
  if (!filename || typeof filename !== 'string' || filename.length > 200)
    return jsonError('Invalid filename', 400);
  if (!contentType)
    return jsonError('contentType is required', 400);
  if (typeof sizeBytes !== 'number' || sizeBytes <= 0)
    return jsonError('sizeBytes must be a positive number', 400);

  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileKey   = `${type}s/${Date.now()}_${sanitized}`;

  if (type === 'photo') {
    if (!ALLOWED_PHOTO_TYPES.includes(contentType))
      return jsonError('Content type not allowed for photos', 415);
    if (sizeBytes > MAX_PHOTO_BYTES)
      return jsonError(`Photo exceeds ${MAX_PHOTO_BYTES / 1024 / 1024} MB limit`, 413);
  } else {
    if (!ALLOWED_VIDEO_TYPES.includes(contentType))
      return jsonError('Content type not allowed for videos', 415);
    if (sizeBytes > MAX_VIDEO_BYTES)
      return jsonError(`Video exceeds ${MAX_VIDEO_BYTES / 1024 / 1024} MB limit`, 413);
  }

  // ── Pick bucket (deterministic round-robin by filename hash) ────────────
  const pool = type === 'photo' ? PHOTO_BUCKETS : VIDEO_BUCKETS;
  const slotIdx = simpleHash(sanitized) % pool.length;
  const slot    = pool[slotIdx];

  // Resolve env var names to actual values
  const keyId      = env[slot.keyId];
  const appKey     = env[slot.appKey];
  const bucketName = env[slot.bucketName];
  const endpoint   = env[slot.endpoint];

  if (!keyId || !appKey || !bucketName || !endpoint) {
    console.error('Missing B2 env vars for slot', slot);
    return jsonError('Server configuration error', 500);
  }

  // ── Generate pre-signed URL via B2 S3-compatible API ────────────────────
  try {
    const uploadUrl = await generatePresignedPut({
      keyId, appKey, endpoint, bucketName, fileKey, contentType,
    });
    const publicUrl = await generatePresignedGet({ keyId, appKey, endpoint, bucketName, fileKey });

    return jsonOk({ uploadUrl, fileKey, publicUrl });
  } catch (err) {
    console.error('B2 presign error:', err);
    return jsonError('Failed to generate upload URL', 502);
  }
}

// ── Pre-signed PUT via AWS Signature V4 (B2 S3-compat) ───────────────────────
async function generatePresignedPut({ keyId, appKey, endpoint, bucketName, fileKey, contentType }) {
  const region     = endpoint.split('.')[1] || 'us-west-004'; // e.g. us-west-004
  const service    = 's3';
  const expires    = 3600; // 1 hour
  const host       = endpoint;
  const now        = new Date();
  const amzDate    = toAmzDate(now);
  const dateStamp  = amzDate.slice(0, 8);
  const credScope  = `${dateStamp}/${region}/${service}/aws4_request`;
  // B2 requires Content-Type to be signed for PUT requests — must be alphabetical order
  const signedHeaders = 'content-type;host';
  const canonicalUri  = `/${bucketName}/${encodeURIComponent(fileKey).replace(/%2F/g, '/')}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':    `${keyId}/${credScope}`,
    'X-Amz-Date':          amzDate,
    'X-Amz-Expires':       String(expires),
    'X-Amz-SignedHeaders': signedHeaders,
  });
  queryParams.sort();
  const canonicalQuery    = queryParams.toString();
  // canonical headers must be lowercase and sorted alphabetically
  const canonicalHeaders  = `content-type:${contentType}\nhost:${host}\n`;
  const canonicalRequest  = [
    'PUT', canonicalUri, canonicalQuery,
    canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD',
  ].join('\n');

  const strToSign = [
    'AWS4-HMAC-SHA256', amzDate, credScope,
    await sha256hex(canonicalRequest),
  ].join('\n');

  const sigKey  = await deriveSigningKey(appKey, dateStamp, region, service);
  const sigHex  = await hmacHex(sigKey, strToSign);

  queryParams.set('X-Amz-Signature', sigHex);

  return `https://${host}${canonicalUri}?${queryParams.toString()}`;
}


// ── Pre-signed GET via AWS Signature V4 (B2 S3-compat) — private bucket support
async function generatePresignedGet({ keyId, appKey, endpoint, bucketName, fileKey, expiresIn = 86400 }) {
  const region     = endpoint.split('.')[1] || 'us-west-004';
  const service    = 's3';
  const host       = endpoint;
  const now        = new Date();
  const amzDate    = toAmzDate(now);
  const dateStamp  = amzDate.slice(0, 8);
  const credScope  = `${dateStamp}/${region}/${service}/aws4_request`;
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
  const canonicalQuery   = queryParams.toString();
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    'GET', canonicalUri, canonicalQuery,
    canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD',
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

// ── Crypto helpers ────────────────────────────────────────────────────────────
function toAmzDate(d) {
  return d.toISOString().replace(/[:-]/g, '').replace(/\.\d+/, '');
}

async function sha256hex(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return hex(buf);
}

async function hmacHex(key, msg) {
  // Always import the key — deriveSigningKey returns an ArrayBuffer, not a CryptoKey
  const rawKey = typeof key === 'string'
    ? new TextEncoder().encode(key)
    : key instanceof ArrayBuffer ? key : new Uint8Array(key);
  const k = await crypto.subtle.importKey('raw', rawKey,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return hex(sig);
}

async function hmacKey(key, msg) {
  const rawKey = typeof key === 'string'
    ? new TextEncoder().encode(key)
    : key instanceof ArrayBuffer ? key : new Uint8Array(key);
  const k   = await crypto.subtle.importKey('raw', rawKey,
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

function simpleHash(str) {
  let h = 0;
  for (const c of str) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

// ── Response helpers ──────────────────────────────────────────────────────────
function jsonOk(data)           { return Response.json(data, { status: 200 }); }
function jsonError(msg, status) { return Response.json({ error: msg }, { status }); }
