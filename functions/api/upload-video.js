export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const keyId = env.B2_KEY_ID;
  const appKey = env.B2_APPLICATION_KEY;
  const bucketId = env.B2_BUCKET_ID;
  const bucketName = env.B2_BUCKET_NAME;

  if (!keyId || !appKey || !bucketId || !bucketName) {
    return new Response('Missing B2 configuration', { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const auth = btoa(`${keyId}:${appKey}`);
  // 1. Authorize
  let authData;
  try {
    const authResp = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!authResp.ok) return new Response('B2 auth failed', { status: 500 });
    authData = await authResp.json();
  } catch(e) { return new Response('B2 auth error', { status: 500 }); }

  const apiUrl = authData.apiUrl;
  const authToken = authData.authorizationToken;

  // 2. Get upload URL
  let uploadUrlData;
  try {
    const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: { Authorization: authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId }),
    });
    if (!urlResp.ok) return new Response('Get upload URL failed', { status: 500 });
    uploadUrlData = await urlResp.json();
  } catch(e) { return new Response('Upload URL error', { status: 500 }); }

  const uploadUrl = uploadUrlData.uploadUrl;
  const uploadAuthToken = uploadUrlData.authorizationToken;

  // 3. Read the uploaded file
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return new Response('No file provided', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });

  const fileBuffer = await file.arrayBuffer();
  const uniqueName = `${crypto.randomUUID()}-${file.name}`;

  // 4. Upload
  try {
    const uploadResp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: uploadAuthToken,
        'X-Bz-File-Name': encodeURIComponent(uniqueName),
        'Content-Type': file.type || 'application/octet-stream',
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
      body: fileBuffer,
    });
    if (!uploadResp.ok) {
      const err = await uploadResp.text();
      return new Response(`Upload failed: ${err}`, { status: 500 });
    }
    const result = await uploadResp.json();

    return new Response(JSON.stringify({
      id: result.fileName,
      url: `/video/${encodeURIComponent(result.fileName)}`,
      name: result.fileName,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch(e) { return new Response('Upload error', { status: 500 }); }
}