// fix-cache-and-cleanup.mjs
// Run from the repo root: node fix-cache-and-cleanup.mjs
//
// Context: the mobile button size fix (premium.css + WeddingGallery.js) is
// already correct in the repo as of commit 77f018a. If the buttons STILL
// look unchanged in the browser, the #1 remaining suspect is that
// public/css/premium.css is served as a plain static file (not hashed by
// webpack), so browsers aggressively cache it. This script:
//
//   1. Adds a cache-busting "?v=" query string to premium.css / premium.js
//      in public/index.html so the browser is forced to re-fetch them.
//   2. Removes the leftover .bak files that have been accumulating in git.
//   3. Fixes a corrupted (UTF-16) trailing line in .gitignore.

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const indexPath = path.join(root, "public", "index.html");
const gitignorePath = path.join(root, ".gitignore");

function run(cmd) {
  try {
    execSync(cmd, { stdio: "pipe" });
    return true;
  } catch (e) {
    return false;
  }
}

// ── 1. Cache-bust premium.css / premium.js ─────────────────────────────
let html = fs.readFileSync(indexPath, "utf8");
const v = Date.now();

if (html.includes('href="%PUBLIC_URL%/css/premium.css"')) {
  html = html.replace(
    'href="%PUBLIC_URL%/css/premium.css"',
    `href="%PUBLIC_URL%/css/premium.css?v=${v}"`
  );
  console.log("✔ 1a. premium.css link cache-busted (?v=" + v + ")");
} else if (/premium\.css\?v=\d+/.test(html)) {
  html = html.replace(/premium\.css\?v=\d+/, `premium.css?v=${v}`);
  console.log("✔ 1a. premium.css cache-bust version bumped (?v=" + v + ")");
} else {
  console.log("⚠ 1a. premium.css link not found in expected form — skipped");
}

if (html.includes('src="%PUBLIC_URL%/js/premium.js"')) {
  html = html.replace(
    'src="%PUBLIC_URL%/js/premium.js"',
    `src="%PUBLIC_URL%/js/premium.js?v=${v}"`
  );
  console.log("✔ 1b. premium.js script cache-busted (?v=" + v + ")");
} else if (/premium\.js\?v=\d+/.test(html)) {
  html = html.replace(/premium\.js\?v=\d+/, `premium.js?v=${v}`);
  console.log("✔ 1b. premium.js cache-bust version bumped (?v=" + v + ")");
} else {
  console.log("⚠ 1b. premium.js link not found in expected form — skipped");
}

fs.writeFileSync(indexPath, html);

// ── 2. Remove leftover .bak files from git + disk ──────────────────────
const bakFiles = execSync('git ls-files', { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.bak/.test(f));

if (bakFiles.length) {
  for (const f of bakFiles) {
    if (run(`git rm -q --cached "${f}"`)) {
      console.log(`✔ 2. Removed from git tracking: ${f}`);
    }
    const full = path.join(root, f);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
} else {
  console.log("⚠ 2. No tracked .bak files found — skipped");
}

// ── 3. Fix corrupted .gitignore trailing line ──────────────────────────
const giBuf = fs.readFileSync(gitignorePath);
// Detect the UTF-16-with-nulls "__backup__/" tail that got appended
const hasNulls = giBuf.includes(0x00);
if (hasNulls) {
  // Strip all null bytes, then dedupe/clean trailing whitespace
  let cleaned = giBuf.toString("utf8").replace(/\u0000/g, "");
  cleaned = cleaned.replace(/\r/g, "");
  cleaned = cleaned.replace(/\n+$/g, "\n");
  if (!cleaned.includes("__backup__/")) {
    cleaned += "__backup__/\n";
  } else {
    // it's already there once the nulls are stripped, just normalize
    cleaned = cleaned.split("\n").filter((l, i, arr) => l.trim() !== "" || i === arr.length - 1).join("\n");
    if (!cleaned.endsWith("\n")) cleaned += "\n";
  }
  fs.writeFileSync(gitignorePath, cleaned, "utf8");
  console.log("✔ 3. Fixed corrupted (UTF-16) trailing line in .gitignore");
} else {
  console.log("⚠ 3. .gitignore already clean — skipped");
}

console.log("\nDone. Now run:");
console.log("  git add -A");
console.log('  git commit -m "cache-bust premium assets, repo cleanup"');
console.log("  git push");
console.log("\nThen on your phone/browser: fully close the tab/app and reopen");
console.log("the page (not just refresh) so it re-requests premium.css.");
