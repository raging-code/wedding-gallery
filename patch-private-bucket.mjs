import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ─── Shared: generatePresignedGet function to inject into both files ──────────
// Generates a signed download URL valid for 24 hours (86400s)
// Same AWS Signature V4 logic as generatePresignedPut but for GET requests
const PRESIGNED_GET_FN = `
// ── Pre-signed GET via AWS Signature V4 (B2 S3-compat) — private bucket support
async function generatePresignedGet({ keyId, appKey, endpoint, bucketName, fileKey, expiresIn = 86400 }) {
  const region     = endpoint.split('.')[1] || 'us-west-004';
  const service    = 's3';
  const host       = endpoint;
  const now        = new Date();
  const amzDate    = toAmzDate(now);
  const dateStamp  = amzDate.slice(0, 8);
  const credScope  = \`\${dateStamp}/\${region}/\${service}/aws4_request\`;
  const signedHeaders = 'host';
  const canonicalUri  = \`/\${bucketName}/\${encodeURIComponent(fileKey).replace(/%2F/g, '/')}\`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':    \`\${keyId}/\${credScope}\`,
    'X-Amz-Date':          amzDate,
    'X-Amz-Expires':       String(expiresIn),
    'X-Amz-SignedHeaders': signedHeaders,
  });
  queryParams.sort();
  const canonicalQuery   = queryParams.toString();
  const canonicalHeaders = \`host:\${host}\\n\`;
  const canonicalRequest = [
    'GET', canonicalUri, canonicalQuery,
    canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD',
  ].join('\\n');

  const strToSign = [
    'AWS4-HMAC-SHA256', amzDate, credScope,
    await sha256hex(canonicalRequest),
  ].join('\\n');

  const sigKey = await deriveSigningKey(appKey, dateStamp, region, service);
  const sigHex = await hmacHex(sigKey, strToSign);

  queryParams.set('X-Amz-Signature', sigHex);
  return \`https://\${host}\${canonicalUri}?\${queryParams.toString()}\`;
}
`;

// ─── Fix upload.js ────────────────────────────────────────────────────────────
const UPLOAD_PATH = resolve("functions/api/upload.js");
let upload = readFileSync(UPLOAD_PATH, "utf8");
let uploadChanged = 0;

// Fix 1: Replace plain publicUrl with presigned GET URL
const oldPublicUrl = "    const publicUrl = `https://${endpoint}/${bucketName}/${fileKey}`;";
const newPublicUrl = "    const publicUrl = await generatePresignedGet({ keyId, appKey, endpoint, bucketName, fileKey });";

if (upload.includes(oldPublicUrl)) {
  upload = upload.replace(oldPublicUrl, newPublicUrl);
  console.log("✅ upload.js Fix 1 — publicUrl now uses presigned GET (private bucket)");
  uploadChanged++;
} else {
  console.log("⚠️  upload.js Fix 1 skipped — pattern not found");
}

// Fix 2: Inject generatePresignedGet before crypto helpers
const uploadCryptoMarker = "// ── Crypto helpers ────────────────────────────────────────────────────────────\nfunction toAmzDate(d) {";

if (!upload.includes("async function generatePresignedGet(") && upload.includes(uploadCryptoMarker)) {
  upload = upload.replace(uploadCryptoMarker, PRESIGNED_GET_FN + "\n" + uploadCryptoMarker);
  console.log("✅ upload.js Fix 2 — injected generatePresignedGet function");
  uploadChanged++;
} else if (upload.includes("async function generatePresignedGet(")) {
  console.log("ℹ️  upload.js Fix 2 skipped — generatePresignedGet already exists");
} else {
  console.log("⚠️  upload.js Fix 2 skipped — crypto marker not found");
}

if (uploadChanged > 0) {
  writeFileSync(UPLOAD_PATH, upload, "utf8");
  console.log(`   → Wrote ${uploadChanged} fix(es) to functions/api/upload.js\n`);
} else {
  console.log("   → No changes to functions/api/upload.js\n");
}

