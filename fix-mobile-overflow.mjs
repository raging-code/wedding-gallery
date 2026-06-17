// fix-mobile-overflow.mjs (CRLF-safe)
// Run from the repo root: node fix-mobile-overflow.mjs
//
// Fixes the "I can zoom out / pan left-right on mobile" issue.
//
// Root cause: overflow-x: hidden is only set on `body`, not on `html`.
// On mobile Safari/Chrome, if any element is even a few px wider than
// the viewport, overflow-x:hidden on body alone often fails to fully
// suppress horizontal pan/pinch-zoom-to-reveal — you need it on BOTH
// html and body. This explains why it's intermittent ("sometimes"):
// it only shows up on whichever screen/state happens to have something
// a hair too wide at that moment.
//
// Fix: add overflow-x: hidden (and width: 100%, belt-and-suspenders)
// to the `html` rule too.

import fs from "fs";

const file = "src/WeddingGallery.js";
const raw = fs.readFileSync(file, "utf8");
const usesCRLF = raw.includes("\r\n");

const backup = `${file}.bak-overflow-${Date.now()}`;
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
  "1. Add overflow-x: hidden + width: 100% to html (mobile pan/zoom fix)",
  `html { scroll-behavior: smooth; }`,
  `html { scroll-behavior: smooth; overflow-x: hidden; width: 100%; }`,
  { required: false }
);

const out = usesCRLF ? src.replace(/\n/g, "\r\n") : src;
fs.writeFileSync(file, out);
console.log(`✔ Wrote changes to ${file}`);
