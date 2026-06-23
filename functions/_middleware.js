/**
 * Cloudflare Pages Middleware
 * Runs before every /api/* Function request.
 * Adds CORS headers and rejects non-allowed origins.
 */
export async function onRequest(context) {
  const { request, next, env } = context;

  // Let the route run first. Several Functions (comments.js, reactions.js,
  // upload.js, list.js, media.js) compute their OWN Access-Control-Allow-Origin
  // — including reflecting *.pages.dev preview-deployment origins, which a
  // single-origin allow-list here can't represent. This middleware now only
  // fills in CORS headers as a FALLBACK for routes that didn't already set
  // their own, instead of unconditionally overwriting them. It also no
  // longer intercepts OPTIONS itself, so each route's own onRequestOptions()
  // (when present) still runs.
  const response = await next();

  if (response.headers.has('Access-Control-Allow-Origin')) {
    return response; // route already handled CORS correctly — leave it alone
  }

  const origin = request.headers.get('Origin') || '';

  // Fallback allow-list, only used for routes with no CORS logic of their own.
  const allowed = [
    env.SITE_ORIGIN || '',          // e.g. https://your-project.pages.dev
    'http://localhost:3000',
    'http://localhost:8788',         // wrangler pages dev default
  ].filter(Boolean);

  const corsOrigin = allowed.includes(origin) ? origin : allowed[0];

  // Handle pre-flight for routes with no onRequestOptions of their own.
  if (request.method === 'OPTIONS' && response.status === 204) {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(corsOrigin),
    });
  }

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