// ─── Fix list.js ──────────────────────────────────────────────────────────────
const LIST_PATH = resolve("functions/api/list.js");
let list = readFileSync(LIST_PATH, "utf8");
let listChanged = 0;

// Fix 1: Replace synchronous plain-URL item loop with async presigned GET loop
const oldItemsLoop =
`  const items = [];
  const re    = /<Contents>([\\s\\S]*?)<\\/Contents>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block       = m[1];
    const key         = tag(block, 'Key');
    const lastMod     = tag(block, 'LastModified');
    const size        = parseInt(tag(block, 'Size'), 10);
    if (!key) continue;
    items.push({
      key,
      url:      \`https://\${host}/\${bucketName}/\${key}\`,
      size,
      uploaded: lastMod ? new Date(lastMod).getTime() : 0,
    });
  }
  return items;`;

const newItemsLoop =
`  // Collect raw metadata first (sync), then sign URLs in parallel (async)
  const rawItems = [];
  const re       = /<Contents>([\\s\\S]*?)<\\/Contents>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block   = m[1];
    const key     = tag(block, 'Key');
    const lastMod = tag(block, 'LastModified');
    const size    = parseInt(tag(block, 'Size'), 10);
    if (!key) continue;
    rawItems.push({ key, size, uploaded: lastMod ? new Date(lastMod).getTime() : 0 });
  }
  // Generate presigned GET URLs for private bucket access (valid 24 hours)
  return Promise.all(rawItems.map(async item => ({
    ...item,
    url: await generatePresignedGet({ keyId, appKey, endpoint, bucketName, fileKey: item.key }),
  })));`;

if (list.includes(oldItemsLoop)) {
  list = list.replace(oldItemsLoop, newItemsLoop);
  console.log("✅ list.js Fix 1 — item URLs now use presigned GET (private bucket)");
  listChanged++;
} else {
  console.log("⚠️  list.js Fix 1 skipped — loop pattern not found");
}

// Fix 2: Inject generatePresignedGet before crypto helpers in list.js
const listCryptoMarker = "// ── Crypto helpers (duplicated here — Pages Functions don't share modules) ────\nfunction toAmzDate(d) {";

if (!list.includes("async function generatePresignedGet(") && list.includes(listCryptoMarker)) {
  list = list.replace(listCryptoMarker, PRESIGNED_GET_FN + "\n" + listCryptoMarker);
  console.log("✅ list.js Fix 2 — injected generatePresignedGet function");
  listChanged++;
} else if (list.includes("async function generatePresignedGet(")) {
  console.log("ℹ️  list.js Fix 2 skipped — generatePresignedGet already exists");
} else {
  console.log("⚠️  list.js Fix 2 skipped — crypto marker not found");
}

if (listChanged > 0) {
  writeFileSync(LIST_PATH, list, "utf8");
  console.log(`   → Wrote ${listChanged} fix(es) to functions/api/list.js\n`);
} else {
  console.log("   → No changes to functions/api/list.js\n");
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = uploadChanged + listChanged;
if (total > 0) {
  console.log(`🎉 Done — ${total} total fix(es) applied.`);
  console.log(`
What changed:
  • Photos/videos are fetched via presigned GET URLs (expire after 24h)
  • Newly uploaded files get a presigned URL immediately so they display right away
  • Works with Private B2 buckets — no public access needed

Backblaze bucket setting:
  • Files in Bucket are: Private ✅

Cloudflare env vars — NO CHANGE needed:
  • B2_PHOTOx_ENDPOINT / B2_VIDEOx_ENDPOINT still point to real B2 S3 endpoint
  • No CDN vars needed for private bucket approach

Next steps:
  1. Commit and push:
       git add functions/api/upload.js functions/api/list.js
       git commit -m "Private bucket support: use presigned GET URLs for file access"
       git push
  2. Set your Backblaze buckets to Private
  3. Done!
  `);
} else {
  console.log("ℹ️  No changes written — files may already be patched.");
}
