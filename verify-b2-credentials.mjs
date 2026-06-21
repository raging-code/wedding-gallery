/**
 * verify-b2-credentials.mjs
 *
 * Tests a B2 key pair using the EXACT same signing logic as your Cloudflare Workers.
 * Run this locally with a fresh key pair BEFORE updating Cloudflare env vars.
 *
 * Usage:
 *   node verify-b2-credentials.mjs "<KEY_ID>" "<APP_KEY>" "CMPHOTO1" "s3.us-east-005.backblazeb2.com"
 */

import { createHash, createHmac } from 'node:crypto';
import https from 'node:https';
import { URL } from 'node:url';

const [,, keyId, appKey, bucketName, endpoint] = process.argv;

if (!keyId || !appKey || !bucketName || !endpoint) {
  console.error('Usage: node verify-b2-credentials.mjs "<KEY_ID>" "<APP_KEY>" "<BUCKET_NAME>" "<ENDPOINT>"');
  console.error('Example: node verify-b2-credentials.mjs "0055abc..." "K005abc..." "CMPHOTO1" "s3.us-east-005.backblazeb2.com"');
  process.exit(1);
}

// ── Crypto helpers (identical to functions/api/list.js) ──────────────────────
function toAmzDate(d) {
  return d.toISOString().replace(/[:-]/g, '').replace(/\.\d+/, '');
}
function sha256hex(msg) {
  return createHash('sha256').update(msg, 'utf8').digest('hex');
}
function hmacBuf(key, msg) {
  const k = typeof key === 'string' ? Buffer.from(key, 'utf8') : Buffer.from(key);
  return createHmac('sha256', k).update(msg, 'utf8').digest();
}
function hmacHex(key, msg) {
  return hmacBuf(key, msg).toString('hex');
}
function deriveSigningKey(secret, date, region, service) {
  const kDate    = hmacBuf('AWS4' + secret, date);
  const kRegion  = hmacBuf(kDate,   region);
  const kService = hmacBuf(kRegion, service);
  return hmacBuf(kService, 'aws4_request');
}

