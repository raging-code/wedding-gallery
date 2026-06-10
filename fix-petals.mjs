#!/usr/bin/env node
/**
 * fix-petals.mjs  (v3 — detects & repairs bad v2 injection)
 * ─────────────────────────────────────────────────────────────────
 * Fixes the "Babel decorator" compile error caused by the petal CSS
 * being injected BEFORE the opening backtick of LUXURY_CSS (v2 bug).
 *
 * What went wrong in v2:
 *   The regex used a non-greedy `[\s\S]*?` which matched the very
 *   FIRST backtick in the file (the opening quote of the template
 *   literal) instead of the closing one. The petal CSS landed outside
 *   the string, making Babel parse @keyframes as a JS decorator.
 *
 * This script:
 *   1. Detects that broken state and removes the misplaced CSS
 *   2. Re-injects the petal CSS INSIDE the template literal,
 *      right before the closing backtick
 *
 * Run from the project root:
 *   node fix-petals.mjs
 */

import fs   from 'fs';
import path from 'path';

const ROOT   = process.cwd();
const TARGET = path.join(ROOT, 'src', 'WeddingGallery.js');

const log  = (icon, msg) => console.log(`${icon}  ${msg}`);
const ok   = msg => log('✅', msg);
const skip = msg => log('⏭️ ', msg);
const fail = msg => { log('❌', msg); process.exit(1); };

if (!fs.existsSync(TARGET)) {
  fail('src/WeddingGallery.js not found — run this from the project root.');
}

let src = fs.readFileSync(TARGET, 'utf8');

// ── Petal CSS to inject ─────────────────────────────────────────
const PETAL_CSS = `
/* ── FLOATING PETALS ────────────────────────────────────────────── */
@keyframes petalFall {
  0%   { transform: translateY(-60px) translateX(0)              rotate(0deg); opacity: 0; }
  8%   { opacity: 0.85; }
  92%  { opacity: 0.55; }
  100% { transform: translateY(110vh) translateX(var(--petal-x)) rotate(var(--petal-r)); opacity: 0; }
}
@keyframes petalSway {
  0%, 100% { margin-left: 0; }
  50%       { margin-left: var(--petal-sway); }
}

.lux-petal {
  position: fixed;
  top: -60px;
  z-index: 0;
  pointer-events: none;
  width:  var(--petal-size);
  height: calc(var(--petal-size) * 1.2);
  animation:
    petalFall    var(--petal-dur)      linear      var(--petal-delay) infinite,
    petalSway    var(--petal-sway-dur) ease-in-out var(--petal-delay) infinite;
}
.lux-petal svg { width: 100%; height: 100%; display: block; }
`;

// ── STEP 1: Detect & repair bad v2 injection ────────────────────
// Bad state signature: "const LUXURY_CSS = " immediately followed
// by a newline + the petal comment (no backtick between = and CSS)
const BAD_INJECTION = /const LUXURY_CSS = [\r\n]+\/\* ── FLOATING PETALS[\s\S]*?\.lux-petal svg \{[^\}]+\}[\r\n]+`/;

if (BAD_INJECTION.test(src)) {
  log('🔧', 'Detected bad injection from previous run — reverting...');
  // Remove the displaced petal CSS and restore the opening backtick
  src = src.replace(BAD_INJECTION, 'const LUXURY_CSS = `');
  ok('Restored LUXURY_CSS opening backtick. File is clean again.');
}

// ── STEP 2: Check if petal CSS is already correctly inside ──────
if (src.includes('petalFall')) {
  skip('Petal CSS already present inside LUXURY_CSS — nothing to do.');
  process.exit(0);
}

// ── STEP 3: Inject before the closing backtick ──────────────────
// The closing backtick of LUXURY_CSS is the only backtick in the
// file that is followed by ONLY whitespace/newlines and then
// "const MOCK_PHOTOS". This is a unique, reliable anchor.
const CLOSE_ANCHOR = /(`)([\r\n\t ]+const MOCK_PHOTOS)/;

if (!CLOSE_ANCHOR.test(src)) {
  fail(
    'Could not locate the closing backtick of LUXURY_CSS.\n' +
    '  The file structure may have changed significantly.\n' +
    '  Please open src/WeddingGallery.js, find the closing backtick\n' +
    '  of the LUXURY_CSS template literal, and paste the .lux-petal\n' +
    '  CSS block directly before it.'
  );
}

// Insert PETAL_CSS inside the template literal, before the closing `
src = src.replace(CLOSE_ANCHOR, `${PETAL_CSS}$1$2`);
ok('Injected .lux-petal CSS inside LUXURY_CSS (before closing backtick).');

// ── Save ────────────────────────────────────────────────────────
fs.writeFileSync(TARGET, src, 'utf8');

console.log(
  '\n🎉  Done! Run `npm start` — the petal CSS is now correctly inside\n' +
  '    the template literal and the Babel error is gone.\n'
);
