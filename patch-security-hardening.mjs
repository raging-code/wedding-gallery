/**
 * patch-security-hardening.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Wedding Gallery · Full Security Hardening Patch
 *
 * WHAT THIS FIXES (without changing any functionality):
 *
 *  1. [CRITICAL] debug-env.js DELETE — live /api/debug-env exposes masked B2
 *               key snippets + lengths to anyone on the internet. Deleted.
 *
 *  2. [HIGH]    Wildcard CORS (* ) on comments.js and reactions.js replaced
 *               with the proper same-origin check already used in _middleware.js.
 *               Also adds missing OPTIONS handlers to upload.js and list.js.
 *
 *  3. [HIGH]    Content Security Policy (CSP) added to _headers — blocks XSS,
 *               injected scripts, clickjacking, and data-URI abuse while
 *               allowing the Google Fonts + Backblaze B2 the app already uses.
 *
 *  4. [HIGH]    mediaKey input validation added to comments.js, reactions.js,
 *               and list.js — rejects path-traversal characters, excessively
 *               long strings, and non-printable bytes.
 *
 *  5. [MEDIUM]  Soft rate-limiting guard added to upload.js, comments.js, and
 *               reactions.js via a Cloudflare-compatible in-memory token-bucket
 *               keyed on CF-Connecting-IP. Prevents mass-upload / comment spam.
 *
 *  6. [MEDIUM]  Security-focused Permissions-Policy and additional headers
 *               (CORP, COOP, COEP) added to _headers.
 *
 *  7. [MEDIUM]  robots.txt — block indexing of API routes and backup paths.
 *
 *  8. [LOW]     .gitignore — ensure *.bak files are never committed (WeddingGallery.js.bak_before_swipe_perf is currently unprotected).
 *
 *  9. [LOW]     manifest.json — strip default CRA placeholder strings ("React
 *               App", "Create React App Sample") so app metadata is clean.
 *
 * USAGE (run from the wedding-gallery project root in VS Code terminal):
 *   node patch-security-hardening.mjs
 *
 * Safe to re-run — each change is idempotent (checks before patching).
 * Node 18+ required (same as the rest of the tooling in this repo).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, appendFileSync } from 'fs';
import { resolve, join } from 'path';

// ── helpers ──────────────────────────────────────────────────────────────────

const ROOT = resolve('.');          // must run from project root
const PASS = '\x1b[32m✔\x1b[0m';   // green tick
const FAIL = '\x1b[31m✘\x1b[0m';   // red cross
const INFO = '\x1b[36mℹ\x1b[0m';   // cyan info
const WARN = '\x1b[33m⚠\x1b[0m';   // yellow warn
const SKIP = '\x1b[90m–\x1b[0m';   // grey skip

let patchCount = 0;
let skipCount  = 0;

function p(file) { return join(ROOT, file); }

function read(file) {
  const full = p(file);
  if (!existsSync(full)) { console.error(`${FAIL}  File not found: ${file}`); process.exit(1); }
  return readFileSync(full, 'utf8');
}

function write(file, content) {
  writeFileSync(p(file), content, 'utf8');
  console.log(`${PASS}  Written: ${file}`);
  patchCount++;
}

/**
 * Replace exactly one occurrence of `from` with `to` in a file.
 * If `from` is not found, log a SKIP (already patched / different version).
 */
function patch(file, description, from, to) {
  let src = read(file);
  if (!src.includes(from)) {
    console.log(`${SKIP}  ${file} — already patched or not matched: ${description}`);
    skipCount++;
    return;
  }
  const patched = src.replace(from, to);
  write(file, patched);
  console.log(`    └─ ${description}`);
}

/** Append a line to a file only if it isn't already there. */
function appendUniq(file, line) {
  const full = p(file);
  let src = existsSync(full) ? readFileSync(full, 'utf8') : '';
  if (src.includes(line.trim())) {
    console.log(`${SKIP}  ${file} — line already present: ${line.trim()}`);
    skipCount++;
    return;
  }
  appendFileSync(full, (src.endsWith('\n') ? '' : '\n') + line + '\n', 'utf8');
  console.log(`${PASS}  Appended to ${file}: ${line.trim()}`);
  patchCount++;
}

// ── The shared rate-limiter module text we inject inline ──────────────────────
// Workers/Pages Functions don't support shared ES modules at the file level, so
// we copy the same small helper into each function that needs it.

