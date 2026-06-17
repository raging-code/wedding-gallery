// fix-hero-name-size.mjs (CRLF-safe)
// Run from the repo root: node fix-hero-name-size.mjs
//
// Makes the big "Claudine" / "Mark" hero title bigger on phones.
//
// Currently .lux-name uses font-size: clamp(72px, 18vw, 150px) (and
// clamp(78px, 20vw, 164px) for the second name) with no mobile-specific
// override — so on a 414px-wide phone (iPhone XR) it renders at only
// ~74.5px / ~82.8px, near the floor of its range.
//
// This adds a rule inside the existing @media (max-width: 479px) block
// that bumps both names up by roughly 25-28% on common modern phone
// widths (390-430px), while tapering back close to the original size
// on rare, very narrow legacy screens (~320px) so the longer name
// "Claudine" doesn't risk overflowing there.
//
// Resulting sizes by viewport width:
//   320px -> Claudine ~74px / Mark ~80px   (about the same as before)
//   360px -> Claudine ~83px / Mark ~90px
//   375px -> Claudine ~86px / Mark ~94px
//   414px -> Claudine ~95px / Mark ~104px  (your tested iPhone XR width)
//   430px -> Claudine ~99px / Mark ~108px

import fs from "fs";

const file = "src/WeddingGallery.js";
const raw = fs.readFileSync(file, "utf8");
const usesCRLF = raw.includes("\r\n");

const backup = `${file}.bak-heroname-${Date.now()}`;
fs.writeFileSync(backup, raw);
console.log(`✔ Backup → ${backup}`);
console.log(`  Detected line endings: ${usesCRLF ? "CRLF (\\r\\n)" : "LF (\\n)"}`);

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

replace(
  "1. Bigger hero names on mobile",
  `  /* Footer: reduce large top gap */
  .lux-footer { margin-top: 60px; gap: 14px; }
}`,
  `  /* Footer: reduce large top gap */
  .lux-footer { margin-top: 60px; gap: 14px; }

  /* Hero names — bigger presence on phones (scales with viewport,
     tapers back near-original on very narrow/legacy widths) */
  .lux-name              { font-size: clamp(70px, 23vw, 150px); }
  .lux-name:last-child   { font-size: clamp(78px, 25vw, 164px); }
}`,
  { required: false }
);

const out = usesCRLF ? src.replace(/\n/g, "\r\n") : src;
fs.writeFileSync(file, out);
console.log(`✔ Wrote changes to ${file}`);
