/**
 * patch-premium.mjs
 * Wedding Gallery — "Vellum & Verdigris" design overhaul
 *
 * Run from the project root:
 *   node patch-premium.mjs
 *
 * What this patch does:
 *  1. Rewrites LUXURY_CSS inside WeddingGallery.js with a new premium design system
 *  2. Rewrites the JSX render tree with refined structure and markup
 *  3. Keeps all existing color tokens intact (rose / gold / ink palette)
 *  4. Upgrades typography to Cormorant Infant + DM Serif Display (already available)
 *  5. Replaces generic patterns with distinctive, editorial-grade treatments
 *
 * Safe to run multiple times — it writes an atomic backup before patching.
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET    = path.join(__dirname, "src", "WeddingGallery.js");
const BACKUP    = path.join(__dirname, "src", "WeddingGallery.js.bak");

/* ─── Guard ─────────────────────────────────────────────────────────────── */
if (!fs.existsSync(TARGET)) {
  console.error("✗ Could not find src/WeddingGallery.js — are you in the project root?");
  process.exit(1);
}

/* ─── Backup ─────────────────────────────────────────────────────────────── */
fs.copyFileSync(TARGET, BACKUP);
console.log(`✓ Backup written → ${path.relative(__dirname, BACKUP)}`);

/* ═══════════════════════════════════════════════════════════════════════════
   NEW CSS  — "Vellum & Verdigris"
   Palette: preserved exactly from original tokens
   Type:    DM Serif Display (hero) · Cormorant Infant (display) · Jost (body)
   Signature: press-reveal hero animation · editorial 5-col photo grid ·
              engraved SVG-frame card · flush-left section eyebrows ·
              filmstrip lightbox scrubber
══════════════════════════════════════════════════════════════════════════════ */
const NEW_CSS = `
/* ── DM Serif Display (hero) · Cormorant Infant (display) · Jost (body) ─── */
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500;1,600&family=Jost:wght@200;300;400;500;600&display=swap');

/* ── DESIGN TOKENS ─────────────────────────────────────────────────────── */
:root {
  /* Palette — original, unchanged */
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

  /* Typography — overhauled */
  --font-hero:    'DM Serif Display', Georgia, serif;
  --font-display: 'Cormorant Infant', Georgia, serif;
  --font-body:    'Jost', system-ui, sans-serif;

  /* Motion */
  --ease-out:       cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-cinematic: cubic-bezier(0.22, 0.68, 0, 1.2);
  --ease-press:     cubic-bezier(0.77, 0, 0.175, 1);
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

/* Single-pixel elegant scrollbar */
::-webkit-scrollbar { width: 1px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--pink-border); }

/* ── KEYFRAMES ─────────────────────────────────────────────────────────── */

/* Press-reveal: clip from bottom, like ink absorbed into vellum */
@keyframes pressReveal {
  from { clip-path: inset(0 0 100% 0); opacity: 0.4; }
  to   { clip-path: inset(0 0 0% 0);   opacity: 1; }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.97) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes lineExpand {
  from { transform: scaleX(0); transform-origin: left; }
  to   { transform: scaleX(1); transform-origin: left; }
}

@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}

@keyframes goldRipple {
  0%   { box-shadow: 0 0 0 0 rgba(184,144,74,0.45); }
  70%  { box-shadow: 0 0 0 10px rgba(184,144,74,0); }
  100% { box-shadow: 0 0 0 0 rgba(184,144,74,0); }
}

/* ── AMBIENT BACKGROUND ─────────────────────────────────────────────────── */
.lux-bg-canvas {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; overflow: hidden;
}

/* Layered radial wash — warmer toward top, deeper rose at bottom edge */
.lux-bg-canvas::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 90% 55% at 50% -5%,  rgba(249,213,226,0.60) 0%, transparent 68%),
    radial-gradient(ellipse 55% 45% at 92% 95%,  rgba(196,116,142,0.16) 0%, transparent 58%),
    radial-gradient(ellipse 45% 35% at 5%  55%,  rgba(184,144,74,0.07)  0%, transparent 52%),
    radial-gradient(ellipse 70% 30% at 50% 110%, rgba(196,116,142,0.09) 0%, transparent 50%);
}

/* Fine grain texture — linen-like, more visible than before */
.lux-bg-canvas::after {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.032'/%3E%3C/svg%3E");
  background-size: 512px 512px;
  mix-blend-mode: multiply;
  opacity: 0.75;
}

/* ── PAGE WRAPPER ───────────────────────────────────────────────────────── */
.lux-page {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px 140px;
}
@media (min-width: 640px)  { .lux-page { padding: 0 40px 140px; } }
@media (min-width: 960px)  { .lux-page { padding: 0 56px 140px; } }

/* ── HERO ───────────────────────────────────────────────────────────────── */
.lux-hero {
  padding: 96px 0 72px;
  text-align: center;
}

/* Eyebrow — tiny spaced caps, flanked by hairlines that grow outward */
.lux-pretitle {
  font-family: var(--font-body);
  font-size: 9.5px; font-weight: 500;
  letter-spacing: 0.44em; text-transform: uppercase;
  color: var(--gold);
  display: flex; align-items: center; justify-content: center; gap: 20px;
  margin-bottom: 36px;
  animation: fadeIn 1.4s ease 0.1s both;
}
.lux-pretitle::before, .lux-pretitle::after {
  content: ''; display: block; height: 0.5px;
  width: clamp(24px, 5vw, 48px);
  animation: lineExpand 1.6s var(--ease-out) 0.3s both;
}
.lux-pretitle::before { background: linear-gradient(90deg, transparent, var(--gold)); }
.lux-pretitle::after  { background: linear-gradient(90deg, var(--gold), transparent); }

/* Names — DM Serif Display, press-reveal per name */
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
}

/* Connector row — date + location typography replacing the ampersand */
.lux-connector-row {
  display: flex; align-items: center; justify-content: center; gap: 0;
  margin: 20px 0 6px;
  animation: fadeIn 1s ease 0.9s both;
  width: 100%;
}
.lux-connector-rule {
  flex: 1; height: 0.5px; max-width: 80px;
  background: linear-gradient(90deg, transparent, var(--gold-border));
}
.lux-connector-rule.r { background: linear-gradient(90deg, var(--gold-border), transparent); }
.lux-connector-center {
  display: flex; flex-direction: column; align-items: center;
  padding: 0 20px; gap: 4px;
}
.lux-connector-amp {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(13px, 2.8vw, 18px);
  color: var(--gold); letter-spacing: 0.18em;
  line-height: 1;
}
.lux-connector-dot { width: 3px; height: 3px; background: var(--gold-border); border-radius: 50%; }

/* Date stamp */
.lux-date-row {
  margin-top: 22px;
  animation: fadeIn 1s ease 1.0s both;
}
.lux-date-txt {
  font-family: var(--font-body);
  font-size: 10.5px; font-weight: 400; letter-spacing: 0.32em;
  text-transform: uppercase; color: var(--ink-40);
}

/* ── INVITATION TEXT ────────────────────────────────────────────────────── */
.lux-invite-plain {
  margin: 52px auto;
  max-width: 560px;
  text-align: center;
  animation: fadeUp 1.1s var(--ease-cinematic) 0.1s both;
}
.lux-invite-body {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(15px, 3.8vw, 20px);
  line-height: 2.1; letter-spacing: 0.02em;
  color: var(--ink-60);
}

.lux-hashtag-wrap { margin-top: 28px; }
.lux-hashtag {
  font-family: var(--font-hero);
  font-style: italic; font-weight: 400;
  font-size: clamp(22px, 6vw, 44px);
  line-height: 1.1; letter-spacing: -0.01em;
  display: inline;
}
.lux-ht-gold { color: var(--gold); }
.lux-ht-ink  { color: var(--ink); }

.lux-cta-hint {
  margin-top: 28px;
  font-family: var(--font-body);
  font-size: 11px; font-weight: 300; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-40);
}
.lux-arrow {
  display: block; margin: 16px auto 0;
  width: 1px; height: 40px;
  background: linear-gradient(180deg, var(--gold-border), transparent);
}

/* ── SECTION EYEBROW — flush-left editorial label ───────────────────────── */
.lux-eyebrow {
  display: flex; align-items: center; gap: 14px;
  margin: 64px 0 20px;
}
.lux-eyebrow-label {
  font-family: var(--font-body);
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.38em;
  text-transform: uppercase; color: var(--pink-dark);
  white-space: nowrap;
}
.lux-eyebrow-rule {
  flex: 1; height: 0.5px;
  background: linear-gradient(90deg, rgba(196,116,142,0.35), transparent);
}

/* ── INNER SECTION LABEL — offset, reduced ──────────────────────────────── */
.lux-inner-label-row {
  display: flex; align-items: center; gap: 10px;
  margin: 32px 0 20px;
  padding: 0 4px;
}
.lux-inner-label-txt {
  font-family: var(--font-body);
  font-size: 9px; font-weight: 500; letter-spacing: 0.30em;
  text-transform: uppercase; color: var(--ink-40); white-space: nowrap;
}
.lux-inner-label-rule {
  flex: 1; height: 0.5px;
  background: linear-gradient(90deg, rgba(184,144,74,0.20), transparent);
}

/* ── VIDEO MOMENTS ──────────────────────────────────────────────────────── */
.lux-stories-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 14px; flex-wrap: wrap; gap: 10px;
}
.lux-stories-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 400;
  font-size: clamp(18px, 4.2vw, 24px); color: var(--ink);
  letter-spacing: 0.01em;
}
.lux-stories-sub {
  font-family: var(--font-body);
  font-size: 11.5px; font-weight: 300; letter-spacing: 0.04em;
  color: var(--ink-40); margin-top: 5px;
}
.lux-btn-ghost {
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  letter-spacing: 0.18em; text-transform: uppercase;
  padding: 9px 16px; background: transparent;
  border: 0.5px solid var(--gold-border); color: var(--gold);
  cursor: pointer; transition: all .3s;
}
.lux-btn-ghost:hover { background: var(--gold-glow); border-color: var(--gold); }

/* Stories strip */
.lux-stories-strip {
  display: flex; gap: 10px; overflow-x: auto;
  padding: 4px 2px 18px; scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.lux-stories-strip::-webkit-scrollbar { height: 1px; }
.lux-stories-strip::-webkit-scrollbar-thumb { background: var(--gold-border); }

/* Story tiles — now portrait-ratio with heavier border presence */
.lux-story-add {
  flex-shrink: 0; width: 96px; height: 170px;
  background: linear-gradient(160deg, var(--white-off) 0%, rgba(252,232,239,0.55) 100%);
  border: 0.5px solid var(--pink-border);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; cursor: pointer; transition: all .35s var(--ease-out); scroll-snap-align: start;
  box-shadow: 0 2px 12px var(--pink-shadow), 0 1px 0 rgba(255,255,255,0.7) inset;
  position: relative;
}
.lux-story-add::after {
  content: '';
  position: absolute; inset: 4px;
  border: 0.5px solid rgba(196,116,142,0.12);
  pointer-events: none;
}
.lux-story-add:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 40px var(--pink-shadow), 0 1px 0 rgba(255,255,255,0.8) inset;
}
.lux-story-add-ring {
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(196,116,142,0.07);
  border: 0.5px solid rgba(184,144,74,0.35);
  display: flex; align-items: center; justify-content: center; transition: all .3s;
}
.lux-story-add:hover .lux-story-add-ring { animation: goldRipple 1.3s ease-out infinite; }
.lux-story-add-label {
  font-family: var(--font-body);
  font-size: 10.5px; font-weight: 400; letter-spacing: 0.07em;
  color: var(--ink-60); text-align: center; line-height: 1.6;
}

.lux-story-ph {
  flex-shrink: 0; width: 96px; height: 170px;
  scroll-snap-align: start; overflow: hidden; position: relative;
  background: linear-gradient(160deg, var(--white-off) 0%, rgba(249,213,226,0.45) 100%);
  border: 0.5px solid var(--pink-border);
  box-shadow: 0 2px 12px var(--pink-shadow), 0 1px 0 rgba(255,255,255,0.7) inset;
}
.lux-story-ph-inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
}
.lux-story-ph-icon {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(196,116,142,0.06);
  border: 0.5px dashed rgba(196,116,142,0.45);
  display: flex; align-items: center; justify-content: center;
}
.lux-story-ph-txt {
  font-family: var(--font-body);
  font-size: 10.5px; font-weight: 300; letter-spacing: 0.05em;
  color: var(--ink-40); text-align: center;
}
.lux-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
  background-size: 200%; animation: shimmer 3.8s ease-in-out infinite; pointer-events: none;
}

@media (min-width: 480px) {
  .lux-story-add, .lux-story-ph { width: 112px; height: 196px; }
}

/* ── UPLOAD SECTION ─────────────────────────────────────────────────────── */
.lux-upload-simple {
  display: flex; flex-direction: column; align-items: center;
  gap: 18px; padding: 4px 0;
  animation: fadeUp 1.1s var(--ease-cinematic) 0.08s both;
}

/* Primary CTA — full-width on mobile, auto on desktop */
.lux-btn-upload {
  display: inline-flex; align-items: center; gap: 13px;
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  letter-spacing: 0.26em; text-transform: uppercase;
  padding: 18px 52px;
  background: var(--ink); color: var(--pink);
  border: none; cursor: pointer;
  transition: all .35s var(--ease-out);
  box-shadow: 0 8px 28px rgba(28,15,20,0.20), 0 1px 0 rgba(255,255,255,0.07) inset;
  position: relative; overflow: hidden;
}
/* Gold sweep on hover — restrained */
.lux-btn-upload::after {
  content: '';
  position: absolute; top: 0; left: -120%; width: 80%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(184,144,74,0.10), transparent);
  transition: left 0.55s var(--ease-out);
}
.lux-btn-upload:hover { transform: translateY(-3px); box-shadow: 0 14px 44px rgba(28,15,20,0.26); }
.lux-btn-upload:hover::after { left: 140%; }

.lux-upload-hint {
  font-family: var(--font-body);
  font-size: 10.5px; font-weight: 300; letter-spacing: 0.07em;
  color: var(--ink-40);
}

/* ── PREVIEW SECTION ────────────────────────────────────────────────────── */
.lux-preview-sec { width: 100%; margin-top: 4px; }
.lux-preview-label {
  font-family: var(--font-body);
  font-size: 9.5px; font-weight: 500; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--gold); margin-bottom: 12px;
}
.lux-preview-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(66px, 1fr)); gap: 5px;
}
.lux-preview-item {
  aspect-ratio: 1; overflow: hidden;
  position: relative; background: var(--pink-deep);
}
.lux-preview-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lux-preview-remove {
  position: absolute; inset: 0; background: rgba(28,15,20,0.50);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: .2s; border: none; color: white; font-size: 12px; cursor: pointer;
  backdrop-filter: blur(2px);
}
.lux-preview-item:hover .lux-preview-remove { opacity: 1; }

/* ── SEND BAR ───────────────────────────────────────────────────────────── */
.lux-send-bar { width: 100%; padding: 18px 0 4px; text-align: center; }
.lux-btn-send {
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  letter-spacing: 0.26em; text-transform: uppercase;
  padding: 17px 60px;
  background: linear-gradient(135deg, var(--ink) 0%, #2a111e 100%);
  color: var(--pink); border: none; cursor: pointer; transition: all .3s;
  box-shadow: 0 6px 24px rgba(28,15,20,0.22);
  position: relative; overflow: hidden;
}
.lux-btn-send::after {
  content: '';
  position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(184,144,74,0.11), transparent);
  transition: left .55s;
}
.lux-btn-send:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(28,15,20,0.28); }
.lux-btn-send:hover::after { left: 100%; }
.lux-btn-send:disabled { opacity: .38; cursor: not-allowed; transform: none; }
.lux-send-hint {
  margin-top: 10px;
  font-family: var(--font-body);
  font-size: 11.5px; font-weight: 300; letter-spacing: 0.05em; color: var(--ink-40);
}

/* ── GALLERY CARD — engraved SVG frame ──────────────────────────────────── */
.lux-card {
  background: var(--white);
  border: 0.5px solid rgba(196,116,142,0.16);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.88) inset,
    0 -1px 0 rgba(196,116,142,0.08) inset,
    0 3px 0 rgba(196,116,142,0.05),
    0 20px 60px rgba(196,116,142,0.11),
    0 44px 88px rgba(28,15,20,0.05);
  position: relative; overflow: hidden;
  animation: scaleIn 1.0s var(--ease-cinematic) 0.14s both;
}

/* Top-edge gold shimmer */
.lux-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--gold-pale) 25%, var(--gold-light) 50%, var(--gold-pale) 75%, transparent 100%);
  opacity: 0.75; z-index: 1;
}

/* Engraved inner-frame: a continuous fine inset rectangle */
.lux-card-frame {
  position: absolute; inset: 10px; pointer-events: none; z-index: 2;
}

.lux-gallery-panel { padding: 32px 24px 36px; }
@media (min-width: 480px) { .lux-gallery-panel { padding: 40px 32px 44px; } }

/* Gallery header */
.lux-gallery-bar {
  display: flex; align-items: flex-start; justify-content: space-between;
  flex-wrap: wrap; gap: 12px; margin-bottom: 24px;
}
.lux-gallery-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 400;
  font-size: clamp(19px, 4.2vw, 25px); color: var(--ink);
  letter-spacing: 0.01em;
}
.lux-gallery-sub {
  font-family: var(--font-body);
  font-size: 10.5px; font-weight: 300; letter-spacing: 0.07em;
  color: var(--ink-40); margin-top: 5px;
}
.lux-gallery-actions { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
.lux-btn-action {
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  letter-spacing: 0.16em; text-transform: uppercase;
  padding: 7px 13px; background: transparent;
  border: 0.5px solid var(--pink-border); color: var(--ink-60);
  cursor: pointer; transition: all .25s;
}
.lux-btn-action:hover { border-color: var(--pink-dark); color: var(--ink); background: rgba(196,116,142,0.05); }
.lux-btn-action.active { background: var(--ink); color: var(--pink); border-color: var(--ink); }
.lux-btn-action.dl {
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
  color: var(--white); border-color: var(--gold);
  box-shadow: 0 3px 14px var(--gold-glow);
}
.lux-btn-action.dl:hover { box-shadow: 0 6px 22px var(--gold-glow); transform: translateY(-1px); }

/* ── PHOTO GRID — editorial 5-column asymmetric ──────────────────────────
   Desktop: 5 equal columns, gap 4px
   First item: spans col 1-3, row 1-2 (large anchor)
   Items 2-3: cols 4-5 (stacked)
   Items 4-6: cols 1-2, 3, 4-5 (varied)
   Falls back to 2-col on mobile, 3-col on tablet
───────────────────────────────────────────────────────────────────────── */
.lux-photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 136px;
  gap: 4px;
}

@media (min-width: 480px) {
  .lux-photo-grid {
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 152px;
  }
}

@media (min-width: 640px) {
  .lux-photo-grid {
    grid-template-columns: repeat(5, 1fr);
    grid-auto-rows: 120px;
  }
  /* Anchor: first photo takes the left 3 cols × 2 rows */
  .lux-photo-item.featured {
    grid-column: 1 / 4;
    grid-row: 1 / 3;
  }
  /* Next two stack in the right 2 cols */
  .lux-photo-item:nth-child(2) { grid-column: 4 / 6; }
  .lux-photo-item:nth-child(3) { grid-column: 4 / 6; }
  /* Row 3: 2-col + 1-col + 2-col */
  .lux-photo-item:nth-child(4) { grid-column: 1 / 3; }
  .lux-photo-item:nth-child(5) { grid-column: 3 / 4; }
  .lux-photo-item:nth-child(6) { grid-column: 4 / 6; }
}

.lux-photo-item {
  cursor: pointer; overflow: hidden;
  background: var(--pink-mid);
  position: relative; border: 2px solid transparent; transition: all .3s var(--ease-out);
}
/* On mobile keep the featured span */
@media (max-width: 639px) {
  .lux-photo-item.featured { grid-column: span 2; grid-row: span 2; }
}

.lux-photo-item.selected { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
.lux-photo-item img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform .65s var(--ease-out), filter .3s;
}
.lux-photo-item:hover img { transform: scale(1.05); filter: brightness(1.02); }

/* Hover overlay */
.lux-photo-hover {
  position: absolute; inset: 0;
  background: linear-gradient(
    180deg,
    transparent 25%,
    rgba(28,15,20,0.18) 65%,
    rgba(28,15,20,0.48) 100%
  );
  opacity: 0; transition: opacity .35s;
  display: flex; align-items: flex-end; justify-content: flex-end; padding: 10px;
}
.lux-photo-item:hover .lux-photo-hover { opacity: 1; }
.lux-photo-view-icon {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,0.16); backdrop-filter: blur(8px);
  border: 0.5px solid rgba(255,255,255,0.40);
  display: flex; align-items: center; justify-content: center;
}

/* Selection check */
.lux-select-check {
  position: absolute; top: 7px; left: 7px;
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(255,255,255,0.90); border: 1.5px solid var(--gold);
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
.lux-no-photos { grid-column: 1/-1; padding: 72px 0; text-align: center; }
.lux-no-photos-ring {
  width: 52px; height: 52px; border-radius: 50%;
  border: 0.5px solid var(--pink-border);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 18px;
  background: rgba(196,116,142,0.05);
}
.lux-no-photos-txt {
  font-family: var(--font-display); font-style: italic;
  font-size: clamp(16px, 3.6vw, 20px); color: var(--ink-60);
}
.lux-no-photos-hint {
  font-family: var(--font-body);
  font-size: 11.5px; font-weight: 300; letter-spacing: 0.05em;
  color: var(--ink-40); margin-top: 8px;
}

/* View all */
.lux-view-all-wrap { text-align: center; margin-top: 24px; }
.lux-btn-view-all {
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  letter-spacing: 0.26em; text-transform: uppercase;
  padding: 12px 36px; background: transparent;
  border: 0.5px solid var(--gold-border); color: var(--ink-60);
  cursor: pointer; transition: .3s; position: relative; overflow: hidden;
}
.lux-btn-view-all::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(184,144,74,0.07), transparent);
  opacity: 0; transition: opacity .3s;
}
.lux-btn-view-all:hover { color: var(--gold); border-color: var(--gold); }
.lux-btn-view-all:hover::before { opacity: 1; }

/* ── FOOTER ─────────────────────────────────────────────────────────────── */
.lux-footer {
  text-align: center; margin-top: 100px; padding-top: 36px;
  display: flex; flex-direction: column; align-items: center; gap: 20px;
  animation: fadeIn 1s ease 0.6s both;
}
.lux-footer-names {
  font-family: var(--font-display); font-style: italic; font-weight: 300;
  font-size: clamp(13px, 2.8vw, 16px); color: var(--ink-40); letter-spacing: 0.10em;
}

/* ── LIGHTBOX ────────────────────────────────────────────────────────────
   Signature feature: filmstrip scrubber replaces plain counter
─────────────────────────────────────────────────────────────────────── */
.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(7, 2, 5, 0.97);
  display: none; align-items: center; justify-content: center; flex-direction: column;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.lux-lightbox.open { display: flex; animation: fadeIn .3s ease both; }

.lux-lb-close {
  position: absolute; top: 18px; right: 20px;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.55); cursor: pointer; transition: all .25s;
  display: flex; align-items: center; justify-content: center;
}
.lux-lb-close:hover { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.30); }

.lux-lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px;
  background: transparent; border: 0.5px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.45); font-size: 22px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .25s;
}
.lux-lb-nav:hover { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.34); }
.lux-lb-prev { left: 12px; }
.lux-lb-next { right: 12px; }

.lux-lb-img-wrap { max-width: 90vw; max-height: 72vh; display: flex; align-items: center; justify-content: center; }
.lux-lb-img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  transition: transform .4s var(--ease-cinematic);
  box-shadow: 0 40px 80px rgba(0,0,0,0.55);
}
.lux-lb-img.zoomed { transform: scale(2.2); }

/* Filmstrip scrubber */
.lux-lb-filmstrip {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: center;
  gap: 3px; padding: 12px 16px 18px;
  background: linear-gradient(0deg, rgba(0,0,0,0.72) 0%, transparent 100%);
  overflow-x: auto; -webkit-overflow-scrolling: touch;
}
.lux-lb-filmstrip::-webkit-scrollbar { display: none; }

.lux-lb-thumb {
  flex-shrink: 0;
  width: 38px; height: 28px;
  background: rgba(255,255,255,0.10);
  border: 1.5px solid transparent;
  overflow: hidden; cursor: pointer; transition: all .25s; opacity: 0.52;
}
.lux-lb-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lux-lb-thumb.active { border-color: var(--gold); opacity: 1; box-shadow: 0 0 0 1px rgba(184,144,74,0.5); }
.lux-lb-thumb:hover:not(.active) { opacity: 0.82; border-color: rgba(255,255,255,0.25); }

/* Zoom toggle — floats above filmstrip */
.lux-lb-zoom {
  position: absolute; bottom: 80px;
  background: transparent; border: 0.5px solid rgba(255,255,255,0.16);
  color: rgba(255,255,255,0.42);
  font-family: var(--font-body); font-size: 10px; font-weight: 400;
  letter-spacing: 0.16em; text-transform: uppercase;
  padding: 8px 18px; cursor: pointer; transition: all .25s;
}
.lux-lb-zoom:hover { color: #fff; border-color: rgba(184,144,74,0.55); }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   NEW JSX  — refined markup for each section
══════════════════════════════════════════════════════════════════════════════ */

/* ── 1. Replace entire LUXURY_CSS string ─────────────────────────────────── */
const ORIGINAL_IMPORTS = `import { useState, useEffect, useRef } from "react";

