/**
 * fix-mobile-buttons.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Two fixes:
 *
 * 1. STYLE CACHE BUG — The useEffect injects CSS only once
 *    (`if (!document.getElementById("lux-css"))`), so hot-reloads in dev
 *    never pick up CSS changes. Fixed by always updating textContent.
 *
 * 2. BUTTON SIZES — Upload Photos and View All are too large on mobile.
 *    Previous patch only targeted ≤479px; many phones (390–430px) are wider.
 *    Fix: reduce padding/font-size in the BASE rule so it applies everywhere,
 *    then restore the larger desktop size at min-width: 640px.
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

// ── 1. Fix style cache bug ───────────────────────────────────────────────────
src = replace(
  src,
  '1. Fix style injection — always update textContent',
  `  useEffect(() => {
    if (!document.getElementById("lux-css")) {
      const s = document.createElement("style");
      s.id = "lux-css"; s.textContent = LUXURY_CSS;
      document.head.appendChild(s);
    }
  }, []);`,
  `  useEffect(() => {
    let s = document.getElementById("lux-css");
    if (!s) { s = document.createElement("style"); s.id = "lux-css"; document.head.appendChild(s); }
    s.textContent = LUXURY_CSS;
  }, []);`
);

// ── 2. Upload Photos button — smaller base size, restore large on desktop ────
src = replace(
  src,
  '2. Upload Photos — smaller base, desktop restore',
  `.lux-btn-upload {
  display: inline-flex; align-items: center; gap: 13px;
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  letter-spacing: 0.26em; text-transform: uppercase;
  padding: 18px 52px;
  background: var(--ink); color: var(--pink);
  border: none; cursor: pointer;
  transition: all .35s var(--ease-out);
  box-shadow: 0 8px 28px rgba(28,15,20,0.20), 0 1px 0 rgba(255,255,255,0.07) inset;
  position: relative; overflow: hidden;
}`,
  `.lux-btn-upload {
  display: inline-flex; align-items: center; gap: 13px;
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 11px 20px;
  background: var(--ink); color: var(--pink);
  border: none; cursor: pointer;
  transition: all .35s var(--ease-out);
  box-shadow: 0 8px 28px rgba(28,15,20,0.20), 0 1px 0 rgba(255,255,255,0.07) inset;
  position: relative; overflow: hidden;
}
@media (min-width: 640px) {
  .lux-btn-upload { font-size: 11px; letter-spacing: 0.26em; padding: 18px 52px; }
}`
);

// ── 3. View All button — smaller base size, restore large on desktop ──────────
src = replace(
  src,
  '3. View All — smaller base, desktop restore',
  `.lux-btn-view-all {
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  letter-spacing: 0.26em; text-transform: uppercase;
  padding: 12px 36px; background: transparent;
  border: 0.5px solid var(--gold-border); color: var(--ink-60);
  cursor: pointer; transition: .3s; position: relative; overflow: hidden;
}`,
  `.lux-btn-view-all {
  font-family: var(--font-body); font-size: 9px; font-weight: 500;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 9px 20px; background: transparent;
  border: 0.5px solid var(--gold-border); color: var(--ink-60);
  cursor: pointer; transition: .3s; position: relative; overflow: hidden;
}
@media (min-width: 640px) {
  .lux-btn-view-all { font-size: 10px; letter-spacing: 0.26em; padding: 12px 36px; }
}`
);

// ── 4 & 5. Clean up now-redundant ≤479px overrides ──────────────────────────
src = replace(
  src,
  '4. Remove redundant ≤479px upload button override',
  `  .lux-btn-upload     { width: 100%; justify-content: center; padding: 11px 20px; font-size: 10px; letter-spacing: 0.22em; }`,
  `  .lux-btn-upload     { width: 100%; justify-content: center; }`,
  false
);

src = replace(
  src,
  '5. Remove redundant ≤479px view-all button override',
  `  .lux-btn-view-all  { width: 100%; padding: 10px 20px; font-size: 9px; letter-spacing: 0.22em; }`,
  `  .lux-btn-view-all  { width: 100%; }`,
  false
);

writeFileSync(FILE, src, 'utf8');
console.log('\n✅  Done.');
console.log('   • Style injection now always updates — hot-reload picks up CSS changes.');
console.log('   • Both buttons are smaller on all mobile widths, full size on desktop (≥640px).');
