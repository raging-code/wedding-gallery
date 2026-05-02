export async function onRequest(context) {
  const { env } = context;
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const keyId = env.B2_KEY_ID;
  const appKey = env.B2_APPLICATION_KEY;
  const bucketId = env.B2_BUCKET_ID;
  const bucketName = env.B2_BUCKET_NAME;

  if (!keyId || !appKey || !bucketId || !bucketName) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const auth = btoa(`${keyId}:${appKey}`);
  try {
    // Authorize with B2
    const authResp = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!authResp.ok) throw new Error('B2 auth failed');
    const authData = await authResp.json();
    const apiUrl = authData.apiUrl;
    const authToken = authData.authorizationToken;

    // List files
    const listResp = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: { Authorization: authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId, maxFileCount: 1000, prefix: '', delimiter: '' }),
    });
    if (!listResp.ok) throw new Error('Listing failed');
    const listData = await listResp.json();

// After getting listData.files...
const files = listData.files || [];
const videos = files.map(f => {
  const originalName = decodeURIComponent(f.fileName);
  return {
    id: f.fileName,                                    // raw B2 name (for future use)
    url: `/video/${encodeURIComponent(originalName)}`,  // single‑encoded proxy URL
    name: f.fileName,
    size: f.contentLength,
  };
});

    return new Response(JSON.stringify(videos), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=30' },
    });
  } catch(e) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}