const LUXURY_CSS = \``;

const NEW_IMPORTS = `import { useState, useEffect, useRef } from "react";

const LUXURY_CSS = \``;

/* ── 2. Hero JSX — new names structure with outlined second name ──────────── */
const OLD_HERO = `        {/* HERO */}
        <div className="lux-hero">
          <div className="lux-pretitle">Wedding Gallery</div>
          <div className="lux-names">
            <span className="lux-name">Claudine</span>
            <div className="lux-amp-row">
              <div className="lux-amp-rule l" />
              <span className="lux-amp">&amp;</span>
              <div className="lux-amp-rule r" />
            </div>
            <span className="lux-name">Mark</span>
          </div>
          <div className="lux-date-row">
            <div className="lux-pip" />
            <span className="lux-date-txt">Forever begins · 2026</span>
            <div className="lux-pip" />
          </div>
        </div>`;

const NEW_HERO = `        {/* HERO */}
        <div className="lux-hero">
          <div className="lux-pretitle">Wedding Gallery</div>
          <div className="lux-names">
            <span className="lux-name">Claudine</span>
            <div className="lux-connector-row">
              <div className="lux-connector-rule" />
              <div className="lux-connector-center">
                <span className="lux-connector-amp">and</span>
                <div className="lux-connector-dot" />
              </div>
              <div className="lux-connector-rule r" />
            </div>
            <span className="lux-name">Mark</span>
          </div>
          <div className="lux-date-row">
            <span className="lux-date-txt">Forever begins · 2026</span>
          </div>
        </div>`;