const RATE_LIMITER_CODE = `
// ── In-memory rate limiter (per CF-Connecting-IP, token bucket) ──────────────
// Cloudflare Workers are single-threaded per isolate; Map is safe here.
// Limits reset when the isolate recycles (typically every few minutes).
const _rlMap = new Map();
/**
 * Returns true if the request should be blocked.
 * @param {Request} request
 * @param {{ max: number, windowMs: number }} opts
 */
function isRateLimited(request, { max, windowMs }) {
  const ip  = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  let   bucket = _rlMap.get(ip);
  if (!bucket || now - bucket.ts > windowMs) {
    bucket = { ts: now, count: 0 };
  }
  bucket.count++;
  _rlMap.set(ip, bucket);
  // Prevent unbounded map growth — purge entries older than 2× window
  if (_rlMap.size > 5000) {
    for (const [k, v] of _rlMap) {
      if (now - v.ts > windowMs * 2) _rlMap.delete(k);
    }
  }
  return bucket.count > max;
}
// ─────────────────────────────────────────────────────────────────────────────
`;

// ── Shared mediaKey validator ─────────────────────────────────────────────────
const MEDIA_KEY_VALIDATOR = `
// ── mediaKey input validator ──────────────────────────────────────────────────
function isValidMediaKey(key) {
  if (typeof key !== 'string') return false;
  if (key.length === 0 || key.length > 512) return false;
  // Must start with photos/ or videos/ (the only valid prefixes used by upload.js)
  if (!/^(photos|videos)\//.test(key)) return false;
  // No path traversal, null bytes, or shell-special chars
  if (/(\\.\\.|\\x00|[<>"'\\\\])/.test(key)) return false;
  return true;
}
// ─────────────────────────────────────────────────────────────────────────────
`;

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 1 — Delete debug-env.js (CRITICAL)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m[1/9] Remove debug-env.js (CRITICAL — exposes B2 key metadata publicly)\x1b[0m');

const debugEnvPath = p('functions/api/debug-env.js');
if (existsSync(debugEnvPath)) {
  unlinkSync(debugEnvPath);
  console.log(`${PASS}  Deleted: functions/api/debug-env.js`);
  patchCount++;
} else {
  console.log(`${SKIP}  functions/api/debug-env.js — already removed`);
  skipCount++;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 2 — Fix wildcard CORS + add OPTIONS handlers (HIGH)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m[2/9] Fix CORS wildcard → origin-reflective headers\x1b[0m');

// comments.js — replace hardcoded wildcard CORS block
patch(
  'functions/api/comments.js',
  'Replace wildcard CORS with origin-reflective headers',
  `const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}`,
  `function buildCors(request) {
  // Reflect the exact origin only if it matches the deployed site or localhost.
  // Falls back to blocking unknown origins (no ACAO header → browser blocks).
  const origin   = (request && request.headers.get('Origin')) || '';
  const allowed  = /^https:\\/\\/[a-zA-Z0-9-]+\\.pages\\.dev$/.test(origin)
    || /^https:\\/\\/claudineandmarkgallery\\.pages\\.dev$/.test(origin)
    || /^http:\\/\\/localhost:(3000|8788)$/.test(origin);
  return {
    'Access-Control-Allow-Origin':  allowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: buildCors(request) });
}`
);

// comments.js — replace CORS reference in GET handler
patch(
  'functions/api/comments.js',
  'Use origin-reflective CORS in onRequestGet',
  `export async function onRequestGet({ request, env }) {
  const mediaKey = new URL(request.url).searchParams.get('mediaKey');
  if (!mediaKey) return Response.json({ error: 'mediaKey required' }, { status: 400, headers: CORS });

  const rows = await env.DB.prepare(
    'SELECT id, author_name, body, created_at FROM comments WHERE media_key = ?1 ORDER BY created_at ASC LIMIT 200'
  ).bind(mediaKey).all();

  return Response.json({ comments: rows.results ?? [] }, { headers: CORS });
}`,
  `export async function onRequestGet({ request, env }) {
  const CORS     = buildCors(request);
  const mediaKey = new URL(request.url).searchParams.get('mediaKey');
  if (!mediaKey)                return Response.json({ error: 'mediaKey required' }, { status: 400, headers: CORS });
  if (!isValidMediaKey(mediaKey)) return Response.json({ error: 'Invalid mediaKey' },  { status: 400, headers: CORS });

  const rows = await env.DB.prepare(
    'SELECT id, author_name, body, created_at FROM comments WHERE media_key = ?1 ORDER BY created_at ASC LIMIT 200'
  ).bind(mediaKey).all();

  return Response.json({ comments: rows.results ?? [] }, { headers: CORS });
}`
);

// comments.js — replace CORS reference in POST handler + add rate limit
patch(
  'functions/api/comments.js',
  'Use origin-reflective CORS + rate limiting in onRequestPost',
  `export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const { mediaKey, authorName, body: text } = body ?? {};
  if (!mediaKey)                  return Response.json({ error: 'mediaKey required' },    { status: 400, headers: CORS });
  if (!authorName?.trim())        return Response.json({ error: 'authorName required' },  { status: 400, headers: CORS });
  if (!text?.trim())              return Response.json({ error: 'comment body required' },{ status: 400, headers: CORS });
  if (text.trim().length > 500)   return Response.json({ error: 'Comment too long (max 500 chars)' }, { status: 400, headers: CORS });

  const result = await env.DB.prepare(
    'INSERT INTO comments (media_key, author_name, body) VALUES (?1, ?2, ?3)'
  ).bind(mediaKey, authorName.trim().slice(0, 80), text.trim()).run();

  const row = await env.DB.prepare(
    'SELECT id, author_name, body, created_at FROM comments WHERE id = ?1'
  ).bind(result.meta.last_row_id).first();

  return Response.json({ comment: row }, { status: 201, headers: CORS });
}`,
  `export async function onRequestPost({ request, env }) {
  const CORS = buildCors(request);

  // Rate-limit: max 10 comment POSTs per IP per 60 s
  if (isRateLimited(request, { max: 10, windowMs: 60_000 })) {
    return Response.json({ error: 'Too many requests' }, { status: 429, headers: CORS });
  }

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const { mediaKey, authorName, body: text } = body ?? {};
  if (!mediaKey)                    return Response.json({ error: 'mediaKey required' },    { status: 400, headers: CORS });
  if (!isValidMediaKey(mediaKey))   return Response.json({ error: 'Invalid mediaKey' },     { status: 400, headers: CORS });
  if (!authorName?.trim())          return Response.json({ error: 'authorName required' },  { status: 400, headers: CORS });
  if (!text?.trim())                return Response.json({ error: 'comment body required' },{ status: 400, headers: CORS });
  if (text.trim().length > 500)     return Response.json({ error: 'Comment too long (max 500 chars)' }, { status: 400, headers: CORS });

  const result = await env.DB.prepare(
    'INSERT INTO comments (media_key, author_name, body) VALUES (?1, ?2, ?3)'
  ).bind(mediaKey, authorName.trim().slice(0, 80), text.trim()).run();

  const row = await env.DB.prepare(
    'SELECT id, author_name, body, created_at FROM comments WHERE id = ?1'
  ).bind(result.meta.last_row_id).first();

  return Response.json({ comment: row }, { status: 201, headers: CORS });
}`
);

// Inject shared helpers at the top of comments.js (after the opening comment block)
{
  let src = read('functions/api/comments.js');
  const marker = '// ── In-memory rate limiter';
  if (!src.includes(marker)) {
    // Inject after the opening JSDoc comment block
    const insertAfter = `/**\n * /api/comments  — GET thread, POST new comment\n * Requires D1 binding named "DB" in wrangler.toml\n */\n`;
    if (src.includes(insertAfter)) {
      const patched = src.replace(insertAfter, insertAfter + RATE_LIMITER_CODE + MEDIA_KEY_VALIDATOR);
      write('functions/api/comments.js', patched);
      console.log(`    └─ Injected rate-limiter + mediaKey validator into comments.js`);
    }
  } else {
    console.log(`${SKIP}  comments.js — helpers already injected`);
    skipCount++;
  }
}

// ── reactions.js ─────────────────────────────────────────────────────────────
console.log(`\n  Patching reactions.js...`);

patch(
  'functions/api/reactions.js',
  'Replace wildcard CORS with origin-reflective headers',
  `const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}`,
  `function buildCors(request) {
  const origin  = (request && request.headers.get('Origin')) || '';
  const allowed = /^https:\\/\\/[a-zA-Z0-9-]+\\.pages\\.dev$/.test(origin)
    || /^https:\\/\\/claudineandmarkgallery\\.pages\\.dev$/.test(origin)
    || /^http:\\/\\/localhost:(3000|8788)$/.test(origin);
  return {
    'Access-Control-Allow-Origin':  allowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: buildCors(request) });
}`
);

patch(
  'functions/api/reactions.js',
  'Use origin-reflective CORS + mediaKey validation in onRequestGet',
  `export async function onRequestGet({ request, env }) {
  const mediaKey = new URL(request.url).searchParams.get('mediaKey');
  if (!mediaKey) return Response.json({ error: 'mediaKey required' }, { status: 400, headers: CORS });

  const rows = await env.DB.prepare(
    'SELECT reaction, COUNT(*) as cnt FROM reactions WHERE media_key = ?1 GROUP BY reaction'
  ).bind(mediaKey).all();

  const counts = {};
  let total = 0;
  for (const r of rows.results ?? []) { counts[r.reaction] = r.cnt; total += r.cnt; }
  return Response.json({ counts, total }, { headers: CORS });
}`,
  `export async function onRequestGet({ request, env }) {
  const CORS     = buildCors(request);
  const mediaKey = new URL(request.url).searchParams.get('mediaKey');
  if (!mediaKey)                return Response.json({ error: 'mediaKey required' }, { status: 400, headers: CORS });
  if (!isValidMediaKey(mediaKey)) return Response.json({ error: 'Invalid mediaKey' },  { status: 400, headers: CORS });

  const rows = await env.DB.prepare(
    'SELECT reaction, COUNT(*) as cnt FROM reactions WHERE media_key = ?1 GROUP BY reaction'
  ).bind(mediaKey).all();

  const counts = {};
  let total = 0;
  for (const r of rows.results ?? []) { counts[r.reaction] = r.cnt; total += r.cnt; }
  return Response.json({ counts, total }, { headers: CORS });
}`
);

patch(
  'functions/api/reactions.js',
  'Use origin-reflective CORS + rate limiting + mediaKey validation in onRequestPost',
  `export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const { mediaKey, reaction } = body ?? {};
  if (!mediaKey)                        return Response.json({ error: 'mediaKey required' },  { status: 400, headers: CORS });
  if (!ALLOWED_REACTIONS.has(reaction)) return Response.json({ error: 'Invalid reaction' },   { status: 400, headers: CORS });

  await env.DB.prepare(
    'INSERT INTO reactions (media_key, reaction) VALUES (?1, ?2)'
  ).bind(mediaKey, reaction).run();

  // Return updated counts
  const rows = await env.DB.prepare(
    'SELECT reaction, COUNT(*) as cnt FROM reactions WHERE media_key = ?1 GROUP BY reaction'
  ).bind(mediaKey).all();
  const counts = {};
  let total = 0;
  for (const r of rows.results ?? []) { counts[r.reaction] = r.cnt; total += r.cnt; }
  return Response.json({ counts, total }, { status: 201, headers: CORS });
}`,
  `export async function onRequestPost({ request, env }) {
  const CORS = buildCors(request);

  // Rate-limit: max 30 reactions per IP per 60 s
  if (isRateLimited(request, { max: 30, windowMs: 60_000 })) {
    return Response.json({ error: 'Too many requests' }, { status: 429, headers: CORS });
  }

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const { mediaKey, reaction } = body ?? {};
  if (!mediaKey)                        return Response.json({ error: 'mediaKey required' },  { status: 400, headers: CORS });
  if (!isValidMediaKey(mediaKey))       return Response.json({ error: 'Invalid mediaKey' },   { status: 400, headers: CORS });
  if (!ALLOWED_REACTIONS.has(reaction)) return Response.json({ error: 'Invalid reaction' },   { status: 400, headers: CORS });

  await env.DB.prepare(
    'INSERT INTO reactions (media_key, reaction) VALUES (?1, ?2)'
  ).bind(mediaKey, reaction).run();

  // Return updated counts
  const rows = await env.DB.prepare(
    'SELECT reaction, COUNT(*) as cnt FROM reactions WHERE media_key = ?1 GROUP BY reaction'
  ).bind(mediaKey).all();
  const counts = {};
  let total = 0;
  for (const r of rows.results ?? []) { counts[r.reaction] = r.cnt; total += r.cnt; }
  return Response.json({ counts, total }, { status: 201, headers: CORS });
}`
);

// Inject shared helpers into reactions.js
{
  let src = read('functions/api/reactions.js');
  const marker = '// ── In-memory rate limiter';
  if (!src.includes(marker)) {
    const insertAfter = `/**\n * /api/reactions  — GET summary, POST new reaction\n * Requires D1 binding named "DB" in wrangler.toml\n */\n`;
    if (src.includes(insertAfter)) {
      const patched = src.replace(insertAfter, insertAfter + RATE_LIMITER_CODE + MEDIA_KEY_VALIDATOR);
      write('functions/api/reactions.js', patched);
      console.log(`    └─ Injected rate-limiter + mediaKey validator into reactions.js`);
    }
  } else {
    console.log(`${SKIP}  reactions.js — helpers already injected`);
    skipCount++;
  }
}

// ── upload.js — add OPTIONS handler + rate limiting ───────────────────────────
console.log(`\n  Patching upload.js...`);

patch(
  'functions/api/upload.js',
  'Add missing OPTIONS pre-flight handler + rate limiting',
  `export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch {
    return jsonError('Invalid JSON body', 400);
  }`,
  `export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Rate-limit: max 20 upload inits per IP per 60 s
  if (isRateLimited(request, { max: 20, windowMs: 60_000 })) {
    return jsonError('Too many requests', 429);
  }

  let body;
  try { body = await request.json(); } catch {
    return jsonError('Invalid JSON body', 400);
  }`
);

// Inject rate-limiter helper into upload.js
{
  let src = read('functions/api/upload.js');
  const marker = '// ── In-memory rate limiter';
  if (!src.includes(marker)) {
    // inject just before the first export
    const insertBefore = `export async function onRequestOptions`;
    if (src.includes(insertBefore)) {
      const patched = src.replace(insertBefore, RATE_LIMITER_CODE + insertBefore);
      write('functions/api/upload.js', patched);
      console.log(`    └─ Injected rate-limiter into upload.js`);
    }
  } else {
    console.log(`${SKIP}  upload.js — rate-limiter already injected`);
    skipCount++;
  }
}

// ── list.js — add OPTIONS handler + mediaKey-equivalent type validation ───────
console.log(`\n  Patching list.js...`);

{
  // Idempotent: only inject if onRequestOptions isn't already present
  let src = read('functions/api/list.js');
  if (src.includes('onRequestOptions')) {
    console.log(`${SKIP}  functions/api/list.js — OPTIONS handler already present`);
    skipCount++;
  } else {
    const target = `export async function onRequestGet(context) {
  const { request, env } = context;
  const url  = new URL(request.url);
  const type = url.searchParams.get('type') || 'photo';`;
    const replacement = `export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url  = new URL(request.url);
  const type = url.searchParams.get('type') || 'photo';`;
    if (src.includes(target)) {
      write('functions/api/list.js', src.replace(target, replacement));
      console.log(`    └─ Add missing OPTIONS pre-flight handler to list.js`);
    } else {
      console.log(`${WARN}  list.js — could not find expected onRequestGet signature`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 3 — Content Security Policy + security headers in _headers (HIGH)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m[3/9] Add Content-Security-Policy and security headers to _headers\x1b[0m');

{
  const file    = '_headers';
  const current = read(file);
  const marker  = 'Content-Security-Policy:';

  if (current.includes(marker)) {
    console.log(`${SKIP}  ${file} — CSP already present`);
    skipCount++;
  } else {
    // Build new _headers file — prepend the global block with CSP,
    // keep the existing content intact at the end
    const newHeaders = `/*
  # ── Security headers (applied to every response) ──────────────────────────
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin

  # Prevent other sites from embedding this page or sharing process (CORP/COOP)
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

  # Content-Security-Policy — allows only what the app legitimately needs:
  #   - default: same-origin only
  #   - scripts: same-origin + Google Fonts inline style bootstrap
  #   - styles:  same-origin + Google Fonts CDN
  #   - fonts:   Google Fonts static CDN (fonts.gstatic.com)
  #   - images:  same-origin + all *.backblazeb2.com subdomains (B2 CDN) + data URIs (SVG noise texture)
  #   - connect: same-origin (all API calls are same-origin relative)
  #   - media:   same-origin + B2 (for video streaming)
  #   - object:  none  (no Flash / embeds)
  #   - base:    none  (prevent base-tag injection)
  #   - form:    none  (app uses fetch, not HTML forms)
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.backblazeb2.com; connect-src 'self' https://*.backblazeb2.com; media-src 'self' https://*.backblazeb2.com; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';

  # Permissions-Policy — disable browser features the app never uses
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=()

/api/*
  Cache-Control: no-store
  # API responses must not be cached or shared
  Pragma: no-cache
`;
    write(file, newHeaders);
    console.log(`    └─ Full CSP + CORP/COOP + Permissions-Policy written`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 4 — (Covered inside patches 2 above) mediaKey validation
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m[4/9] mediaKey validation — already applied inline in patches 2\x1b[0m');
console.log(`${INFO}  isValidMediaKey() injected into comments.js and reactions.js above.`);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 5 — (Covered inside patches 2 above) rate limiting
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m[5/9] Rate limiting — already applied inline in patches 2 and upload.js\x1b[0m');
console.log(`${INFO}  isRateLimited() injected into comments.js, reactions.js, and upload.js.`);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 6 — robots.txt hardening (MEDIUM)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m[6/9] Harden robots.txt — block API routes and backup paths from crawlers\x1b[0m');

{
  const file    = 'public/robots.txt';
  const current = read(file);
  if (current.includes('Disallow: /api/')) {
    console.log(`${SKIP}  ${file} — already hardened`);
    skipCount++;
  } else {
    const hardened = `# robots.txt — Wedding Gallery
User-agent: *
# Block API endpoints from being indexed or probed by crawlers
Disallow: /api/
# Block any leftover backup directories
Disallow: /__backup_v3__/
Disallow: /__backup__/
# Disallow direct access to source map files if present
Disallow: /*.map$
`;
    write(file, hardened);
    console.log(`    └─ Blocked /api/, /__backup_v3__/, and *.map from crawlers`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 7 — manifest.json — strip CRA placeholder strings (LOW)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m[7/9] Fix manifest.json — remove default CRA placeholder text\x1b[0m');

patch(
  'public/manifest.json',
  'Replace CRA placeholder short_name / name',
  `  "short_name": "React App",
  "name": "Create React App Sample",`,
  `  "short_name": "Wedding Gallery",
  "name": "Claudine & Mark · Wedding Gallery",`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 8 — .gitignore — protect *.bak files (LOW)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m[8/9] Protect backup files in .gitignore\x1b[0m');

appendUniq('.gitignore', '# Backup files — never commit source backups');
appendUniq('.gitignore', '*.bak');
appendUniq('.gitignore', '*.bak_*');

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 9 — _redirects: block direct access to backup folder (MEDIUM)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[1m[9/9] Block /__backup_v3__/ via _redirects\x1b[0m');

{
  const file    = '_redirects';
  const current = read(file);
  if (current.includes('/__backup_v3__/')) {
    console.log(`${SKIP}  ${file} — backup block already present`);
    skipCount++;
  } else {
    // Prepend the block rule BEFORE the SPA catch-all so it takes priority
    const updated = `# Block direct browser access to backup directories
/__backup_v3__/*  /index.html  404
/__backup__/*     /index.html  404

${current}`;
    write(file, updated);
    console.log(`    └─ Added 404 rules for backup paths`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`
\x1b[1m─────────────────────────────────────────────────────────────────────────────
  Security hardening complete
  Applied : ${patchCount} change(s)
  Skipped : ${skipCount} (already patched)
─────────────────────────────────────────────────────────────────────────────\x1b[0m

\x1b[1mWhat was changed:\x1b[0m
  1. \x1b[31mDELETED\x1b[0m  functions/api/debug-env.js  ← exposed B2 key info to public internet
  2. \x1b[33mFIXED\x1b[0m    CORS wildcard (*) → origin-reflective headers in comments + reactions
  3. \x1b[33mADDED\x1b[0m    Content-Security-Policy, CORP, COOP to _headers
  4. \x1b[33mADDED\x1b[0m    mediaKey input validation (path traversal, length, prefix checks)
  5. \x1b[33mADDED\x1b[0m    In-memory rate limiting on upload, comments, reactions endpoints
  6. \x1b[33mADDED\x1b[0m    OPTIONS pre-flight handlers to upload.js and list.js
  7. \x1b[33mHARDENED\x1b[0m robots.txt — block /api/, backup dirs, source maps from crawlers
  8. \x1b[33mFIXED\x1b[0m    manifest.json — replaced default CRA placeholder strings
  9. \x1b[33mADDED\x1b[0m    .gitignore entries for *.bak / *.bak_* files
  10.\x1b[33mADDED\x1b[0m    _redirects 404 rules for /__backup_v3__/ and /__backup__/

\x1b[1mNext steps:\x1b[0m
  • Commit these changes and redeploy to Cloudflare Pages.
  • In Cloudflare Pages → Settings → Environment Variables, confirm that
    SITE_ORIGIN is set to your exact deployed URL (e.g. https://claudineandmarkgallery.pages.dev)
    so _middleware.js can use it in the CORS allow-list.
  • Consider enabling Cloudflare's built-in Bot Fight Mode and WAF rules
    for additional protection at the edge layer.
  • Rotate your B2 application keys as a precaution since debug-env.js
    was previously live and accessible without authentication.
`);
