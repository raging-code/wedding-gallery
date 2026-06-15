/**
 * fix-mobile-buttons.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * ROOT CAUSE (found via analysis):
 *   public/css/premium.css has a broad rule:
 *     button:not([class*="close"]):not([class*="dismiss"]):not([class*="toggle"]) {
 *       padding: 0.95rem 2.6rem !important;
 *       font-size: 0.68rem !important; }
 *   This matches ALL lux-* buttons (specificity 0,3,1 beats our 0,1,0)
 *   and forces large padding with !important — overriding everything in LUXURY_CSS.
 *
 * FIX:
 *   1. Patch premium.css — add :not([class*="lux-"]) to exclude all our buttons.
 *   2. Keep the smaller base sizes in LUXURY_CSS (already in the repo).
 *
 * RUN: node fix-mobile-buttons.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';

function patch(filePath, label, find, replacement, required = true) {
  const norm    = s => s.replace(/\r\n/g, '\n');
  let   src     = readFileSync(filePath, 'utf8');
  const hadCRLF = src.includes('\r\n');
  const s       = norm(src);
  const f       = norm(find);
  if (!s.includes(f)) {
    if (required) throw new Error(`Pattern not found for: ${label}`);
    console.log(`⚠  Skipped (already applied): ${label}`);
    return;
  }
  let result = s.replace(f, norm(replacement));
  if (hadCRLF) result = result.replace(/\n/g, '\r\n');
  writeFileSync(filePath, result, 'utf8');
  console.log(`✔  ${label}`);
}

// ── 1. Fix premium.css — exclude lux-* buttons from the broad rule ───────────
const PREMIUM = resolve('public/css/premium.css');
const bak1 = `${PREMIUM}.bak-${Date.now()}`;
copyFileSync(PREMIUM, bak1);
console.log(`✔  Backup → ${bak1}`);

patch(
  PREMIUM,
  '1. premium.css — exclude lux-* buttons from forced padding/font-size',
  `button:not([class*="close"]):not([class*="dismiss"]):not([class*="toggle"]) {`,
  `button:not([class*="close"]):not([class*="dismiss"]):not([class*="toggle"]):not([class*="lux-"]) {`
);

// ── 2. Ensure LUXURY_CSS style injection always updates (cache fix) ───────────
const WG = resolve('src/WeddingGallery.js');
const bak2 = `${WG}.bak-${Date.now()}`;
copyFileSync(WG, bak2);
console.log(`✔  Backup → ${bak2}\n`);

patch(
  WG,
  '2. Style injection — always update textContent (cache fix)',
  `    if (!document.getElementById("lux-css")) {
      const s = document.createElement("style");
      s.id = "lux-css"; s.textContent = LUXURY_CSS;
      document.head.appendChild(s);
    }`,
  `    let s = document.getElementById("lux-css");
    if (!s) { s = document.createElement("style"); s.id = "lux-css"; document.head.appendChild(s); }
    s.textContent = LUXURY_CSS;`,
  false // already applied in latest repo
);

console.log('✅  Done.');
console.log('   Buttons will now respect the sizes defined in LUXURY_CSS on all screen sizes.');