/* ── 3. Section dividers → eyebrow labels ────────────────────────────────── */
const OLD_VIDEO_DIV = `        {/* VIDEO MOMENTS */}
        <SectionDivider label="Video Moments" />`;
const NEW_VIDEO_DIV = `        {/* VIDEO MOMENTS */}
        <div className="lux-eyebrow"><span className="lux-eyebrow-label">Video Moments</span><div className="lux-eyebrow-rule" /></div>`;

const OLD_UPLOAD_DIV = `        <SectionDivider label="Share Your Photos" />`;
const NEW_UPLOAD_DIV = `        <div className="lux-eyebrow"><span className="lux-eyebrow-label">Share Your Photos</span><div className="lux-eyebrow-rule" /></div>`;

const OLD_SHARED_DIV = `        {/* GALLERY — inside white card/widget */}
        <InnerDivider label="Shared Memories" />`;
const NEW_SHARED_DIV = `        {/* GALLERY — inside white card/widget */}
        <div className="lux-inner-label-row"><span className="lux-inner-label-txt">Shared Memories</span><div className="lux-inner-label-rule" /></div>`;

/* ── 4. Gallery card — replace corner brackets with engraved SVG frame ───── */
const OLD_CARD_OPEN = `        <div className="lux-card">
          <div className="lux-corner tl" /><div className="lux-corner tr" />
          <div className="lux-corner bl" /><div className="lux-corner br" />`;

