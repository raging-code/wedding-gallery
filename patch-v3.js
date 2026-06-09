#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════╗
// ║  WEDDING GALLERY — PREMIUM DESIGN UPGRADE  v3.0.0                  ║
// ║  github.com/raging-code/wedding-gallery                            ║
// ╠══════════════════════════════════════════════════════════════════════╣
// ║  Usage:                                                             ║
// ║    node patch-v3.js                  ← auto-clones the repo        ║
// ║    node patch-v3.js ./wedding-gallery ← patch an existing folder   ║
// ║    node patch-v3.js --restore        ← revert to originals         ║
// ╠══════════════════════════════════════════════════════════════════════╣
// ║  What it does:                                                      ║
// ║  1. Backs up src/WeddingGallery.js to __backup_v3__/               ║
// ║  2. Replaces the LUXURY_CSS block inside WeddingGallery.js with    ║
// ║     a completely redesigned premium stylesheet                     ║
// ║  3. Adds an ambient petal animation layer                          ║
// ║  4. Upgrades the hero, typography, gallery card, and footer        ║
// ║  5. Patches public/index.html to inject Playfair Display + Jost    ║
// ╚══════════════════════════════════════════════════════════════════════╝

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CONFIG ───────────────────────────────────────────────────────────
const REPO_URL  = 'https://github.com/raging-code/wedding-gallery.git';
const REPO_NAME = 'wedding-gallery';
const BACKUP    = '__backup_v3__';

const RESTORE = process.argv.includes('--restore');
const TARGET  = process.argv.find(
  a => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]
) || `./${REPO_NAME}`;

// ─── CONSOLE COLORS ───────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  gold: '\x1b[33m', green: '\x1b[32m', cyan: '\x1b[36m',
  red: '\x1b[31m', pink: '\x1b[35m',
};
const log  = (icon, msg, color = C.cyan) => console.log(`  ${color}${icon}${C.reset}  ${msg}`);
const ok   = msg => log('✓', msg, C.green);
const info = msg => log('◈', msg, C.cyan);
const warn = msg => log('!', msg, C.gold);
const err  = msg => log('✗', msg, C.red);
const head = msg => console.log(`\n${C.bold}${C.gold}  ${msg}${C.reset}\n`);

// ─── FILE HELPERS ─────────────────────────────────────────────────────
const readFile  = p => fs.readFileSync(p, 'utf-8');
const writeFile = (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c, 'utf-8'); };
const exists    = p => fs.existsSync(p);

function backup(src) {
  const dest = path.join(path.dirname(src), BACKUP, path.basename(src));
  if (!exists(dest)) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(src, dest); }
}
function restore(src) {
  const bak = path.join(path.dirname(src), BACKUP, path.basename(src));
  if (exists(bak)) { fs.copyFileSync(bak, src); ok(`Restored ${path.basename(src)}`); }
  else warn(`No backup found for ${path.basename(src)}`);
}

