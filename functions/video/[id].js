export async function onRequest(context) {
  const { env, params } = context;
  const videoId = params.id;

  const keyId = env.B2_KEY_ID;
  const appKey = env.B2_APPLICATION_KEY;
  const bucketName = env.B2_BUCKET_NAME;

  if (!keyId || !appKey || !bucketName) {
    return new Response('Missing B2 configuration', { status: 500 });
  }

  const auth = btoa(`${keyId}:${appKey}`);
  let authData;
  try {
    const authResp = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!authResp.ok) return new Response('B2 auth failed', { status: 500 });
    authData = await authResp.json();
  } catch (e) {
    return new Response('B2 auth error', { status: 500 });
  }

  const downloadUrl = authData.downloadUrl;
  const authToken = authData.authorizationToken;

  const fileUrl = `${downloadUrl}/file/${bucketName}/${encodeURIComponent(videoId)}`;

  const b2Response = await fetch(fileUrl, {
    headers: { Authorization: authToken },
  });

  if (!b2Response.ok) {
    return new Response('Video not found', { status: 404 });
  }

  const newHeaders = new Headers(b2Response.headers);
  newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  newHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(b2Response.body, {
    status: b2Response.status,
    headers: newHeaders,
  });
}