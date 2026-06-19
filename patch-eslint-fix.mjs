import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const TARGET = resolve("src/WeddingGallery.js");

console.log("📄 Reading", TARGET);
let src = readFileSync(TARGET, "utf8");
let changed = 0;

// ─── Fix 1: Remove unused `useCallback` from React import ────────────────────
const before1 = `import { useState, useEffect, useRef, useCallback } from "react";`;
const after1  = `import { useState, useEffect, useRef } from "react";`;

if (src.includes(before1)) {
  src = src.replace(before1, after1);
  console.log("✅ Fix 1 applied — removed unused `useCallback` from import");
  changed++;
} else {
  console.log("⚠️  Fix 1 skipped — pattern not found (already fixed or line differs)");
}

// ─── Fix 2: Remove unused `activeTab` / `setActiveTab` state ─────────────────
// Matches both tight and padded spacing variants
const statePattern = /[ \t]*const \[activeTab,\s*setActiveTab\]\s*=\s*useState\('photos'\);.*\n/;

if (statePattern.test(src)) {
  src = src.replace(statePattern, "");
  console.log("✅ Fix 2 applied — removed unused `activeTab` / `setActiveTab` state");
  changed++;
} else {
  console.log("⚠️  Fix 2 skipped — pattern not found (already fixed or line differs)");
}

// ─── Write back ───────────────────────────────────────────────────────────────
if (changed > 0) {
  writeFileSync(TARGET, src, "utf8");
  console.log(`\n🎉 Done — ${changed} fix(es) applied. Commit and push to trigger a clean Cloudflare build.`);
} else {
  console.log("\nℹ️  No changes written — file may already be clean.");
}
