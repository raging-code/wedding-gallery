/**
 * patch-list-resilience.mjs
 *
 * WHY
 *   GET /api/list?type=photo has been returning a 502, while ?type=video
 *   works fine. The current code only catches the *outer* Promise.all — if
 *   either photo bucket throws (bad credentials, B2 permission error, a
 *   malformed item, etc.) the WHOLE request dies with a generic
 *   "Failed to list media" and you get zero visibility into which bucket
 *   or what error actually caused it.
 *
 * WHAT THIS PATCH DOES
 *   1. Wraps EACH bucket's listing in its own try/catch, so one broken
 *      bucket (e.g. CMPHOTO2) no longer takes down CMPHOTO1's results too.
 *      You get partial results instead of a hard failure.
 *   2. Turns silent B2 HTTP failures (403/401/etc, previously swallowed
 *      into an empty array with no trace) into a real error that includes
 *      B2's status code + error code (e.g. "SignatureDoesNotMatch",
 *      "AccessDenied") — this is the #1 fastest way to find a bad/mismatched
 *      key pair.
 *   3. Wraps each individual presigned-URL generation in try/catch too, so
 *      one oddly-named file can't crash an entire bucket's results.
 *   4. Surfaces any errors that occurred in a `_errors` field on the JSON
 *      response (visible right in the browser Network tab → Preview), so
 *      you don't need to dig through `wrangler pages deployment tail` or
 *      the dashboard's Real-time Logs to see what broke.
 *
 *   Net effect: the endpoint now returns 200 with whatever it COULD list,
 *   plus a clear reason for whatever it couldn't, instead of an opaque 502.
 *
 * USAGE
 *   node patch-list-resilience.mjs
 *
 * Run from the wedding-gallery project root (Windows / Git Bash / VS Code
 * terminal, Node 18+). Safe to re-run — it no-ops if already applied.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TARGET = resolve('functions/api/list.js');

if (!existsSync(TARGET)) {
  console.error(`❌ Could not find ${TARGET}`);
  console.error('   Run this script from the wedding-gallery project root.');
  process.exit(1);
}

// Normalise to LF so matching works regardless of CRLF checkout, restore on write
let src = readFileSync(TARGET, 'utf8');
const usesCRLF = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');

if (src.includes('_errors')) {
  console.log('✅ Already applied — functions/api/list.js already has resilience patch. Nothing to do.');
  process.exit(0);
}

let patched = src;
let count = 0;

// ── Patch 1: onRequestGet — per-bucket try/catch + surfaced errors ──────────
const oldRequestGet = `export async function onRequestGet(context) {
  const { request, env } = context;
  const url  = new URL(request.url);
  const type = url.searchParams.get('type') || 'photo';

  if (!['photo', 'video'].includes(type))
    return Response.json({ error: 'type must be photo or video' }, { status: 400 });

  const pool = type === 'photo' ? PHOTO_BUCKETS : VIDEO_BUCKETS;

  try {
    const results = await Promise.all(pool.map(slot => listBucket(slot, env, type)));
    const merged  = results.flat().sort((a, b) => b.uploaded - a.uploaded);
    return Response.json({ items: merged });
  } catch (err) {
    console.error('list error:', err);
    return Response.json({ error: 'Failed to list media' }, { status: 502 });
  }
}`;

const newRequestGet = `export async function onRequestGet(context) {
  const { request, env } = context;
  const url  = new URL(request.url);
  const type = url.searchParams.get('type') || 'photo';

  if (!['photo', 'video'].includes(type))
    return Response.json({ error: 'type must be photo or video' }, { status: 400 });

  const pool = type === 'photo' ? PHOTO_BUCKETS : VIDEO_BUCKETS;

  // Each bucket is isolated — a failure in one (bad creds, B2 permission
  // error, etc.) no longer takes down the other bucket's results.
  const errors = [];
  const results = await Promise.all(pool.map(async (slot) => {
    try {
      return await listBucket(slot, env, type);
    } catch (err) {
      console.error(\`list error [\${slot.bucketName}]:\`, err);
      errors.push(\`\${env[slot.bucketName] || slot.bucketName}: \${err.message || err}\`);
      return [];
    }
  }));

  const merged = results.flat().sort((a, b) => b.uploaded - a.uploaded);
  const body = { items: merged };
  // Visible right in the Network tab's Preview — remove once root cause is fixed.
  if (errors.length) body._errors = errors;
  return Response.json(body);
}`;

if (patched.includes(oldRequestGet)) {
  patched = patched.replace(oldRequestGet, newRequestGet);
  count++;
} else {
  console.error('❌ Could not find the expected onRequestGet block to patch (Patch 1).');
  console.error('   The file may have changed since this patch was written — no changes made.');
  process.exit(1);
}

// ── Patch 2: listBucket — turn silent B2 failures into real errors ─────────
const oldListBucket = `  if (!resp.ok) {
    console.error('B2 list failed', resp.status, await resp.text());
    return [];
  }`;

const newListBucket = `  if (!resp.ok) {
    const errText = await resp.text();
    const code = (errText.match(/<Code>([^<]+)<\\/Code>/) || [])[1] || resp.status;
    console.error('B2 list failed', resp.status, errText);
    throw new Error(\`B2 list failed (\${resp.status} \${code}) for bucket "\${bucketName}"\`);
  }`;

if (patched.includes(oldListBucket)) {
  patched = patched.replace(oldListBucket, newListBucket);
  count++;
} else {
  console.error('❌ Could not find the expected listBucket B2-failure block (Patch 2).');
  process.exit(1);
}

// ── Patch 3: per-item presign — one bad item can't crash the whole bucket ──
const oldPresignMap = `  // Generate presigned GET URLs for private bucket access (valid 24 hours)
  return Promise.all(rawItems.map(async item => ({
    ...item,
    url: await generatePresignedGet({ keyId, appKey, endpoint, bucketName, fileKey: item.key }),
  })));`;

const newPresignMap = `  // Generate presigned GET URLs for private bucket access (valid 24 hours)
  const signed = await Promise.all(rawItems.map(async item => {
    try {
      return { ...item, url: await generatePresignedGet({ keyId, appKey, endpoint, bucketName, fileKey: item.key }) };
    } catch (err) {
      console.error('presign error for', item.key, err);
      return null; // skip this one item rather than failing the whole bucket
    }
  }));
  return signed.filter(Boolean);`;

if (patched.includes(oldPresignMap)) {
  patched = patched.replace(oldPresignMap, newPresignMap);
  count++;
} else {
  console.error('❌ Could not find the expected presign-mapping block (Patch 3).');
  process.exit(1);
}

if (usesCRLF) patched = patched.replace(/\n/g, '\r\n');
writeFileSync(TARGET, patched, 'utf8');

console.log(`✅ Applied ${count}/3 patches to functions/api/list.js`);
console.log('');
console.log('Next steps:');
console.log('  git add functions/api/list.js');
console.log('  git commit -m "fix: isolate per-bucket list failures, surface real B2 errors"');
console.log('  git push');
console.log('');
console.log('After it deploys, reload the gallery and open DevTools → Network →');
console.log('list?type=photo → Preview. If anything is still broken you will now');
console.log('see a real reason in `_errors`, e.g. "403 SignatureDoesNotMatch" or');
console.log('"403 AccessDenied" — instead of a blind 502.');
