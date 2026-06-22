/**
 * patch-debug-env-check.mjs
 *
 * WHY
 *   The upload response showed an X-Amz-Credential value containing
 *   wrangler's own `--help` text instead of an actual B2 Key ID — meaning
 *   at least one Cloudflare Pages secret got corrupted while being set
 *   (most likely a PowerShell stdin/pipe mixup from batch-pasting many
 *   `echo "x" | wrangler pages secret put ...` commands at once).
 *
 *   Secrets are write-only — `wrangler pages secret list` only shows
 *   names, never values — so there is no way to inspect them except from
 *   inside a live Function. This patch adds exactly that, temporarily.
 *
 * WHAT THIS PATCH DOES
 *   Creates functions/api/debug-env.js — a GET endpoint that reports, for
 *   each of the 16 B2_* secrets: its length, and a masked snippet (first 3
 *   + last 3 characters). A real Key ID is ~25 chars; a real App Key is
 *   ~31 chars; an endpoint/bucket name is short and readable. Anything
 *   wildly longer (100+ chars) or starting with control characters is the
 *   corrupted one.
 *
 *   This NEVER prints full secret values — only enough to tell "looks
 *   right" from "looks corrupted" at a glance.
 *
 * USAGE
 *   node patch-debug-env-check.mjs
 *   git add functions/api/debug-env.js
 *   git commit -m "chore: temp env diagnostic endpoint"
 *   git push
 *
 *   Then visit:  https://claudineandmarkgallery.pages.dev/api/debug-env
 *   Paste the JSON output back so we can see which var(s) are corrupted.
 *
 *   IMPORTANT: delete functions/api/debug-env.js once you're done — don't
 *   leave a secrets-introspection endpoint live on a public site.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const TARGET = 'functions/api/debug-env.js';

if (existsSync(TARGET)) {
  console.log(`✅ Already exists — ${TARGET} is already in place. Nothing to do.`);
  console.log('   (Delete it manually once you are done diagnosing.)');
  process.exit(0);
}

const VARS = [
  'B2_PHOTO1_KEY_ID', 'B2_PHOTO1_APP_KEY', 'B2_PHOTO1_BUCKET_NAME', 'B2_PHOTO1_ENDPOINT',
  'B2_PHOTO2_KEY_ID', 'B2_PHOTO2_APP_KEY', 'B2_PHOTO2_BUCKET_NAME', 'B2_PHOTO2_ENDPOINT',
  'B2_VIDEO1_KEY_ID', 'B2_VIDEO1_APP_KEY', 'B2_VIDEO1_BUCKET_NAME', 'B2_VIDEO1_ENDPOINT',
  'B2_VIDEO2_KEY_ID', 'B2_VIDEO2_APP_KEY', 'B2_VIDEO2_BUCKET_NAME', 'B2_VIDEO2_ENDPOINT',
];

const content = `/**
 * TEMPORARY DIAGNOSTIC — GET /api/debug-env
 * Reports length + masked snippet of each B2 secret so corruption (e.g. a
 * stray CLI help string) is visible without ever exposing the real value.
 * DELETE THIS FILE once you've confirmed all secrets look correct.
 */

const VARS = ${JSON.stringify(VARS, null, 2)};

export async function onRequestGet(context) {
  const { env } = context;
  const report = {};

  for (const name of VARS) {
    const val = env[name];
    if (val === undefined || val === null) {
      report[name] = { status: 'MISSING' };
      continue;
    }
    const str = String(val);
    // Flag obviously-wrong control characters (e.g. \\r\\n from a CLI help dump)
    const hasControlChars = /[\\r\\n\\t]/.test(str);
    const snippet = str.length <= 8
      ? str.slice(0, 2) + '***'
      : str.slice(0, 3) + '...' + str.slice(-3);

    report[name] = {
      length: str.length,
      snippet,
      looksSuspicious: hasControlChars || str.length > 60,
    };
  }

  return Response.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
`;

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, content, 'utf8');

console.log(`✅ Created ${TARGET}`);
console.log('');
console.log('Next steps:');
console.log('  git add functions/api/debug-env.js');
console.log('  git commit -m "chore: temp env diagnostic endpoint"');
console.log('  git push');
console.log('');
console.log('Then visit https://claudineandmarkgallery.pages.dev/api/debug-env');
console.log('and paste the JSON back. Look for "looksSuspicious": true or any');
console.log('length far bigger than ~30 — that is the corrupted secret.');
