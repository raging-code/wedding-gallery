/**
 * fix-lockfile-sync.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Wedding Gallery · fix "npm ci" lockfile-out-of-sync build failure
 *
 * WHY
 *   Cloudflare Pages runs `npm ci` during build, which requires package.json
 *   and package-lock.json to be perfectly in sync. Right now they aren't —
 *   the lockfile is missing yaml@2.9.0, a transitive dependency that your
 *   current package.json now resolves to. This isn't related to your B2/CORS
 *   work; it's just a stale lockfile.
 *
 * WHAT THIS SCRIPT DOES
 *   1. Runs `npm install` to regenerate package-lock.json so it matches
 *      package.json exactly (also refreshes node_modules locally).
 *   2. Runs `npm ci` to verify the fix actually satisfies what Cloudflare's
 *      build step will do — fails loudly if it doesn't.
 *
 * USAGE
 *   node fix-lockfile-sync.mjs
 *
 * Run from the wedding-gallery project root (Windows / Git Bash, Node 18+).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('.');

if (!existsSync(resolve(ROOT, 'package.json'))) {
  console.error('❌ No package.json found here.');
  console.error('   Run this script from the wedding-gallery project root.');
  process.exit(1);
}

function run(cmd) {
  console.log(`\n$ ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

try {
  console.log('🔧 Step 1/2 — Regenerating package-lock.json with `npm install`...');
  run('npm install');
} catch {
  console.error('\n❌ `npm install` failed. Scroll up for the real npm error and fix that first.');
  process.exit(1);
}

try {
  console.log('\n🔍 Step 2/2 — Verifying with `npm ci` (this is what Cloudflare runs)...');
  run('npm ci');
} catch {
  console.error('\n❌ `npm ci` still fails after `npm install`. Lockfile is not fully in sync yet.');
  console.error('   Paste the error above back to Claude for a follow-up fix.');
  process.exit(1);
}

console.log('\n✅ Lockfile is in sync — `npm ci` passes locally, same as Cloudflare will run.\n');
console.log('Next steps:');
console.log('  git add package-lock.json');
console.log('  git commit -m "Sync package-lock.json with package.json"');
console.log('  git push\n');
console.log('That push will trigger a new Cloudflare Pages build, which should now succeed.\n');
