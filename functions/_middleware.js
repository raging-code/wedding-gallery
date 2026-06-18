/**
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