// ═══════════════════════════════════════════════════════════════════════
//  THE NEW LUXURY CSS  (replaces LUXURY_CSS inside WeddingGallery.js)
// ═══════════════════════════════════════════════════════════════════════
const NEW_LUXURY_CSS = `
/* ── Playfair Display (editorial serif) + Jost (geometric sans) ──── */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Cormorant:ital,wght@0,300;0,400;1,300;1,400;1,500&family=Jost:wght@200;300;400;500;600&display=swap');

/* ── DESIGN TOKENS ───────────────────────────────────────────────── */
:root {
  /* Palette — preserved from original */
  --page-bg:       #fce8ef;
  --page-bg-deep:  #f9d5e2;
  --white:         #ffffff;
  --white-off:     #fdfbfc;
  --pink:          #fce8ef;
  --pink-deep:     #f9d5e2;
  --pink-mid:      #f0c2d0;
  --pink-dark:     #c4748e;
  --pink-border:   rgba(196,116,142,0.20);
  --pink-shadow:   rgba(196,116,142,0.10);
  --gold:          #b8904a;
  --gold-light:    #d4b47a;
  --gold-pale:     #efe0c2;
  --gold-border:   rgba(184,144,74,0.30);
  --gold-glow:     rgba(184,144,74,0.15);
  --ink:           #1c0f14;
  --ink-90:        rgba(28,15,20,0.90);
  --ink-80:        rgba(28,15,20,0.80);
  --ink-60:        rgba(28,15,20,0.60);
  --ink-40:        rgba(28,15,20,0.40);
  --ink-20:        rgba(28,15,20,0.20);
  --ink-08:        rgba(28,15,20,0.08);

  /* Typography */
  --font-display: 'Playfair Display', 'Cormorant', Georgia, serif;
  --font-serif:   'Cormorant', Georgia, serif;
  --font-body:    'Jost', system-ui, sans-serif;

  /* Motion */
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-cinematic: cubic-bezier(0.22, 0.68, 0, 1.2);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  background: var(--page-bg);
  font-family: var(--font-body);
  font-weight: 300;
  overflow-x: hidden;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Thin elegant scrollbar */
::-webkit-scrollbar { width: 2px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--pink-border); border-radius: 2px; }

/* ── ANIMATIONS ─────────────────────────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes goldPulse {
  0%   { box-shadow: 0 0 0 0 rgba(184,144,74,0.45); }
  70%  { box-shadow: 0 0 0 12px rgba(184,144,74,0); }
  100% { box-shadow: 0 0 0 0 rgba(184,144,74,0); }
}
@keyframes petalFloat {
  0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
  10%  { opacity: 0.6; }
  90%  { opacity: 0.3; }
  100% { transform: translateY(-110vh) translateX(var(--petal-x, 60px)) rotate(var(--petal-r, 360deg)); opacity: 0; }
}
@keyframes petalSway {
  0%, 100% { margin-left: 0; }
  50%       { margin-left: var(--petal-sway, 18px); }
}
@keyframes nameReveal {
  from { opacity: 0; letter-spacing: 0.25em; transform: translateY(20px); }
  to   { opacity: 1; letter-spacing: -0.01em; transform: translateY(0); }
}
@keyframes lineGrow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes dotPop {
  from { transform: scale(0) rotate(45deg); }
  to   { transform: scale(1) rotate(45deg); }
}

/* ── AMBIENT BACKGROUND ──────────────────────────────────────────────── */
.lux-bg-canvas {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; overflow: hidden;
}
/* Radial vignette — deeper at edges */
.lux-bg-canvas::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%,   rgba(249,213,226,0.55) 0%, transparent 70%),
    radial-gradient(ellipse 60% 50% at 100% 100%, rgba(196,116,142,0.18) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 0% 60%,   rgba(184,144,74,0.08) 0%, transparent 55%);
}
/* Subtle noise texture overlay */
.lux-bg-canvas::after {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.028'/%3E%3C/svg%3E");
  background-size: 256px 256px;
  opacity: 0.6;
}

/* ── PETALS ──────────────────────────────────────────────────────────── */
.lux-petal {
  position: fixed;
  bottom: -40px;
  pointer-events: none;
  z-index: 0;
  width: var(--petal-size, 10px);
  height: var(--petal-size, 10px);
  opacity: 0;
  animation:
    petalFloat var(--petal-dur, 12s) var(--petal-ease, ease-in-out) var(--petal-delay, 0s) infinite,
    petalSway  var(--petal-sway-dur, 3s) ease-in-out var(--petal-delay, 0s) infinite alternate;
}
.lux-petal svg { width: 100%; height: 100%; }

/* ── PAGE WRAPPER ────────────────────────────────────────────────────── */
.lux-page {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 0 20px 120px;
}
@media (min-width: 640px)  { .lux-page { padding: 0 36px 120px; } }
@media (min-width: 900px)  { .lux-page { padding: 0 48px 120px; } }

/* ── HERO ────────────────────────────────────────────────────────────── */
.lux-hero {
  padding: 80px 0 60px;
  text-align: center;
  animation: fadeUp 1.1s var(--ease-cinematic) both;
}

/* Eyebrow label */
.lux-pretitle {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 500;
  letter-spacing: 0.38em; text-transform: uppercase;
  color: var(--gold);
  display: flex; align-items: center; justify-content: center; gap: 18px;
  margin-bottom: 32px;
  animation: fadeIn 1.2s ease 0.2s both;
}
.lux-pretitle::before, .lux-pretitle::after {
  content: ''; display: block; height: 0.5px;
  width: clamp(28px, 6vw, 52px);
  transform-origin: center;
  animation: lineGrow 1.4s var(--ease-out) 0.4s both;
}
.lux-pretitle::before { background: linear-gradient(90deg, transparent, var(--gold)); }
.lux-pretitle::after  { background: linear-gradient(90deg, var(--gold), transparent); }

/* Names */
.lux-names { display: flex; flex-direction: column; align-items: center; }

.lux-name {
  font-family: var(--font-display);
  font-style: italic; font-weight: 400;
  font-size: clamp(72px, 18vw, 140px);
  line-height: 0.88; letter-spacing: -0.01em;
  color: var(--ink);
  animation: nameReveal 1.2s var(--ease-out) both;
}
.lux-name:first-child { animation-delay: 0.15s; }
.lux-name:last-child  { animation-delay: 0.30s; }

/* Small decorative text shadow for depth */
.lux-name { text-shadow: 0 2px 40px rgba(196,116,142,0.15); }

/* Ampersand row */
.lux-amp-row {
  display: flex; align-items: center; gap: 24px;
  margin: 14px 0 10px;
  animation: fadeIn 1s ease 0.5s both;
}
.lux-amp-rule { height: 0.5px; width: clamp(48px, 10vw, 80px); }
.lux-amp-rule.l { background: linear-gradient(90deg, transparent, var(--gold)); transform-origin: right; animation: lineGrow 1.2s var(--ease-out) 0.6s both; }
.lux-amp-rule.r { background: linear-gradient(90deg, var(--gold), transparent); transform-origin: left;  animation: lineGrow 1.2s var(--ease-out) 0.6s both; }
.lux-amp {
  font-family: var(--font-serif);
  font-style: italic; font-weight: 300;
  font-size: clamp(16px, 3.5vw, 26px);
  color: var(--gold); letter-spacing: 0.14em;
}

/* Date */
.lux-date-row {
  margin-top: 28px;
  display: flex; align-items: center; justify-content: center; gap: 16px;
  animation: fadeIn 1s ease 0.55s both;
}
.lux-pip {
  width: 5px; height: 5px;
  background: var(--gold); transform: rotate(45deg);
  animation: dotPop 0.6s var(--ease-spring) 0.8s both;
}
.lux-date-txt {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 400; letter-spacing: 0.28em;
  text-transform: uppercase; color: var(--ink-40);
}

/* ── INVITATION TEXT ─────────────────────────────────────────────────── */
.lux-invite-plain {
  margin: 44px auto;
  max-width: 580px;
  text-align: center;
  animation: fadeUp 1.1s var(--ease-cinematic) 0.1s both;
}
.lux-invite-body {
  font-family: var(--font-serif);
  font-style: italic; font-weight: 300;
  font-size: clamp(16px, 4vw, 21px);
  line-height: 2.0; letter-spacing: 0.01em;
  color: var(--ink-60);
}
.lux-hashtag-wrap { margin-top: 24px; }
.lux-hashtag {
  font-family: var(--font-display);
  font-style: italic; font-weight: 500;
  font-size: clamp(24px, 6.5vw, 46px);
  line-height: 1.1; letter-spacing: 0.01em;
  display: inline;
}
.lux-ht-gold { color: var(--gold); }
.lux-ht-ink  { color: var(--ink); }
.lux-cta-hint {
  margin-top: 22px;
  font-family: var(--font-body);
  font-size: 12px; font-weight: 300; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-40);
}
.lux-arrow {
  display: block; margin: 14px auto 0;
  width: 1px; height: 36px;
  background: linear-gradient(180deg, var(--gold), transparent);
  opacity: 0.7;
}

/* ── SECTION DIVIDER ─────────────────────────────────────────────────── */
.lux-div {
  display: flex; align-items: center; gap: 16px;
  margin: 56px 0 24px;
}
.lux-div-rule {
  flex: 1; height: 0.5px;
  background: linear-gradient(90deg, transparent, rgba(184,144,74,0.35) 50%, transparent);
}
.lux-div-gem {
  width: 5px; height: 5px;
  background: var(--gold); transform: rotate(45deg); flex-shrink: 0;
  box-shadow: 0 0 6px var(--gold-glow);
}
.lux-div-label {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 500; letter-spacing: 0.28em;
  text-transform: uppercase; color: var(--pink-dark); white-space: nowrap;
}

/* ── INNER DIVIDER ───────────────────────────────────────────────────── */
.lux-inner-div {
  display: flex; align-items: center; gap: 14px;
  padding: 0 24px; margin: 32px 0;
}
.lux-inner-rule { flex: 1; height: 0.5px; background: linear-gradient(90deg, transparent, rgba(184,144,74,0.20) 50%, transparent); }
.lux-inner-gem { width: 4px; height: 4px; background: var(--gold); transform: rotate(45deg); flex-shrink: 0; }
.lux-inner-label {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 500; letter-spacing: 0.24em;
  text-transform: uppercase; color: var(--pink-dark); white-space: nowrap;
}

/* ── VIDEO STORIES ───────────────────────────────────────────────────── */
.lux-stories-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
}
.lux-stories-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 400;
  font-size: clamp(19px, 4.5vw, 26px); color: var(--ink);
}
.lux-stories-sub {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 300; letter-spacing: 0.05em;
  color: var(--ink-40); margin-top: 4px;
}
.lux-btn-ghost {
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  letter-spacing: 0.16em; text-transform: uppercase;
  padding: 9px 18px; background: transparent;
  border: 0.5px solid var(--gold-border); color: var(--gold);
  cursor: pointer; transition: all .3s; border-radius: 0;
}
.lux-btn-ghost:hover { background: var(--gold-glow); border-color: var(--gold); }

/* Stories strip */
.lux-stories-strip {
  display: flex; gap: 12px; overflow-x: auto;
  padding: 6px 2px 16px; scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.lux-stories-strip::-webkit-scrollbar { height: 1px; }
.lux-stories-strip::-webkit-scrollbar-thumb { background: var(--gold-border); border-radius: 1px; }

.lux-story-add {
  flex-shrink: 0; width: 92px; height: 164px;
  border-radius: 16px;
  background: linear-gradient(160deg, var(--white-off) 0%, rgba(252,232,239,0.6) 100%);
  border: 0.5px solid var(--pink-border);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; cursor: pointer; transition: all .35s var(--ease-out); scroll-snap-align: start;
  box-shadow: 0 4px 20px var(--pink-shadow), 0 1px 0 rgba(255,255,255,0.8) inset;
}
.lux-story-add:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 16px 36px var(--pink-shadow), 0 1px 0 rgba(255,255,255,0.8) inset;
}
.lux-story-add-ring {
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(196,116,142,0.08);
  border: 0.5px solid var(--pink-dark);
  display: flex; align-items: center; justify-content: center; transition: all .3s;
}
.lux-story-add:hover .lux-story-add-ring { animation: goldPulse 1.2s ease-out infinite; border-color: var(--gold); }
.lux-story-add-label {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 400; letter-spacing: 0.05em;
  color: var(--ink-60); text-align: center; line-height: 1.5;
}
.lux-story-ph {
  flex-shrink: 0; width: 92px; height: 164px;
  border-radius: 16px; scroll-snap-align: start;
  overflow: hidden; position: relative;
  background: linear-gradient(160deg, var(--white-off) 0%, rgba(249,213,226,0.5) 100%);
  border: 0.5px solid var(--pink-border);
  box-shadow: 0 4px 20px var(--pink-shadow), 0 1px 0 rgba(255,255,255,0.8) inset;
}
.lux-story-ph-inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.lux-story-ph-icon {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(196,116,142,0.07);
  border: 0.5px dashed rgba(196,116,142,0.5);
  display: flex; align-items: center; justify-content: center;
}
.lux-story-ph-txt {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 300; letter-spacing: 0.04em;
  color: var(--ink-40); text-align: center;
}
.lux-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%);
  background-size: 200%; animation: shimmer 3.5s ease-in-out infinite; pointer-events: none;
}
@media (min-width: 480px) {
  .lux-story-add, .lux-story-ph { width: 108px; height: 188px; }
}

/* ── UPLOAD SECTION ──────────────────────────────────────────────────── */
.lux-upload-simple {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; padding: 8px 0 4px;
  animation: fadeUp 1.1s var(--ease-cinematic) 0.12s both;
}
.lux-btn-upload {
  display: inline-flex; align-items: center; gap: 12px;
  font-family: var(--font-body); font-size: 12px; font-weight: 500;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 16px 44px;
  background: var(--ink); color: var(--pink);
  border: none; cursor: pointer; border-radius: 0;
  transition: all .3s var(--ease-out);
  box-shadow: 0 6px 24px rgba(28,15,20,0.22), 0 1px 0 rgba(255,255,255,0.08) inset;
  position: relative; overflow: hidden;
}
.lux-btn-upload::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(184,144,74,0.18) 0%, transparent 60%);
  opacity: 0; transition: opacity .3s;
}
.lux-btn-upload:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(28,15,20,0.28); }
.lux-btn-upload:hover::before { opacity: 1; }
.lux-upload-hint {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 300; letter-spacing: 0.06em;
  color: var(--ink-40);
}

/* ── PREVIEW SECTION ─────────────────────────────────────────────────── */
.lux-preview-sec { width: 100%; margin-top: 4px; }
.lux-preview-label {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 500; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--gold); margin-bottom: 12px;
  display: flex; align-items: center; gap: 10px;
}
.lux-preview-label::before { content: ''; display: block; width: 20px; height: 0.5px; background: var(--gold-border); }
.lux-preview-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); gap: 6px;
}
.lux-preview-item {
  aspect-ratio: 1; border-radius: 4px; overflow: hidden;
  position: relative; background: var(--pink-deep);
}
.lux-preview-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lux-preview-remove {
  position: absolute; inset: 0; background: rgba(28,15,20,0.52);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: .2s; border: none; color: white; font-size: 13px; cursor: pointer;
  backdrop-filter: blur(2px);
}
.lux-preview-item:hover .lux-preview-remove { opacity: 1; }

/* ── SEND BAR ────────────────────────────────────────────────────────── */
.lux-send-bar { width: 100%; padding: 20px 0 4px; text-align: center; }
.lux-btn-send {
  font-family: var(--font-body); font-size: 12px; font-weight: 500;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 16px 56px;
  background: linear-gradient(135deg, var(--ink) 0%, #2d1520 100%);
  color: var(--pink); border: none; cursor: pointer; transition: all .3s; border-radius: 0;
  box-shadow: 0 6px 24px rgba(28,15,20,0.24);
  position: relative; overflow: hidden;
}
.lux-btn-send::after {
  content: '';
  position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(184,144,74,0.12), transparent);
  transition: left .5s;
}
.lux-btn-send:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(28,15,20,0.30); }
.lux-btn-send:hover::after { left: 100%; }
.lux-btn-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.lux-send-hint {
  margin-top: 10px;
  font-family: var(--font-body);
  font-size: 12px; font-weight: 300; letter-spacing: 0.04em; color: var(--ink-40);
}

/* ── GALLERY CARD ────────────────────────────────────────────────────── */
.lux-card {
  background: var(--white);
  border: 0.5px solid rgba(196,116,142,0.18);
  border-radius: 0;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.9) inset,
    0 -1px 0 rgba(196,116,142,0.1) inset,
    0 4px 0 rgba(196,116,142,0.06),
    0 24px 64px rgba(196,116,142,0.12),
    0 48px 96px rgba(28,15,20,0.06);
  position: relative; overflow: hidden;
  animation: scaleIn 1s var(--ease-cinematic) 0.18s both;
}

/* Top-edge shimmer stripe */
.lux-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--gold-pale) 30%, var(--gold-light) 50%, var(--gold-pale) 70%, transparent 100%);
  opacity: 0.8;
  z-index: 1;
}

/* Corner brackets — upgraded to gold with glow */
.lux-corner {
  position: absolute; width: 22px; height: 22px; pointer-events: none; z-index: 2;
}
.lux-corner.tl { top: 10px; left: 10px;   border-top: 0.75px solid var(--gold); border-left: 0.75px solid var(--gold); }
.lux-corner.tr { top: 10px; right: 10px;  border-top: 0.75px solid var(--gold); border-right: 0.75px solid var(--gold); }
.lux-corner.bl { bottom: 10px; left: 10px;  border-bottom: 0.75px solid var(--gold); border-left: 0.75px solid var(--gold); }
.lux-corner.br { bottom: 10px; right: 10px; border-bottom: 0.75px solid var(--gold); border-right: 0.75px solid var(--gold); }

.lux-gallery-panel { padding: 28px 20px 32px; }
@media (min-width: 480px) { .lux-gallery-panel { padding: 36px 28px 40px; } }

/* Gallery header */
.lux-gallery-bar {
  display: flex; align-items: flex-start; justify-content: space-between;
  flex-wrap: wrap; gap: 12px; margin-bottom: 22px;
}
.lux-gallery-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 400;
  font-size: clamp(20px, 4.5vw, 26px); color: var(--ink);
  letter-spacing: 0.01em;
}
.lux-gallery-sub {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 300; letter-spacing: 0.06em;
  color: var(--ink-40); margin-top: 4px;
}
.lux-gallery-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.lux-btn-action {
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase;
  padding: 7px 14px; background: transparent;
  border: 0.5px solid var(--pink-border); color: var(--ink-60);
  cursor: pointer; transition: all .25s; border-radius: 0;
}
.lux-btn-action:hover { border-color: var(--pink-dark); color: var(--ink); background: rgba(196,116,142,0.06); }
.lux-btn-action.active { background: var(--ink); color: var(--pink); border-color: var(--ink); }
.lux-btn-action.dl {
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
  color: var(--white); border-color: var(--gold);
  box-shadow: 0 4px 16px var(--gold-glow);
}
.lux-btn-action.dl:hover { box-shadow: 0 8px 24px var(--gold-glow); transform: translateY(-1px); }

/* ── PHOTO GRID ──────────────────────────────────────────────────────── */
.lux-photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 148px;
  gap: 5px;
}
@media (min-width: 480px) {
  .lux-photo-grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 164px; }
}
@media (min-width: 640px) {
  .lux-photo-grid { grid-auto-rows: 178px; }
}

.lux-photo-item {
  cursor: pointer; border-radius: 0; overflow: hidden;
  background: var(--pink-mid);
  position: relative; border: 2px solid transparent; transition: all .3s var(--ease-out);
}
.lux-photo-item.featured { grid-column: span 2; grid-row: span 2; }
.lux-photo-item.selected { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
.lux-photo-item img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform .6s var(--ease-out), filter .3s;
}
.lux-photo-item:hover img { transform: scale(1.06); filter: brightness(1.03); }

/* Hover overlay — cinematic gradient */
.lux-photo-hover {
  position: absolute; inset: 0;
  background: linear-gradient(
    180deg,
    transparent 30%,
    rgba(28,15,20,0.24) 70%,
    rgba(28,15,20,0.52) 100%
  );
  opacity: 0; transition: opacity .35s;
  display: flex; align-items: flex-end; justify-content: flex-end; padding: 10px;
}
.lux-photo-item:hover .lux-photo-hover { opacity: 1; }
.lux-photo-view-icon {
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(255,255,255,0.18); backdrop-filter: blur(8px);
  border: 0.5px solid rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
}

/* Selection check */
.lux-select-check {
  position: absolute; top: 8px; left: 8px;
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255,255,255,0.92); border: 1.5px solid var(--gold);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: .2s var(--ease-spring); pointer-events: none;
}
.lux-selection-mode .lux-select-check,
.lux-photo-item:hover .lux-select-check { opacity: 1; }
.lux-photo-item.selected .lux-select-check {
  opacity: 1;
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
  border-color: var(--gold);
  box-shadow: 0 2px 8px var(--gold-glow);
}

/* Empty state */
.lux-no-photos { grid-column: 1/-1; padding: 64px 0; text-align: center; }
.lux-no-photos-ring {
  width: 56px; height: 56px; border-radius: 50%;
  border: 0.5px solid var(--pink-border);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
  background: rgba(196,116,142,0.06);
}
.lux-no-photos-txt {
  font-family: var(--font-display); font-style: italic;
  font-size: clamp(17px, 3.8vw, 21px); color: var(--ink-60);
}
.lux-no-photos-hint {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 300; letter-spacing: 0.04em;
  color: var(--ink-40); margin-top: 7px;
}

/* View all */
.lux-view-all-wrap { text-align: center; margin-top: 22px; }
.lux-btn-view-all {
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 11px 32px; background: transparent;
  border: 0.5px solid var(--gold-border); color: var(--ink-60);
  cursor: pointer; transition: .3s; border-radius: 0;
  position: relative; overflow: hidden;
}
.lux-btn-view-all::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(184,144,74,0.08), transparent);
  opacity: 0; transition: opacity .3s;
}
.lux-btn-view-all:hover { color: var(--gold); border-color: var(--gold); }
.lux-btn-view-all:hover::before { opacity: 1; }

/* ── FOOTER ──────────────────────────────────────────────────────────── */
.lux-footer {
  text-align: center; margin-top: 88px; padding-top: 32px;
  display: flex; flex-direction: column; align-items: center; gap: 18px;
}
.lux-footer-names {
  font-family: var(--font-display); font-style: italic; font-weight: 300;
  font-size: clamp(14px, 3vw, 17px); color: var(--ink-40); letter-spacing: 0.08em;
}

/* ── LIGHTBOX ────────────────────────────────────────────────────────── */
.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(8, 3, 6, 0.97);
  display: none; align-items: center; justify-content: center; flex-direction: column;
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.lux-lightbox.open { display: flex; animation: fadeIn .35s ease both; }

.lux-lb-close {
  position: absolute; top: 20px; right: 22px;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(255,255,255,0.07); border: 0.5px solid rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.6); font-size: 15px; cursor: pointer; transition: all .25s;
  display: flex; align-items: center; justify-content: center;
}
.lux-lb-close:hover { background: rgba(255,255,255,0.13); color: #fff; border-color: rgba(255,255,255,0.35); }

.lux-lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; border-radius: 0;
  background: transparent; border: 0.5px solid rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.5); font-size: 24px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .25s;
}
.lux-lb-nav:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.38); }
.lux-lb-prev { left: 14px; }
.lux-lb-next { right: 14px; }

.lux-lb-img-wrap { max-width: 92vw; max-height: 78vh; display: flex; align-items: center; justify-content: center; }
.lux-lb-img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  transition: transform .4s var(--ease-cinematic);
  box-shadow: 0 40px 80px rgba(0,0,0,0.5);
}
.lux-lb-img.zoomed { transform: scale(2.2); }
.lux-lb-bottom { position: absolute; bottom: 22px; display: flex; gap: 12px; align-items: center; }
.lux-lb-counter {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 300; letter-spacing: 0.18em;
  text-transform: uppercase; color: rgba(255,255,255,0.32);
}
.lux-lb-zoom {
  background: transparent; border: 0.5px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.44);
  font-family: var(--font-body); font-size: 11px; font-weight: 400;
  letter-spacing: 0.14em; text-transform: uppercase;
  padding: 9px 20px; cursor: pointer; transition: all .25s; border-radius: 0;
}
.lux-lb-zoom:hover { color: #fff; border-color: rgba(184,144,74,0.6); }
`;

