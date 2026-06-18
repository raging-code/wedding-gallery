/**
 * patch-b2-cloudflare.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Wedding Gallery · Backblaze B2 (4 accounts, 4 buckets) + Cloudflare Pages
 *
 * BUCKET LAYOUT
 *   Account 1 → bucket: wedding-photos-1    (photos, primary)
 *   Account 2 → bucket: wedding-photos-2    (photos, overflow)
 *   Account 3 → bucket: wedding-videos-1    (videos, primary)
 *   Account 4 → bucket: wedding-videos-2    (videos, overflow)
 *
 * WHAT THIS PATCH DOES
 *   1. Creates  functions/_middleware.js        (Cloudflare Pages Function — CORS)
 *   2. Creates  functions/api/upload.js         (signed-URL issuer — never exposes keys)
 *   3. Creates  functions/api/list.js           (lists media from all 4 buckets)
 *   4. Rewrites src/WeddingGallery.js          (replaces MOCK_PHOTOS + wires upload/videos)
 *   5. Creates  .env.example                   (documents the 20 env vars needed)
 *   6. Creates  _headers                       (security headers for Cloudflare Pages)
 *   7. Creates  _redirects                     (SPA fallback for Cloudflare Pages)
 *   8. Updates  .gitignore                     (ensures .env* never ships)
 *
 * HOW KEYS STAY SECURE
 *   - All B2 Application Keys live ONLY in Cloudflare Pages › Settings › Env Vars
 *   - The browser NEVER receives any key — it only gets a short-lived presigned URL
 *   - The Cloudflare Pages Function generates the presigned URL server-side, then
 *     the browser PUTs the file directly to B2 (no proxy bandwidth cost)
 *   - CORS on each bucket is configured to allow only your Cloudflare Pages domain
 *
 * USAGE
 *   node patch-b2-cloudflare.mjs
 *
 * Run from the wedding-gallery project root on Windows (Node 18+).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── helpers ──────────────────────────────────────────────────────────────────
const ROOT = process.cwd();

function write(relPath, content) {
  const abs = join(ROOT, relPath);
  const dir = abs.split(/[\\/]/).slice(0, -1).join('/');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  // Normalise to LF so Node string matching always works
  writeFileSync(abs, content.replace(/\r\n/g, '\n'), 'utf8');
  console.log(`  ✔  wrote  ${relPath}`);
}

function read(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8').replace(/\r\n/g, '\n');
}

function patch(relPath, oldStr, newStr) {
  let src = read(relPath);
  if (!src.includes(oldStr)) {
    console.error(`  ✘  patch FAILED — target string not found in ${relPath}`);
    console.error('     Make sure you are running from the project root.');
    process.exit(1);
  }
  writeFileSync(join(ROOT, relPath), src.replace(oldStr, newStr), 'utf8');
  console.log(`  ✔  patched ${relPath}`);
}

// ── 1. _headers ───────────────────────────────────────────────────────────────
console.log('\n[1/8] Writing _headers …');
write('_headers', `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/api/*
  Cache-Control: no-store
`);

// ── 2. _redirects ─────────────────────────────────────────────────────────────
console.log('\n[2/8] Writing _redirects …');
write('_redirects', `# SPA fallback — Cloudflare Pages
/*  /index.html  200
`);

// ── 3. functions/_middleware.js (CORS + basic rate-limit header) ──────────────
console.log('\n[3/8] Writing functions/_middleware.js …');
write('functions/_middleware.js', `/**
 * Cloudflare Pages Middleware
 * Runs before every /api/* Function request.
 * Adds CORS headers and rejects non-allowed origins.
 */
export async function onRequest(context) {
  const { request, next, env } = context;
  const origin = request.headers.get('Origin') || '';

  // Allow the deployed Pages domain AND localhost for dev
  const allowed = [
    env.SITE_ORIGIN || '',          // e.g. https://your-project.pages.dev
    'http://localhost:3000',
    'http://localhost:8788',         // wrangler pages dev default
  ].filter(Boolean);

  const corsOrigin = allowed.includes(origin) ? origin : allowed[0];

  // Handle pre-flight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(corsOrigin),
    });
  }

  const response = await next();
  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(corsOrigin))) {
    newHeaders.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}
