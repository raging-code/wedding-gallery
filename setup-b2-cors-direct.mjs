/**
 * setup-b2-cors-direct.mjs
 *
 * Sets CORS rules on ONE Backblaze B2 bucket via b2_update_bucket.
 *
 * Bucket ID resolution (in order):
 *   1. If the key is restricted to a single bucket, b2_authorize_account
 *      returns its bucketId directly — no extra lookup needed.
 *   2. Otherwise, falls back to b2_list_buckets filtered by bucketName
 *      (only works if the key has the listBuckets capability).
 *
 * Usage:
 *   node setup-b2-cors-direct.mjs <KEY_ID> <APP_KEY> <BUCKET_NAME> <ORIGIN>
 */

const [, , keyId, appKey, bucketName, origin] = process.argv;

if (!keyId || !appKey || !bucketName || !origin) {
  console.error('Usage: node setup-b2-cors-direct.mjs <KEY_ID> <APP_KEY> <BUCKET_NAME> <ORIGIN>');
  process.exitCode = 1;
  process.exit();
}

const corsRules = [
  {
    corsRuleName: 'allowWebUpload',
    allowedOrigins: [origin],
    allowedHeaders: ['*'],
    allowedOperations: [
      's3_head', 's3_get', 's3_put', 's3_post', 's3_delete',
      'b2_download_file_by_name', 'b2_download_file_by_id', 'b2_upload_file',
    ],
    exposeHeaders: ['ETag'],
    maxAgeSeconds: 3600,
  },
];

async function main() {
  console.log('🔑 Authorizing with Backblaze...');
  const authRes = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: 'Basic ' + Buffer.from(`${keyId}:${appKey}`).toString('base64') },
  });
  const authText = await authRes.text();
  if (!authRes.ok) {
    console.error('❌ Authorization failed. Status:', authRes.status);
    console.error('   Response body:', authText);
    process.exitCode = 1;
    return;
  }
  const auth = JSON.parse(authText);
  console.log(`✅ Authorized as account: ${auth.accountId}`);

  const apiUrl = auth.apiInfo.storageApi.apiUrl;
  const allowed = auth.apiInfo.storageApi.allowed || auth.allowed;
  let bucketId = allowed && allowed.bucketId;

  if (bucketId) {
    console.log(`📦 Key is restricted to bucket: ${allowed.bucketName || bucketId} (${bucketId})`);
  } else {
    console.log(`📦 Key is not bucket-restricted — looking up "${bucketName}" via b2_list_buckets...`);
    const listRes = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets?accountId=${auth.accountId}&bucketName=${encodeURIComponent(bucketName)}`, {
      headers: { Authorization: auth.authorizationToken },
    });
    const listText = await listRes.text();
    if (!listRes.ok) {
      console.error('❌ Failed to list buckets. Status:', listRes.status);
      console.error('   Response body:', listText);
      console.error('   (This key likely lacks the listBuckets capability — provide the bucket ID directly instead.)');
      process.exitCode = 1;
      return;
    }
    const listData = JSON.parse(listText);
    const match = (listData.buckets || []).find(b => b.bucketName === bucketName);
    if (!match) {
      console.error(`❌ No bucket named "${bucketName}" found for this account.`);
      process.exitCode = 1;
      return;
    }
    bucketId = match.bucketId;
    console.log(`📦 Found bucket "${bucketName}" → ${bucketId}`);
  }

  console.log(`📦 Updating CORS rules on bucket ${bucketId}...`);
  const updateRes = await fetch(`${apiUrl}/b2api/v3/b2_update_bucket`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accountId: auth.accountId,
      bucketId,
      corsRules,
    }),
  });
  const updateText = await updateRes.text();
  if (!updateRes.ok) {
    console.error('❌ Failed to update bucket. Status:', updateRes.status);
    console.error('   Response body:', updateText);
    process.exitCode = 1;
    return;
  }

  const updated = JSON.parse(updateText);
  console.log(`✅ CORS updated for bucket "${updated.bucketName}" (revision ${updated.revision})`);
  console.log('   Rule:', JSON.stringify(updated.corsRules, null, 2));
}

main().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exitCode = 1;
});
