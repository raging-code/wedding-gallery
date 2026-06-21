// setup-b2-cors.mjs
// Usage: node setup-b2-cors.mjs KEY_ID APP_KEY ORIGIN
// Example: node setup-b2-cors.mjs "0055abc..." "K005abc..." "https://claudineandmarkgallery.pages.dev"

const [,, keyId, appKey, origin] = process.argv;

if (!keyId || !appKey || !origin) {
  console.error('Usage: node setup-b2-cors.mjs KEY_ID APP_KEY ORIGIN');
  console.error('Example: node setup-b2-cors.mjs "0055abc..." "K005abc..." "https://claudineandmarkgallery.pages.dev"');
  process.exit(1);
}

// Guard: ORIGIN must be the URL your gallery is served FROM (same value as
// SITE_ORIGIN in .env) — NOT a B2 storage endpoint (B2_*_ENDPOINT, e.g.
// s3.us-east-005.backblazeb2.com). Passing the endpoint by mistake is exactly
// what makes B2 reply "an allowedOrigin doesn't look like an origin".
if (/backblazeb2\.com$/i.test(origin) || /^s3[.-]/i.test(origin)) {
  console.error(`❌ "${origin}" looks like a B2 storage endpoint, not a site origin.`);
  console.error('   ORIGIN must be the URL your gallery is served from, e.g.');
  console.error('   https://claudineandmarkgallery.pages.dev — the same value as');
  console.error('   SITE_ORIGIN in your .env, not B2_PHOTO1_ENDPOINT.');
  process.exit(1);
}
if (!/^https?:\/\/[^/\s]+$/.test(origin)) {
  console.error(`❌ "${origin}" doesn't look like a valid origin.`);
  console.error('   It needs a scheme and no path, e.g. https://claudineandmarkgallery.pages.dev');
  process.exit(1);
}

// Step 1: Authorize
console.log('🔑 Authorizing with Backblaze...');
const creds = Buffer.from(`${keyId}:${appKey}`).toString('base64');
const authRes = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
  headers: { Authorization: `Basic ${creds}` }
});
const auth = await authRes.json();
if (!authRes.ok) {
  console.error('❌ Authorization failed:', authRes.status, auth.message);
  process.exit(1);
}

const { authorizationToken, accountId } = auth;
const apiUrl = auth.apiInfo.storageApi.apiUrl;
console.log('✅ Authorized as account:', accountId);

// Step 2: List buckets
console.log('\n📦 Fetching bucket list...');
const listRes = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets?accountId=${accountId}`, {
  headers: { Authorization: authorizationToken }
});
const listText = await listRes.text();
if (!listRes.ok) {
  console.error('❌ Failed to list buckets. Status:', listRes.status);
  console.error('   Response body:', listText);
  process.exitCode = 1;
} else {
  const listData = JSON.parse(listText);
  const buckets = listData.buckets;
  console.log(`   Found ${buckets.length} bucket(s):`, buckets.map(b => b.bucketName).join(', '));

  // Step 3: CORS rules to apply
  const corsRules = [
    {
      corsRuleName: 'allowCloudflare',
      allowedOrigins: [
        origin,
        // Also allow preview deployment URLs
        'https://*.pages.dev'
      ],
      allowedOperations: [
        'b2_download_file_by_name',
        'b2_download_file_by_id',
        's3_get',
        's3_head',
        's3_put'
      ],
      allowedHeaders: ['*'],
      exposeHeaders: ['ETag', 'x-amz-version-id'],
      maxAgeSeconds: 3600
    }
  ];

  // Step 4: Apply CORS to each bucket
  console.log(`\n🔧 Applying CORS rules (origin: ${origin})...\n`);
  for (const bucket of buckets) {
    const updateRes = await fetch(`${apiUrl}/b2api/v3/b2_update_bucket`, {
      method: 'POST',
      headers: {
        Authorization: authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountId,
        bucketId: bucket.bucketId,
        corsRules
      })
    });
    const updateData = await updateRes.json();
    if (updateRes.ok) {
      console.log(`  ✅ ${bucket.bucketName} — CORS updated`);
    } else {
      console.log(`  ❌ ${bucket.bucketName} — Failed: ${updateData.message}`);
    }
  }

  console.log('\n🎉 Done! Trigger a new Cloudflare deploy and images should load.');
}
