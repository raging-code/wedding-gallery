/**
 * /api/comments  — GET thread, POST new comment
 * Requires D1 binding named "DB" in wrangler.toml
 */

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
    'SELECT id, author_name, body, created_at FROM comments WHERE media_key = ?1 ORDER BY created_at ASC LIMIT 200'
  ).bind(mediaKey).all();

  return Response.json({ comments: rows.results ?? [] }, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
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
}
