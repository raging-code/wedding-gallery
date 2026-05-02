export async function onRequest(context) {
  const { env, params } = context;
  const videoId = params.id;

  const keyId = env.B2_KEY_ID;
  const appKey = env.B2_APPLICATION_KEY;
  const bucketName = env.B2_BUCKET_NAME;
  const endpoint = env.B2_ENDPOINT;

  if (!keyId || !appKey || !bucketName || !endpoint) {
    return new Response('Missing config', { status: 500 });
  }

  const b2FileUrl = `https://${endpoint}/${bucketName}/${encodeURIComponent(videoId)}`;
  const auth = btoa(`${keyId}:${appKey}`);

  const b2Response = await fetch(b2FileUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!b2Response.ok) return new Response('Video not found', { status: 404 });

  const newHeaders = new Headers(b2Response.headers);
  newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  newHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(b2Response.body, {
    status: b2Response.status,
    headers: newHeaders,
  });
}