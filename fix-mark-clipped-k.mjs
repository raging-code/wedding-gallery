/**
 * fix-mark-clipped-k.mjs
 *
 * WHY: The "k" in "Mark" is cropped because .lux-name:last-child has no
 * padding-right. The pressReveal animation ends with clip-path: inset(0 0 0% 0),
 * which clips to the element's exact border box. Italic Cormorant Infant at
 * ~132px has a pronounced rightward lean — the "k" stroke physically overhangs
 * the measured text width and gets hard-clipped.
 *
 * FIX: Add padding-right to .lux-name:last-child so the italic glyph overhang
 * sits inside the element box (and therefore inside the clip region).
 *
 * Usage: node fix-mark-clipped-k.mjs
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const FILE = resolve('src/WeddingGallery.js');

// ── backup ─────────────────────────────────────────────────────────────────
const backup = FILE + '.bak-fix-k-' + Date.now();
copyFileSync(FILE, backup);
console.log(`✔ Backup → ${backup}`);

// ── read & normalize CRLF → LF (safe on Windows git checkouts) ────────────
const raw = readFileSync(FILE, 'utf8');
const crlf = raw.includes('\r\n');
const src_norm = crlf ? raw.replace(/\r\n/g, '\n') : raw;

// ── patch ──────────────────────────────────────────────────────────────────
const OLD = `.lux-name:last-child  {
  animation-delay: 0.52s;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(64px, 16vw, 132px);
  letter-spacing: 0.015em;
  color: var(--ink-60);
}`;

const NEW = `.lux-name:last-child  {
  animation-delay: 0.52s;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(64px, 16vw, 132px);
  letter-spacing: 0.015em;
  padding-right: 0.12em; /* room for italic glyph overhang — prevents 'k' clip */
  color: var(--ink-60);
}`;

if (!src_norm.includes(OLD)) {
  // Already patched?
  if (src_norm.includes('padding-right: 0.12em')) {
    console.log('✔ Already patched — nothing to do.');
    process.exit(0);
  }
  console.error('✘  Could not find the target block.');
  console.error('   Run this to see what the block actually looks like:');
  console.error('   node -e "const f=require(\'fs\').readFileSync(\'src/WeddingGallery.js\',\'utf8\'); const i=f.indexOf(\'lux-name:last-child\'); console.log(JSON.stringify(f.slice(i,i+220)));"');
  process.exit(1);
}

// restore original line endings when writing back
let patched = src_norm.replace(OLD, NEW);
if (crlf) patched = patched.replace(/\n/g, '\r\n');

writeFileSync(FILE, patched, 'utf8');

console.log('✔  Patched .lux-name:last-child → added padding-right: 0.12em');
console.log('');
console.log('Done! Rebuild the app to see the fix:');
console.log('  npm run build   (or npm start for dev)');
