/**
 * patch-bugfix-v1.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Wedding Gallery · Bug-fix patch (no functionality/feature changes)
 *
 * WHAT THIS FIXES
 *
 *  1. [CRITICAL] Comments & reactions are completely broken.
 *     b2List()/mediaKeyFromItem() in src/WeddingGallery.js send the bare
 *     filename (e.g. "1716000000000_g_Q2FybG8.jpg") as `mediaKey` to
 *     /api/comments and /api/reactions. isValidMediaKey() in those two
 *     Functions requires the key to start with "photos/" or "videos/" —
 *     a prefix that is never present in what the frontend actually sends.
 *     Every GET/POST to comments or reactions has been returning
 *     400 "Invalid mediaKey" since the security-hardening patch added that
 *     check without updating the frontend's key shape to match.
 *     FIX: widen isValidMediaKey() in comments.js and reactions.js to also
 *     accept the bare "<digits>_<sanitized-name>.<ext>" shape that is
 *     actually used today, while keeping every existing protection
 *     (length cap, no path traversal, no shell-special chars). The old
 *     "photos/"/"videos/" prefix form is still accepted too, so nothing
 *     that worked before stops working.
 *
 *  2. [HIGH] functions/_middleware.js hijacks ALL /api/* CORS handling.
 *     It intercepts every OPTIONS preflight and answers it directly —
 *     comments.js / reactions.js's own onRequestOptions() (which correctly
 *     reflects *.pages.dev preview origins) never even runs. It then also
 *     overwrites every response's Access-Control-Allow-Origin afterward
 *     using a single-origin allow-list (env.SITE_ORIGIN, falling back to
 *     http://localhost:3000 if that var isn't set on the Pages project).
 *     This silently stomps the correct per-route CORS logic and is a likely
 *     cause of CORS/403 failures on preview deployments or whenever
 *     SITE_ORIGIN is missing.
 *     FIX: middleware now only fills in CORS headers when a route did NOT
 *     already set its own Access-Control-Allow-Origin, and no longer
 *     short-circuits OPTIONS — it lets each Function's own
 *     onRequestOptions() run via next() first.
 *
 *  3. [MEDIUM] functions/api/list.js has no per-bucket fault isolation.
 *     One bucket failing (bad creds, B2 permission error, transient 5xx)
 *     currently 502s the ENTIRE /api/list response for that media type,
 *     and B2 HTTP errors were silently swallowed into an empty array with
 *     no diagnostic info anywhere.
 *     FIX: each bucket's listing is now isolated in its own try/catch so
 *     one broken bucket no longer takes down the other bucket's results.
 *     B2 HTTP failures now throw with the real status + <Code> from B2's
 *     XML error body, and any per-bucket errors are surfaced in a
 *     non-fatal `_errors` field on the JSON response (visible in
 *     DevTools → Network → list?type=... → Preview) instead of vanishing.
 *
 *  4. [LOW] Two backup files are committed to git despite being covered by
 *     .gitignore rules added later (.gitignore only blocks NEW matches —
 *     it can't retroactively untrack files already in the index):
 *       - public/__backup_v3__/index.html
 *       - src/WeddingGallery.js.bak_before_swipe_perf
 *     FIX: `git rm --cached` both (working-tree copies are left alone).
 *
 * WHAT THIS DOES NOT CHANGE
 *   No UI, no styling, no app behavior, no upload/compression/Reels logic.
 *   Allowed origins, rate limits, validation rules (other than the mediaKey
 *   prefix widening above) are all unchanged.
 *
 * USAGE (run from the wedding-gallery project root, VS Code terminal on
 * Windows — PowerShell or Git Bash, Node 18+):
 *   node patch-bugfix-v1.mjs
 *
 * Safe to re-run — every change is idempotent (checks before patching).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve('.');
const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✘\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const SKIP = '\x1b[90m–\x1b[0m';

let patchCount = 0;
let skipCount  = 0;
let failCount  = 0;

function p(file) { return resolve(ROOT, file); }

function readNormalized(file) {
  const full = p(file);
  if (!existsSync(full)) {
    console.error(`${FAIL}  File not found: ${file}`);
    failCount++;
    return null;
  }
  const raw = readFileSync(full, 'utf8');
  const usesCRLF = raw.includes('\r\n');
  return { raw, usesCRLF, normalized: raw.replace(/\r\n/g, '\n') };
}

function writeNormalized(file, content, usesCRLF) {
  const out = usesCRLF ? content.replace(/\n/g, '\r\n') : content;
  writeFileSync(p(file), out, 'utf8');
  console.log(`${PASS}  Written: ${file}`);
  patchCount++;
}

/**
 * Replace exactly one occurrence of `from` with `to` inside `content`.
 * Returns the new content, or null (with a log line) if `from` wasn't found.
 */
