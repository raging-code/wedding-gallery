#!/usr/bin/env node
/**
 * fix-premium-paths.mjs
 * ─────────────────────────────────────────────────────────────────
 * Fixes the "Uncaught SyntaxError: Unexpected token '<'" error in
 * wedding-gallery by moving css/ and js/ inside public/ where
 * Create React App's dev server can actually serve them.
 *
 * Run from the project root:
 *   node fix-premium-paths.mjs
 */

import fs   from 'fs';
import path from 'path';

const ROOT       = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const INDEX_HTML = path.join(PUBLIC_DIR, 'index.html');

// ── Helpers ────────────────────────────────────────────────────────
function log(icon, msg) { console.log(`${icon}  ${msg}`); }
function ok(msg)        { log('✅', msg); }
function skip(msg)      { log('⏭️ ', msg); }
function fail(msg)      { log('❌', msg); process.exit(1); }

function moveFolder(src, dest) {
  if (!fs.existsSync(src)) {
    skip(`Source not found, skipping: ${path.relative(ROOT, src)}`);
    return false;
  }
  if (fs.existsSync(dest)) {
    skip(`Destination already exists, skipping: ${path.relative(ROOT, dest)}`);
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  ok(`Moved  ${path.relative(ROOT, src)}  →  ${path.relative(ROOT, dest)}`);
  return true;
}

// ── 1. Move css/ → public/css/ ────────────────────────────────────
moveFolder(
  path.join(ROOT, 'css'),
  path.join(PUBLIC_DIR, 'css')
);

// ── 2. Move js/ → public/js/ ──────────────────────────────────────
moveFolder(
  path.join(ROOT, 'js'),
  path.join(PUBLIC_DIR, 'js')
);

// ── 3. Patch index.html references ────────────────────────────────
if (!fs.existsSync(INDEX_HTML)) {
  fail(`public/index.html not found — are you running from the project root?`);
}

let html = fs.readFileSync(INDEX_HTML, 'utf8');
let changed = false;

const replacements = [
  // CSS — any relative path pointing to premium.css
  {
    pattern: /href=["'](?:\.\.\/)*css\/premium\.css["']/g,
    replacement: 'href="%PUBLIC_URL%/css/premium.css"',
    label: 'CSS href',
  },
  // JS — any relative path pointing to premium.js
  {
    pattern: /src=["'](?:\.\.\/)*js\/premium\.js["']/g,
    replacement: 'src="%PUBLIC_URL%/js/premium.js"',
    label: 'JS src',
  },
];

for (const { pattern, replacement, label } of replacements) {
  if (pattern.test(html)) {
    html = html.replace(pattern, replacement);
    changed = true;
    ok(`Patched ${label} in public/index.html`);
  } else {
    // Check if the correct value is already there
    const correct = replacement;
    if (html.includes(correct)) {
      skip(`${label} already correct in public/index.html`);
    } else {
      skip(`${label} pattern not found in public/index.html — check manually`);
    }
  }
}

if (changed) {
  fs.writeFileSync(INDEX_HTML, html, 'utf8');
  ok('Saved public/index.html');
}

// ── Done ───────────────────────────────────────────────────────────
console.log('\n🎉  Done! Run `npm start` and the error should be gone.\n');