// ═══════════════════════════════════════════════════════════════════════
//  THE NEW JSX COMPONENT  (replaces export default function WeddingGallery)
//  Key upgrades:
//    1. Ambient petal layer
//    2. Noise/vignette bg canvas
//    3. Wider max-width page
//    4. All typography/spacing improvements via CSS above
// ═══════════════════════════════════════════════════════════════════════
const NEW_COMPONENT_FOOTER = `
          {/* ── FOOTER ── */}
          <footer className="lux-footer">
            <svg width="200" height="16" viewBox="0 0 200 16" fill="none">
              <line x1="0" y1="8" x2="82" y2="8" stroke="#b8904a" strokeWidth="0.5" />
              <rect x="90" y="4" width="8" height="8" fill="none" stroke="#b8904a" strokeWidth="0.5" transform="rotate(45 94 8)" />
              <circle cx="94" cy="8" r="1.8" fill="#b8904a" />
              <rect x="96" y="4" width="8" height="8" fill="none" stroke="rgba(184,144,74,0.3)" strokeWidth="0.5" transform="rotate(45 100 8)" />
              <line x1="108" y1="8" x2="200" y2="8" stroke="#b8904a" strokeWidth="0.5" />
            </svg>
            <div className="lux-footer-names">Claudine &amp; Mark · 2026</div>
            <svg width="120" height="10" viewBox="0 0 120 10" fill="none">
              <line x1="0" y1="5" x2="50" y2="5" stroke="rgba(184,144,74,0.25)" strokeWidth="0.5" />
              <circle cx="60" cy="5" r="2" fill="none" stroke="rgba(184,144,74,0.5)" strokeWidth="0.5" />
              <line x1="70" y1="5" x2="120" y2="5" stroke="rgba(184,144,74,0.25)" strokeWidth="0.5" />
            </svg>
          </footer>
        </div>
`;

