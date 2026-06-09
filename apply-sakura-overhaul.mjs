/**
 * apply-sakura-overhaul.mjs
 * Complete design overhaul — Sakura Pink × Gold Leaf × Japan Red
 * Run: node apply-sakura-overhaul.mjs
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Target file ────────────────────────────────────────────────────────────
const TARGET = join(__dirname, "src", "WeddingGallery.js");

if (!existsSync(TARGET)) {
  console.error("❌  src/WeddingGallery.js not found. Run this script from the project root.");
  process.exit(1);
}

// ── The complete new WeddingGallery.js ─────────────────────────────────────
const NEW_CONTENT = `import { useState, useEffect, useRef } from "react";

/* SAKURA_OVERHAUL_V1 */
const SAKURA_CSS = \`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --sakura-pink:   #ffb7c5;
  --sakura-dark:   #ffb7c5;
  --soft-cream:    #fff0f1;
  --japan-red:     #bc3f2e;
  --gold-leaf:     #d4af37;
  --dark-charcoal: #31231a;

  /* Computed tints & transparencies */
  --sakura-10:     rgba(255,183,197,0.10);
  --sakura-18:     rgba(255,183,197,0.18);
  --sakura-30:     rgba(255,183,197,0.30);
  --sakura-60:     rgba(255,183,197,0.60);
  --red-10:        rgba(188,63,46,0.10);
  --red-20:        rgba(188,63,46,0.20);
  --gold-15:       rgba(212,175,55,0.15);
  --gold-35:       rgba(212,175,55,0.35);
  --charcoal-40:   rgba(49,35,26,0.40);
  --charcoal-55:   rgba(49,35,26,0.55);
  --charcoal-70:   rgba(49,35,26,0.70);
  --charcoal-08:   rgba(49,35,26,0.08);
  --white-pure:    #ffffff;

  --font-display: 'Cormorant Garamond', 'Georgia', serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  background-color: var(--soft-cream);
  background-image:
    radial-gradient(ellipse 80% 60% at 110% -10%, rgba(255,183,197,0.22) 0%, transparent 65%),
    radial-gradient(ellipse 60% 50% at -10% 100%, rgba(212,175,55,0.07) 0%, transparent 55%);
  font-family: var(--font-body);
  font-weight: 400;
  overflow-x: hidden;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  color: var(--dark-charcoal);
}

/* ── ANIMATIONS ───────────────────────────────────── */
@keyframes riseIn {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes petalDrift {
  0%   { transform: translateY(0) rotate(0deg); opacity: 0.7; }
  100% { transform: translateY(110vh) rotate(540deg); opacity: 0; }
}
@keyframes goldShimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes softPulse {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.55; }
}

/* ── PETALS (ambient background decoration) ───────── */
.sk-petals {
  position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
}
.sk-petal {
  position: absolute; top: -40px;
  width: 8px; height: 8px; border-radius: 50% 0 50% 0;
  background: var(--sakura-pink);
  animation: petalDrift linear infinite;
  opacity: 0;
}
.sk-petal:nth-child(1)  { left:  8%; width:7px; height:7px; animation-duration: 14s; animation-delay:  0s; }
.sk-petal:nth-child(2)  { left: 22%; width:5px; height:5px; animation-duration: 11s; animation-delay:  3s; }
.sk-petal:nth-child(3)  { left: 38%; width:9px; height:9px; animation-duration: 16s; animation-delay:  7s; }
.sk-petal:nth-child(4)  { left: 55%; width:6px; height:6px; animation-duration: 12s; animation-delay:  1s; }
.sk-petal:nth-child(5)  { left: 70%; width:8px; height:8px; animation-duration: 15s; animation-delay:  5s; }
.sk-petal:nth-child(6)  { left: 85%; width:5px; height:5px; animation-duration: 13s; animation-delay:  9s; }
.sk-petal:nth-child(7)  { left: 14%; width:7px; height:7px; animation-duration: 17s; animation-delay: 11s; }
.sk-petal:nth-child(8)  { left: 60%; width:6px; height:6px; animation-duration: 10s; animation-delay:  4s; }

/* ── SCROLL RIBBON (kakejiku) — right edge decoration ── */
.sk-ribbon {
  position: fixed; top: 0; right: 0; width: 4px; height: 100vh;
  background: linear-gradient(180deg,
    transparent 0%,
    var(--sakura-30) 15%,
    var(--sakura-pink) 40%,
    var(--sakura-60) 60%,
    var(--gold-leaf) 80%,
    transparent 100%
  );
  z-index: 2; pointer-events: none;
}
@media (min-width: 760px) {
  .sk-ribbon { width: 6px; }
}

/* ── PAGE WRAPPER ─────────────────────────────────── */
.sk-page {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 0 24px 120px;
}
@media (min-width: 640px) {
  .sk-page { padding: 0 44px 120px; }
}

/* ── HERO ─────────────────────────────────────────── */
.sk-hero {
  padding: 72px 0 56px;
  animation: riseIn 1.1s cubic-bezier(.16,.84,.44,1) both;
}

.sk-eyebrow {
  display: inline-flex; align-items: center; gap: 12px;
  margin-bottom: 44px;
}
.sk-eyebrow-gem {
  width: 6px; height: 6px;
  background: var(--japan-red);
  transform: rotate(45deg);
  flex-shrink: 0;
}
.sk-eyebrow-text {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.44em; text-transform: uppercase;
  color: var(--japan-red);
}

/* Name composition: stacked vertical Japanese-poster layout */
.sk-name-block {
  position: relative;
  display: flex; flex-direction: column;
  align-items: flex-start;
  gap: 0;
}

.sk-name-primary {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(62px, 15vw, 114px);
  line-height: 0.85; letter-spacing: -0.025em;
  color: var(--dark-charcoal);
}

.sk-connector-row {
  display: flex; align-items: center; gap: 0;
  margin: 10px 0 10px 4px;
  width: 100%;
}
/* Vertical ampersand in a gold pill — the signature element */
.sk-amp-pill {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 28px; height: 54px;
  background: var(--gold-leaf);
  border-radius: 14px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  box-shadow: 0 4px 18px rgba(212,175,55,0.35);
}
.sk-amp-glyph {
  font-family: var(--font-display);
  font-style: italic; font-weight: 600;
  font-size: 18px; line-height: 1;
  color: #fff0d8;
  letter-spacing: 0;
}
.sk-connector-line {
  height: 1px; flex: 1;
  background: linear-gradient(90deg, var(--gold-leaf), transparent);
  margin-left: 16px;
  opacity: 0.4;
}

.sk-name-secondary {
  font-family: var(--font-display);
  font-style: normal; font-weight: 400;
  font-size: clamp(48px, 11vw, 88px);
  line-height: 0.9; letter-spacing: -0.015em;
  color: var(--sakura-pink);
  align-self: flex-end;
  text-align: right;
  width: 100%;
  /* Subtle gold underline shimmer */
  background: linear-gradient(90deg,
    var(--sakura-pink) 0%, var(--sakura-pink) 40%,
    var(--gold-leaf) 55%, var(--sakura-pink) 70%,
    var(--sakura-pink) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: goldShimmer 8s linear infinite;
}

.sk-date-strip {
  margin-top: 32px;
  display: flex; align-items: center; gap: 14px;
}
.sk-date-rule { height: 1px; width: 32px; background: var(--charcoal-40); }
.sk-date-txt {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 400; letter-spacing: 0.38em;
  text-transform: uppercase; color: var(--charcoal-55);
}

/* ── INVITE VERSE ─────────────────────────────────── */
.sk-verse {
  margin: 44px 0 0;
  padding: 28px 0 28px 24px;
  border-left: 3px solid var(--sakura-pink);
  position: relative;
  animation: riseIn 1.1s cubic-bezier(.16,.84,.44,1) 0.1s both;
}
.sk-verse::before {
  content: '\u201C';
  position: absolute; top: -8px; left: 12px;
  font-family: var(--font-display);
  font-size: 72px; font-style: italic; font-weight: 300;
  color: var(--sakura-pink); opacity: 0.4;
  line-height: 1; pointer-events: none;
}
.sk-verse-body {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(16px, 4vw, 20px);
  line-height: 1.95; letter-spacing: 0.01em;
  color: var(--charcoal-70);
  position: relative; z-index: 1;
}
.sk-hashtag-block { margin-top: 22px; }
.sk-hashtag {
  font-family: var(--font-display);
  font-style: italic; font-weight: 500;
  font-size: clamp(24px, 6vw, 44px);
  line-height: 1.1; letter-spacing: 0.01em;
  display: inline;
}
.sk-ht-gold { color: var(--gold-leaf); }
.sk-ht-red  { color: var(--japan-red); }
.sk-cta-nudge {
  margin-top: 22px;
  font-family: var(--font-body);
  font-size: 12px; font-weight: 400; letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--charcoal-40);
  display: flex; align-items: center; gap: 10px;
}
.sk-cta-nudge::after {
  content: ''; display: block;
  width: 20px; height: 1px;
  background: var(--charcoal-40);
}

/* ── SECTION DIVIDER ──────────────────────────────── */
.sk-div {
  margin: 64px 0 28px;
  display: flex; align-items: center; gap: 14px;
}
.sk-div-gem {
  width: 5px; height: 5px;
  background: var(--japan-red);
  transform: rotate(45deg); flex-shrink: 0;
}
.sk-div-label {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 600; letter-spacing: 0.40em;
  text-transform: uppercase; color: var(--japan-red);
}
.sk-div-rule {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, var(--charcoal-08), transparent);
}

/* ── INNER DIVIDER ────────────────────────────────── */
.sk-inner-div {
  margin: 40px 0 22px;
  display: flex; align-items: center; gap: 12px;
}
.sk-inner-gem {
  width: 4px; height: 4px;
  background: var(--gold-leaf);
  transform: rotate(45deg); flex-shrink: 0;
}
.sk-inner-label {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 600; letter-spacing: 0.36em;
  text-transform: uppercase; color: var(--gold-leaf);
}
.sk-inner-rule {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, var(--gold-35), transparent);
}

/* ── VIDEO STORIES ────────────────────────────────── */
.sk-stories-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
}
.sk-stories-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(20px, 4.5vw, 26px); color: var(--dark-charcoal);
  letter-spacing: -0.01em;
}
.sk-stories-sub {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 400; letter-spacing: 0.02em;
  color: var(--charcoal-40); margin-top: 4px;
}
.sk-btn-ghost {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  padding: 9px 18px; background: transparent;
  border: 1px solid var(--sakura-30); color: var(--japan-red);
  cursor: pointer; transition: all .25s; border-radius: 0;
}
.sk-btn-ghost:hover {
  background: var(--sakura-10); border-color: var(--sakura-pink);
}

.sk-stories-strip {
  display: flex; gap: 10px; overflow-x: auto;
  padding: 4px 2px 16px; scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.sk-stories-strip::-webkit-scrollbar { height: 2px; }
.sk-stories-strip::-webkit-scrollbar-thumb { background: var(--sakura-30); border-radius: 2px; }

.sk-story-add {
  flex-shrink: 0; width: 90px; height: 160px;
  background: var(--white-pure);
  border: 1.5px dashed var(--sakura-30);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; cursor: pointer; transition: all .3s; scroll-snap-align: start;
  position: relative; overflow: hidden;
}
.sk-story-add::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, var(--sakura-10), transparent 60%);
  pointer-events: none;
}
.sk-story-add:hover {
  transform: translateY(-3px);
  border-color: var(--sakura-pink);
  box-shadow: 0 8px 28px var(--sakura-18);
}
.sk-story-add-ring {
  width: 38px; height: 38px; border-radius: 50%;
  background: var(--sakura-10);
  border: 1px solid var(--sakura-30);
  display: flex; align-items: center; justify-content: center; transition: all .3s;
}
.sk-story-add:hover .sk-story-add-ring {
  background: var(--sakura-18); border-color: var(--sakura-pink);
}
.sk-story-add-label {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 500; letter-spacing: 0.04em;
  color: var(--charcoal-55); text-align: center; line-height: 1.5;
}
.sk-story-ph {
  flex-shrink: 0; width: 90px; height: 160px;
  scroll-snap-align: start; overflow: hidden; position: relative;
  background: var(--white-pure);
  border: 0.5px solid var(--sakura-18);
  border-top: 2px solid var(--sakura-pink);
}
.sk-story-ph-inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.sk-story-ph-icon {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--sakura-10);
  border: 0.5px dashed var(--sakura-30);
  display: flex; align-items: center; justify-content: center;
}
.sk-story-ph-txt {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 400; letter-spacing: 0.02em;
  color: var(--charcoal-40); text-align: center;
}
@media (min-width: 480px) {
  .sk-story-add, .sk-story-ph { width: 102px; height: 178px; }
}

/* ── UPLOAD SECTION ───────────────────────────────── */
.sk-upload {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; padding: 8px 0 4px;
  animation: riseIn 1.1s cubic-bezier(.16,.84,.44,1) 0.12s both;
}
.sk-btn-upload {
  display: inline-flex; align-items: center; gap: 12px;
  font-family: var(--font-body); font-size: 12px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase;
  padding: 16px 44px;
  background: var(--japan-red); color: #fff;
  border: none; cursor: pointer; border-radius: 0;
  transition: all .3s;
  box-shadow: 0 4px 22px rgba(188,63,46,0.25);
  position: relative; overflow: hidden;
}
.sk-btn-upload::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  transform: translateX(-100%); transition: transform 0.5s;
}
.sk-btn-upload:hover::after { transform: translateX(100%); }
.sk-btn-upload:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(188,63,46,0.32);
}
.sk-upload-hint {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 400; letter-spacing: 0.04em;
  color: var(--charcoal-40);
}

/* ── PREVIEW ──────────────────────────────────────── */
.sk-preview-sec { width: 100%; margin-top: 4px; }
.sk-preview-label {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--gold-leaf); margin-bottom: 12px;
  display: flex; align-items: center; gap: 10px;
}
.sk-preview-label::before {
  content: ''; display: block; width: 18px; height: 1px;
  background: var(--gold-leaf); opacity: 0.5;
}
.sk-preview-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); gap: 6px;
}
.sk-preview-item {
  aspect-ratio: 1; overflow: hidden;
  position: relative; background: var(--sakura-10);
  border: 1px solid var(--sakura-18);
}
.sk-preview-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sk-preview-remove {
  position: absolute; inset: 0; background: rgba(49,35,26,0.52);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: .2s; border: none; color: white; font-size: 13px; cursor: pointer;
}
.sk-preview-item:hover .sk-preview-remove { opacity: 1; }

/* ── SEND BAR ─────────────────────────────────────── */
.sk-send-bar {
  width: 100%; padding: 20px 0 4px;
  text-align: center;
}
.sk-btn-send {
  font-family: var(--font-body); font-size: 12px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase;
  padding: 16px 56px;
  background: linear-gradient(135deg, var(--gold-leaf), #c9a227);
  color: var(--dark-charcoal);
  border: none; cursor: pointer; transition: all .3s; border-radius: 0;
  box-shadow: 0 4px 20px var(--gold-35);
}
.sk-btn-send:hover {
  transform: translateY(-2px); box-shadow: 0 10px 32px var(--gold-35);
}
.sk-btn-send:disabled { opacity: .45; cursor: not-allowed; transform: none; }
.sk-send-hint {
  margin-top: 10px;
  font-family: var(--font-body);
  font-size: 12px; letter-spacing: 0.02em; color: var(--charcoal-40);
}

/* ── GALLERY CARD ─────────────────────────────────── */
.sk-card {
  background: var(--white-pure);
  border: 1px solid var(--sakura-18);
  border-top: 3px solid var(--sakura-pink);
  box-shadow: 0 6px 40px rgba(255,183,197,0.14), 0 1px 0 var(--gold-15);
  position: relative; overflow: hidden;
  animation: riseIn 1.1s cubic-bezier(.16,.84,.44,1) 0.18s both;
}
/* gold corner accent */
.sk-card::before {
  content: ''; position: absolute; top: 0; right: 0;
  width: 40px; height: 40px;
  background: linear-gradient(225deg, var(--gold-leaf) 0%, transparent 50%);
  opacity: 0.25; pointer-events: none;
}

.sk-gallery-panel { padding: 28px 20px 30px; }
@media (min-width: 480px) {
  .sk-gallery-panel { padding: 32px 28px 36px; }
}

.sk-gallery-bar {
  display: flex; align-items: flex-start; justify-content: space-between;
  flex-wrap: wrap; gap: 10px; margin-bottom: 22px;
}
.sk-gallery-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(20px, 4.5vw, 26px); color: var(--dark-charcoal);
  letter-spacing: -0.01em;
}
.sk-gallery-sub {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 400;
  color: var(--charcoal-40); margin-top: 4px;
}
.sk-gallery-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.sk-btn-action {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 0.10em; text-transform: uppercase;
  padding: 7px 14px; background: transparent;
  border: 1px solid var(--sakura-30); color: var(--charcoal-55);
  cursor: pointer; transition: all .2s; border-radius: 0;
}
.sk-btn-action:hover  { border-color: var(--sakura-pink); background: var(--sakura-10); color: var(--japan-red); }
.sk-btn-action.active { background: var(--japan-red); color: #fff; border-color: var(--japan-red); }
.sk-btn-action.dl     { background: var(--gold-leaf); color: var(--dark-charcoal); border-color: var(--gold-leaf); }

/* Mobile 2-col; ≥480 3-col */
.sk-photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 148px;
  gap: 5px;
}
@media (min-width: 480px) {
  .sk-photo-grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 162px; }
}
@media (min-width: 640px) {
  .sk-photo-grid { grid-auto-rows: 172px; }
}
.sk-photo-item {
  cursor: pointer; overflow: hidden;
  background: var(--sakura-10);
  position: relative; border: 2px solid transparent; transition: all .28s;
}
.sk-photo-item.featured { grid-column: span 2; grid-row: span 2; }
.sk-photo-item.selected { border-color: var(--japan-red); }
.sk-photo-item img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s cubic-bezier(.22,.68,0,1.2); }
.sk-photo-item:hover img { transform: scale(1.06); }
.sk-photo-hover {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 35%, rgba(49,35,26,0.42) 100%);
  opacity: 0; transition: opacity .3s;
  display: flex; align-items: flex-end; justify-content: flex-end; padding: 9px;
}
.sk-photo-item:hover .sk-photo-hover { opacity: 1; }
.sk-photo-view-icon {
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(255,255,255,0.22); backdrop-filter: blur(8px);
  border: 0.5px solid rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
}
.sk-select-check {
  position: absolute; top: 8px; left: 8px;
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(255,255,255,0.92); border: 1.5px solid var(--sakura-pink);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: .2s; pointer-events: none;
}
.sk-selection-mode .sk-select-check,
.sk-photo-item:hover .sk-select-check { opacity: 1; }
.sk-photo-item.selected .sk-select-check {
  opacity: 1; background: var(--japan-red); border-color: var(--japan-red);
}

.sk-no-photos { grid-column: 1/-1; padding: 60px 0; text-align: center; }
.sk-no-photos-ring {
  width: 52px; height: 52px; border-radius: 50%;
  border: 1px solid var(--sakura-30);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
  background: var(--sakura-10);
}
.sk-no-photos-txt {
  font-family: var(--font-display); font-style: italic;
  font-size: clamp(17px, 3.8vw, 20px); color: var(--charcoal-55);
}
.sk-no-photos-hint {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 400;
  color: var(--charcoal-40); margin-top: 7px;
}
.sk-view-all-wrap { text-align: center; margin-top: 24px; }
.sk-btn-view-all {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase;
  padding: 11px 36px; background: transparent;
  border: 1px solid var(--sakura-30); color: var(--charcoal-55);
  cursor: pointer; transition: .22s; border-radius: 0;
}
.sk-btn-view-all:hover {
  color: var(--japan-red); border-color: var(--sakura-pink);
  background: var(--sakura-10);
}

/* ── FOOTER ───────────────────────────────────────── */
.sk-footer {
  margin-top: 100px; padding-top: 40px;
  border-top: 1px solid var(--sakura-18);
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
}
.sk-footer-names {
  font-family: var(--font-display); font-style: italic; font-weight: 300;
  font-size: clamp(14px, 3vw, 17px); color: var(--charcoal-40); letter-spacing: 0.06em;
}
.sk-footer-gem {
  width: 5px; height: 5px;
  background: var(--sakura-pink); transform: rotate(45deg);
}

/* ── LIGHTBOX ─────────────────────────────────────── */
.sk-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(20,8,12,0.97);
  display: none; align-items: center; justify-content: center; flex-direction: column;
  backdrop-filter: blur(6px);
}
.sk-lightbox.open { display: flex; animation: fadeIn .3s ease both; }
.sk-lb-close {
  position: absolute; top: 20px; right: 22px;
  width: 38px; height: 38px;
  background: rgba(255,183,197,0.10); border: 0.5px solid rgba(255,183,197,0.22);
  color: rgba(255,183,197,0.7); font-size: 15px; cursor: pointer; transition: all .2s;
  display: flex; align-items: center; justify-content: center; border-radius: 0;
}
.sk-lb-close:hover { background: rgba(255,183,197,0.18); color: var(--sakura-pink); }
.sk-lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; border-radius: 0;
  background: transparent; border: 0.5px solid rgba(255,183,197,0.18);
  color: rgba(255,183,197,0.52); font-size: 24px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.sk-lb-nav:hover {
  background: rgba(255,183,197,0.08); color: var(--sakura-pink);
  border-color: rgba(255,183,197,0.45);
}
.sk-lb-prev { left: 14px; }
.sk-lb-next { right: 14px; }
.sk-lb-img-wrap {
  max-width: 92vw; max-height: 78vh;
  display: flex; align-items: center; justify-content: center;
}
.sk-lb-img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  transition: transform .38s cubic-bezier(.22,.68,0,1.2);
}
.sk-lb-img.zoomed { transform: scale(2.2); }
.sk-lb-bottom {
  position: absolute; bottom: 22px;
  display: flex; gap: 12px; align-items: center;
}
.sk-lb-counter {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 400; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(255,183,197,0.38);
}
.sk-lb-zoom {
  background: transparent; border: 0.5px solid rgba(255,183,197,0.20);
  color: rgba(255,183,197,0.52);
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  letter-spacing: 0.12em; text-transform: uppercase;
  padding: 8px 20px; cursor: pointer; transition: all .2s; border-radius: 0;
}
.sk-lb-zoom:hover { color: var(--sakura-pink); border-color: rgba(255,183,197,0.5); }
\`;

const MOCK_PHOTOS = [
  { id: 1, url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=85", name: "ceremony.jpg" },
  { id: 2, url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=85", name: "couple.jpg" },
  { id: 3, url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=85", name: "reception.jpg" },
  { id: 4, url: "https://images.unsplash.com/photo-1525772764200-be829a350797?w=600&q=85", name: "dance.jpg" },
  { id: 5, url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600&q=85", name: "rings.jpg" },
  { id: 6, url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=85", name: "portrait.jpg" },
  { id: 7, url: "https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=600&q=85", name: "flowers.jpg" },
  { id: 8, url: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=85", name: "venue.jpg" },
];

function SectionDivider({ label }) {
  return (
    <div className="sk-div">
      <span className="sk-div-gem" />
      <span className="sk-div-label">{label}</span>
      <div className="sk-div-rule" />
    </div>
  );
}

function InnerDivider({ label }) {
  return (
    <div className="sk-inner-div">
      <span className="sk-inner-gem" />
      <span className="sk-inner-label">{label}</span>
      <div className="sk-inner-rule" />
    </div>
  );
}

export default function WeddingGallery() {
  const [photos] = useState(MOCK_PHOTOS);
  const [previews, setPreviews] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showAll, setShowAll] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, idx: 0, zoomed: false });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById("sk-css")) {
      const s = document.createElement("style");
      s.id = "sk-css"; s.textContent = SAKURA_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!lightbox.open) return;
      if (e.key === "Escape")     setLightbox(l => ({ ...l, open: false, zoomed: false }));
      if (e.key === "ArrowLeft")  setLightbox(l => ({ ...l, idx: (l.idx - 1 + photos.length) % photos.length, zoomed: false }));
      if (e.key === "ArrowRight") setLightbox(l => ({ ...l, idx: (l.idx + 1) % photos.length, zoomed: false }));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, photos.length]);

  function handleFiles(fileList) {
    Array.from(fileList).filter(f => f.type.startsWith("image/"))
      .slice(0, 20 - previews.length)
      .forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviews(p => [...p, { url, name: file.name, id: Date.now() + Math.random() }]);
      });
  }

  function removePreview(id) { setPreviews(p => p.filter(x => x.id !== id)); }

  function openLightbox(idx) {
    if (selectMode) { toggleSelect(idx); return; }
    setLightbox({ open: true, idx, zoomed: false });
  }

  function navPhoto(dir) {
    setLightbox(l => ({ ...l, idx: (l.idx + dir + photos.length) % photos.length, zoomed: false }));
  }

  function toggleSelect(idx) {
    if (!selectMode) return;
    setSelected(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  }

  function toggleSelectMode() {
    setSelectMode(s => { if (s) setSelected(new Set()); return !s; });
  }

  function selectAll() {
    if (selected.size === photos.length) setSelected(new Set());
    else setSelected(new Set(photos.map((_, i) => i)));
  }

  const visiblePhotos = showAll ? photos : photos.slice(0, 9);
  const currentImg = photos[lightbox.idx];

  return (
    <>
      {/* Ambient petals */}
      <div className="sk-petals" aria-hidden="true">
        {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="sk-petal" />)}
      </div>

      {/* Kakejiku scroll ribbon */}
      <div className="sk-ribbon" aria-hidden="true" />

      <div className="sk-page">

        {/* HERO */}
        <div className="sk-hero">
          <div className="sk-eyebrow">
            <div className="sk-eyebrow-gem" />
            <span className="sk-eyebrow-text">Wedding Gallery</span>
          </div>

          <div className="sk-name-block">
            <span className="sk-name-primary">Claudine</span>
            <div className="sk-connector-row">
              <div className="sk-amp-pill">
                <span className="sk-amp-glyph">&amp;</span>
              </div>
              <div className="sk-connector-line" />
            </div>
            <span className="sk-name-secondary">Mark</span>
          </div>

          <div className="sk-date-strip">
            <div className="sk-date-rule" />
            <span className="sk-date-txt">Forever begins · 2026</span>
          </div>
        </div>

        {/* VERSE */}
        <div className="sk-verse">
          <p className="sk-verse-body">
            Capture the kilig moments, tawanan, iyakan,<br />
            and every beautiful memory we've made together.<br />
            Don't forget to tag us and use our hashtag:
          </p>
          <div className="sk-hashtag-block">
            <span className="sk-hashtag">
              <span className="sk-ht-gold">#Forever</span>
              <span className="sk-ht-red">MARK</span>
              <span className="sk-ht-gold">edfor</span>
              <span className="sk-ht-red">CLAUD</span>
            </span>
          </div>
          <div className="sk-cta-nudge">Got the perfect shot? Upload it below</div>
        </div>

        {/* VIDEO MOMENTS */}
        <SectionDivider label="Video Moments" />
        <div className="sk-stories-head">
          <div>
            <div className="sk-stories-title">Moments in Motion</div>
            <div className="sk-stories-sub">Swipe to watch · tap to play</div>
          </div>
          <button className="sk-btn-ghost">+ Add Video</button>
        </div>
        <div className="sk-stories-strip">
          <div className="sk-story-add" onClick={() => {}}>
            <div className="sk-story-add-ring">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4v10M4 9h10" stroke="#bc3f2e" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="sk-story-add-label">Add<br />Video</span>
          </div>
          {[0, 1, 2].map(i => (
            <div className="sk-story-ph" key={i}>
              <div className="sk-story-ph-inner">
                <div className="sk-story-ph-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#ffb7c5" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#ffb7c5" strokeWidth="0.9" />
                  </svg>
                </div>
                <div className="sk-story-ph-txt">Coming<br />soon</div>
              </div>
            </div>
          ))}
        </div>

        {/* UPLOAD */}
        <SectionDivider label="Share Your Photos" />
        <div className="sk-upload">
          <button
            className="sk-btn-upload"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 12l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 19h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M7 10.5A5 5 0 0 1 17 10.5" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            Upload Photos
          </button>
          <span className="sk-upload-hint">JPEG · PNG · WEBP · Up to 5 MB · Max 20 photos</span>
          <input
            ref={fileInputRef} type="file" multiple accept="image/*"
            style={{ display: "none" }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
          />

          {previews.length > 0 && (
            <div className="sk-preview-sec">
              <div className="sk-preview-label">
                {previews.length} photo{previews.length !== 1 ? "s" : ""} ready to send
              </div>
              <div className="sk-preview-grid">
                {previews.map(p => (
                  <div className="sk-preview-item" key={p.id}>
                    <img src={p.url} alt="preview" />
                    <button className="sk-preview-remove" onClick={() => removePreview(p.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previews.length > 0 && (
            <div className="sk-send-bar">
              <button className="sk-btn-send">Send to Gallery</button>
              <div className="sk-send-hint">
                {previews.length} photo{previews.length !== 1 ? "s" : ""} will be shared with all guests
              </div>
            </div>
          )}
        </div>

        {/* GALLERY */}
        <InnerDivider label="Shared Memories" />

        <div className="sk-card">
          <div className="sk-gallery-panel">
            <div className="sk-gallery-bar">
              <div>
                <div className="sk-gallery-title">Photo Gallery</div>
                <div className="sk-gallery-sub">Every frame, forever</div>
              </div>
              <div className="sk-gallery-actions">
                <button
                  className={\`sk-btn-action\${selectMode ? " active" : ""}\`}
                  onClick={toggleSelectMode}
                >
                  {selectMode ? "Done" : "Select"}
                </button>
                {selectMode && photos.length > 0 && (
                  <button className="sk-btn-action" onClick={selectAll}>
                    {selected.size === photos.length ? "Deselect All" : "Select All"}
                  </button>
                )}
                {selected.size > 0 && (
                  <button className="sk-btn-action dl">
                    Download ({selected.size})
                  </button>
                )}
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="sk-no-photos">
                <div className="sk-no-photos-ring">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#ffb7c5" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#ffb7c5" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#ffb7c5" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="sk-no-photos-txt">No photos yet</div>
                <div className="sk-no-photos-hint">Be the first to share a memory</div>
              </div>
            ) : (
              <>
                <div className={\`sk-photo-grid\${selectMode ? " sk-selection-mode" : ""}\`}>
                  {visiblePhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className={\`sk-photo-item\${idx === 0 ? " featured" : ""}\${selected.has(idx) ? " selected" : ""}\`}
                      onClick={() => openLightbox(idx)}
                    >
                      <img src={photo.url} alt="wedding photo" loading="lazy" />
                      <div className="sk-photo-hover">
                        <div className="sk-photo-view-icon">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="5.5" cy="5.5" r="3.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
                            <path d="M8 8l2.5 2.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                      <div className="sk-select-check">
                        {selected.has(idx) && (
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 4.5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sk-view-all-wrap">
                  <button className="sk-btn-view-all" onClick={() => setShowAll(v => !v)}>
                    {showAll ? "Show Less" : \`View All · \${photos.length} Photos\`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="sk-footer">
          <div className="sk-footer-names">Claudine et Mark · 2026</div>
          <div className="sk-footer-gem" />
        </footer>
      </div>

      {/* LIGHTBOX */}
      <div className={\`sk-lightbox\${lightbox.open ? " open" : ""}\`}>
        <button className="sk-lb-close" onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="sk-lb-nav sk-lb-prev" onClick={() => navPhoto(-1)}>‹</button>
        <button className="sk-lb-nav sk-lb-next" onClick={() => navPhoto(1)}>›</button>
        <div className="sk-lb-img-wrap">
          {lightbox.open && currentImg && (
            <img
              className={\`sk-lb-img\${lightbox.zoomed ? " zoomed" : ""}\`}
              src={currentImg.url} alt="wedding photo"
            />
          )}
        </div>
        <div className="sk-lb-bottom">
          <span className="sk-lb-counter">{lightbox.idx + 1} / {photos.length}</span>
          <button
            className="sk-lb-zoom"
            onClick={() => setLightbox(l => ({ ...l, zoomed: !l.zoomed }))}
          >
            {lightbox.zoomed ? "Zoom Out" : "Zoom In"}
          </button>
        </div>
      </div>
    </>
  );
}
`;

// ── Write it ───────────────────────────────────────────────────────────────
writeFileSync(TARGET, NEW_CONTENT, "utf8");
console.log("✅  WeddingGallery.js has been completely overhauled.");
console.log("    Design: Sakura Pink × Gold Leaf × Japan Red × Cormorant Garamond");
console.log("    Run:  npm start   to preview the changes.");
