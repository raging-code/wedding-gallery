/**
 * /api/reactions  — GET summary, POST new reaction
 * Requires D1 binding named "DB" in wrangler.toml
 */

const ALLOWED_REACTIONS = new Set(['❤️', '👏', '💍', '😍', '🥂']);
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const mediaKey = new URL(request.url).searchParams.get('mediaKey');
  if (!mediaKey) return Response.json({ error: 'mediaKey required' }, { status: 400, headers: CORS });

  const rows = await env.DB.prepare(
    'SELECT reaction, COUNT(*) as cnt FROM reactions WHERE media_key = ?1 GROUP BY reaction'
  ).bind(mediaKey).all();

  const counts = {};
  let total = 0;
  for (const r of rows.results ?? []) { counts[r.reaction] = r.cnt; total += r.cnt; }
  return Response.json({ counts, total }, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
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
}
