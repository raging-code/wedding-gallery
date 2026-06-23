/**
 * patch-cf-media-proxy.mjs
 *
 * Routes all media reads (photo/video delivery) through a new Cloudflare Pages
 * Function (/api/media) instead of sending browsers directly to Backblaze B2.
 *
 * WHY this saves B2 costs
 * ───────────────────────
 *   Backblaze B2 and Cloudflare are partners — traffic between CF Workers /
 *   Pages Functions and B2 is FREE (zero egress fees on both sides).
 *   Before: browser -> B2  (counts against B2 download quota + bandwidth)
 *   After:  browser -> Cloudflare Pages Function -> B2 (free leg) -> browser
 *   Cloudflare Pages Functions bandwidth is also free on all plans.
 *
 * WHAT CHANGES
 * ────────────
 *   1. NEW   functions/api/media.js  — proxy function (streams B2 -> client)
 *   2. PATCH functions/api/list.js   — return proxy URLs instead of presigned B2 URLs
 *   3. PATCH functions/api/upload.js — return proxy URL as publicUrl after upload
 *   4. PATCH _headers                — tighten CSP (remove direct B2 browser access)
 *
 * WHAT DOES NOT CHANGE
 * ────────────────────
 *   Upload flow: browser still PUT-s directly to B2 via presigned PUT URL
 *   (uploads are free on B2; only downloads cost)
 *   All React code in src/ is untouched — it uses item.url from the API
 *   D1 reactions / comments system — untouched
 *   All auth, rate-limiting, security hardening — untouched
 *
 * USAGE  (Windows, Node.js v18+, run from repo root)
 *   node patch-cf-media-proxy.mjs
 *
 * Then:
 *   git add functions/api/media.js functions/api/list.js functions/api/upload.js _headers
 *   git commit -m "feat: route media reads through CF proxy (free B2 egress)"
 *   git push
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ── Helpers ───────────────────────────────────────────────────────────────────

function read(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) throw new Error(`File not found: ${rel}`);
  return readFileSync(p, 'utf8');
}

function write(rel, content) {
  writeFileSync(join(ROOT, rel), content, 'utf8');
  console.log(`  ✔  wrote ${rel}`);
}

function patchStr(rel, search, replace, description) {
  const src = read(rel);
  if (!src.includes(search)) {
    throw new Error(
      `Patch "${description}" FAILED — marker not found in ${rel}.\n` +
      `Expected to find (first 120 chars):\n${search.slice(0, 120)}`
    );
  }
  write(rel, src.replace(search, replace));
  console.log(`     (${description})`);
}

function patchRegex(rel, re, replace, description) {
  const src = read(rel);
  if (!re.test(src)) {
    throw new Error(`Patch "${description}" FAILED — regex not matched in ${rel}.`);
  }
  write(rel, src.replace(re, replace));
  console.log(`  ✔  wrote ${rel}`);
  console.log(`     (${description})`);
}

// ── Guard: detect if already applied ─────────────────────────────────────────

const APPLIED_MARKER = '// __PATCH_CF_MEDIA_PROXY_V1__';

if (existsSync(join(ROOT, 'functions/api/media.js'))) {
  const existing = readFileSync(join(ROOT, 'functions/api/media.js'), 'utf8');
  if (existing.includes(APPLIED_MARKER)) {
    console.log('WARNING: Patch already applied (functions/api/media.js exists with marker).');
    console.log('Nothing changed. Re-run only after reverting previous application.');
    process.exit(0);
  }
}

console.log('\n🔧  patch-cf-media-proxy — routing media reads through Cloudflare\n');

// =============================================================================
// STEP 1 — Create functions/api/media.js (the new proxy Function)
// =============================================================================

console.log('1/4  Creating functions/api/media.js ...');

const MEDIA_JS = `// __PATCH_CF_MEDIA_PROXY_V1__
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
  const credScope     = \`\${dateStamp}/\${region}/\${service}/aws4_request\`;
  const signedHeaders = 'host';
  const canonicalUri  = \`/\${bucketName}/\${encodeURIComponent(fileKey).replace(/%2F/g, '/')}\`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':    \`\${keyId}/\${credScope}\`,
    'X-Amz-Date':          amzDate,
    'X-Amz-Expires':       String(expiresIn),
    'X-Amz-SignedHeaders': signedHeaders,
  });
  queryParams.sort();

  const canonicalRequest = [
    'GET', canonicalUri, queryParams.toString(),
    \`host:\${host}\\n\`, signedHeaders, 'UNSIGNED-PAYLOAD',
  ].join('\\n');

  const strToSign = [
    'AWS4-HMAC-SHA256', amzDate, credScope,
    await sha256hex(canonicalRequest),
  ].join('\\n');

  const sigKey = await deriveSigningKey(appKey, dateStamp, region, service);
  const sigHex = await hmacHex(sigKey, strToSign);
  queryParams.set('X-Amz-Signature', sigHex);
  return \`https://\${host}\${canonicalUri}?\${queryParams.toString()}\`;
}

// Crypto helpers (same pattern as list.js / upload.js)
function toAmzDate(d) {
  return d.toISOString().replace(/[:-]/g, '').replace(/\\.\\d+/, '');
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
`;

write('functions/api/media.js', MEDIA_JS);

// =============================================================================
// STEP 2 — Patch list.js
// =============================================================================

console.log('\n2/4  Patching functions/api/list.js ...');

// 2a) Pass bucket index to listBucket
patchStr(
  'functions/api/list.js',
  '  const results = await Promise.all(pool.map(slot => listBucket(slot, env, type)));',
  '  const results = await Promise.all(pool.map((slot, idx) => listBucket(slot, env, type, idx)));',
  'pass bucket index to listBucket'
);

// 2b) Add bidx parameter to listBucket signature
patchStr(
  'functions/api/list.js',
  'async function listBucket(slot, env, type) {',
  'async function listBucket(slot, env, type, bidx) {',
  'add bidx param to listBucket'
);

// 2c) Replace presigned URL generation with proxy URL construction.
//     Use explicit \n to match the newlines in the file.
patchStr(
  'functions/api/list.js',
  '  // Generate presigned GET URLs for private bucket access (valid 24 hours)\n  return Promise.all(rawItems.map(async item => ({\n    ...item,\n    url: await generatePresignedGet({ keyId, appKey, endpoint, bucketName, fileKey: item.key }),\n  })));',
  '  // Return proxy URLs — browser fetches via /api/media (CF<->B2 egress is free)\n  return rawItems.map(item => ({\n    ...item,\n    url: `/api/media?key=${encodeURIComponent(item.key)}&btype=${type}&bidx=${bidx}`,\n  }));',
  'replace presigned GET URLs with proxy URLs'
);

// 2d) Remove generatePresignedGet function from list.js via regex
patchRegex(
  'functions/api/list.js',
  /\/\/ ── Pre-signed GET via AWS Signature V4 \(B2 S3-compat\) — private bucket support[\s\S]*?\n\}\n\n\/\/ ── Crypto helpers/,
  '// ── Crypto helpers',
  'remove unused generatePresignedGet from list.js'
);

// =============================================================================
// STEP 3 — Patch upload.js
// =============================================================================

console.log('\n3/4  Patching functions/api/upload.js ...');

// 3a) Capture bucket index alongside slotIdx
patchStr(
  'functions/api/upload.js',
  "  // ── Pick bucket (deterministic round-robin by filename hash) ────────────\n  const pool = type === 'photo' ? PHOTO_BUCKETS : VIDEO_BUCKETS;\n  const slotIdx = simpleHash(sanitized) % pool.length;\n  const slot    = pool[slotIdx];",
  "  // ── Pick bucket (deterministic round-robin by filename hash) ────────────\n  const pool    = type === 'photo' ? PHOTO_BUCKETS : VIDEO_BUCKETS;\n  const slotIdx = simpleHash(sanitized) % pool.length;\n  const slot    = pool[slotIdx];\n  const bidx    = slotIdx; // 0 or 1 — used to build the proxy URL",
  'capture bucket index for proxy URL'
);

// 3b) Replace presigned GET publicUrl with proxy URL
patchStr(
  'functions/api/upload.js',
  "  // ── Generate pre-signed URL via B2 S3-compatible API ────────────────────\n  try {\n    const uploadUrl = await generatePresignedPut({\n      keyId, appKey, endpoint, bucketName, fileKey, contentType,\n    });\n    const publicUrl = await generatePresignedGet({ keyId, appKey, endpoint, bucketName, fileKey });\n\n    return jsonOk({ uploadUrl, fileKey, publicUrl });\n  } catch (err) {\n    console.error('B2 presign error:', err);\n    return jsonError('Failed to generate upload URL', 502);\n  }",
  "  // ── Generate pre-signed PUT URL via B2 S3-compatible API ─────────────────\n  // publicUrl is served through the CF proxy (/api/media) — browser never\n  // contacts B2 directly for reads, so B2 download quota is not consumed.\n  try {\n    const uploadUrl = await generatePresignedPut({\n      keyId, appKey, endpoint, bucketName, fileKey, contentType,\n    });\n    const publicUrl = `/api/media?key=${encodeURIComponent(fileKey)}&btype=${type}&bidx=${bidx}`;\n\n    return jsonOk({ uploadUrl, fileKey, publicUrl });\n  } catch (err) {\n    console.error('B2 presign error:', err);\n    return jsonError('Failed to generate upload URL', 502);\n  }",
  'replace presigned GET publicUrl with proxy URL in upload.js'
);

// 3c) Remove generatePresignedGet from upload.js via regex
patchRegex(
  'functions/api/upload.js',
  /\/\/ ── Pre-signed GET via AWS Signature V4 \(B2 S3-compat\) — private bucket support[\s\S]*?\n\}\n\n\/\/ ── Crypto helpers/,
  '// ── Crypto helpers',
  'remove unused generatePresignedGet from upload.js'
);

// =============================================================================
// STEP 4 — Patch _headers: tighten CSP
// =============================================================================

console.log('\n4/4  Patching _headers (CSP) ...');

patchStr(
  '_headers',
  "  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.backblazeb2.com; connect-src 'self' https://*.backblazeb2.com; media-src 'self' https://*.backblazeb2.com; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';",
  "  # B2 removed from browser CSP — all reads go via /api/media (Cloudflare proxy).\n  # blob: added to img-src + media-src for local object-URL previews during upload.\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';",
  'tighten CSP — remove direct B2 browser access'
);

// =============================================================================
// Done
// =============================================================================

console.log(`
+------------------------------------------------------------------+
|  Patch applied successfully!                                     |
+------------------------------------------------------------------+

WHAT CHANGED
  functions/api/media.js   NEW  CF proxy (fetches B2, streams to browser)
  functions/api/list.js         returns /api/media?... URLs, not presigned B2
  functions/api/upload.js       publicUrl is /api/media?... after upload
  _headers                      CSP tightened (backblazeb2.com removed)

NEXT STEPS
  git add functions/api/media.js functions/api/list.js functions/api/upload.js _headers
  git commit -m "feat: route media reads through CF proxy (free B2 egress)"
  git push

COST IMPACT
  B2 download transactions : Zero  (browser never calls B2 directly)
  B2 download bandwidth    : Zero  (CF<->B2 is partner bandwidth, free)
  CF Pages bandwidth       : Free  (unlimited on all CF plans)
  Upload flow              : Unchanged (browser PUT still goes direct to B2;
                             B2 upload transactions are already free)
`);
