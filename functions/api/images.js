export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  // Return empty JSON if configuration is missing
  if (!cloudName || !apiKey || !apiSecret) {
    return new Response(JSON.stringify([]), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Build Basic auth header safely (btoa may not exist in all Workers)
  const auth = base64Encode(`${apiKey}:${apiSecret}`);
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?type=upload&prefix=wedding_gallery/&max_results=500`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      return new Response(JSON.stringify([]), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await response.json();
    const images = data.resources.map(r => ({
      id: r.public_id,
      url: r.secure_url,
      width: r.width,
      height: r.height,
      format: r.format,
    }));

    return new Response(JSON.stringify(images), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=30',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify([]), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

function base64Encode(str) {
  // Convert string to UTF-8 bytes then to base64
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  data.forEach(byte => (binary += String.fromCharCode(byte)));
  return btoa(binary);   // btoa is available in Workers (2022+)
}