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
    return new Response(JSON.stringify({ error: 'Missing B2 configuration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const auth = btoa(`${keyId}:${appKey}`);
  try {
    const authResp = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!authResp.ok) throw new Error('B2 auth failed');
    const authData = await authResp.json();
    const apiUrl = authData.apiUrl;
    const authToken = authData.authorizationToken;

    const listResp = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: { Authorization: authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId, maxFileCount: 1000, prefix: '' }),
    });
    if (!listResp.ok) {
      const errText = await listResp.text();
      throw new Error(`Listing failed: ${errText}`);
    }

    const listData = await listResp.json();
    const allFiles = listData.files || [];

    // Build a set of known file names (to find thumbnails)
    const fileSet = new Set(allFiles.map(f => f.fileName));

    // Separate videos from thumbnails
    const videos = allFiles
      .filter(f => !f.fileName.endsWith('.thumb.jpg'))
      .map(f => {
        const originalName = decodeURIComponent(f.fileName);
        const thumbFilename = f.fileName + '.thumb.jpg';
        const hasThumb = fileSet.has(thumbFilename);
        return {
          id: f.fileName,
          url: `/video/${encodeURIComponent(originalName)}`,
          name: f.fileName,
          size: f.contentLength,
          thumbUrl: hasThumb ? `/video/${encodeURIComponent(originalName)}.thumb.jpg` : null,
        };
      });

    return new Response(JSON.stringify(videos), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=30' },
    });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}