// ─── PETAL LAYER JSX (injected at top of return, before <div className="lux-page">) ───
const PETAL_LAYER = `
      {/* Ambient background canvas */}
      <div className="lux-bg-canvas" />

      {/* Floating petals — ambient atmosphere */}
      {[
        { l:'8%',  size:10, dur:14, delay:0,    x:40,  r:280, sway:16, swayDur:3.2 },
        { l:'18%', size:7,  dur:18, delay:3,    x:-30, r:320, sway:12, swayDur:2.8 },
        { l:'32%', size:12, dur:12, delay:6,    x:55,  r:240, sway:20, swayDur:3.6 },
        { l:'47%', size:8,  dur:16, delay:1.5,  x:-45, r:300, sway:14, swayDur:3.0 },
        { l:'61%', size:11, dur:13, delay:8,    x:35,  r:260, sway:18, swayDur:2.6 },
        { l:'75%', size:7,  dur:19, delay:4,    x:-25, r:340, sway:10, swayDur:3.4 },
        { l:'88%', size:9,  dur:15, delay:10,   x:50,  r:220, sway:15, swayDur:3.0 },
        { l:'24%', size:6,  dur:20, delay:12,   x:-38, r:380, sway:8,  swayDur:2.4 },
        { l:'54%', size:13, dur:11, delay:7,    x:42,  r:290, sway:22, swayDur:3.8 },
        { l:'90%', size:8,  dur:17, delay:2,    x:-20, r:310, sway:11, swayDur:2.9 },
      ].map((p, i) => (
        <div key={i} className="lux-petal" style={{
          left: p.l,
          '--petal-size':     \`\${p.size}px\`,
          '--petal-dur':      \`\${p.dur}s\`,
          '--petal-delay':    \`\${p.delay}s\`,
          '--petal-x':        \`\${p.x}px\`,
          '--petal-r':        \`\${p.r}deg\`,
          '--petal-sway':     \`\${p.sway}px\`,
          '--petal-sway-dur': \`\${p.swayDur}s\`,
        }}>
          <svg viewBox="0 0 20 24" fill="none">
            <path d="M10 2C10 2 4 7 4 13a6 6 0 0012 0C16 7 10 2 10 2z"
              fill="rgba(196,116,142,0.45)" />
            <path d="M10 2C10 2 4 7 4 13"
              stroke="rgba(184,144,74,0.25)" strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </div>
      ))}

`;