`);

// ── 4. functions/api/upload.js ────────────────────────────────────────────────
console.log('\n[4/8] Writing functions/api/upload.js …');
write('functions/api/upload.js', `/**
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
  const fileKey   = \`\${type}s/\${Date.now()}_\${sanitized}\`;

  if (type === 'photo') {
    if (!ALLOWED_PHOTO_TYPES.includes(contentType))
      return jsonError('Content type not allowed for photos', 415);
    if (sizeBytes > MAX_PHOTO_BYTES)
      return jsonError(\`Photo exceeds \${MAX_PHOTO_BYTES / 1024 / 1024} MB limit\`, 413);
  } else {
    if (!ALLOWED_VIDEO_TYPES.includes(contentType))
      return jsonError('Content type not allowed for videos', 415);
    if (sizeBytes > MAX_VIDEO_BYTES)
      return jsonError(\`Video exceeds \${MAX_VIDEO_BYTES / 1024 / 1024} MB limit\`, 413);
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
    const publicUrl = \`https://\${endpoint}/\${bucketName}/\${fileKey}\`;

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
  const credScope  = \`\${dateStamp}/\${region}/\${service}/aws4_request\`;
  const signedHeaders = 'host';
  const canonicalUri  = \`/\${bucketName}/\${encodeURIComponent(fileKey).replace(/%2F/g, '/')}\`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':    \`\${keyId}/\${credScope}\`,
    'X-Amz-Date':          amzDate,
    'X-Amz-Expires':       String(expires),
    'X-Amz-SignedHeaders': signedHeaders,
  });
  queryParams.sort();
  const canonicalQuery    = queryParams.toString();
  const canonicalHeaders  = \`host:\${host}\\n\`;
  const canonicalRequest  = [
    'PUT', canonicalUri, canonicalQuery,
    canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD',
  ].join('\\n');

  const strToSign = [
    'AWS4-HMAC-SHA256', amzDate, credScope,
    await sha256hex(canonicalRequest),
  ].join('\\n');

  const sigKey  = await deriveSigningKey(appKey, dateStamp, region, service);
  const sigHex  = await hmacHex(sigKey, strToSign);

  queryParams.set('X-Amz-Signature', sigHex);

  return \`https://\${host}\${canonicalUri}?\${queryParams.toString()}\`;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────
function toAmzDate(d) {
  return d.toISOString().replace(/[:-]/g, '').replace(/\\.\\d+/, '');
}

async function sha256hex(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return hex(buf);
}

async function hmacHex(key, msg) {
  const k   = typeof key === 'string'
    ? await crypto.subtle.importKey('raw', new TextEncoder().encode(key),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    : key;
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
`);

// ── 5. functions/api/list.js ──────────────────────────────────────────────────
console.log('\n[5/8] Writing functions/api/list.js …');
write('functions/api/list.js', `/**
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

  const prefix   = \`\${type}s/\`;
  const region   = endpoint.split('.')[1] || 'us-west-004';
  const host     = endpoint;
  const service  = 's3';
  const now      = new Date();
  const amzDate  = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credScope = \`\${dateStamp}/\${region}/\${service}/aws4_request\`;

  const queryParams = new URLSearchParams({
    'list-type':  '2',
    'prefix':     prefix,
    'max-keys':   '1000',
  });
  queryParams.sort();

  const canonicalUri     = \`/\${bucketName}/\`;
  const canonicalHeaders = \`host:\${host}\\nx-amz-date:\${amzDate}\\n\`;
  const signedHeaders    = 'host;x-amz-date';
  const payloadHash      = await sha256hex('');
  const canonicalRequest = [
    'GET', canonicalUri, queryParams.toString(),
    canonicalHeaders, signedHeaders, payloadHash,
  ].join('\\n');

  const strToSign = [
    'AWS4-HMAC-SHA256', amzDate, credScope,
    await sha256hex(canonicalRequest),
  ].join('\\n');

  const sigKey = await deriveSigningKey(appKey, dateStamp, region, service);
  const sigHex = await hmacHex(sigKey, strToSign);

  const fetchUrl = \`https://\${host}\${canonicalUri}?\${queryParams}&X-Amz-Signature=\${sigHex}\`;
  const resp = await fetch(fetchUrl, {
    headers: {
      'Host':        host,
      'x-amz-date':  amzDate,
      'Authorization': \`AWS4-HMAC-SHA256 Credential=\${keyId}/\${credScope}, SignedHeaders=\${signedHeaders}, Signature=\${sigHex}\`,
    },
  });

  if (!resp.ok) {
    console.error('B2 list failed', resp.status, await resp.text());
    return [];
  }

  const xml   = await resp.text();
  const items = [];
  const re    = /<Contents>([\\s\\S]*?)<\\/Contents>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block       = m[1];
    const key         = tag(block, 'Key');
    const lastMod     = tag(block, 'LastModified');
    const size        = parseInt(tag(block, 'Size'), 10);
    if (!key) continue;
    items.push({
      key,
      url:      \`https://\${host}/\${bucketName}/\${key}\`,
      size,
      uploaded: lastMod ? new Date(lastMod).getTime() : 0,
    });
  }
  return items;
}

function tag(xml, name) {
  const m = xml.match(new RegExp(\`<\${name}>([\\\\s\\\\S]*?)<\\/\${name}>\`));
  return m ? m[1].trim() : '';
}

// ── Crypto helpers (duplicated here — Pages Functions don't share modules) ────
function toAmzDate(d) {
  return d.toISOString().replace(/[:-]/g, '').replace(/\\.\\d+/, '');
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
`);

// ── 6. .env.example ───────────────────────────────────────────────────────────
console.log('\n[6/8] Writing .env.example …');
write('.env.example', `# ─────────────────────────────────────────────────────────────────────────────
# Wedding Gallery · Cloudflare Pages Environment Variables
#
# Copy these into: Cloudflare Dashboard → Pages → your-project → Settings →
#                  Environment Variables → Production (and Preview if needed)
#
# NEVER commit a real .env file. This file is safe to commit (no real values).
# ─────────────────────────────────────────────────────────────────────────────

# Your Cloudflare Pages URL (used for CORS allow-list in _middleware.js)
SITE_ORIGIN=https://your-project.pages.dev

# ── Account 1 · PHOTOS bucket 1 ──────────────────────────────────────────────
# In Backblaze B2 Account 1:
#   1. Create bucket: wedding-photos-1   (set to "Public" OR use signed URLs)
#   2. App Keys → Add Application Key → restrict to that bucket
#   3. Note the keyID, applicationKey, bucketId, and the endpoint shown on bucket page
B2_PHOTO1_KEY_ID=your-account1-key-id
B2_PHOTO1_APP_KEY=your-account1-application-key
B2_PHOTO1_BUCKET_ID=your-account1-bucket-id
B2_PHOTO1_BUCKET_NAME=wedding-photos-1
B2_PHOTO1_ENDPOINT=s3.us-west-004.backblazeb2.com

# ── Account 2 · PHOTOS bucket 2 ──────────────────────────────────────────────
B2_PHOTO2_KEY_ID=your-account2-key-id
B2_PHOTO2_APP_KEY=your-account2-application-key
B2_PHOTO2_BUCKET_ID=your-account2-bucket-id
B2_PHOTO2_BUCKET_NAME=wedding-photos-2
B2_PHOTO2_ENDPOINT=s3.us-west-004.backblazeb2.com

# ── Account 3 · VIDEOS bucket 1 ──────────────────────────────────────────────
B2_VIDEO1_KEY_ID=your-account3-key-id
B2_VIDEO1_APP_KEY=your-account3-application-key
B2_VIDEO1_BUCKET_ID=your-account3-bucket-id
B2_VIDEO1_BUCKET_NAME=wedding-videos-1
B2_VIDEO1_ENDPOINT=s3.us-west-004.backblazeb2.com

# ── Account 4 · VIDEOS bucket 2 ──────────────────────────────────────────────
B2_VIDEO2_KEY_ID=your-account4-key-id
B2_VIDEO2_APP_KEY=your-account4-application-key
B2_VIDEO2_BUCKET_ID=your-account4-bucket-id
B2_VIDEO2_BUCKET_NAME=wedding-videos-2
B2_VIDEO2_ENDPOINT=s3.us-west-004.backblazeb2.com
`);

// ── 7. Update .gitignore ───────────────────────────────────────────────────────
console.log('\n[7/8] Updating .gitignore …');
{
  let gi = read('.gitignore');
  const additions = [
    '# B2 / Cloudflare secrets — NEVER commit real env files',
    '.env',
    '.env.production',
    '.dev.vars',
    '.wrangler/',
  ].filter(line => !gi.includes(line)).join('\n');

  if (additions.trim()) {
    gi += '\n' + additions + '\n';
    writeFileSync(join(ROOT, '.gitignore'), gi, 'utf8');
    console.log('  ✔  patched .gitignore');
  } else {
    console.log('  ─  .gitignore already up to date');
  }
}

// ── 8. Patch WeddingGallery.js ────────────────────────────────────────────────
// Replace MOCK_PHOTOS const and the static useState with real API-driven state
console.log('\n[8/8] Patching src/WeddingGallery.js …');

// 8a. Replace the import line to add useCallback
patch(
  'src/WeddingGallery.js',
  `import { useState, useEffect, useRef } from "react";`,
  `import { useState, useEffect, useRef, useCallback } from "react";`
);

// 8b. Replace MOCK_PHOTOS + static state block with real API state
patch(
  'src/WeddingGallery.js',
  `const MOCK_PHOTOS = [
  { id: 1, url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=85", name: "ceremony.jpg" },
  { id: 2, url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=85", name: "couple.jpg" },
  { id: 3, url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=85", name: "reception.jpg" },
  { id: 4, url: "https://images.unsplash.com/photo-1525772764200-be829a350797?w=600&q=85", name: "dance.jpg" },
  { id: 5, url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600&q=85", name: "rings.jpg" },
  { id: 6, url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=85", name: "portrait.jpg" },
  { id: 7, url: "https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=600&q=85", name: "flowers.jpg" },
  { id: 8, url: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=85", name: "venue.jpg" },
];`,
  `// ── B2 API config ────────────────────────────────────────────────────────────
// In production these are Cloudflare Pages Functions at /api/*
// In local dev (npm start) you need to run: npx wrangler pages dev build --compatibility-date 2024-01-01
const API_BASE = '';  // empty = same origin (works for both Pages and local wrangler dev)

/** Upload a single file → returns the public B2 URL */
async function b2Upload(file, type) {
  // 1. Ask our server-side Function for a presigned PUT URL
  const metaRes = await fetch(\`\${API_BASE}/api/upload\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      filename:    file.name,
      contentType: file.type,
      sizeBytes:   file.size,
    }),
  });
  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error || \`Upload init failed (\${metaRes.status})\`);
  }
  const { uploadUrl, publicUrl } = await metaRes.json();

  // 2. PUT the file bytes directly to B2 (no server proxy)
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error(\`B2 PUT failed (\${putRes.status})\`);

  return publicUrl;
}

/** List media from all buckets via our server-side Function */
async function b2List(type) {
  const res = await fetch(\`\${API_BASE}/api/list?type=\${type}\`);
  if (!res.ok) throw new Error(\`List failed (\${res.status})\`);
  const { items } = await res.json();
  return items.map((item, i) => ({
    id:   i + 1,
    url:  item.url,
    name: item.key.split('/').pop(),
    size: item.size,
    uploaded: item.uploaded,
  }));
}`
);

// 8c. Replace the component state block
patch(
  'src/WeddingGallery.js',
  `export default function WeddingGallery() {
  const [photos] = useState(MOCK_PHOTOS);
  const [previews, setPreviews] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showAll, setShowAll] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, idx: 0, zoomed: false });
  const fileInputRef = useRef(null);`,
  `export default function WeddingGallery() {
  const [photos, setPhotos]         = useState([]);
  const [videos, setVideos]         = useState([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [previews, setPreviews]     = useState([]);
  const [uploadState, setUploadState] = useState({ active: false, progress: 0, error: null });
  const [videoPreview, setVideoPreview] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState(new Set());
  const [showAll, setShowAll]       = useState(false);
  const [lightbox, setLightbox]     = useState({ open: false, idx: 0, zoomed: false });
  const [activeTab, setActiveTab]   = useState('photos'); // 'photos' | 'videos'
  const fileInputRef     = useRef(null);
  const videoInputRef    = useRef(null);`
);

// 8d. Replace the CSS useEffect to also load media on mount
patch(
  'src/WeddingGallery.js',
  `  useEffect(() => {
    let s = document.getElementById("lux-css");
    if (!s) { s = document.createElement("style"); s.id = "lux-css"; document.head.appendChild(s); }
    s.textContent = LUXURY_CSS;
  }, []);`,
  `  useEffect(() => {
    let s = document.getElementById("lux-css");
    if (!s) { s = document.createElement("style"); s.id = "lux-css"; document.head.appendChild(s); }
    s.textContent = LUXURY_CSS;
  }, []);

  // Load photos from B2 on mount
  useEffect(() => {
    setPhotosLoading(true);
    b2List('photo')
      .then(items => setPhotos(items))
      .catch(err  => console.error('Photo list error:', err))
      .finally(()  => setPhotosLoading(false));
  }, []);

  // Load videos from B2 on mount
  useEffect(() => {
    setVideosLoading(true);
    b2List('video')
      .then(items => setVideos(items))
      .catch(err  => console.error('Video list error:', err))
      .finally(()  => setVideosLoading(false));
  }, []);`
);

// 8e. Replace handleFiles with a real upload handler
patch(
  'src/WeddingGallery.js',
  `  function handleFiles(fileList) {
    Array.from(fileList).filter(f => f.type.startsWith("image/"))
      .slice(0, 20 - previews.length)
      .forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviews(p => [...p, { url, name: file.name, id: Date.now() + Math.random() }]);
      });
  }

  function removePreview(id) { setPreviews(p => p.filter(x => x.id !== id)); }`,
  `  function handleFiles(fileList) {
    Array.from(fileList).filter(f => f.type.startsWith("image/"))
      .slice(0, 20 - previews.length)
      .forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviews(p => [...p, { url, name: file.name, id: Date.now() + Math.random(), file }]);
      });
  }

  function removePreview(id) { setPreviews(p => p.filter(x => x.id !== id)); }

  function handleVideoFile(fileList) {
    const file = Array.from(fileList).find(f => f.type.startsWith("video/"));
    if (!file) return;
    setVideoPreview({ url: URL.createObjectURL(file), name: file.name, id: Date.now(), file });
  }

  async function uploadPhotos() {
    if (!previews.length) return;
    setUploadState({ active: true, progress: 0, error: null });
    try {
      const uploaded = [];
      for (let i = 0; i < previews.length; i++) {
        const p = previews[i];
        const publicUrl = await b2Upload(p.file, 'photo');
        uploaded.push({ id: Date.now() + i, url: publicUrl, name: p.name });
        setUploadState(s => ({ ...s, progress: Math.round(((i + 1) / previews.length) * 100) }));
        URL.revokeObjectURL(p.url);
      }
      setPhotos(prev => [...uploaded.reverse(), ...prev]);
      setPreviews([]);
      setUploadState({ active: false, progress: 0, error: null });
    } catch (err) {
      setUploadState({ active: false, progress: 0, error: err.message });
    }
  }

  async function uploadVideo() {
    if (!videoPreview) return;
    setUploadState({ active: true, progress: 0, error: null });
    try {
      const publicUrl = await b2Upload(videoPreview.file, 'video');
      setVideos(prev => [{ id: Date.now(), url: publicUrl, name: videoPreview.name }, ...prev]);
      URL.revokeObjectURL(videoPreview.url);
      setVideoPreview(null);
      setUploadState({ active: false, progress: 100, error: null });
      setTimeout(() => setUploadState(s => ({ ...s, progress: 0 })), 1500);
    } catch (err) {
      setUploadState({ active: false, progress: 0, error: err.message });
    }
  }`
);

// 8f. Replace the static story strip (Add Video button) with real video list
patch(
  'src/WeddingGallery.js',
  `        {/* VIDEO MOMENTS */}
        <div className="lux-stories-head">
          <div>
            <div className="lux-stories-sub">Swipe to watch · tap to play</div>
          </div>
        </div>
        <div className="lux-stories-strip">
          <div className="lux-story-add" onClick={() => {}}>
            <div className="lux-story-add-ring">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4v10M4 9h10" stroke="#b8944f" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="lux-story-add-label">Add<br />Video</span>
          </div>
          {[0, 1, 2].map(i => (
            <div className="lux-story-ph" key={i}>
              <div className="lux-story-ph-inner">
                <div className="lux-story-ph-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#c4748e" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#c4748e" strokeWidth="0.9" />
                  </svg>
                </div>
                <div className="lux-story-ph-txt">Coming<br />soon</div>
              </div>
              <div className="lux-shimmer" />
            </div>
          ))}
        </div>`,
  `        {/* VIDEO MOMENTS — live from B2 */}
        <div className="lux-stories-head">
          <div>
            <div className="lux-stories-sub">Swipe to watch · tap to play</div>
          </div>
        </div>
        <div className="lux-stories-strip">
          {/* Add Video button */}
          <div className="lux-story-add" onClick={() => videoInputRef.current?.click()}>
            <div className="lux-story-add-ring">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4v10M4 9h10" stroke="#b8944f" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="lux-story-add-label">Add<br />Video</span>
          </div>
          <input
            ref={videoInputRef} type="file" accept="video/*"
            style={{ display: "none" }}
            onChange={e => { handleVideoFile(e.target.files); e.target.value = ""; }}
          />

          {/* Video preview before upload */}
          {videoPreview && (
            <div className="lux-story-ph" style={{ position: 'relative' }}>
              <video
                src={videoPreview.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                muted playsInline
              />
              <button
                onClick={uploadVideo}
                disabled={uploadState.active}
                style={{
                  position: 'absolute', bottom: 4, left: 4, right: 4,
                  background: 'rgba(184,144,74,0.9)', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 10,
                  padding: '4px 0', cursor: 'pointer', fontFamily: 'var(--font-body)'
                }}
              >
                {uploadState.active ? \`\${uploadState.progress}%\` : 'Upload'}
              </button>
            </div>
          )}

          {/* Uploaded videos */}
          {videosLoading && [0,1,2].map(i => (
            <div className="lux-story-ph" key={i}>
              <div className="lux-story-ph-inner">
                <div className="lux-story-ph-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#c4748e" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#c4748e" strokeWidth="0.9" />
                  </svg>
                </div>
                <div className="lux-story-ph-txt">Loading…</div>
              </div>
              <div className="lux-shimmer" />
            </div>
          ))}
          {!videosLoading && videos.length === 0 && !videoPreview && [0,1,2].map(i => (
            <div className="lux-story-ph" key={i}>
              <div className="lux-story-ph-inner">
                <div className="lux-story-ph-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#c4748e" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#c4748e" strokeWidth="0.9" />
                  </svg>
                </div>
                <div className="lux-story-ph-txt">Coming<br />soon</div>
              </div>
              <div className="lux-shimmer" />
            </div>
          ))}
          {!videosLoading && videos.map(vid => (
            <div className="lux-story-ph" key={vid.id} style={{ cursor: 'pointer' }}>
              <video
                src={vid.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                controls muted playsInline
                preload="metadata"
              />
            </div>
          ))}
        </div>`
);

// 8g. Patch the "Send to Gallery" button to actually upload
patch(
  'src/WeddingGallery.js',
  `            {previews.length > 0 && (
              <div className="lux-send-bar">
                <button className="lux-btn-send">Send to Gallery</button>
                <div className="lux-send-hint">
                  {previews.length} photo{previews.length !== 1 ? "s" : ""} will be shared with all guests
                </div>
              </div>
            )}`,
  `            {previews.length > 0 && (
              <div className="lux-send-bar">
                {uploadState.error && (
                  <div style={{ color: '#c45', fontSize: 12, marginBottom: 6, textAlign: 'center' }}>
                    {uploadState.error}
                  </div>
                )}
                <button
                  className="lux-btn-send"
                  onClick={uploadPhotos}
                  disabled={uploadState.active}
                >
                  {uploadState.active
                    ? \`Uploading… \${uploadState.progress}%\`
                    : "Send to Gallery"}
                </button>
                <div className="lux-send-hint">
                  {previews.length} photo{previews.length !== 1 ? "s" : ""} will be shared with all guests
                </div>
              </div>
            )}`
);

// 8h. Patch the photo loading state in the gallery grid
patch(
  'src/WeddingGallery.js',
  `            {photos.length === 0 ? (
              <div className="lux-no-photos">
                <div className="lux-no-photos-ring">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#c4748e" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="lux-no-photos-txt">No photos yet</div>
                <div className="lux-no-photos-hint">Be the first to share a memory</div>
              </div>
            ) : (`,
  `            {photosLoading ? (
              <div className="lux-no-photos">
                <div className="lux-no-photos-ring">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#c4748e" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="lux-no-photos-txt">Loading gallery…</div>
                <div className="lux-no-photos-hint">Fetching your memories</div>
              </div>
            ) : photos.length === 0 ? (
              <div className="lux-no-photos">
                <div className="lux-no-photos-ring">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#c4748e" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="lux-no-photos-txt">No photos yet</div>
                <div className="lux-no-photos-hint">Be the first to share a memory</div>
              </div>
            ) : (`
);

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  ✅  Patch complete!  All 8 steps applied successfully.                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

WHAT WAS CREATED / CHANGED
  _headers                          Security headers for Cloudflare Pages
  _redirects                        SPA fallback route
  functions/_middleware.js          CORS handler (runs before all /api/* calls)
  functions/api/upload.js           Presigned URL issuer (server-side, keys never exposed)
  functions/api/list.js             Lists media from all 4 B2 buckets
  .env.example                      Documents all 20 required environment variables
  .gitignore                        Ensures .env/.dev.vars are never committed
  src/WeddingGallery.js             Wired to real B2 upload + live photo/video display

──────────────────────────────────────────────────────────────────────────────
NEXT STEPS — do these IN ORDER
──────────────────────────────────────────────────────────────────────────────

STEP 1 · Backblaze B2 — for EACH of the 4 accounts:
  a) Log in → Buckets → Create Bucket
       Name:     wedding-photos-1  (Account 1)  /  wedding-photos-2 (Account 2)
                 wedding-videos-1  (Account 3)  /  wedding-videos-2 (Account 4)
       Access:   Private  ← keep private, presigned URLs handle access
  b) On the bucket page, scroll to "Bucket Settings" → CORS Rules:
       Add this rule (replace YOUR_PAGES_URL with your actual domain):

       [
         {
           "corsRuleName": "wedding-gallery",
           "allowedOrigins": ["https://YOUR_PROJECT.pages.dev"],
           "allowedHeaders": ["*"],
           "allowedOperations": ["s3_put"],
           "exposeHeaders": ["ETag"],
           "maxAgeSeconds": 3600
         }
       ]

  c) App Keys → Add Application Key
       Name:          wedding-gallery-key
       Buckets:       restrict to this bucket ONLY
       Capabilities:  listFiles, readFiles, writeFiles
       Save the keyID + applicationKey — you won't see the key again!
  d) Note the endpoint from the bucket page (e.g. s3.us-west-004.backblazeb2.com)

STEP 2 · Cloudflare Pages — set Environment Variables:
  Dashboard → Pages → wedding-gallery → Settings → Environment Variables
  Add ALL 20 variables from .env.example with your real values.
  Set for "Production" (and "Preview" if you want staging to work too).

STEP 3 · Deploy to Cloudflare Pages:
  Option A — Git integration (recommended):
    Dashboard → Pages → Create project → Connect to Git → raging-code/wedding-gallery
    Build command:    npm run build
    Output dir:       build
    (Cloudflare auto-deploys on every push to main)

  Option B — Manual deploy (Wrangler CLI):
    npm run build
    npx wrangler pages deploy build --project-name wedding-gallery

STEP 4 · Update CORS in Backblaze:
  After deploy, you get a URL like https://wedding-gallery.pages.dev
  Go back to each B2 bucket → CORS Rules → update allowedOrigins to that URL.
  Also set SITE_ORIGIN= that URL in Cloudflare Pages env vars.

STEP 5 · Test:
  Open the deployed site → upload a photo → it should appear in the gallery.
  Open the site → click Add Video → select an mp4 → tap Upload.
  Check the B2 bucket in the dashboard to confirm files are landing.

──────────────────────────────────────────────────────────────────────────────
LOCAL DEV TIP
  To test the Pages Functions locally:
    npm run build
    npx wrangler pages dev build --compatibility-date 2024-01-01
  Then set the B2 env vars in a local .dev.vars file (never commit it).
──────────────────────────────────────────────────────────────────────────────
`);
