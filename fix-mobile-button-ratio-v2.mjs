// fix-mobile-button-ratio.mjs (v2 — CRLF-safe)
// Run from the repo root: node fix-mobile-button-ratio.mjs
//
// v1 reported "Pattern not found" on Windows because Git for Windows
// (core.autocrlf=true) checks the file out with \r\n line endings, but
// the patterns were written with plain \n. This version normalizes line
// endings before matching and restores the original style on write.
//
// What it does, inside @media (max-width: 479px):
//   1. Removes `.lux-upload-simple { align-items: stretch; }` (was forcing
//      the Upload Photos button to stretch full-width even with no
//      explicit width).
//   2. Replaces `.lux-btn-upload { width: 100%; justify-content: center; }`
//      with a compact auto-width pill: `padding: 14px 32px; justify-content: center;`
//   3. Replaces `.lux-btn-view-all { width: 100%; }` with a compact
//      auto-width pill: `padding: 11px 28px;`
//
// Both buttons end up centered (via the existing flex/text-align rules)
// with desktop-like pill proportions, just smaller.

import fs from "fs";

const file = "src/WeddingGallery.js";
const raw = fs.readFileSync(file, "utf8");
const usesCRLF = raw.includes("\r\n");

const backup = `${file}.bak-btnratio-${Date.now()}`;
fs.writeFileSync(backup, raw);
console.log(`✔ Backup → ${backup}`);
console.log(`  Detected line endings: ${usesCRLF ? "CRLF (\\r\\n)" : "LF (\\n)"}`);

// Normalize to \n for matching; restore CRLF on write if needed
let src = usesCRLF ? raw.replace(/\r\n/g, "\n") : raw;

function replace(label, oldStr, newStr, { required = true } = {}) {
  if (src.includes(newStr) && !src.includes(oldStr)) {
    console.log(`⚠  Skipped (already applied): ${label}`);
    return;
  }
  if (!src.includes(oldStr)) {
    if (required) throw new Error(`Pattern not found for: ${label}`);
    console.log(`⚠  Skipped (pattern not found): ${label}`);
    return;
  }
  src = src.replace(oldStr, newStr);
  console.log(`✔  ${label}`);
}

// 1 + 2. Upload CTA block
replace(
  "1. Upload CTA — drop stretch override, compact pill padding",
  `  /* Upload CTA — stretch to full width */
  .lux-upload-simple  { align-items: stretch; }
  .lux-btn-upload     { width: 100%; justify-content: center; }`,
  `  /* Upload CTA — compact pill, centered like desktop */
  .lux-btn-upload     { padding: 14px 32px; justify-content: center; }`,
  { required: false }
);

// 3. View All button
replace(
  "2. View All — compact pill padding instead of full width",
  `  /* View All: full-width */
  .lux-view-all-wrap { margin-top: 14px; }
  .lux-btn-view-all  { width: 100%; }`,
  `  /* View All: compact pill, centered like desktop */
  .lux-view-all-wrap { margin-top: 14px; }
  .lux-btn-view-all  { padding: 11px 28px; }`,
  { required: false }
);

const out = usesCRLF ? src.replace(/\n/g, "\r\n") : src;
fs.writeFileSync(file, out);
console.log(`✔ Wrote changes to ${file}`);