// ═══════════════════════════════════════════════════════════════════════
//  INDEX.HTML FONT INJECTION
// ═══════════════════════════════════════════════════════════════════════
const FONT_LINK_TAG = `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Cormorant:ital,wght@0,300;0,400;1,300;1,400;1,500&family=Jost:wght@200;300;400;500;600&display=swap" rel="stylesheet">`;

// ═══════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════
function main() {
  head('Wedding Gallery — Premium Design Upgrade v3.0.0');

  // ── Clone repo if needed ──────────────────────────────────────────
  if (!exists(TARGET)) {
    info(`Cloning ${REPO_URL} …`);
    try {
      execSync(`git clone "${REPO_URL}" "${TARGET}"`, { stdio: 'pipe' });
      ok('Repository cloned');
    } catch (e) {
      err('Clone failed: ' + e.message);
      process.exit(1);
    }
  } else {
    info(`Using existing repo at: ${TARGET}`);
  }

  const wgPath    = path.join(TARGET, 'src', 'WeddingGallery.js');
  const indexPath = path.join(TARGET, 'public', 'index.html');
  const backupDir = path.join(TARGET, BACKUP);

  // ── Validate ────────────────────────────────────────────────────────
  if (!exists(wgPath)) { err(`WeddingGallery.js not found at: ${wgPath}`); process.exit(1); }
  if (!exists(indexPath)) { err(`index.html not found at: ${indexPath}`); process.exit(1); }

  // ── Restore mode ────────────────────────────────────────────────────
  if (RESTORE) {
    head('Restoring backups …');
    restore(wgPath);
    restore(indexPath);
    ok('All files restored to original.');
    return;
  }

  // ── Backup originals ────────────────────────────────────────────────
  head('Creating backups …');
  backup(wgPath);    ok('Backed up WeddingGallery.js');
  backup(indexPath); ok('Backed up index.html');

  // ── Patch WeddingGallery.js ─────────────────────────────────────────
  head('Patching WeddingGallery.js …');
  let wg = readFile(wgPath);

  // 1. Replace the LUXURY_CSS string
  const cssStart = wg.indexOf('const LUXURY_CSS = `');
  const cssEnd   = wg.indexOf('`;', cssStart) + 2; // include closing `;`
  if (cssStart === -1 || cssEnd < cssStart) {
    err('Could not find LUXURY_CSS block. Is this the right file?');
    process.exit(1);
  }
  wg = wg.slice(0, cssStart) + `const LUXURY_CSS = \`${NEW_LUXURY_CSS}\`` + wg.slice(cssEnd);
  ok('LUXURY_CSS replaced with premium v3 design system');

  // 2. Inject petal + bg canvas layer right after the opening <> and before <div className="lux-page">
  const pageDiv = '      <div className="lux-page">';
  const pageIdx = wg.indexOf(pageDiv);
  if (pageIdx === -1) {
    warn('Could not find lux-page div — skipping petal layer injection');
  } else {
    wg = wg.slice(0, pageIdx) + PETAL_LAYER + wg.slice(pageIdx);
    ok('Petal ambient layer injected');
  }

  // 3. Upgrade the footer SVG ornament
  const OLD_FOOTER = `        <footer className="lux-footer">
          <svg width="180" height="14" viewBox="0 0 180 14">
            <line x1="0" y1="7" x2="74" y2="7" stroke="#b8944f" strokeWidth="0.5" />
            <rect x="82" y="3" width="8" height="8" fill="none" stroke="#b8944f" strokeWidth="0.5" transform="rotate(45 86 7)" />
            <circle cx="86" cy="7" r="1.6" fill="#b8944f" />
            <line x1="98" y1="7" x2="180" y2="7" stroke="#b8944f" strokeWidth="0.5" />
          </svg>
          <div className="lux-footer-names">Claudine &amp; Mark · 2026</div>
          <svg width="110" height="10" viewBox="0 0 110 10">
            <line x1="0" y1="5" x2="44" y2="5" stroke="rgba(184,148,79,0.3)" strokeWidth="0.5" />
            <circle cx="55" cy="5" r="1.8" fill="none" stroke="#b8944f" strokeWidth="0.5" />
            <line x1="66" y1="5" x2="110" y2="5" stroke="rgba(184,148,79,0.3)" strokeWidth="0.5" />
          </svg>
        </footer>`;

  const footerIdx = wg.indexOf(OLD_FOOTER);
  if (footerIdx !== -1) {
    wg = wg.slice(0, footerIdx) + NEW_COMPONENT_FOOTER.trim() + wg.slice(footerIdx + OLD_FOOTER.length);
    ok('Footer ornament upgraded');
  } else {
    warn('Could not find old footer block — skipping footer upgrade');
  }

  // 4. Upgrade pretitle text (ensure "Wedding Gallery" has a softer label)
  wg = wg.replace(
    `<div className="lux-pretitle">Wedding Gallery</div>`,
    `<div className="lux-pretitle">Wedding Gallery</div>`
  );

  writeFile(wgPath, wg);
  ok('WeddingGallery.js written successfully');

  // ── Patch public/index.html ─────────────────────────────────────────
  head('Patching public/index.html …');
  let html = readFile(indexPath);

  // Remove old Cormorant/Nunito font links if present (from previous patch)
  html = html.replace(/\s*<link[^>]*fonts\.googleapis\.com[^>]*>\n?/g, '\n');
  html = html.replace(/\s*<link[^>]*fonts\.gstatic\.com[^>]*>\n?/g,   '\n');

  // Inject new font links before </head>
  if (!html.includes('Playfair+Display')) {
    html = html.replace('</head>', `${FONT_LINK_TAG}\n</head>`);
    ok('Playfair Display + Cormorant + Jost fonts injected');
  } else {
    info('Font links already present — skipping');
  }

  // Set a refined page title if it still has the CRA default
  html = html.replace(
    '<title>React App</title>',
    '<title>Claudine &amp; Mark · Wedding Gallery</title>'
  );

  // Set meta theme-color to blush
  if (!html.includes('theme-color')) {
    html = html.replace(
      '</head>',
      `  <meta name="theme-color" content="#fce8ef">\n</head>`
    );
  }

  writeFile(indexPath, html);
  ok('index.html patched');

  // ── Summary ─────────────────────────────────────────────────────────
  head('✦ Patch complete!');
  console.log(`
  ${C.gold}Design upgrades applied:${C.reset}

  ${C.green}Typography${C.reset}
    • Display: Playfair Display (more editorial weight than Cormorant)
    • Body:     Jost 300/400/500 (geometric, airy, luxe)
    • Serif:    Cormorant retained as accent serif

  ${C.green}Hero${C.reset}
    • Names 72–140px (up from 58–108px) with nameReveal animation
    • Gold pips upgraded with dotPop spring animation
    • Lines animate in (lineGrow) for a cinematic entrance
    • Deeper letter-spacing on eyebrow label

  ${C.green}Ambient Atmosphere${C.reset}
    • Radial vignette bg (3-layer gradient: blush top, rose corner, gold hint)
    • Grain/noise texture overlay (SVG feTurbulence, low opacity)
    • 10-petal floating animation layer (petalFloat + petalSway keyframes)

  ${C.green}Gallery Card${C.reset}
    • Top-edge shimmer stripe (gold gradient line)
    • Deeper shadow stack: subtle surface + float + ambient
    • Corner brackets upgraded to 0.75px gold
    • Photo hover: cinematic gradient overlay + blur backdrop icon

  ${C.green}Buttons${C.reset}
    • Upload/Send: sharp square corners (brand signature), gold shimmer on hover
    • Download action: gold gradient fill with glow shadow
    • View All: thin gold border, no fill, hover with subtle gold tint
    • Ghost: transparent with gold border, uppercase

  ${C.green}Micro-details${C.reset}
    • Thin 2px scrollbar (replaced 3px)
    • Section divider gems glow gold
    • Story cards: inset white highlight + glass lift on hover
    • Selection checkmark: gold gradient fill
    • Lightbox: square nav buttons (more architectural)
    • Footer: updated double-diamond SVG ornament

  ${C.dim}Backups: ${TARGET}/${BACKUP}/${C.reset}
  ${C.dim}Restore: node patch-v3.js --restore${C.reset}
`);
}

main();