function applyOne(content, from, to, label) {
  if (!content.includes(from)) return null;
  const idx = content.indexOf(from);
  const rest = content.slice(idx + from.length);
  if (rest.includes(from)) {
    console.error(`${FAIL}  "${label}" matched more than once — refusing to guess, no changes made.`);
    failCount++;
    return null;
  }
  return content.slice(0, idx) + to + rest;
}

function patchFile(file, steps) {
  const loaded = readNormalized(file);
  if (!loaded) return;
  let { normalized, usesCRLF } = loaded;
  let fileChanged = false;

  for (const step of steps) {
    const result = applyOne(normalized, step.from, step.to, step.label);
    if (result === null) {
      if (normalized.includes(step.alreadyAppliedMarker || '\u0000__never__')) {
        console.log(`${SKIP}  ${file} — already applied: ${step.label}`);
        skipCount++;
      } else {
        console.log(`${SKIP}  ${file} — pattern not found (already patched or different version): ${step.label}`);
        skipCount++;
      }
      continue;
    }
    normalized = result;
    fileChanged = true;
    console.log(`    └─ ${step.label}`);
  }

  if (fileChanged) {
    writeNormalized(file, normalized, usesCRLF);
  } else {
    console.log(`${INFO}  ${file} — no changes needed.`);
  }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Wedding Gallery — Bug-fix patch v1');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// ─────────────────────────────────────────────────────────────────────────
// FIX 1 — isValidMediaKey: accept the bare filename shape actually sent
// ─────────────────────────────────────────────────────────────────────────
console.log(`${INFO}  Fix 1/4 — widen isValidMediaKey() (comments.js + reactions.js)`);

const OLD_VALIDATOR = `function isValidMediaKey(key) {
  if (typeof key !== 'string') return false;
  if (key.length === 0 || key.length > 512) return false;
  // Must start with photos/ or videos/ (the only valid prefixes used by upload.js)
  const validPrefix = key.startsWith('photos/') || key.startsWith('videos/');
  if (!validPrefix) return false;
  // No path traversal, null bytes, or shell-special chars
  if (key.includes('..') || key.includes('\\x00') || /[<>"'\\\\]/.test(key)) return false;
  return true;
}`;

const NEW_VALIDATOR = `function isValidMediaKey(key) {
  if (typeof key !== 'string') return false;
  if (key.length === 0 || key.length > 512) return false;
  // The frontend (b2List/mediaKeyFromItem in WeddingGallery.js) sends the
  // bare filename portion of the B2 object key, e.g.
  // "1716000000000_g_Q2FybG8.jpg" — NOT the full "photos/<name>" key.
  // Accept either that bare shape or the full prefixed key, so this stays
  // compatible with any caller that does pass the prefix.
  const hasPathPrefix  = key.startsWith('photos/') || key.startsWith('videos/');
  const bareFilenameRe = /^\\d+_[A-Za-z0-9._-]+\\.[A-Za-z0-9]+$/;
  if (!hasPathPrefix && !bareFilenameRe.test(key)) return false;
  // No path traversal, null bytes, or shell-special chars
  if (key.includes('..') || key.includes('\\x00') || /[<>"'\\\\]/.test(key)) return false;
  return true;
}`;

for (const file of ['functions/api/comments.js', 'functions/api/reactions.js']) {
  patchFile(file, [
    {
      label: 'isValidMediaKey() now accepts the bare filename shape the frontend actually sends',
      from: OLD_VALIDATOR,
      to: NEW_VALIDATOR,
      alreadyAppliedMarker: 'bareFilenameRe',
    },
  ]);
}

// ─────────────────────────────────────────────────────────────────────────
// FIX 2 — _middleware.js: stop hijacking per-route CORS / OPTIONS
// ─────────────────────────────────────────────────────────────────────────
console.log('');
console.log(`${INFO}  Fix 2/4 — stop _middleware.js from overriding per-route CORS`);

const OLD_MIDDLEWARE = `export async function onRequest(context) {
  const { request, next, env } = context;
  const origin = request.headers.get('Origin') || '';

  // Allow the deployed Pages domain AND localhost for dev
  const allowed = [
    env.SITE_ORIGIN || '',          // e.g. https://your-project.pages.dev
    'http://localhost:3000',
    'http://localhost:8788',         // wrangler pages dev default
  ].filter(Boolean);

  const corsOrigin = allowed.includes(origin) ? origin : allowed[0];

  // Handle pre-flight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(corsOrigin),
    });
  }

  const response = await next();
  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(corsOrigin))) {
    newHeaders.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}`;

const NEW_MIDDLEWARE = `export async function onRequest(context) {
  const { request, next, env } = context;

  // Let the route run first. Several Functions (comments.js, reactions.js,
  // upload.js, list.js, media.js) compute their OWN Access-Control-Allow-Origin
  // — including reflecting *.pages.dev preview-deployment origins, which a
  // single-origin allow-list here can't represent. This middleware now only
  // fills in CORS headers as a FALLBACK for routes that didn't already set
  // their own, instead of unconditionally overwriting them. It also no
  // longer intercepts OPTIONS itself, so each route's own onRequestOptions()
  // (when present) still runs.
  const response = await next();

  if (response.headers.has('Access-Control-Allow-Origin')) {
    return response; // route already handled CORS correctly — leave it alone
  }

  const origin = request.headers.get('Origin') || '';

  // Fallback allow-list, only used for routes with no CORS logic of their own.
  const allowed = [
    env.SITE_ORIGIN || '',          // e.g. https://your-project.pages.dev
    'http://localhost:3000',
    'http://localhost:8788',         // wrangler pages dev default
  ].filter(Boolean);

  const corsOrigin = allowed.includes(origin) ? origin : allowed[0];

  // Handle pre-flight for routes with no onRequestOptions of their own.
  if (request.method === 'OPTIONS' && response.status === 204) {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(corsOrigin),
    });
  }

  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(corsOrigin))) {
    newHeaders.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}`;

patchFile('functions/_middleware.js', [
  {
    label: 'middleware now defers to each route\'s own CORS handling instead of overwriting it',
    from: OLD_MIDDLEWARE,
    to: NEW_MIDDLEWARE,
    alreadyAppliedMarker: 'route already handled CORS correctly',
  },
]);

// ─────────────────────────────────────────────────────────────────────────
// FIX 3 — list.js: per-bucket fault isolation + surfaced B2 errors
// ─────────────────────────────────────────────────────────────────────────
console.log('');
console.log(`${INFO}  Fix 3/4 — isolate per-bucket failures in list.js`);

const OLD_ON_REQUEST_GET = `  const pool = type === 'photo' ? PHOTO_BUCKETS : VIDEO_BUCKETS;

  try {
    const results = await Promise.all(pool.map((slot, idx) => listBucket(slot, env, type, idx)));
    const merged  = results.flat().sort((a, b) => b.uploaded - a.uploaded);
    return Response.json({ items: merged });
  } catch (err) {
    console.error('list error:', err);
    return Response.json({ error: 'Failed to list media' }, { status: 502 });
  }
}`;

const NEW_ON_REQUEST_GET = `  const pool = type === 'photo' ? PHOTO_BUCKETS : VIDEO_BUCKETS;

  // Each bucket is isolated — a failure in one (bad creds, B2 permission
  // error, transient 5xx, etc.) no longer takes down the other bucket's
  // results for this media type.
  const errors = [];
  const results = await Promise.all(pool.map(async (slot, idx) => {
    try {
      return await listBucket(slot, env, type, idx);
    } catch (err) {
      console.error(\`list error [\${slot.bucketName}]:\`, err);
      errors.push(\`\${env[slot.bucketName] || slot.bucketName}: \${err.message || err}\`);
      return [];
    }
  }));

  const merged = results.flat().sort((a, b) => b.uploaded - a.uploaded);
  const body = { items: merged };
  // Visible right in DevTools → Network → list?type=... → Preview.
  if (errors.length) body._errors = errors;
  return Response.json(body);
}`;

const OLD_RESP_NOT_OK = `  if (!resp.ok) {
    console.error('B2 list failed', resp.status, await resp.text());
    return [];
  }`;

const NEW_RESP_NOT_OK = `  if (!resp.ok) {
    const errText = await resp.text();
    const code = (errText.match(/<Code>([^<]+)<\\/Code>/) || [])[1] || resp.status;
    console.error('B2 list failed', resp.status, errText);
    throw new Error(\`B2 list failed (\${resp.status} \${code}) for bucket "\${bucketName}"\`);
  }`;

patchFile('functions/api/list.js', [
  {
    label: 'onRequestGet — per-bucket try/catch, surfaced _errors instead of a hard 502',
    from: OLD_ON_REQUEST_GET,
    to: NEW_ON_REQUEST_GET,
    alreadyAppliedMarker: 'Each bucket is isolated',
  },
  {
    label: 'listBucket — B2 HTTP failures now throw (status + B2 error code) instead of vanishing into []',
    from: OLD_RESP_NOT_OK,
    to: NEW_RESP_NOT_OK,
    alreadyAppliedMarker: 'B2 list failed (',
  },
]);

// ─────────────────────────────────────────────────────────────────────────
// FIX 4 — untrack committed backup files
// ─────────────────────────────────────────────────────────────────────────
console.log('');
console.log(`${INFO}  Fix 4/4 — untrack backup files covered by .gitignore`);

const BACKUP_FILES = [
  'public/__backup_v3__/index.html',
  'src/WeddingGallery.js.bak_before_swipe_perf',
];

function isTracked(file) {
  try {
    execSync(`git ls-files --error-unmatch "${file}"`, { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

let isGitRepo = true;
try {
  execSync('git rev-parse --is-inside-work-tree', { cwd: ROOT, stdio: 'ignore' });
} catch {
  isGitRepo = false;
}

if (!isGitRepo) {
  console.log(`${WARN}  Not a git repository (or git not on PATH) — skipping backup-file untracking.`);
  console.log(`${WARN}  You can do this manually later:`);
  for (const f of BACKUP_FILES) console.log(`${WARN}    git rm --cached "${f}"`);
  skipCount += BACKUP_FILES.length;
} else {
  for (const file of BACKUP_FILES) {
    if (!existsSync(p(file))) {
      console.log(`${SKIP}  ${file} — file does not exist, nothing to untrack.`);
      skipCount++;
      continue;
    }
    if (!isTracked(file)) {
      console.log(`${SKIP}  ${file} — already untracked.`);
      skipCount++;
      continue;
    }
    try {
      execSync(`git rm --cached "${file}"`, { cwd: ROOT, stdio: 'pipe' });
      console.log(`${PASS}  Untracked (kept on disk): ${file}`);
      patchCount++;
    } catch (err) {
      console.error(`${FAIL}  Failed to untrack ${file}: ${err.message}`);
      failCount++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Done — ${patchCount} change(s) applied, ${skipCount} skipped, ${failCount} failed.`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

if (failCount > 0) {
  console.log(`${WARN}  Some patches could not be applied — see ✘ lines above.`);
  console.log(`${WARN}  This usually means a file has already diverged from what this`);
  console.log(`${WARN}  script expects. No partial/corrupt changes were written for those steps.`);
}

console.log('Next steps:');
console.log('  git status');
console.log('  git add -A');
console.log('  git commit -m "fix: mediaKey validation, CORS middleware override, list.js bucket isolation"');
console.log('  git push');
console.log('');
console.log('After it deploys:');
console.log('  - Comments and reactions should work again (no more "Invalid mediaKey").');
console.log('  - If /api/list still has trouble, check the JSON response\'s "_errors"');
console.log('    field in DevTools → Network for the real B2 status + error code.');
console.log('');
