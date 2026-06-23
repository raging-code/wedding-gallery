/**
 * /api/comments  — GET thread, POST new comment
 * Requires D1 binding named "DB" in wrangler.toml
 */

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

// ── mediaKey input validator ──────────────────────────────────────────────────
function isValidMediaKey(key) {
  if (typeof key !== 'string') return false;
  if (key.length === 0 || key.length > 512) return false;
  // The frontend (b2List/mediaKeyFromItem in WeddingGallery.js) sends the
  // bare filename portion of the B2 object key, e.g.
  // "1716000000000_g_Q2FybG8.jpg" — NOT the full "photos/<name>" key.
  // Accept either that bare shape or the full prefixed key, so this stays
  // compatible with any caller that does pass the prefix.
  const hasPathPrefix  = key.startsWith('photos/') || key.startsWith('videos/');
  const bareFilenameRe = /^\d+_[A-Za-z0-9._-]+\.[A-Za-z0-9]+$/;
  if (!hasPathPrefix && !bareFilenameRe.test(key)) return false;
  // No path traversal, null bytes, or shell-special chars
  if (key.includes('..') || key.includes('\x00') || /[<>"'\\]/.test(key)) return false;
  return true;
}
// ─────────────────────────────────────────────────────────────────────────────

function buildCors(request) {
  // Reflect the exact origin only if it matches the deployed site or localhost.
  // Falls back to blocking unknown origins (no ACAO header → browser blocks).
  const origin   = (request && request.headers.get('Origin')) || '';
  const allowed  = /^https:\/\/[a-zA-Z0-9-]+\.pages\.dev$/.test(origin)
    || /^https:\/\/claudineandmarkgallery\.pages\.dev$/.test(origin)
    || /^http:\/\/localhost:(3000|8788)$/.test(origin);
  return {
    'Access-Control-Allow-Origin':  allowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: buildCors(request) });
}

export async function onRequestGet({ request, env }) {
  const CORS     = buildCors(request);
  const mediaKey = new URL(request.url).searchParams.get('mediaKey');
  if (!mediaKey)                return Response.json({ error: 'mediaKey required' }, { status: 400, headers: CORS });
  if (!isValidMediaKey(mediaKey)) return Response.json({ error: 'Invalid mediaKey' },  { status: 400, headers: CORS });

  const rows = await env.DB.prepare(
    'SELECT id, author_name, body, created_at FROM comments WHERE media_key = ?1 ORDER BY created_at ASC LIMIT 200'
  ).bind(mediaKey).all();

  return Response.json({ comments: rows.results ?? [] }, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
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
}