function httpsGet(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'Host': parsed.hostname, ...extraHeaders },
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Test 1: Header-based auth listing (same as listBucket in list.js) ────────
async function testHeaderAuth() {
  const region    = endpoint.split('.')[1];
  const service   = 's3';
  const host      = endpoint;
  const now       = new Date();
  const amzDate   = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const queryParams = new URLSearchParams({ 'list-type': '2', 'prefix': 'photos/', 'max-keys': '5' });
  queryParams.sort();

  const canonicalUri     = `/${bucketName}/`;
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders    = 'host;x-amz-date';
  const payloadHash      = sha256hex('');
  const canonicalRequest = [
    'GET', canonicalUri, queryParams.toString(),
    canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const strToSign = [
    'AWS4-HMAC-SHA256', amzDate, credScope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const sigKey = deriveSigningKey(appKey, dateStamp, region, service);
  const sigHex = hmacHex(sigKey, strToSign);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${keyId}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sigHex}`;
  const fetchUrl = `https://${host}${canonicalUri}?${queryParams}`;

  const res = await httpsGet(fetchUrl, {
    'x-amz-date':    amzDate,
    'Authorization': authHeader,
  });

  if (res.status === 200) {
    const count = (res.body.match(/<Key>/g) || []).length;
    console.log(`  ✅ Header-based auth (list) — ${res.status} OK, found ${count} object(s)`);
    return true;
  } else {
    const errCode = res.body.match(/<Code>([^<]+)<\/Code>/)?.[1] || 'Unknown';
    console.log(`  ❌ Header-based auth (list) — ${res.status} ${errCode}`);
    if (errCode === 'SignatureDoesNotMatch') {
      console.log('     → The APP_KEY secret does not match the KEY_ID. These must be from the same B2 key pair.');
    } else if (errCode === 'InvalidAccessKeyId') {
      console.log('     → The KEY_ID was not found. Check for typos or that the key has not been deleted.');
    } else if (errCode === 'AccessDenied') {
      console.log('     → Key exists but lacks permission to list this bucket.');
    }
    return false;
  }
}

// ── Test 2: Presigned GET (same as generatePresignedGet in upload.js) ─────────
async function testPresignedGet(fileKey) {
  const region     = endpoint.split('.')[1];
  const service    = 's3';
  const host       = endpoint;
  const now        = new Date();
  const amzDate    = toAmzDate(now);
  const dateStamp  = amzDate.slice(0, 8);
  const credScope  = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = 'host';
  const canonicalUri  = `/${bucketName}/${encodeURIComponent(fileKey).replace(/%2F/g, '/')}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':    `${keyId}/${credScope}`,
    'X-Amz-Date':          amzDate,
    'X-Amz-Expires':       '3600',
    'X-Amz-SignedHeaders': signedHeaders,
  });
  queryParams.sort();

  const canonicalRequest = [
    'GET', canonicalUri, queryParams.toString(),
    `host:${host}\n`, signedHeaders, 'UNSIGNED-PAYLOAD',
  ].join('\n');

  const strToSign = [
    'AWS4-HMAC-SHA256', amzDate, credScope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const sigKey = deriveSigningKey(appKey, dateStamp, region, service);
  queryParams.set('X-Amz-Signature', hmacHex(sigKey, strToSign));

  const url = `https://${host}${canonicalUri}?${queryParams.toString()}`;
  const res = await httpsGet(url);

  if (res.status === 200) {
    const bytes = Buffer.byteLength(res.body);
    console.log(`  ✅ Presigned GET — ${res.status} OK (${bytes} bytes returned)`);
    return true;
  } else if (res.status === 404) {
    // 404 means auth worked, file just doesn't exist — that's fine
    console.log(`  ✅ Presigned GET — auth valid (404 NoSuchKey expected, file doesn't exist)`);
    return true;
  } else {
    const errCode = res.body.match(/<Code>([^<]+)<\/Code>/)?.[1] || 'Unknown';
    console.log(`  ❌ Presigned GET — ${res.status} ${errCode}`);
    if (errCode === 'SignatureDoesNotMatch') {
      console.log('     → Same credentials failed presigned-URL auth. KEY_ID and APP_KEY must be a fresh, matched pair.');
    }
    return false;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n🔍 Verifying B2 credentials for bucket: ${bucketName}`);
console.log(`   Key ID  : ${keyId}`);
console.log(`   Endpoint: ${endpoint}`);
console.log(`   App Key : ${'*'.repeat(Math.max(0, appKey.length - 4))}${appKey.slice(-4)}\n`);

let listResult;
try {
  listResult = await testHeaderAuth();
} catch (e) {
  console.log(`  ❌ Header-based auth — network error: ${e.message}`);
  listResult = false;
}

// Pick a test key to use for presigned GET test
let testFileKey = 'test-credential-check.txt';  // fake key — 404 = auth success
if (listResult) {
  // If listing worked, optionally use a real key for a more thorough test
  // (still passes on 404 — we're just checking auth, not file existence)
}

let getResult;
try {
  getResult = await testPresignedGet(testFileKey);
} catch (e) {
  console.log(`  ❌ Presigned GET — network error: ${e.message}`);
  getResult = false;
}

console.log('');
if (listResult && getResult) {
  console.log('✅ Both auth methods work. These credentials are ready for Cloudflare.\n');
  console.log('Set these in Cloudflare Pages → Settings → Environment Variables:');
  console.log(`  B2_PHOTO1_KEY_ID     = ${keyId}`);
  console.log(`  B2_PHOTO1_APP_KEY    = ${appKey}`);
  console.log(`  B2_PHOTO1_BUCKET_NAME= ${bucketName}`);
  console.log(`  B2_PHOTO1_ENDPOINT   = ${endpoint}`);
  console.log(`  B2_PHOTO2_KEY_ID     = ${keyId}   (same — you only have 1 bucket)`);
  console.log(`  B2_PHOTO2_APP_KEY    = ${appKey}   (same)`);
  console.log(`  B2_PHOTO2_BUCKET_NAME= ${bucketName}   (same)`);
  console.log(`  B2_PHOTO2_ENDPOINT   = ${endpoint}   (same)`);
  console.log('\nAfter saving: git commit --allow-empty -m "rotate B2 key" && git push\n');
} else {
  console.log('❌ One or more checks failed. Do NOT deploy these credentials.\n');
  console.log('Fix: create a fresh application key in the Backblaze dashboard:');
  console.log('  App Keys → Add a New Application Key → scope to ' + bucketName);
  console.log('  Copy both the keyID and applicationKey immediately (shown once)');
  console.log('  Re-run this script with the new pair\n');
}
