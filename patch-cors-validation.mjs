/**
 * patch-cors-validation.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Wedding Gallery · setup-b2-cors.mjs — add ORIGIN validation
 *
 * WHY
 *   setup-b2-cors.mjs forwards whatever string you pass as ORIGIN straight to
 *   Backblaze. If you accidentally pass a B2 endpoint (e.g.
 *   s3.us-east-005.backblazeb2.com) instead of your site's origin, B2 only
 *   replies "an allowedOrigin doesn't look like an origin" — no hint at what's
 *   actually wrong, so it's easy to burn time re-running the same bad command.
 *
 * WHAT THIS PATCH DOES
 *   Adds a guard right after the existing arg check in setup-b2-cors.mjs that:
 *     1. Catches B2-endpoint-shaped values and tells you to use your site
 *        origin instead (the same value as SITE_ORIGIN in .env)
 *     2. Catches a missing scheme / stray path and shows the correct format
 *   Fails fast and exits BEFORE calling the B2 API if ORIGIN is wrong.
 *
 * USAGE
 *   node patch-cors-validation.mjs
 *
 * Run from the wedding-gallery project root (Windows / Git Bash, Node 18+).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TARGET = resolve('setup-b2-cors.mjs');

if (!existsSync(TARGET)) {
  console.error(`❌ Could not find ${TARGET}`);
  console.error('   Run this script from the wedding-gallery project root.');
  process.exit(1);
}

// Read + normalise to LF so matching works regardless of CRLF checkout
let src = readFileSync(TARGET, 'utf8').replace(/\r\n/g, '\n');

const oldStr =
`const [,, keyId, appKey, origin] = process.argv;

if (!keyId || !appKey || !origin) {
  console.error('Usage: node setup-b2-cors.mjs KEY_ID APP_KEY ORIGIN');
  process.exit(1);
}`;

const newStr =
`const [,, keyId, appKey, origin] = process.argv;

if (!keyId || !appKey || !origin) {
  console.error('Usage: node setup-b2-cors.mjs KEY_ID APP_KEY ORIGIN');
  console.error('Example: node setup-b2-cors.mjs "0055abc..." "K005abc..." "https://claudineandmarkgallery.pages.dev"');
  process.exit(1);
}

// Guard: ORIGIN must be the URL your gallery is served FROM (same value as
// SITE_ORIGIN in .env) — NOT a B2 storage endpoint (B2_*_ENDPOINT, e.g.
// s3.us-east-005.backblazeb2.com). Passing the endpoint by mistake is exactly
// what makes B2 reply "an allowedOrigin doesn't look like an origin".
if (/backblazeb2\\.com$/i.test(origin) || /^s3[.-]/i.test(origin)) {
  console.error(\`❌ "\${origin}" looks like a B2 storage endpoint, not a site origin.\`);
  console.error('   ORIGIN must be the URL your gallery is served from, e.g.');
  console.error('   https://claudineandmarkgallery.pages.dev — the same value as');
  console.error('   SITE_ORIGIN in your .env, not B2_PHOTO1_ENDPOINT.');
  process.exit(1);
}
if (!/^https?:\\/\\/[^/\\s]+$/.test(origin)) {
  console.error(\`❌ "\${origin}" doesn't look like a valid origin.\`);
  console.error('   It needs a scheme and no path, e.g. https://claudineandmarkgallery.pages.dev');
  process.exit(1);
}`;

if (!src.includes(oldStr)) {
  console.error('❌ Patch FAILED — target code not found in setup-b2-cors.mjs');
  console.error('   This usually means the file was already patched, or its');
  console.error('   content has changed since this patch was written.');
  process.exit(1);
}

src = src.replace(oldStr, newStr);
writeFileSync(TARGET, src, 'utf8');

console.log('✅ setup-b2-cors.mjs — added ORIGIN validation\n');
console.log('Next steps:');
console.log('  git add setup-b2-cors.mjs');
console.log('  git commit -m "Validate ORIGIN in setup-b2-cors.mjs to catch endpoint/origin mix-ups"');
console.log('  git push\n');
console.log('Then re-run with your real site origin, e.g.:');
console.log('  node setup-b2-cors.mjs "<KEY_ID>" "<APP_KEY>" "https://claudineandmarkgallery.pages.dev"');