const NEW_CARD_OPEN = `        <div className="lux-card">
          {/* Engraved hairline frame — continuous with notched corners */}
          <svg className="lux-card-frame" viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{position:'absolute',inset:10,width:'calc(100% - 20px)',height:'calc(100% - 20px)',pointerEvents:'none',zIndex:2}}>
            <rect x="0.5" y="0.5" width="99" height="99" fill="none"
              stroke="rgba(184,144,74,0.28)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
            {/* Corner notches */}
            {[['0.5','0.5'],['99.5','0.5'],['0.5','99.5'],['99.5','99.5']].map(([cx,cy],i)=>(
              <circle key={i} cx={cx} cy={cy} r="1.5" fill="none"
                stroke="rgba(184,144,74,0.45)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>`;

/* ── 5. Lightbox bottom — filmstrip replacing plain counter + zoom ────────── */
const OLD_LB_BOTTOM = `        <div className="lux-lb-bottom">
          <span className="lux-lb-counter">{lightbox.idx + 1} / {photos.length}</span>
          <button
            className="lux-lb-zoom"
            onClick={() => setLightbox(l => ({ ...l, zoomed: !l.zoomed }))}
          >
            {lightbox.zoomed ? "Zoom Out" : "Zoom In"}
          </button>
        </div>`;

