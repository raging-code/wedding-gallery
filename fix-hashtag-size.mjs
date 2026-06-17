// fix-hashtag-size.mjs (CRLF-safe)
// Run from the repo root: node fix-hashtag-size.mjs
//
// Makes "#ForeverMARKedforCLAUD" bigger on phones.
//
// Currently .lux-hashtag uses font-size: clamp(22px, 6vw, 44px), which
// renders at only ~24.8px on a 414px-wide phone (iPhone XR) — near the
// floor of its range.
//
// IMPORTANT: unlike the hero names, the hashtag is one unbroken
// 22-character run with no spaces ("#ForeverMARKedforCLAUD"), so it
// can't wrap to a second line if it gets too wide — it would just get
// clipped at the screen edge. So this bump is intentionally more
// conservative (~17% bigger at your tested width) than the hero-name
// fix, to leave a safe margin:
//
//   320px -> ~22.4px (about the same as before — narrow legacy phones)
//   360px -> ~25.2px
//   375px -> ~26.3px
//   390px -> ~27.3px
//   414px -> ~29.0px  (your tested iPhone XR width, vs ~24.8px before)
//   430px -> ~30.1px
//
// This is written to apply independently of whether the earlier
// fix-hero-name-size.mjs has been run yet — it anchors on the
// `.lux-footer` line, not on what follows it.

import fs from "fs";

const file = "src/WeddingGallery.js";
const raw = fs.readFileSync(file, "utf8");
const usesCRLF = raw.includes("\r\n");

const backup = `${file}.bak-hashtag-${Date.now()}`;
fs.writeFileSync(backup, raw);
console.log(`✔ Backup → ${backup}`);
console.log(`  Detected line endings: ${usesCRLF ? "CRLF (\\r\\n)" : "LF (\\n)"}`);

let src = usesCRLF ? raw.replace(/\r\n/g, "\n") : raw;

function replace(label, oldStr, newStr, { required = true } = {}) {
  if (src.includes(newStr)) {
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

replace(
  "1. Bigger hashtag on mobile",
  `  .lux-footer { margin-top: 60px; gap: 14px; }`,
  `  .lux-footer { margin-top: 60px; gap: 14px; }

  /* Hashtag — bigger on phones, kept safely under the available width
     since "#ForeverMARKedforCLAUD" is one unbroken 22-character run */
  .lux-hashtag { font-size: clamp(22px, 7vw, 34px); }`,
  { required: false }
);

const out = usesCRLF ? src.replace(/\n/g, "\r\n") : src;
fs.writeFileSync(file, out);
console.log(`✔ Wrote changes to ${file}`);
