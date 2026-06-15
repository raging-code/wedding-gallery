/**
 * fix-mobile-buttons.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Makes "Upload Photos" and "View All Photos" buttons smaller on mobile.
 *
 * Changes (mobile ≤ 639px only):
 *   • .lux-btn-upload  — padding 18px 20px → 11px 20px, font-size 11px → 10px
 *   • .lux-btn-view-all — padding 14px 20px → 10px 20px, font-size stays 10px
 *
 * RUN: node fix-mobile-buttons.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const FILE = resolve('src/WeddingGallery.js');

function replace(src, label, find, replacement, required = true) {
  const norm    = s => s.replace(/\r\n/g, '\n');
  const hadCRLF = src.includes('\r\n');
  const s       = norm(src);
  const f       = norm(find);
  if (!s.includes(f)) {
    if (required) throw new Error(`Pattern not found for: ${label}`);
    console.log(`⚠  Skipped (already applied): ${label}`);
    return src;
  }
  let result = s.replace(f, norm(replacement));
  if (hadCRLF) result = result.replace(/\n/g, '\r\n');
  console.log(`✔  ${label}`);
  return result;
}

let src = readFileSync(FILE, 'utf8');
const bak = `${FILE}.bak-mobilebtns-${Date.now()}`;
copyFileSync(FILE, bak);
console.log(`✔  Backup → ${bak}\n`);

// ── 1. Upload Photos button — smaller padding + font-size on mobile ──────────
src = replace(
  src,
  '1. Upload Photos button — smaller on mobile',
  `  .lux-btn-upload     { width: 100%; justify-content: center; padding: 18px 20px; }`,
  `  .lux-btn-upload     { width: 100%; justify-content: center; padding: 11px 20px; font-size: 10px; letter-spacing: 0.22em; }`
);

// ── 2. View All button — smaller padding on mobile ───────────────────────────
src = replace(
  src,
  '2. View All Photos button — smaller on mobile',
  `  .lux-btn-view-all  { width: 100%; padding: 14px 20px; }`,
  `  .lux-btn-view-all  { width: 100%; padding: 10px 20px; font-size: 9px; letter-spacing: 0.22em; }`
);

writeFileSync(FILE, src, 'utf8');
console.log('\n✅  Done — both buttons are now smaller on mobile.');
