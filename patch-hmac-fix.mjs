import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ─── Fix upload.js ────────────────────────────────────────────────────────────
const UPLOAD_PATH = resolve("functions/api/upload.js");
let upload = readFileSync(UPLOAD_PATH, "utf8");
let uploadChanged = 0;

// hmacHex in upload.js passes the ArrayBuffer from deriveSigningKey directly
// to crypto.subtle.sign() which expects a CryptoKey — throws TypeError → 502
const oldHmacHexUpload =
`async function hmacHex(key, msg) {
  const k   = typeof key === 'string'
    ? await crypto.subtle.importKey('raw', new TextEncoder().encode(key),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    : key;
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return hex(sig);
}`;

const newHmacHexUpload =
`async function hmacHex(key, msg) {
  // Always import the key — deriveSigningKey returns an ArrayBuffer, not a CryptoKey
  const rawKey = typeof key === 'string'
    ? new TextEncoder().encode(key)
    : key instanceof ArrayBuffer ? key : new Uint8Array(key);
  const k = await crypto.subtle.importKey('raw', rawKey,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return hex(sig);
}`;

if (upload.includes(oldHmacHexUpload)) {
  upload = upload.replace(oldHmacHexUpload, newHmacHexUpload);
  writeFileSync(UPLOAD_PATH, upload, "utf8");
  console.log("✅ upload.js — fixed hmacHex (now correctly imports ArrayBuffer as CryptoKey)");
  uploadChanged++;
} else {
  console.log("⚠️  upload.js — pattern not found (already fixed or code differs)");
}

// ─── Fix list.js ──────────────────────────────────────────────────────────────
const LIST_PATH = resolve("functions/api/list.js");
let list = readFileSync(LIST_PATH, "utf8");
let listChanged = 0;

// hmacHex in list.js passes key directly to sign() with zero preparation — same bug
const oldHmacHexList =
`async function hmacHex(key, msg) {
  const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return hex(buf);
}`;

const newHmacHexList =
`async function hmacHex(key, msg) {
  // Always import the key — deriveSigningKey returns an ArrayBuffer, not a CryptoKey
  const rawKey = key instanceof ArrayBuffer ? key : new Uint8Array(key);
  const k = await crypto.subtle.importKey('raw', rawKey,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const buf = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return hex(buf);
}`;

if (list.includes(oldHmacHexList)) {
  list = list.replace(oldHmacHexList, newHmacHexList);
  writeFileSync(LIST_PATH, list, "utf8");
  console.log("✅ list.js   — fixed hmacHex (now correctly imports ArrayBuffer as CryptoKey)");
  listChanged++;
} else {
  console.log("⚠️  list.js  — pattern not found (already fixed or code differs)");
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const total = uploadChanged + listChanged;
if (total > 0) {
  console.log(`
🎉 Done — ${total} fix(es) applied.

Root cause: deriveSigningKey() returns an ArrayBuffer but hmacHex()
was passing it directly to crypto.subtle.sign() which requires a CryptoKey.
This threw a TypeError which was caught and returned as a 502.

Next steps:
  git add functions/api/upload.js functions/api/list.js
  git commit -m "Fix hmacHex: import ArrayBuffer as CryptoKey before signing"
  git push
`);
} else {
  console.log("\nℹ️  No changes written.");
}
