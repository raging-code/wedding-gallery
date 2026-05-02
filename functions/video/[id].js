export async function onRequest(context) {
  const { env, params } = context;
  const videoId = params.id;                // may still be percent‑encoded

  const keyId = env.B2_KEY_ID;
  const appKey = env.B2_APPLICATION_KEY;
  const bucketName = env.B2_BUCKET_NAME;

  if (!keyId || !appKey || !bucketName) {
    return new Response('Missing B2 configuration', { status: 500 });
  }

  // 1. Authorize with B2
  const auth = btoa(`${keyId}:${appKey}`);
  let authData;
  try {
    const authResp = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!authResp.ok) return new Response('B2 auth failed', { status: 502 });
    authData = await authResp.json();
  } catch (e) {
    return new Response('B2 auth error', { status: 502 });
  }

  const downloadUrl = authData.downloadUrl;
  const authToken = authData.authorizationToken;

  // 2. Decode the incoming videoId (remove any existing encoding), then re‑encode once
  const decodedName = decodeURIComponent(videoId);          // e.g., "Creamy Steak Bites Recipe.mp4"
  const encodedName = encodeURIComponent(decodedName);      // e.g., "Creamy%20Steak%20Bites%20Recipe.mp4"
  const fileUrl = `${downloadUrl}/file/${bucketName}/${encodedName}`;

  // 3. Fetch the video from B2
  const b2Response = await fetch(fileUrl, {
    headers: { Authorization: authToken },
  });

  if (!b2Response.ok) {
    return new Response('Video not found', { status: 404 });
  }

  // 4. Stream the video back to the browser
  const newHeaders = new Headers(b2Response.headers);
  newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  newHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(b2Response.body, {
    status: 200,
    headers: newHeaders,
  });
}