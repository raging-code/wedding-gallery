/**
 * /api/reactions  — GET summary, POST new reaction
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
  // Must start with photos/ or videos/ (the only valid prefixes used by upload.js)
  if (!/^(photos|videos)//.test(key)) return false;
  // No path traversal, null bytes, or shell-special chars
  if (/(\.\.|\x00|[<>"'\\])/.test(key)) return false;
  return true;
}
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_REACTIONS = new Set(['❤️', '🌸', '🥂', '😂', '💍']);
function buildCors(request) {
  const origin  = (request && request.headers.get('Origin')) || '';
  const allowed = /^https:\/\/[a-zA-Z0-9-]+\.pages\.dev$/.test(origin)
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
    'SELECT reaction, COUNT(*) as cnt FROM reactions WHERE media_key = ?1 GROUP BY reaction'
  ).bind(mediaKey).all();

  const counts = {};
  let total = 0;
  for (const r of rows.results ?? []) { counts[r.reaction] = r.cnt; total += r.cnt; }
  return Response.json({ counts, total }, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
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
}
