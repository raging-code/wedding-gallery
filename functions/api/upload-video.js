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

  // 3. Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return new Response('No video file provided', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });

  const thumbFile = formData.get('thumb');   // thumbnail (optional)

  const fileBuffer = await file.arrayBuffer();
  const originalName = `${crypto.randomUUID()}-${file.name}`;
  const encodedName = encodeURIComponent(originalName);

  // 4. Upload video
  try {
    const uploadResp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: uploadAuthToken,
        'X-Bz-File-Name': encodedName,
        'Content-Type': file.type || 'application/octet-stream',
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
      body: fileBuffer,
    });
    if (!uploadResp.ok) {
      const err = await uploadResp.text();
      return new Response(`Video upload failed: ${err}`, { status: 500 });
    }
    const videoResult = await uploadResp.json();

    // 5. Upload thumbnail if present
    let thumbUrl = null;
    if (thumbFile) {
      const thumbBuffer = await thumbFile.arrayBuffer();
      const thumbName = originalName + '.thumb.jpg';
      const encodedThumbName = encodeURIComponent(thumbName);

      // Get a new upload URL (each is one-use)
      let thumbUploadUrlData;
      try {
        const urlResp = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
          method: 'POST',
          headers: { Authorization: authToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucketId }),
        });
        if (!urlResp.ok) throw new Error('Thumbnail upload URL error');
        thumbUploadUrlData = await urlResp.json();
      } catch(e) {
        // If thumbnail fails, we still return video success
        return new Response(JSON.stringify({
          id: videoResult.fileName,
          url: `/video/${encodeURIComponent(originalName)}`,
          name: videoResult.fileName,
          thumbUrl: null,
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const thumbUploadResp = await fetch(thumbUploadUrlData.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: thumbUploadUrlData.authorizationToken,
          'X-Bz-File-Name': encodedThumbName,
          'Content-Type': 'image/jpeg',
          'X-Bz-Content-Sha1': 'do_not_verify',
        },
        body: thumbBuffer,
      });
      if (thumbUploadResp.ok) {
        thumbUrl = `/video/${encodeURIComponent(originalName)}.thumb.jpg`;
      }
    }

    return new Response(JSON.stringify({
      id: videoResult.fileName,
      url: `/video/${encodeURIComponent(originalName)}`,
      name: videoResult.fileName,
      thumbUrl: thumbUrl,   // may be null
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch(e) { return new Response('Upload error', { status: 500 }); }
}