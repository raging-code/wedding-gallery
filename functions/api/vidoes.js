export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const auth = base64Encode(`${apiKey}:${apiSecret}`);
  // List video resources from the 'wedding_videos' folder
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/video?type=upload&prefix=wedding_videos/&max_results=500`;

  try {
    const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!response.ok) throw new Error('Cloudinary video fetch failed');
    const data = await response.json();
    const videos = data.resources.map(r => ({
      public_id: r.public_id,
      secure_url: r.secure_url,
      format: r.format,
      duration: r.duration,
    }));
    return new Response(JSON.stringify(videos), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=30' },
    });
  } catch (e) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

function base64Encode(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  data.forEach(byte => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}