const NEW_LB_BOTTOM = `        <button
          className="lux-lb-zoom"
          onClick={() => setLightbox(l => ({ ...l, zoomed: !l.zoomed }))}
        >
          {lightbox.zoomed ? "Zoom Out" : "Zoom In"}
        </button>
        <div className="lux-lb-filmstrip">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className={\`lux-lb-thumb\${lightbox.idx === idx ? " active" : ""}\`}
              onClick={() => setLightbox(l => ({ ...l, idx, zoomed: false }))}
            >
              <img src={photo.url} alt="" />
            </div>
          ))}
        </div>`;

/* ════════════════════════════════════════════════════════════════════════════
   APPLY PATCHES
   Strategy: detect line endings, normalise to LF for matching, restore at end
═══════════════════════════════════════════════════════════════════════════ */
const rawBytes = fs.readFileSync(TARGET, "utf8");

// Detect whether the file uses CRLF (Windows git checkout) or LF
const hasCRLF  = rawBytes.includes("\r\n");
// Normalise to LF for all matching/replacing
let src = hasCRLF ? rawBytes.replace(/\r\n/g, "\n") : rawBytes;

console.log(`  Line endings: ${hasCRLF ? "CRLF (Windows) — normalising for patch" : "LF (Unix)"}`);

// ── Patch 1: Replace the CSS block ────────────────────────────────────────
// Locate "const LUXURY_CSS = `" … closing backtick before "const MOCK_PHOTOS"
const CSS_OPEN     = "const LUXURY_CSS = `\n";
const CSS_CLOSE_RE = /`\s*\n\s*const MOCK_PHOTOS/;

const cssOpenIdx = src.indexOf(CSS_OPEN);
if (cssOpenIdx === -1) throw new Error("CSS block open marker not found — is this the right file?");

const afterCssOpen    = src.indexOf("\n", cssOpenIdx) + 1;
const cssCloseMatch   = src.slice(afterCssOpen).search(CSS_CLOSE_RE);
if (cssCloseMatch === -1) throw new Error("CSS block close marker not found");

const cssCloseIdx = afterCssOpen + cssCloseMatch;

src =
  src.slice(0, cssOpenIdx) +
  "const LUXURY_CSS = `" + NEW_CSS + "`\n\n" +
  src.slice(cssCloseIdx).replace(/^`[ \t]*\n/, "");

