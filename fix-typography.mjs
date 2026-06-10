#!/usr/bin/env node
/**
 * fix-typography.mjs  (v2 — CRLF-safe)
 * ─────────────────────────────────────────────────────────────────
 * Fixes two hero typography issues in src/WeddingGallery.js:
 *
 *  1. CLIPPING  — line-height: 0.86 cuts off ascenders/descenders
 *  2. OUTLINE   — webkit-text-stroke hollow outline looks like a glitch
 *
 * Fix: line-height → 1.05  ·  "Mark" → Cormorant Infant 300 italic
 *
 * Run from the project root:
 *   node fix-typography.mjs
 */

import fs   from 'fs';
import path from 'path';

const ROOT   = process.cwd();
const TARGET = path.join(ROOT, 'src', 'WeddingGallery.js');

const log  = (icon, msg) => console.log(`${icon}  ${msg}`);
const ok   = msg => log('✅', msg);
const skip = msg => log('⏭️ ', msg);
const fail = msg => { log('❌', msg); process.exit(1); };

if (!fs.existsSync(TARGET)) {
  fail('src/WeddingGallery.js not found — run this from the project root.');
}

let raw = fs.readFileSync(TARGET, 'utf8');

// ── Normalise to LF for matching, remember if CRLF so we can restore ──
const hasCRLF = raw.includes('\r\n');
let src = hasCRLF ? raw.replace(/\r\n/g, '\n') : raw;

// ── Already patched? ────────────────────────────────────────────
if (
  src.includes('line-height: 1.05') &&
  src.includes('font-weight: 300') &&
  !src.includes('-webkit-text-stroke: 1px var(--ink)')
) {
  skip('Typography already patched — nothing to do.');
  process.exit(0);
}

// ── OLD block (exact match after LF normalisation) ──────────────
const OLD = `/* Names — DM Serif Display, press-reveal per name */
.lux-names { display: flex; flex-direction: column; align-items: center; }

.lux-name {
  font-family: var(--font-hero);
  font-style: italic; font-weight: 400;
  font-size: clamp(68px, 17vw, 144px);
  line-height: 0.86; letter-spacing: -0.02em;
  color: var(--ink);
  display: block;
  /* Ink absorption reveal — first name slightly delayed */
  animation: pressReveal 1.0s var(--ease-press) both;
}
.lux-name:first-child { animation-delay: 0.20s; }
.lux-name:last-child  {
  animation-delay: 0.52s;
  color: transparent;
  -webkit-text-stroke: 1px var(--ink);
  /* Outline treatment for second name — engraved look */
}`;

const NEW = `/* Names — weight-contrast pair: heavy display vs. delicate serif */
.lux-names { display: flex; flex-direction: column; align-items: center; overflow: visible; }

.lux-name {
  font-family: var(--font-hero);
  font-style: italic; font-weight: 400;
  font-size: clamp(58px, 14vw, 120px);
  line-height: 1.05; letter-spacing: -0.02em;
  color: var(--ink);
  display: block;
  animation: pressReveal 1.0s var(--ease-press) both;
}
.lux-name:first-child { animation-delay: 0.20s; }
.lux-name:last-child  {
  animation-delay: 0.52s;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(64px, 16vw, 132px);
  letter-spacing: 0.015em;
  color: var(--ink-60);
}`;

if (!src.includes(OLD)) {
  fail(
    'Anchor block not found even after line-ending normalisation.\n' +
    'The .lux-name CSS block in your WeddingGallery.js looks different.\n\n' +
    'Manual fix — find this block in src/WeddingGallery.js:\n' +
    '  line-height: 0.86;            → change to  line-height: 1.05;\n' +
    '  color: transparent;            → remove\n' +
    '  -webkit-text-stroke: 1px ...  → remove\n' +
    '  Add inside :last-child:\n' +
    '    font-family: var(--font-display);\n' +
    '    font-weight: 300;\n' +
    '    font-size: clamp(64px, 16vw, 132px);\n' +
    '    letter-spacing: 0.015em;\n' +
    '    color: var(--ink-60);'
  );
}

src = src.replace(OLD, NEW);

// ── Restore original line endings ───────────────────────────────
if (hasCRLF) src = src.replace(/\n/g, '\r\n');

fs.writeFileSync(TARGET, src, 'utf8');
ok('Patched .lux-name typography in src/WeddingGallery.js');
console.log('\n🎉  Done! Run `npm start` to see the updated typography.\n');