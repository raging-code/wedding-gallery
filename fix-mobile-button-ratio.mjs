// fix-mobile-button-ratio.mjs
// Run from the repo root: node fix-mobile-button-ratio.mjs
//
// Problem: on phones (<480px) "Upload Photos" and "View All · N Photos"
// were forced to width: 100% (and .lux-upload-simple to align-items:
// stretch), so they rendered as thin, stretched bars edge-to-edge —
// very different proportions from the compact centered pill buttons
// on desktop.
//
// Fix: in the @media (max-width: 479px) block —
//   1. Remove the `.lux-upload-simple { align-items: stretch; }` override
//      (this alone was forcing the upload button to stretch even without
//      an explicit width).
//   2. Replace `.lux-btn-upload { width: 100%; ... }` with a slightly
//      larger, auto-width padding (14px 32px) — compact pill, centered
//      by the parent's flex `align-items: center`.
//   3. Replace `.lux-btn-view-all { width: 100%; }` with auto-width
//      padding (11px 28px) — centered by `.lux-view-all-wrap`'s
//      text-align: center.
//
// Result: both buttons keep the same desktop-style pill proportions,
// just sized for mobile, instead of stretching full-width.

import fs from "fs";

const file = "src/WeddingGallery.js";
let src = fs.readFileSync(file, "utf8");
const backup = `${file}.bak-btnratio-${Date.now()}`;
fs.writeFileSync(backup, src);
console.log(`✔ Backup → ${backup}`);

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

fs.writeFileSync(file, src);
console.log(`✔ Wrote changes to ${file}`);