console.log("✓ CSS block replaced");

// ── Helper: patch with clear diagnostics ─────────────────────────────────
function applyPatch(oldStr, newStr, label) {
  if (src.includes(oldStr)) {
    src = src.replace(oldStr, newStr);
    console.log(`✓ ${label}`);
  } else {
    console.warn(`⚠  ${label} — marker not found (may already be patched)`);
  }
}

// ── Patch 2: Hero JSX ────────────────────────────────────────────────────
applyPatch(OLD_HERO, NEW_HERO, "Hero JSX updated");

// ── Patch 3: Section dividers → eyebrow labels ───────────────────────────
applyPatch(OLD_VIDEO_DIV,  NEW_VIDEO_DIV,  "Video Moments eyebrow");
applyPatch(OLD_UPLOAD_DIV, NEW_UPLOAD_DIV, "Upload eyebrow");
applyPatch(OLD_SHARED_DIV, NEW_SHARED_DIV, "Shared Memories label");

// ── Patch 4: Gallery card corners → engraved SVG frame ───────────────────
applyPatch(OLD_CARD_OPEN, NEW_CARD_OPEN, "Gallery card engraved frame");

// ── Patch 5: Lightbox bottom → filmstrip ─────────────────────────────────
applyPatch(OLD_LB_BOTTOM, NEW_LB_BOTTOM, "Lightbox filmstrip");

// ── Write — restore original line endings ────────────────────────────────
const output = hasCRLF ? src.replace(/\n/g, "\r\n") : src;
fs.writeFileSync(TARGET, output, "utf8");

console.log(`\n✓ Patch complete → ${path.relative(__dirname, TARGET)}`);
console.log("  Run  npm start  to preview the updated design.");
console.log("  Original preserved at WeddingGallery.js.bak\n");
