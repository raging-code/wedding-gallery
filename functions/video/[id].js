export async function onRequest(context) {
  const { env, params } = context;
  const videoId = params.id;   // the file name from the URL

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

  // 2. Build the full file URL (this is what we'll check)
  const fileUrl = `${downloadUrl}/file/${bucketName}/${encodeURIComponent(videoId)}`;

  // 3. Try to fetch the file from B2
  const b2Response = await fetch(fileUrl, {
    headers: { Authorization: authToken },
  });

  // ★ DEBUG: If file not found, return details so we can see what's wrong
  if (!b2Response.ok) {
    const diagnostic = {
      error: 'Video not found on B2',
      bucketNameUsed: bucketName,
      storageFileName: videoId,
      constructedUrl: fileUrl,
      b2Status: b2Response.status,
    };
    return new Response(JSON.stringify(diagnostic, null, 2), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. Success – stream the video
  const newHeaders = new Headers(b2Response.headers);
  newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  newHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(b2Response.body, {
    status: 200,
    headers: newHeaders,
  });
}