import { useState, useEffect, useRef } from "react";
import { flushSync } from 'react-dom';

const LUXURY_CSS = `
/* ── Fraunces (hero + display) · Manrope (body) ─────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,500;1,9..144,600;1,9..144,700&family=Manrope:wght@200;300;400;500;600&display=swap');

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
  --font-hero:    'Fraunces', Georgia, serif;
  --font-display: 'Fraunces', Georgia, serif;
  --font-body:    'Manrope', system-ui, sans-serif;

  /* Motion */
  --ease-out:       cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-cinematic: cubic-bezier(0.22, 0.68, 0, 1.2);
  --ease-press:     cubic-bezier(0.77, 0, 0.175, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; overflow-x: hidden; width: 100%; }

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
  padding: 0 12px 140px;
}
@media (min-width: 640px)  { .lux-page { padding: 0 40px 140px; } }
@media (min-width: 960px)  { .lux-page { padding: 0 56px 140px; } }
@media (max-width: 479px)  { .lux-page { padding: 0 8px 72px; } }

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

/* Names — weight-contrast pair: heavy display vs. delicate serif */
.lux-names { display: flex; flex-direction: column; align-items: center; overflow: visible; }

.lux-name {
  font-family: var(--font-hero);
  font-style: italic; font-weight: 400;
  font-size: clamp(72px, 18vw, 150px);
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
  font-size: clamp(78px, 20vw, 164px);
  letter-spacing: 0.015em;
  padding-right: 0.12em; /* room for italic glyph overhang — prevents 'k' clip */
  color: var(--ink-60);
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

/* Play-icon overlay on video story thumbnails */
.lux-story-play {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.lux-story-play::before {
  content: '';
  position: absolute; width: 38px; height: 38px; border-radius: 50%;
  background: rgba(0,0,0,0.32); border: 0.5px solid rgba(255,255,255,0.5);
}
.lux-story-play svg { position: relative; z-index: 1; margin-left: 2px; }

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
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 11px 20px;
  background: var(--ink); color: var(--pink);
  border: none; cursor: pointer;
  transition: all .35s var(--ease-out);
  box-shadow: 0 8px 28px rgba(28,15,20,0.20), 0 1px 0 rgba(255,255,255,0.07) inset;
  position: relative; overflow: hidden;
}
@media (min-width: 640px) {
  .lux-btn-upload { font-size: 11px; letter-spacing: 0.26em; padding: 18px 52px; }
}
/* Gold sweep on hover — restrained */
.lux-btn-upload::after {
  content: '';
  position: absolute; top: 0; left: -120%; width: 80%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(184,144,74,0.10), transparent);
  transition: left 0.55s var(--ease-out);
}
.lux-btn-upload:hover { transform: translateY(-3px); box-shadow: 0 14px 44px rgba(28,15,20,0.26); }
@media (hover: none) { .lux-btn-upload:hover { transform: none; } }
.lux-btn-upload:hover::after { left: 140%; }

/* Corner registration marks — photo-frame L-brackets at each corner */
.lux-upload-corner {
  position: absolute;
  width: 8px; height: 8px;
  pointer-events: none; z-index: 2;
  opacity: 0.55;
  transition: opacity 0.35s var(--ease-out);
}
.lux-btn-upload:hover .lux-upload-corner { opacity: 1; }
.lux-upload-corner::before,
.lux-upload-corner::after {
  content: '';
  position: absolute;
  background: var(--gold-light);
}
.lux-upload-corner::before { width: 1px; height: 8px; }
.lux-upload-corner::after  { width: 8px; height: 1px; }
.lux-upload-corner.tl { top: 8px; left: 8px; }
.lux-upload-corner.tl::before { top: 0; left: 0; }
.lux-upload-corner.tl::after  { top: 0; left: 0; }
.lux-upload-corner.tr { top: 8px; right: 8px; }
.lux-upload-corner.tr::before { top: 0; right: 0; }
.lux-upload-corner.tr::after  { top: 0; right: 0; }
.lux-upload-corner.bl { bottom: 8px; left: 8px; }
.lux-upload-corner.bl::before { bottom: 0; left: 0; }
.lux-upload-corner.bl::after  { bottom: 0; left: 0; }
.lux-upload-corner.br { bottom: 8px; right: 8px; }
.lux-upload-corner.br::before { bottom: 0; right: 0; }
.lux-upload-corner.br::after  { bottom: 0; right: 0; }

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
.lux-preview-item img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block; }
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

/* ── GUEST NAME FIELD — required before any upload, remembered locally so
   a returning guest never has to retype it ─────────────────────────────── */
.lux-name-field { margin-bottom: 14px; text-align: left; }
.lux-name-label {
  display: block; font-family: var(--font-body); font-size: 10px; font-weight: 400;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-40); margin-bottom: 6px;
}
.lux-name-input {
  width: 100%; padding: 12px 14px; font-family: var(--font-body); font-size: 14px;
  color: var(--ink); background: rgba(255,255,255,0.65);
  border: 1px solid var(--pink-border); border-radius: 4px; outline: none;
  transition: border-color .2s, background .2s;
}
.lux-name-input:focus { border-color: var(--gold); background: var(--white); }
.lux-name-field-video { margin: 10px 2px 4px; max-width: 360px; }
.lux-name-error { color: #c45; font-size: 11px; margin-top: 6px; }

/* ── GALLERY CARD ─────────────────────────────────────────────────────── */
.lux-card {
  background: var(--white);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.88) inset,
    0 -1px 0 rgba(196,116,142,0.08) inset,
    0 3px 0 rgba(196,116,142,0.05),
    0 20px 60px rgba(196,116,142,0.11),
    0 44px 88px rgba(28,15,20,0.05);
  position: relative; overflow: hidden;
  animation: scaleIn 1.0s var(--ease-cinematic) 0.14s both;
}

.lux-gallery-panel { padding: 32px 24px 36px; }
@media (min-width: 480px) { .lux-gallery-panel { padding: 40px 32px 44px; } }

/* Divider between the upload block and the Photo Gallery header */
.lux-gallery-divider {
  height: 0.5px;
  background: linear-gradient(90deg, transparent, rgba(196,116,142,0.22), transparent);
  margin: 32px 0 28px;
}

/* Gallery header */
.lux-gallery-bar {
  display: flex; align-items: center; justify-content: space-between;
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
  grid-auto-rows: 160px;
  gap: 8px;
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
  height: 100%;
}
/* On mobile, featured photo is a single normal-sized tile like the rest */
@media (max-width: 639px) {
  .lux-photo-item.featured { grid-column: span 1; grid-row: span 1; }
}

.lux-photo-item.selected { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
.lux-photo-item img {
  width: 100% !important; height: 100% !important; object-fit: cover !important; display: block;
  transition: transform .65s var(--ease-out), filter .3s;
}
.lux-photo-item:hover img { transform: scale(1.05); opacity: 0.96; }
@media (hover: none) { .lux-photo-item:hover img { transform: none; filter: none; } }

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
  font-family: var(--font-body); font-size: 9px; font-weight: 500;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 9px 20px; background: transparent;
  border: 0.5px solid var(--gold-border); color: var(--ink-60);
  cursor: pointer; transition: .3s; position: relative; overflow: hidden;
}
@media (min-width: 640px) {
  .lux-btn-view-all { font-size: 10px; letter-spacing: 0.26em; padding: 12px 36px; }
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
@keyframes lbSlideIn {
  from { opacity: 0; transform: scale(0.97) translateY(10px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  width: 100vw; height: 100vh; height: 100dvh;
  background: #000;
  display: none;
  contain: layout style;
  /* Desktop: two-pane side-by-side like Instagram */
  flex-direction: row; align-items: stretch;
}
.lux-lightbox.open {
  display: flex;
  animation: lbSlideIn .28s var(--ease-cinematic) both;
}

/* ── LEFT PANE: image canvas ─────────────────────────────────────────── */
.lux-lb-image-pane {
  flex: 1; min-width: 0;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  background: #000; overflow: hidden;
  /* Tell iOS we handle horizontal gestures here — prevents pointercancel */
  touch-action: pan-y;
}

/* ── RIGHT PANE: social sidebar (desktop only) ───────────────────────── */
.lux-lb-sidebar {
  width: 340px; flex-shrink: 0;
  background: #111; border-left: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.lux-lb-sidebar-header {
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; gap: 10px;
}
.lux-lb-sidebar-credit {
  font-family: var(--font-body); font-size: 13px; font-weight: 500;
  color: #fff; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lux-lb-sidebar-sub {
  font-family: var(--font-body); font-size: 11px; color: rgba(255,255,255,0.45);
  margin-top: 1px;
}
.lux-lb-sidebar-body {
  flex: 1; overflow-y: auto; padding: 0;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.14) transparent;
}
.lux-lb-sidebar-body::-webkit-scrollbar { width: 3px; }
.lux-lb-sidebar-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px; }

/* Mobile: hide sidebar, show bottom-sheet social panel instead */
@media (max-width: 900px) {
  .lux-lb-sidebar { display: none; }
  .lux-lightbox { flex-direction: column; }
  .lux-lb-image-pane { flex: 1; }
}

/* Top bar — gradient fade like Facebook's photo-viewer header. Holds the
   uploader credit + position counter so the canvas below can be a true
   full-bleed black letterbox with zero competing chrome. */
.lux-lb-topbar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 5;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 70px 16px 20px;
  background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%);
  pointer-events: none;
}
.lux-lb-credit {
  font-family: var(--font-body); font-size: 12px; font-weight: 400;
  color: rgba(255,255,255,0.78); letter-spacing: 0.02em;
}
.lux-lb-credit b { color: #fff; font-weight: 500; }
.lux-lb-counter {
  font-family: var(--font-body); font-size: 11px; font-weight: 400;
  color: rgba(255,255,255,0.55); letter-spacing: 0.06em; white-space: nowrap;
}

.lux-lb-close {
  position: absolute; top: 14px; right: 16px; z-index: 6;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(0,0,0,0.4); border: none;
  color: rgba(255,255,255,0.85); cursor: pointer; transition: all .2s;
  display: flex; align-items: center; justify-content: center;
}
.lux-lb-close:hover { background: rgba(0,0,0,0.65); color: #fff; }

/* Facebook-style circular nav — solid dark disc, white chevron, always
   visible on pointer devices; hidden on touch (see hover:none rule below)
   in favor of the native swipe gesture, exactly like Facebook's mobile
   photo viewer. */
.lux-lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; z-index: 4; border-radius: 50%;
  background: rgba(0,0,0,0.4); border: none;
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.lux-lb-nav:hover { background: rgba(0,0,0,0.65); }
.lux-lb-prev { left: 20px; }
.lux-lb-next { right: 20px; }

/* ── Lightbox image strip — three slides side-by-side (prev · cur · next)
   Swiping moves the whole strip, so you always see the adjacent photo
   sliding in from the edge — exactly like Instagram / Facebook web viewer. */
.lux-lb-img-wrap {
  /* Fill the full image pane; the strip inside scrolls horizontally */
  width: 100%; height: 100%;
  overflow: hidden;
  position: relative;
  touch-action: pan-y;
}
/* The strip: three 100%-wide slots laid out in a row */
.lux-lb-strip {
  display: flex;
  width: 300%;
  height: 100%;
  /* Resting position: centre slot is in view */
  transform: translateX(-33.3333%);
  will-change: transform;
  /* FB/IG timing: snappy deceleration, no bounce */
  transition: transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.lux-lb-strip.dragging { transition: none; }
/* Programmatic slide: same curve, block pointer events during flight */
.lux-lb-strip.sliding  {
  transition: transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  pointer-events: none;
}
/* Each slot is exactly 1/3 of the strip = 100vw of the image pane */
.lux-lb-slot {
  width: 33.3333%;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  height: 100%;
  background: #000;
}
.lux-lb-slot img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  user-select: none; -webkit-user-drag: none;
  display: block;
}
/* Zoom: applied to the centre slot's image only */
.lux-lb-slot.current img.zoomed { transform: scale(2.2); transition: transform .4s var(--ease-cinematic); }
/* Legacy single-image class kept for safety (no longer rendered) */
.lux-lb-img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }

/* Lightbox bottom-right icon bar — same pill style as reels bar */
.lux-lb-icon-bar {
  position: absolute;
  right: 14px;
  bottom: 28px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  pointer-events: none;
}
.lux-lb-icon-bar .lux-reel-icon-btn { pointer-events: all; }
/* On desktop the sidebar handles reactions/comments — hide the bar */
@media (min-width: 901px) { .lux-lb-icon-bar { display: none; } }

/* ── FLOATING PETALS ────────────────────────────────────────────── */
@keyframes petalFall {
  0%   { transform: translateY(-60px) translateX(0)              rotate(0deg); opacity: 0; }
  8%   { opacity: 0.85; }
  92%  { opacity: 0.55; }
  100% { transform: translateY(110vh) translateX(var(--petal-x)) rotate(var(--petal-r)); opacity: 0; }
}
@keyframes petalSway {
  0%, 100% { margin-left: 0; }
  50%       { margin-left: var(--petal-sway); }
}

.lux-petal {
  position: fixed;
  top: -60px;
  z-index: 0;
  pointer-events: none;
  width:  var(--petal-size);
  height: calc(var(--petal-size) * 1.2);
  animation:
    petalFall    var(--petal-dur)      linear      var(--petal-delay) infinite,
    petalSway    var(--petal-sway-dur) ease-in-out var(--petal-delay) infinite;
}

/* ══ MOBILE RESPONSIVE ═══════════════════════════════════════════════════════

   Breakpoints used
   ─────────────────
   max-width: 479px   small phones  (iPhone SE, Pixel 4a, etc.)
   max-width: 639px   all phones    (lightbox overrides)
   hover: none        touch devices (suppress hover-only states)

══════════════════════════════════════════════════════════════════════════ */

/* ── Small phones ────────────────────────────────────────────────────────── */
@media (max-width: 479px) {

  /* Page wrapper: reduce tall bottom padding */
  .lux-page { padding-bottom: 72px; }

  /* Hero: cut vertical breathing room in half */
  .lux-hero { padding: 48px 0 32px; }
  .lux-pretitle { margin-bottom: 20px; }

  /* Section eyebrows & dividers */
  .lux-eyebrow        { margin: 36px 0 14px; }
  .lux-inner-label-row { margin: 20px 0 14px; }

  /* Invitation text block */
  .lux-invite-plain { margin: 24px auto; }
  .lux-invite-body  { line-height: 1.85; }
  .lux-cta-hint     { margin-top: 20px; }

  /* Upload CTA — compact pill, centered like desktop */
  .lux-btn-upload     { padding: 14px 32px; justify-content: center; }
  .lux-upload-hint    { text-align: center; }

  /* Send bar — stretch to full width */
  .lux-btn-send    { width: 100%; padding: 17px 20px; }
  .lux-send-bar    { padding: 14px 0 4px; }

  /* Gallery card: tighter inner padding */
  .lux-gallery-panel { padding: 16px 10px 20px; }

  /* Gallery bar: keep title and action row aligned side-by-side */
  .lux-gallery-bar    { align-items: center; gap: 10px; margin-bottom: 16px; }
  .lux-gallery-actions { flex-wrap: wrap; gap: 6px; justify-content: flex-end; }

  /* Action buttons: 38px min-height for finger tapping */
  .lux-btn-action { padding: 9px 14px; min-height: 38px; font-size: 10px; }

  /* Stories heading */
  .lux-stories-head { margin-bottom: 10px; }

  /* View All: compact pill, centered like desktop */
  .lux-view-all-wrap { margin-top: 14px; }
  .lux-btn-view-all  { padding: 11px 28px; }

  /* Footer: reduce large top gap */
  .lux-footer { margin-top: 60px; gap: 14px; }

  /* Hashtag — bigger on phones, kept safely under the available width
     since "#ForeverMARKedforCLAUD" is one unbroken 22-character run */
  .lux-hashtag { font-size: clamp(22px, 7vw, 34px); }

  /* Hero names — bigger presence on phones (scales with viewport,
     tapers back near-original on very narrow/legacy widths) */
  .lux-name              { font-size: clamp(70px, 23vw, 150px); }
  .lux-name:last-child   { font-size: clamp(78px, 25vw, 164px); }
}

/* ── Lightbox: all phones ────────────────────────────────────────────────── */
@media (max-width: 639px) {

  /* Top bar: tighter padding, smaller type */
  .lux-lb-topbar  { padding: 12px 56px 12px 14px; }
  .lux-lb-credit  { font-size: 11px; }
  .lux-lb-counter { font-size: 10px; }

  /* Close button: 44×44 minimum touch target */
  .lux-lb-close { width: 40px; height: 40px; top: 10px; right: 10px; }

  /* Zoom toggle: raise it slightly off the safe-area edge */
  .lux-lb-zoom { bottom: 18px; padding: 8px 16px; }
}

/* ── Touch devices: fix hover-only states ────────────────────────────────── */
@media (hover: none) {

  /* Photo hover overlay never fires on touch — hide it */
  .lux-photo-hover { opacity: 0 !important; }

  /* Selection mode: always show checkboxes so guests can tap-to-select */
  .lux-selection-mode .lux-photo-item .lux-select-check { opacity: 1; }

  /* Lightbox & Reels: desktop click-to-navigate gives way to native swipe */
  .lux-lb-nav    { display: none; }
  .lux-reels-nav { display: none; }
}

/* ── REELS RIGHT-SIDE ICON BAR (Facebook Reels style) ─────────────────────── */

/* Container — right edge, vertically centred, never covers mute/close */
.lux-reel-icon-bar {
  position: absolute;
  right: 14px;
  bottom: 60px;           /* above seek bar — 5 emojis + comment icon */
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  pointer-events: none;   /* bar itself is transparent to touches … */
}
.lux-reel-icon-btn {
  pointer-events: all;    /* … but each button is individually tappable */
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: none; border: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.lux-reel-icon-circle {
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(0,0,0,0.45);
  border: 1.5px solid rgba(255,255,255,0.18);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; line-height: 1;
  color: #fff;
  transition: background .18s, transform .15s;
  -webkit-tap-highlight-color: transparent;
}
.lux-reel-icon-btn:active .lux-reel-icon-circle {
  transform: scale(0.88);
  background: rgba(255,255,255,0.16);
}
.lux-reel-icon-btn.reacted .lux-reel-icon-circle {
  background: rgba(255,80,120,0.35);
  border-color: rgba(255,100,140,0.50);
  animation: reelReactPop .3s cubic-bezier(0.34,1.56,0.64,1) both;
}
@keyframes reelReactPop {
  0%   { transform: scale(1); }
  45%  { transform: scale(1.38); }
  70%  { transform: scale(0.90); }
  100% { transform: scale(1.12); }
}
.lux-reel-icon-label {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 500;
  color: rgba(255,255,255,0.85);
  text-shadow: 0 1px 4px rgba(0,0,0,0.7);
  white-space: nowrap;
}

/* Long-press reaction picker — appears above the heart icon */
.lux-reel-rxn-picker {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  display: flex; gap: 7px; align-items: center;
  background: rgba(20,20,20,0.90);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 999px;
  padding: 8px 12px;
  pointer-events: all;
  animation: pickerPop .2s cubic-bezier(0.34,1.56,0.64,1) both;
  white-space: nowrap;
}
@keyframes pickerPop {
  from { opacity: 0; transform: scale(0.7) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.lux-reel-rxn-picker-btn {
  background: none; border: none; cursor: pointer; padding: 2px;
  font-size: 26px; line-height: 1;
  transition: transform .15s;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.lux-reel-rxn-picker-btn:active { transform: scale(1.35); }

/* Comment bottom sheet for reels/lightbox — slides up from bottom */
.lux-reel-comment-sheet {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  z-index: 20;
  /* Fully solid — nothing bleeds through */
  background: #111;
  border-top: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px 18px 0 0;
  padding: 16px 16px 36px;
  max-height: 70vh;
  overflow-y: auto;
  /* Swipe-down to close: the JS adds .closing which triggers slide-down */
  transition: transform .28s cubic-bezier(0.4,0,0.6,1);
}
.lux-reel-comment-sheet.animating-in  {
  animation: sheetUp .28s cubic-bezier(0.22,1,0.36,1) both;
}
.lux-reel-comment-sheet.closing {
  transform: translateY(100%);
}
@keyframes sheetUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.lux-reel-comment-sheet-handle {
  width: 40px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.28);
  margin: 0 auto 16px;
  cursor: grab;
  touch-action: none; /* we handle the drag ourselves */
}
.lux-reel-sheet-close {
  position: absolute; top: 14px; right: 16px;
  background: none; border: none; color: rgba(255,255,255,0.55);
  font-size: 20px; cursor: pointer; line-height: 1;
  -webkit-tap-highlight-color: transparent;
}

/* ── REELS — full-screen vertical video viewer (TikTok/Reels style) ───────── */
.lux-reels {
  position: fixed; inset: 0; z-index: 1100;
  background: #000;
  display: none;
  contain: layout style;
}
.lux-reels.open { display: block; animation: fadeIn .25s ease both; }

.lux-reels-scroll {
  height: 100vh; height: 100dvh;
  overflow-y: auto; scroll-snap-type: y mandatory;
  will-change: scroll-position;
  /* -webkit-overflow-scrolling: touch — REMOVED.
     That property caused iOS to create a native UIScrollView that
     intercepted ALL touch events across the full viewport, making the
     mute button (a positioned sibling with z-index 200) untappable on
     iPhone and iPad.  The property is deprecated since iOS 13 and the
     default momentum behaviour is identical without it. */
  scrollbar-width: none;
}
.lux-reels-scroll::-webkit-scrollbar { display: none; }

.lux-reel-slide {
  height: 100vh; height: 100dvh;
  /* "normal" (not "always") is what lets a fast flick sail past the next
     snap point instantly, while a slow/partial drag still settles on
     whichever video is more dominant — true Reels/TikTok physics, free. */
  scroll-snap-align: start; scroll-snap-stop: normal;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.lux-reel-video {
  width: 100%; height: 100%;
  /* contain (not cover) → the whole video is always visible, best-fit
     inside the frame; any leftover space is letterboxed by the slide's
     own black background instead of cropping the footage. */
  object-fit: contain; cursor: pointer;
  background: #000;
}

/* Mute + close live as DIRECT children of .lux-reels (position:fixed,
   z-index:1100). Using position:absolute here means they are positioned
   relative to .lux-reels itself — they are NEVER inside a reel-slide
   stacking context, so the comment sheet can never cover them. */
.lux-reels-close, .lux-reels-mute {
  position: absolute; z-index: 200;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.56); border: 1.5px solid rgba(255,255,255,0.18);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .18s, transform .15s, opacity .2s;
  pointer-events: all;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.lux-reels-close    { top: 18px; left: 16px; }
.lux-reels-mute     { top: 18px; right: 16px; }
.lux-reels-download {
  position: absolute; z-index: 200;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.56); border: 1.5px solid rgba(255,255,255,0.18);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .18s, transform .15s, opacity .2s;
  pointer-events: all;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  top: 18px; right: 68px;   /* just to the left of the mute button */
}
.lux-reels-download:hover { background: rgba(0,0,0,0.76); transform: scale(1.06); }
.lux-reels-download:active { transform: scale(0.94); }
@media (max-width: 639px) {
  .lux-reels-download { top: 12px; right: 60px; width: 40px; height: 40px; }
}   /* moved to top-right, mirrors close btn */
/* Mute button now lives at top-right so it never overlaps the bottom sheet;
   keep it visible and tappable even while the sheet is open. */
/* .lux-reels.sheet-open .lux-reels-mute { opacity: 0; pointer-events: none; } */
.lux-reels-close:hover, .lux-reels-mute:hover {
  background: rgba(0,0,0,0.76);
  transform: scale(1.06);
}
.lux-reels-mute:active { transform: scale(0.94); }

/* Desktop-only Prev/Next — LEFT side, hidden on touch (rule above) */
.lux-reels-nav {
  position: absolute; left: 18px; z-index: 200;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.4); border: none;
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.lux-reels-nav:hover    { background: rgba(0,0,0,0.65); }
.lux-reels-nav:disabled { opacity: 0.22; cursor: default; pointer-events: none; }
.lux-reels-prev { top: calc(50% - 56px); }
.lux-reels-next { top: calc(50% + 14px); }

/* Uploader credit caption — bottom-left, above the seek bar, just like
   Facebook/Instagram Reels captions */
.lux-reel-caption {
  position: absolute; left: 16px; right: 70px; bottom: 260px; z-index: 5;
  font-family: var(--font-body); font-size: 12px; color: rgba(255,255,255,0.85);
  text-shadow: 0 1px 6px rgba(0,0,0,0.65); pointer-events: none;
}
.lux-reel-caption b { color: #fff; font-weight: 500; }

/* Per-video seek/scrub bar — tap or drag to fast-forward or replay */
.lux-reel-seek {
  position: absolute; left: 14px; right: 14px; bottom: 18px; z-index: 6;
  padding: 11px 0; cursor: pointer; touch-action: none;
}
.lux-reel-seek-track {
  position: relative; height: 2.5px; border-radius: 2px;
  background: rgba(255,255,255,0.28);
}
.lux-reel-seek-fill {
  position: absolute; top: 0; left: 0; height: 100%; border-radius: 2px;
  background: var(--gold-light);
}
.lux-reel-seek-handle {
  position: absolute; top: 50%; width: 11px; height: 11px; border-radius: 50%;
  background: var(--gold-light); box-shadow: 0 0 0 3px rgba(0,0,0,0.22);
  transform: translate(-50%, -50%);
}

@media (max-width: 639px) {
  .lux-reels-close { top: 12px; left: 12px; width: 40px; height: 40px; }
  .lux-reels-mute  { top: 12px; right: 12px; width: 40px; height: 40px; }   /* moved to top-right */
  .lux-reel-seek   { left: 12px; right: 12px; bottom: 16px; }
  .lux-reel-caption { left: 12px; right: 12px; bottom: 254px; font-size: 11px; }
}

/* ── REACTIONS & COMMENTS PANEL ─────────────────────────────────────────── */
.lux-social-panel {
  background: rgba(255,255,255,0.04);
  border-top: 0.5px solid rgba(255,255,255,0.10);
  padding: 12px 16px 16px;
}

/* Reaction bar — wedding emojis with pop animation */
.lux-reaction-bar {
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
  margin-bottom: 10px;
}
.lux-reaction-btn {
  background: rgba(255,255,255,0.08);
  border: 0.5px solid rgba(255,255,255,0.14);
  border-radius: 999px; padding: 5px 11px;
  font-size: 16px; cursor: pointer; transition: background .18s, transform .18s;
  display: inline-flex; align-items: center; gap: 5px;
  color: rgba(255,255,255,0.82);
  font-family: var(--font-body); line-height: 1;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}
.lux-rxn-emoji { font-size: 16px; line-height: 1; display: inline-block; }
.lux-reaction-btn span.cnt {
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
  color: rgba(255,255,255,0.90);
}
.lux-reaction-btn:hover  { background: rgba(255,255,255,0.16); transform: scale(1.08); }
.lux-reaction-btn.popped { animation: reactionPop .30s var(--ease-spring) both; }

@keyframes reactionPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.36); }
  70%  { transform: scale(0.92); }
  100% { transform: scale(1.10); }
}

/* ── Comments toggle link (Facebook-style) ───────────────────────────── */
.lux-comments-toggle {
  background: none; border: none; padding: 2px 0 8px;
  font-family: var(--font-body); font-size: 12px; font-weight: 500;
  color: rgba(255,255,255,0.52); cursor: pointer;
  display: flex; align-items: center; gap: 4px;
  -webkit-tap-highlight-color: transparent;
  transition: color .15s;
}
.lux-comments-toggle:hover { color: rgba(255,255,255,0.80); }
.lux-comments-toggle-icon {
  transition: transform .22s var(--ease-out);
  flex-shrink: 0;
}
.lux-comments-toggle-icon.open { transform: rotate(180deg); }

/* ── Comment thread — collapse/expand transition ─────────────────────── */
.lux-comments-wrap {
  max-height: 0; overflow: hidden;
  transition: max-height .32s var(--ease-out), opacity .25s;
  opacity: 0;
  margin-bottom: 0;
}
.lux-comments-wrap.expanded {
  max-height: 260px; overflow-y: auto;
  opacity: 1;
  margin-bottom: 10px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.14) transparent;
}
.lux-comments-wrap::-webkit-scrollbar { width: 3px; }
.lux-comments-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px; }

/* Individual comment — avatar initial + stacked name/body */
.lux-comment {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 7px 0; border-bottom: 0.5px solid rgba(255,255,255,0.06);
  animation: fadeIn .2s ease both;
}
.lux-comment:last-child { border-bottom: none; }

.lux-comment-avatar {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, var(--pink-dark) 0%, var(--gold) 100%);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  color: #fff; letter-spacing: 0.03em;
  margin-top: 1px;
}

.lux-comment-content {
  flex: 1; min-width: 0;
}
.lux-comment-author {
  font-family: var(--font-body); font-size: 11.5px; font-weight: 600;
  color: rgba(255,255,255,0.90); letter-spacing: 0.01em;
  margin-right: 6px;
}
.lux-comment-body {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 300;
  color: rgba(255,255,255,0.72); line-height: 1.5;
  word-break: break-word; display: inline;
}

/* ── Name tag — "Posting as X · Change" ─────────────────────────────── */
.lux-comment-name-tag {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 7px;
}
.lux-comment-posting-as {
  font-family: var(--font-body); font-size: 11px; font-weight: 300;
  color: rgba(255,255,255,0.45);
}
.lux-comment-posting-as b { color: rgba(255,255,255,0.70); font-weight: 500; }
.lux-comment-change-name {
  background: none; border: none; padding: 0;
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  color: var(--gold); cursor: pointer; text-decoration: underline;
  -webkit-tap-highlight-color: transparent;
}

/* ── Name input row (shown when no name set) ─────────────────────────── */
.lux-comment-name-row { margin-bottom: 7px; }
.lux-comment-name-input { width: 100%; border-radius: 8px !important; }

/* ── Comment input row ───────────────────────────────────────────────── */
.lux-comment-input-row {
  display: flex; gap: 7px; align-items: center;
}
.lux-comment-input {
  flex: 1; background: rgba(255,255,255,0.09);
  border: 0.5px solid rgba(255,255,255,0.16);
  border-radius: 999px; padding: 8px 14px;
  font-family: var(--font-body); font-size: 13px; font-weight: 300;
  color: #fff; outline: none;
  transition: border-color .2s, background .2s;
  -webkit-appearance: none;
}
.lux-comment-input::placeholder { color: rgba(255,255,255,0.30); }
.lux-comment-input:focus { border-color: var(--gold); background: rgba(255,255,255,0.13); }
.lux-comment-input:disabled { opacity: 0.5; }

.lux-comment-send-btn {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%;
  background: var(--gold); border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .18s, transform .15s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.lux-comment-send-btn:hover  { background: var(--gold-light); transform: scale(1.07); }
.lux-comment-send-btn:active { transform: scale(0.92); }
.lux-comment-send-btn:disabled { opacity: .35; cursor: not-allowed; transform: none; }

/* ── Lightbox mobile bottom-sheet social panel ───────────────────────── */
.lux-lb-social {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 5;
  background: linear-gradient(0deg, rgba(0,0,0,0.80) 0%, transparent 100%);
  padding: 48px 20px 24px;
}
@media (max-width: 639px) {
  .lux-lb-social { padding: 40px 14px 20px; }
}

/* Sidebar social panel — different background, fills the sidebar area */
.lux-lb-sidebar .lux-social-panel {
  background: transparent;
  border-top: none;
  padding: 14px 16px 16px;
  height: 100%; display: flex; flex-direction: column;
}
.lux-lb-sidebar .lux-comments-wrap.expanded {
  max-height: none; flex: 1;
}

/* Loading shimmer for counts */
.lux-social-loading {
  display: inline-block; width: 40px; height: 11px; border-radius: 6px;
  background: rgba(255,255,255,0.12);
  animation: shimmer 1.8s ease-in-out infinite;
}

`


// ── B2 API config ────────────────────────────────────────────────────────────
// In production these are Cloudflare Pages Functions at /api/*
// In local dev (npm start) you need to run: npx wrangler pages dev build --compatibility-date 2024-01-01
const API_BASE = '';  // empty = same origin (works for both Pages and local wrangler dev)

// ── Guest-name ↔ filename encoding ───────────────────────────────────────
// /api/list only ever round-trips the B2 object key (no custom metadata,
// which would need a HEAD request per item to read back). So the guest's
// name is embedded directly in the uploaded filename instead, as
// "g_<base64url-name>.<ext>". Base64url's alphabet (A-Z a-z 0-9 - _) is a
// subset of the server's own [a-zA-Z0-9._-] filename sanitizer, so it
// passes through untouched — and because it's a real byte-level encoding
// (not stripped ASCII), accented/non-Latin names round-trip perfectly.
function encodeNameForKey(name) {
  const trimmed = (name || '').trim().slice(0, 60);
  const bytes = new TextEncoder().encode(trimmed);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeNameFromKey(key) {
  const base = (key || '').split('/').pop() || '';
  const stripped = base.replace(/^\d+_/, ''); // strip the server's Date.now()_ prefix
  const m = stripped.match(/^g_([A-Za-z0-9_-]+)\./);
  if (!m) return null;
  try {
    let b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const name = new TextDecoder().decode(bytes).trim();
    return name || null;
  } catch { return null; }
}

/** Upload a single file → returns the public B2 URL. `uploaderName` is
 *  required and gets embedded in the stored filename (see above). */
async function b2Upload(file, type, uploaderName) {
  const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : (type === 'video' ? 'mp4' : 'jpg');
  const encodedFilename = `g_${encodeNameForKey(uploaderName)}.${ext}`;

  // 1. Ask our server-side Function for a presigned PUT URL
  const metaRes = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      filename:    encodedFilename,
      contentType: file.type,
      sizeBytes:   file.size,
    }),
  });
  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error || `Upload init failed (${metaRes.status})`);
  }
  const { uploadUrl, publicUrl } = await metaRes.json();

  // 2. PUT the file bytes directly to B2 (no server proxy)
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error(`B2 PUT failed (${putRes.status})`);

  return publicUrl;
}

// __PATCH_COMPRESSION_V1__
// ── Client-side compression (runs before b2Upload) ──────────────────────────
// PHOTOS: Canvas resize + WebP re-encode. Supported on iOS 14+ (Sept 2020+)
//         and all modern desktop/Android browsers — safe default in 2026.
// VIDEOS: ffmpeg.wasm, single-threaded core (no SharedArrayBuffer, so no
//         COOP/COEP headers needed — those would break loading B2 media
//         cross-origin in the gallery itself). Loaded lazily from CDN so
//         there's no npm install / build-config change required.

const PHOTO_MAX_DIMENSION = 2048;   // px, longest edge
const PHOTO_WEBP_QUALITY  = 0.83;
const VIDEO_MAX_OUTPUT_BYTES = 100 * 1024 * 1024; // 100 MB backstop
const VIDEO_SKIP_COMPRESSION_UNDER = 15 * 1024 * 1024; // already small — don't bother
const VIDEO_MAX_HEIGHT = 720; // cap to 720p during re-encode

/** Resize + re-encode an image File to WebP. Falls back to the original
 *  file untouched if the browser can't produce WebP (very old browsers). */
async function compressPhoto(file, onProgress) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/webp', PHOTO_WEBP_QUALITY)
    );

    // Some very old browsers silently return null or a PNG when WebP isn't
    // supported — in that case just keep the original file.
    if (!blob || blob.type !== 'image/webp') {
      onProgress?.(100);
      return file;
    }

    onProgress?.(100);
    const newName = file.name.replace(/\.[a-zA-Z0-9]+$/, '') + '.webp';
    return new File([blob], newName, { type: 'image/webp' });
  } catch (err) {
    console.warn('Photo compression failed, uploading original:', err);
    onProgress?.(100);
    return file;
  }
}

// __PATCH_COMPRESSION_V1_FIX_IMPORT__
// ── ffmpeg.wasm lazy loader (CDN, single-threaded core — no special headers) ─
//
// IMPORTANT: we deliberately do NOT write `import('https://unpkg.com/...')`
// as a literal static import() anywhere in this file. CRA's webpack 4
// parses every `import()` call at build time to try to bundle it, and it
// can't handle an external http(s) module specifier — that fails the
// production build with "doesn't support dynamic import() syntax". Instead
// we inject a real <script type="module"> tag at runtime (a plain string,
// invisible to webpack's static analysis) that does the import itself and
// hands the result back to us via a one-off global.
let _ffmpegInstance = null;
let _ffmpegLoadPromise = null;

function loadEsmFromCdn(specifier, globalName) {
  return new Promise((resolve, reject) => {
    const id = `__esm_${globalName}_${Math.random().toString(36).slice(2)}`;
    window[id] = { resolve, reject };
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import * as mod from '${specifier}';
      window['${id}'].resolve(mod);
    `;
    script.onerror = () => { reject(new Error(`Failed to load ${specifier}`)); delete window[id]; };
    document.head.appendChild(script);
    // resolve()/reject() above fire synchronously-ish once the module graph
    // loads; clean up the temp global+script either way.
    Promise.resolve().then(() => {
      const orig = window[id];
      window[id] = {
        resolve: (m) => { orig.resolve(m); delete window[id]; script.remove(); },
        reject:  (e) => { orig.reject(e);  delete window[id]; script.remove(); },
      };
    });
  });
}

async function loadFFmpeg() {
  if (_ffmpegInstance) return _ffmpegInstance;
  if (_ffmpegLoadPromise) return _ffmpegLoadPromise;

  _ffmpegLoadPromise = (async () => {
    const { FFmpeg } = await loadEsmFromCdn('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js', 'ffmpeg');
    const { toBlobURL } = await loadEsmFromCdn('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js', 'ffmpegutil');

    const ffmpeg = new FFmpeg();
    const base = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    _ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return _ffmpegLoadPromise;
}

/** Re-encode a video File with ffmpeg.wasm: H.264, CRF 26, capped at 720p,
 *  audio down to 128k AAC. Good visual quality at a fraction of the size.
 *  Skips compression entirely for files already under
 *  VIDEO_SKIP_COMPRESSION_UNDER (phone cameras already compress well, and
 *  re-encoding a short clip rarely shrinks it further). If the encode would
 *  still land over VIDEO_MAX_OUTPUT_BYTES, throws so the caller can show a
 *  clear "trim your clip" error instead of silently shipping a huge file. */
async function compressVideo(file, onProgress) {
  if (file.size <= VIDEO_SKIP_COMPRESSION_UNDER) {
    onProgress?.(100);
    return file;
  }

  onProgress?.(0);
  const ffmpeg = await loadFFmpeg();
  onProgress?.(5);

  const inputName  = 'input' + (file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || '.mp4');
  const outputName = 'output.mp4';

  const progressHandler = ({ progress }) => {
    // ffmpeg reports 0..1; map onto 5..95 (load already took 0..5)
    const pct = 5 + Math.min(95, Math.max(0, progress * 90));
    onProgress?.(Math.round(pct));
  };
  ffmpeg.on('progress', progressHandler);

  try {
    const { fetchFile } = await loadEsmFromCdn('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js', 'ffmpegutil2');
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    await ffmpeg.exec([
      '-i', inputName,
      '-vf', `scale=-2:'min(${VIDEO_MAX_HEIGHT},ih)'`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '26',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    // cleanup wasm FS so repeated uploads in one session don't leak memory
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress?.(100);

    if (blob.size > VIDEO_MAX_OUTPUT_BYTES) {
      throw new Error(
        `Even after compression this clip is ${(blob.size / 1024 / 1024).toFixed(0)}MB — please trim it shorter and try again.`
      );
    }

    const newName = file.name.replace(/\.[a-zA-Z0-9]+$/, '') + '.mp4';
    return new File([blob], newName, { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', progressHandler);
  }
}


// ── Reactions & Comments API helpers ────────────────────────────────────────
// mediaKey is derived from the B2 object key — it's the stable identifier
// that links a photo/video to its social data in D1.

async function fetchReactions(mediaKey) {
  try {
    const res = await fetch(`/api/reactions?mediaKey=${encodeURIComponent(mediaKey)}`);
    if (!res.ok) return { counts: {}, total: 0 };
    return res.json();
  } catch { return { counts: {}, total: 0 }; }
}

async function postReaction(mediaKey, reaction) {
  const res = await fetch('/api/reactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaKey, reaction }),
  });
  if (!res.ok) throw new Error('Reaction failed');
  return res.json();
}

async function fetchComments(mediaKey) {
  try {
    const res = await fetch(`/api/comments?mediaKey=${encodeURIComponent(mediaKey)}`);
    if (!res.ok) return { comments: [] };
    return res.json();
  } catch { return { comments: [] }; }
}

async function postComment(mediaKey, authorName, body) {
  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaKey, authorName, body }),
  });
  if (!res.ok) throw new Error('Comment failed');
  return res.json();
}

// ── Derive a stable mediaKey from a list item ─────────────────────────────
// We use the filename portion of the key as the stable ID.
// Example: "photos/1716000000000_g_Q2FybG8.jpg" → "1716000000000_g_Q2FybG8.jpg"
function mediaKeyFromItem(item) {
  // item.name is already just the filename (set in b2List)
  return item.name || String(item.id);
}

// ── SocialPanel component ─────────────────────────────────────────────────
// Shared by both the Lightbox (photos) and the Reels viewer (videos).
// mediaKey  — stable string ID for the media item
// guestName — pre-filled author name from local state (may be empty)
/* PATCH:PRO-UI-OVERHAUL */

// ── Wedding reaction set ─────────────────────────────────────────────────────
const REACTIONS_LIST = [
  { emoji: '❤️',  label: 'Love' },
  { emoji: '🌸',  label: 'Cherry Blossom' },
  { emoji: '🥂',  label: 'Cheers' },
  { emoji: '😂',  label: 'Haha' },
  { emoji: '💍',  label: 'Wedding Ring' },
];

// ── Persistent guest-name helpers ─────────────────────────────────────────────
// Any component can call getStoredName() / saveStoredName() to read or update
// the single name key in localStorage. This is the single source of truth for
// the auto-fill feature across upload + reactions + comment inputs.
function getStoredName() {
  try { return localStorage.getItem('lux_guest_name') || ''; } catch { return ''; }
}
function saveStoredName(name) {
  try { localStorage.setItem('lux_guest_name', name.trim()); } catch {}
}

// ── SocialPanel ───────────────────────────────────────────────────────────────
// Shared by both the Lightbox (photos) and the Reels viewer (videos).
// Props:
//   mediaKey  — stable string ID for the media item
//   guestName — parent-level name state (may already be set from upload flow)
//   onNameSaved — callback so parent can sync its own guestName state
function SocialPanel({ mediaKey, guestName, onNameSaved }) {
  const [reactions, setReactions]     = useState(null);
  const [comments, setComments]       = useState(null);
  const [newComment, setNewComment]   = useState('');
  const [sending, setSending]         = useState(false);
  const [poppedEmoji, setPoppedEmoji] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Auto-fill: seed from parent prop first, then fallback to localStorage
  const [localName, setLocalName] = useState(() => (guestName || '').trim() || getStoredName());
  const [editingName, setEditingName] = useState(false);
  const inputRef = useRef(null);

  // Sync localName if parent guestName changes (e.g. user set name in upload flow)
  useEffect(() => {
    const stored = getStoredName();
    const best   = (guestName || '').trim() || stored;
    if (best && !localName) setLocalName(best);
  }, [guestName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mediaKey) return;
    setReactions(null);
    setComments(null);
    fetchReactions(mediaKey).then(setReactions);
    fetchComments(mediaKey).then(d => setComments(d.comments || []));
  }, [mediaKey]);

  function commitName(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLocalName(trimmed);
    saveStoredName(trimmed);
    setEditingName(false);
    if (onNameSaved) onNameSaved(trimmed);
  }

  async function handleReaction(emoji) {
    if (!mediaKey) return;
    setPoppedEmoji(emoji);
    setTimeout(() => setPoppedEmoji(null), 400);
    try {
      const updated = await postReaction(mediaKey, emoji);
      setReactions(updated);
    } catch {}
  }

  async function handleComment() {
    const name = localName.trim();
    const body = newComment.trim();
    if (!name || !body || !mediaKey) return;
    setSending(true);
    try {
      const { comment } = await postComment(mediaKey, name, body);
      setComments(prev => [...(prev || []), comment]);
      setNewComment('');
      setCommentsOpen(true); // auto-expand when you post
    } catch {} finally { setSending(false); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); }
  }

  const authorName   = localName.trim();
  const commentCount = (comments || []).length;
  // Show latest 2 when collapsed, all when expanded
  const visibleComments = commentsOpen ? (comments || []) : (comments || []).slice(-2);

  return (
    <div className="lux-social-panel">

      {/* ── Reaction bar ─────────────────────────────────────────────────── */}
      <div className="lux-reaction-bar">
        {REACTIONS_LIST.map(({ emoji, label }) => (
          <button
            key={emoji}
            className={`lux-reaction-btn${poppedEmoji === emoji ? ' popped' : ''}`}
            onClick={() => handleReaction(emoji)}
            aria-label={`React with ${label}`}
            type="button"
          >
            <span className="lux-rxn-emoji">{emoji}</span>
            {reactions && reactions.counts && reactions.counts[emoji] ? (
              <span className="cnt">{reactions.counts[emoji]}</span>
            ) : null}
          </button>
        ))}
        {reactions === null && <span className="lux-social-loading" />}
      </div>

      {/* ── Comments thread — collapsible like Facebook ───────────────────── */}
      {commentCount > 2 && (
        <button
          className="lux-comments-toggle"
          onClick={() => setCommentsOpen(v => !v)}
          type="button"
        >
          {commentsOpen
            ? 'Hide comments'
            : `View all ${commentCount} comments`}
          <svg
            className={`lux-comments-toggle-icon${commentsOpen ? ' open' : ''}`}
            width="10" height="10" viewBox="0 0 10 10" fill="none"
          >
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {comments !== null && commentCount > 0 && (
        <div className={`lux-comments-wrap${commentsOpen || commentCount <= 2 ? ' expanded' : ''}`}>
          {visibleComments.map(c => (
            <div key={c.id} className="lux-comment">
              <div className="lux-comment-avatar" aria-hidden="true">
                {(c.author_name || '?')[0].toUpperCase()}
              </div>
              <div className="lux-comment-content">
                <span className="lux-comment-author">{c.author_name}</span>
                <span className="lux-comment-body">{c.body}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Name field — shown only if name not yet set, or in edit mode ─── */}
      {(!authorName || editingName) && (
        <div className="lux-comment-name-row">
          <input
            className="lux-comment-input lux-comment-name-input"
            placeholder="Your name (required)…"
            value={localName}
            onChange={e => setLocalName(e.target.value)}
            onBlur={e => { if (e.target.value.trim()) commitName(e.target.value); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitName(localName); } }}
            autoComplete="name"
          />
        </div>
      )}
      {authorName && !editingName && (
        <div className="lux-comment-name-tag">
          <span className="lux-comment-posting-as">Posting as <b>{authorName}</b></span>
          <button
            className="lux-comment-change-name"
            onClick={() => setEditingName(true)}
            type="button"
          >Change</button>
        </div>
      )}

      {/* ── Comment input ─────────────────────────────────────────────────── */}
      <div className="lux-comment-input-row">
        <input
          ref={inputRef}
          className="lux-comment-input"
          placeholder={authorName ? 'Add a comment…' : 'Enter your name above first…'}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending || !authorName}
        />
        <button
          className="lux-comment-send-btn"
          onClick={handleComment}
          disabled={sending || !newComment.trim() || !authorName}
          aria-label="Post comment"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

    </div>
  );
}

// ── ReelSocialBar ────────────────────────────────────────────────────────────
// Facebook-Reels style: right-side icon bar with heart (long-press = picker)
// and comment icon. Comment icon opens a sliding bottom sheet.
const REACTIONS_LIST_SHORT = ['❤️', '🌸', '🥂', '😂', '💍'];

function ReelSocialBar({ mediaKey, guestName, onNameSaved }) {
  const [reactions, setReactions]       = useState(null);
  const [lastReacted, setLastReacted]   = useState(null);
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [comments, setComments]         = useState(null);
  const [newComment, setNewComment]     = useState('');
  const [sending, setSending]           = useState(false);
  const [localName, setLocalName]       = useState(() => (guestName || '').trim() || getStoredName());
  const [editingName, setEditingName]   = useState(false);
  const longPressTimer                  = useRef(null);
  const sheetRef                        = useRef(null);
  const swipeStartY                     = useRef(null);

  // Add/remove 'sheet-open' on the .lux-reels parent so CSS can hide mute
  useEffect(() => {
    const reelsEl = document.querySelector('.lux-reels');
    if (!reelsEl) return;
    if (sheetOpen) reelsEl.classList.add('sheet-open');
    else           reelsEl.classList.remove('sheet-open');
    return () => reelsEl.classList.remove('sheet-open');
  }, [sheetOpen]);

  // Swipe-down on the sheet handle to dismiss
  function handleSwipeStart(e) {
    swipeStartY.current = e.touches ? e.touches[0].clientY : e.clientY;
  }
  function handleSwipeMove(e) {
    if (swipeStartY.current === null) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dy = y - swipeStartY.current;
    if (dy > 0 && sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(' + dy + 'px)';
    }
  }
  function handleSwipeEnd(e) {
    if (swipeStartY.current === null) return;
    const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const dy = y - swipeStartY.current;
    swipeStartY.current = null;
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (dy > 80) closeSheet();  // dragged down >80px = close
  }

  function openSheet()  { setSheetOpen(true);  setPickerOpen(false); }
  function closeSheet() { setSheetOpen(false); }

  // Sync name from parent
  useEffect(() => {
    const best = (guestName || '').trim() || getStoredName();
    if (best && !localName) setLocalName(best);
  }, [guestName]); // eslint-disable-line

  useEffect(() => {
    if (!mediaKey) return;
    setReactions(null); setComments(null);
    fetchReactions(mediaKey).then(setReactions);
    fetchComments(mediaKey).then(d => setComments(d.comments || []));
  }, [mediaKey]);

  // Simple direct react — no long press needed
  async function doReact(emoji) {
    if (!mediaKey) return;
    setLastReacted(emoji);
    setPickerOpen(false);
    try {
      const updated = await postReaction(mediaKey, emoji);
      setReactions(updated);
    } catch {}
  }

  function commitName(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLocalName(trimmed); saveStoredName(trimmed); setEditingName(false);
    if (onNameSaved) onNameSaved(trimmed);
  }

  async function handleComment() {
    const name = localName.trim();
    const body = newComment.trim();
    if (!name || !body || !mediaKey) return;
    setSending(true);
    try {
      const { comment } = await postComment(mediaKey, name, body);
      setComments(prev => [...(prev || []), comment]);
      setNewComment('');
    } catch {} finally { setSending(false); }
  }

  const totalReactions = reactions ? Object.values(reactions.counts || {}).reduce((a, b) => a + b, 0) : 0;
  const commentCount   = (comments || []).length;
  const authorName     = localName.trim();

  return (
    <>
      {/* Right-side icon bar */}
      <div className="lux-reel-icon-bar">

        {/* All reactions — always visible, no long-press */}
        {REACTIONS_LIST.map(({ emoji, label }) => (
          <div key={emoji} style={{ position: 'relative' }}>
            <button
              className={'lux-reel-icon-btn' + (lastReacted === emoji ? ' reacted' : '')}
              onClick={() => doReact(emoji)}
              type="button"
              aria-label={'React ' + label}
            >
              <div className="lux-reel-icon-circle" style={{ width: 40, height: 40, fontSize: 20 }}>
                {emoji}
              </div>
              {reactions && reactions.counts && reactions.counts[emoji] > 0 && (
                <span className="lux-reel-icon-label">{reactions.counts[emoji]}</span>
              )}
            </button>
          </div>
        ))}

        {/* Comment icon */}
        <button
          className="lux-reel-icon-btn"
          onClick={() => sheetOpen ? closeSheet() : openSheet()}
          type="button"
          aria-label="Comments"
        >
          <div className="lux-reel-icon-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h14l4 4V4a2 2 0 00-2-2z"
                stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <span className="lux-reel-icon-label">
            {commentCount > 0 ? commentCount : ''}
          </span>
        </button>

      </div>

      {/* Comment bottom sheet */}
      {sheetOpen && (
        <div
          ref={sheetRef}
          className="lux-reel-comment-sheet animating-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle — swipe down to dismiss */}
          <div
            className="lux-reel-comment-sheet-handle"
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
            onPointerDown={handleSwipeStart}
            onPointerMove={handleSwipeMove}
            onPointerUp={handleSwipeEnd}
          />
          <button
            className="lux-reel-sheet-close"
            onClick={closeSheet}
            type="button"
          >✕</button>

          {/* Comments list */}
          {comments !== null && commentCount > 0 && (
            <div style={{ marginBottom: 14 }}>
              {comments.map(c => (
                <div key={c.id} className="lux-comment" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <div className="lux-comment-avatar">{(c.author_name || '?')[0].toUpperCase()}</div>
                  <div className="lux-comment-content">
                    <span className="lux-comment-author">{c.author_name}</span>
                    <span className="lux-comment-body">{c.body}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {comments !== null && commentCount === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 14 }}>
              No comments yet — be the first!
            </p>
          )}

          {/* Name field */}
          {(!authorName || editingName) && (
            <div style={{ marginBottom: 8 }}>
              <input
                className="lux-comment-input"
                placeholder="Your name (required)…"
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={e => { if (e.target.value.trim()) commitName(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitName(localName); } }}
                autoComplete="name"
              />
            </div>
          )}
          {authorName && !editingName && (
            <div className="lux-comment-name-tag" style={{ marginBottom: 8 }}>
              <span className="lux-comment-posting-as">Posting as <b>{authorName}</b></span>
              <button className="lux-comment-change-name" onClick={() => setEditingName(true)} type="button">Change</button>
            </div>
          )}

          {/* Comment input */}
          <div className="lux-comment-input-row">
            <input
              className="lux-comment-input"
              placeholder={authorName ? 'Add a comment…' : 'Enter your name above first…'}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              disabled={sending || !authorName}
            />
            <button
              className="lux-comment-send-btn"
              onClick={handleComment}
              disabled={sending || !newComment.trim() || !authorName}
              type="button"
              aria-label="Post comment"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** List media from all buckets via our server-side Function */
async function b2List(type) {
  const res = await fetch(`${API_BASE}/api/list?type=${type}`);
  if (!res.ok) throw new Error(`List failed (${res.status})`);
  const { items } = await res.json();
  return items.map((item, i) => ({
    id:   i + 1,
    url:  item.url,
    name: item.key.split('/').pop(),
    size: item.size,
    uploaded: item.uploaded,
    uploaderName: decodeNameFromKey(item.key),
  }));
}

// Per-video seek bar for the Reels viewer — tap or drag to fast-forward or
// replay. Reads/writes the underlying <video> element directly through the
// shared ref array, so dragging tracks the finger with zero extra
// re-renders of the parent (only this small bar re-renders, ~4x/sec, and
// only for whichever video is actually playing).
function ReelSeekBar({ reelRefs, idx, active }) {
  const [progress, setProgress] = useState(0);
  const trackRef   = useRef(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    const video = reelRefs.current[idx];
    if (!video) return;

    const sync = () => {
      if (draggingRef.current) return;
      setProgress(video.duration ? video.currentTime / video.duration : 0);
    };
    video.addEventListener("timeupdate", sync);
    video.addEventListener("loadedmetadata", sync);
    sync();
    return () => {
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("loadedmetadata", sync);
    };
  }, [reelRefs, idx, active]);

  function ratioFromPointer(e) {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }

  function seekTo(ratio) {
    const video = reelRefs.current[idx];
    if (!video || !video.duration || !isFinite(video.duration)) return;
    video.currentTime = ratio * video.duration;
    setProgress(ratio);
  }

  function handlePointerDown(e) {
    e.stopPropagation(); // don't let it bubble into the video's play/pause tap
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(ratioFromPointer(e));
  }

  function handlePointerMove(e) {
    if (!draggingRef.current) return;
    seekTo(ratioFromPointer(e));
  }

  function handlePointerUp() {
    draggingRef.current = false;
  }

  return (
    <div
      className="lux-reel-seek"
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="lux-reel-seek-track">
        <div className="lux-reel-seek-fill"   style={{ width: `${progress * 100}%` }} />
        <div className="lux-reel-seek-handle" style={{ left:  `${progress * 100}%` }} />
      </div>
    </div>
  );
}

export default function WeddingGallery() {
  const [photos, setPhotos]         = useState([]);
  const [videos, setVideos]         = useState([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [previews, setPreviews]     = useState([]);
  const [uploadState, setUploadState] = useState({ active: false, progress: 0, error: null });
  const [videoPreview, setVideoPreview] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState(new Set());
  const [showAll, setShowAll]       = useState(false);
  const [lightbox, setLightbox]     = useState({ open: false, idx: 0, zoomed: false });
  const [showLbComments, setShowLbComments] = useState(false);
  const [reels, setReels]           = useState({ open: false, idx: 0 });
  const [reelMuted, setReelMuted]   = useState(false);
  const [guestName, setGuestName]   = useState(() => {
    try { return localStorage.getItem('lux_guest_name') || ''; } catch { return ''; }
  });
  // Defer petal rendering until after first paint — pure cosmetic, no rush
  const [petalsReady, setPetalsReady] = useState(false);
  useEffect(() => {
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => setPetalsReady(true), { timeout: 2000 })
      : setTimeout(() => setPetalsReady(true), 800);
    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);
  const fileInputRef     = useRef(null);
  const videoInputRef    = useRef(null);
  const reelRefs          = useRef([]);
  const reelContainerRef  = useRef(null);
  const lbImgRef           = useRef(null);
  const lbDragRef          = useRef({ active: false, startX: 0, startY: 0, locked: null, startTime: 0 });
  // Incremented every time a new slide animation starts; stale onEnd
  // callbacks compare their captured animId against this and bail out.
  const lbAnimIdRef        = useRef(0);

  useEffect(() => {
    let s = document.getElementById("lux-css");
    if (!s) { s = document.createElement("style"); s.id = "lux-css"; document.head.appendChild(s); }
    s.textContent = LUXURY_CSS;
  }, []);

  // Lock background scroll while the Lightbox or Reels viewer is open —
  // uses the iOS-safe "fixed body + restore scrollY" technique so the page
  // behind can never rubber-band/scroll, even on mobile Safari.
  useEffect(() => {
    const shouldLock = lightbox.open || reels.open;
    if (shouldLock) {
      const scrollY = window.scrollY;
      document.body.dataset.lockedScrollY = String(scrollY);
      document.body.style.position = 'fixed';
      document.body.style.top    = `-${scrollY}px`;
      document.body.style.left   = '0';
      document.body.style.right  = '0';
      document.body.style.width  = '100%';
    } else if (document.body.dataset.lockedScrollY !== undefined) {
      const scrollY = parseInt(document.body.dataset.lockedScrollY || '0', 10);
      document.body.style.position = '';
      document.body.style.top    = '';
      document.body.style.left   = '';
      document.body.style.right  = '';
      document.body.style.width  = '';
      delete document.body.dataset.lockedScrollY;
      window.scrollTo(0, scrollY);
    }
  }, [lightbox.open, reels.open]);

  // Load photos from B2 on mount
  useEffect(() => {
    setPhotosLoading(true);
    b2List('photo')
      .then(items => setPhotos(items))
      .catch(err  => console.error('Photo list error:', err))
      .finally(()  => setPhotosLoading(false));
  }, []);

  // Load videos from B2 on mount
  useEffect(() => {
    setVideosLoading(true);
    b2List('video')
      .then(items => setVideos(items))
      .catch(err  => console.error('Video list error:', err))
      .finally(()  => setVideosLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!lightbox.open) return;
      if (e.key === "Escape")     setLightbox(l => ({ ...l, open: false, zoomed: false }));
      if (e.key === "ArrowLeft")  { setShowLbComments(false); setLightbox(l => ({ ...l, idx: (l.idx - 1 + photos.length) % photos.length, zoomed: false })); }
      if (e.key === "ArrowRight") { setShowLbComments(false); setLightbox(l => ({ ...l, idx: (l.idx + 1) % photos.length, zoomed: false })); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, photos.length]);

  // Reels: Escape closes the viewer, ↑ / ↓ move between videos (desktop)
  useEffect(() => {
    if (!reels.open) return;
    const handler = (e) => {
      if (e.key === "Escape")    setReels(r => ({ ...r, open: false }));
      if (e.key === "ArrowUp")   goToReel(reels.idx - 1);
      if (e.key === "ArrowDown") goToReel(reels.idx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reels.open, reels.idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reels: jump straight to the tapped video, no scroll animation
  useEffect(() => {
    if (!reels.open) return;
    requestAnimationFrame(() => {
      const el = reelRefs.current[reels.idx];
      el?.closest(".lux-reel-slide")?.scrollIntoView({ block: "start" });
    });
  }, [reels.open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reels: autoplay whichever video is actually in view, pause the rest —
  // and keep reels.idx in sync with whatever is dominant (drives the
  // Prev/Next buttons and keyboard nav even after a manual swipe/scroll).
  useEffect(() => {
    if (!reels.open) return;
    const els = reelRefs.current.filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const vid = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          vid.play().catch(() => {});
          const idx = Number(vid.dataset.reelIdx);
          setReels(r => (r.idx === idx ? r : { ...r, idx }));
        } else {
          vid.pause();
        }
      });
    }, { threshold: [0, 0.6, 1], rootMargin: '200px 0px' });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.open, videos.length]);

  function updateGuestName(value) {
    setGuestName(value);
    try { localStorage.setItem('lux_guest_name', value); } catch { /* private mode, etc. */ }
  }

  function handleFiles(fileList) {
    Array.from(fileList).filter(f => f.type.startsWith("image/"))
      .slice(0, 20 - previews.length)
      .forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviews(p => [...p, { url, name: file.name, id: Date.now() + Math.random(), file }]);
      });
  }

  function removePreview(id) { setPreviews(p => p.filter(x => x.id !== id)); }

  function handleVideoFile(fileList) {
    const file = Array.from(fileList).find(f => f.type.startsWith("video/"));
    if (!file) return;
    setVideoPreview({ url: URL.createObjectURL(file), name: file.name, id: Date.now(), file });
  }

  async function uploadPhotos() {
    if (!previews.length) return;
    const name = guestName.trim();
    if (!name) { setUploadState(s => ({ ...s, error: 'Please enter your name first' })); return; }
    setUploadState({ active: true, progress: 0, error: null });
    try {
      const uploaded = [];
      for (let i = 0; i < previews.length; i++) {
        const p = previews[i];
        const compressed = await compressPhoto(p.file);
        const publicUrl = await b2Upload(compressed, 'photo', name);
        uploaded.push({ id: Date.now() + i, url: publicUrl, name: p.name, uploaderName: name });
        setUploadState(s => ({ ...s, progress: Math.round(((i + 1) / previews.length) * 100) }));
        URL.revokeObjectURL(p.url);
      }
      setPhotos(prev => [...uploaded.reverse(), ...prev]);
      setPreviews([]);
      setUploadState({ active: false, progress: 0, error: null });
    } catch (err) {
      setUploadState({ active: false, progress: 0, error: err.message });
    }
  }

  async function uploadVideo() {
    if (!videoPreview) return;
    const name = guestName.trim();
    if (!name) { setUploadState(s => ({ ...s, error: 'Please enter your name first' })); return; }
    setUploadState({ active: true, progress: 0, error: null, stage: 'compressing' });
    try {
      const compressed = await compressVideo(videoPreview.file, (pct) => {
        setUploadState(s => ({ ...s, progress: pct, stage: pct >= 100 ? 'uploading' : 'compressing' }));
      });
      setUploadState(s => ({ ...s, progress: 0, stage: 'uploading' }));
      const publicUrl = await b2Upload(compressed, 'video', name);
      setVideos(prev => [{ id: Date.now(), url: publicUrl, name: videoPreview.name, uploaderName: name }, ...prev]);
      URL.revokeObjectURL(videoPreview.url);
      setVideoPreview(null);
      setUploadState({ active: false, progress: 100, error: null, stage: null });
      setTimeout(() => setUploadState(s => ({ ...s, progress: 0 })), 1500);
    } catch (err) {
      setUploadState({ active: false, progress: 0, error: err.message, stage: null });
    }
  }

  function openReels(idx) {
    setReels({ open: true, idx });
  }

  function closeReels() {
    reelRefs.current.forEach(v => v && v.pause());
    setReels(r => ({ ...r, open: false }));
  }

  function goToReel(targetIdx) {
    if (targetIdx < 0 || targetIdx >= videos.length) return;
    const el = reelRefs.current[targetIdx];
    el?.closest(".lux-reel-slide")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openLightbox(idx) {
    if (selectMode) { toggleSelect(idx); return; }
    setLightbox({ open: true, idx, zoomed: false });
    setShowLbComments(false);
  }

  // ── lbSlide: core animation — animate FIRST, update state AFTER ──────────
  // dir = +1 (next) or -1 (prev).
  // 1. CSS-transition the strip to the neighbour slot.
  // 2. On transitionend: setLightbox with the new idx.
  // 3. Snap strip back to resting (-33.333%) with no transition,
  //    so the freshly-rendered centre slot appears seamlessly.
  const lbStripRef   = useRef(null);
  const lbSlidingRef = useRef(false); // block re-entrant slides

  function lbSlide(dir) {
    if (lbSlidingRef.current || photos.length < 2) return;
    const strip = lbStripRef.current;
    if (!strip) return;

    lbSlidingRef.current = true;
    // Stamp this animation so lbDragStart can cancel it, and any stale
    // onEnd callback (after interruption) sees a mismatched ID and bails.
    const animId = ++lbAnimIdRef.current;
    setShowLbComments(false);

    // Each slot = 1/3 of strip width in px
    const slotPx    = strip.offsetWidth / 3;
    // Resting offset = -1 slotPx (centre slot in view)
    // Moving right (+1 next) → strip slides left → negative extra px
    const newOffset = -slotPx + (-dir * slotPx);

    // 1. Kick off the CSS transition
    strip.classList.remove('dragging');
    strip.classList.add('sliding');
    strip.style.transform = 'translateX(' + newOffset + 'px)';

    function onEnd() {
      strip.removeEventListener('transitionend', onEnd);

      // If this animation was superseded (user swiped again mid-flight), bail.
      if (animId !== lbAnimIdRef.current) return;

      // 2. Force a synchronous React re-render so the centre slot already
      //    has the new image BEFORE we snap the strip back to resting.
      //    Without flushSync the setState is batched/async and the old image
      //    briefly flashes at centre — the glitch you see on fast swipes.
      flushSync(() => {
        setLightbox(l => ({
          ...l,
          idx: (l.idx + dir + photos.length) % photos.length,
          zoomed: false,
        }));
      });

      // 3. Now snap strip back with no transition — centre slot already
      //    shows the correct new image, so there is no visible flash.
      strip.classList.remove('sliding');
      strip.style.transition = 'none';
      strip.style.transform  = '';
      // Force reflow so "transition:none" is committed before restoring
      void strip.offsetHeight;
      strip.style.transition = '';

      lbSlidingRef.current = false;
    }

    strip.addEventListener('transitionend', onEnd, { once: true });

    // Safety fallback if transitionend never fires (tab hidden, etc.)
    setTimeout(() => {
      if (!lbSlidingRef.current || animId !== lbAnimIdRef.current) return;
      strip.removeEventListener('transitionend', onEnd);
      onEnd();
    }, 500);
  }

  function navPhotoWithReset(dir) { lbSlide(dir); }

  function lbDragStart(e) {
    if (lightbox.zoomed || photos.length < 2) return;

    // If a slide animation is in-flight, cancel it instantly so the next
    // swipe feels responsive rather than being silently dropped.
    // Incrementing lbAnimIdRef makes the pending onEnd see a stale animId
    // and exit without touching state or the strip.
    if (lbSlidingRef.current) {
      lbAnimIdRef.current++;
      const strip = lbStripRef.current;
      if (strip) {
        strip.classList.remove('sliding', 'dragging');
        strip.style.transition = 'none';
        strip.style.transform  = '';
        void strip.offsetHeight;   // flush layout so the snap is instant
        strip.style.transition = '';
      }
      lbSlidingRef.current = false;
    }

    lbDragRef.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      locked: null, startTime: Date.now(),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function lbDragMove(e) {
    const drag = lbDragRef.current;
    if (!drag.active) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.locked === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (drag.locked !== 'x') return;

    const strip = lbStripRef.current;
    if (!strip) return;

    strip.classList.add('dragging');
    strip.classList.remove('sliding');
    // Resting offset in px = -1 slot width; add finger delta
    const slotPx   = strip.offsetWidth / 3;
    const offsetPx = -slotPx + dx;
    strip.style.transform = 'translateX(' + offsetPx + 'px)';
  }

  function lbDragEnd(e) {
    const drag = lbDragRef.current;
    if (!drag.active) return;
    drag.active = false;

    const strip = lbStripRef.current;

    // Resolve drag axis.  On a fast flick, pointermove may not have fired
    // with > 6 px of movement before pointerup — drag.locked stays null.
    // Fall back to the endpoint displacement so quick flicks still register.
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const elapsed = Math.max(1, Date.now() - drag.startTime);

    let locked = drag.locked;
    if (locked === null && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      locked = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }

    const wasHorizontal = locked === 'x';

    if (!wasHorizontal) {
      if (strip) { strip.classList.remove('dragging'); strip.style.transform = ''; }
      return;
    }

    const velocity = Math.abs(dx) / elapsed;

    // 0.30 instead of 0.45 — fast short flicks have high velocity but small
    // displacement; the lower bar catches them without accepting accidental taps.
    const FLICK     = 0.30;  // px/ms
    const THRESHOLD = 0.28;  // fraction of screen width to commit

    const commit = velocity > FLICK || Math.abs(dx) > window.innerWidth * THRESHOLD;

    if (commit) {
      if (strip) strip.classList.remove('dragging');
      lbSlide(dx < 0 ? 1 : -1);
    } else {
      // Spring back to resting with transition
      if (strip) {
        strip.classList.remove('dragging');
        strip.classList.add('sliding');
        strip.style.transform = '';
        strip.addEventListener('transitionend', () => strip.classList.remove('sliding'), { once: true });
      }
    }
  }

  function lbDragCancel() {
    lbDragRef.current.active = false;
    const strip = lbStripRef.current;
    if (!strip) return;
    strip.classList.remove('dragging');
    strip.classList.add('sliding');
    strip.style.transform = '';
    strip.addEventListener('transitionend', () => strip.classList.remove('sliding'), { once: true });
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

  // ── Download current reel video
  async function downloadCurrentVideo() {
    const vid = videos[reels.idx];
    if (!vid) return;
    try {
      const resp = await fetch(vid.url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = vid.url.split('?')[0].split('.').pop() || 'mp4';
      a.download = vid.name || `video-${reels.idx + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 200));
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Video download failed', err);
    }
  }

    // ── Download selected photos — fetch each URL as a blob then trigger <a> click
  async function downloadSelected() {
    const indices = [...selected];
    for (let n = 0; n < indices.length; n++) {
      const photo = photos[indices[n]];
      if (!photo) continue;
      try {
        const resp = await fetch(photo.url);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        // Derive a sensible filename: use the stored name or fall back to index
        const ext = photo.url.split('?')[0].split('.').pop() || 'jpg';
        a.download = photo.name || `photo-${n + 1}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Stagger downloads so the browser doesn't block them
        await new Promise(r => setTimeout(r, 350));
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('Download failed for', photo.url, err);
      }
    }
  }

  const visiblePhotos = showAll ? photos : photos.slice(0, 9);
  const currentImg = photos[lightbox.idx];

  return (
    <>

      {/* Ambient background canvas */}
      <div className="lux-bg-canvas" />

      {/* Floating petals — deferred until idle to not block first paint */}
      {petalsReady && [
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
          '--petal-size':     `${p.size}px`,
          '--petal-dur':      `${p.dur}s`,
          '--petal-delay':    `${p.delay}s`,
          '--petal-x':        `${p.x}px`,
          '--petal-r':        `${p.r}deg`,
          '--petal-sway':     `${p.sway}px`,
          '--petal-sway-dur': `${p.swayDur}s`,
        }}>
          <svg viewBox="0 0 20 24" fill="none">
            <path d="M10 2C10 2 4 7 4 13a6 6 0 0012 0C16 7 10 2 10 2z"
              fill="rgba(196,116,142,0.45)" />
            <path d="M10 2C10 2 4 7 4 13"
              stroke="rgba(184,144,74,0.25)" strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </div>
      ))}

      <div className="lux-page">

        {/* HERO */}
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
        </div>

        {/* INVITATION TEXT — plain, no card */}
        <div className="lux-invite-plain">
          <p className="lux-invite-body">
            Capture the kilig moments, tawanan, iyakan,<br />
            and every beautiful memory we've made together.<br />
            Don't forget to tag us and use our hashtag:
          </p>
          <div className="lux-hashtag-wrap">
            <span className="lux-hashtag">
              <span className="lux-ht-gold">#Forever</span>
              <span className="lux-ht-ink">MARK</span>
              <span className="lux-ht-gold">edfor</span>
              <span className="lux-ht-ink">CLAUD</span>
            </span>
          </div>
          <div className="lux-cta-hint">Got the perfect shot? Upload it below</div>
          <span className="lux-arrow" />
        </div>

        {/* VIDEO MOMENTS — live from B2 */}
        <div className="lux-stories-head">
          <div>
            <div className="lux-stories-sub">Swipe to watch · tap to play</div>
          </div>
        </div>
        <div className="lux-stories-strip">
          {/* Add Video button */}
          <div className="lux-story-add" onClick={() => videoInputRef.current?.click()}>
            <div className="lux-story-add-ring">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4v10M4 9h10" stroke="#b8944f" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="lux-story-add-label">Add<br />Video</span>
          </div>
          <input
            ref={videoInputRef} type="file" accept="video/*"
            style={{ display: "none" }}
            onChange={e => { handleVideoFile(e.target.files); e.target.value = ""; }}
          />

          {/* Video preview before upload */}
          {videoPreview && (
            <div className="lux-story-ph" style={{ position: 'relative' }}>
              <video
                src={videoPreview.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                muted playsInline
              />
              <button
                onClick={uploadVideo}
                disabled={uploadState.active || !guestName.trim()}
                style={{
                  position: 'absolute', bottom: 4, left: 4, right: 4,
                  background: 'rgba(184,144,74,0.9)', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 10,
                  padding: '4px 0', fontFamily: 'var(--font-body)',
                  cursor: (uploadState.active || !guestName.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (!uploadState.active && !guestName.trim()) ? 0.5 : 1,
                }}
              >
                {uploadState.active
                  ? (uploadState.stage === 'compressing' ? `Compressing… ${uploadState.progress}%` : `${uploadState.progress}%`)
                  : 'Upload'}
              </button>
            </div>
          )}

          {/* Uploaded videos */}
          {videosLoading && [0,1,2].map(i => (
            <div className="lux-story-ph" key={i}>
              <div className="lux-story-ph-inner">
                <div className="lux-story-ph-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#c4748e" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#c4748e" strokeWidth="0.9" />
                  </svg>
                </div>
                <div className="lux-story-ph-txt">Loading…</div>
              </div>
              <div className="lux-shimmer" />
            </div>
          ))}
          {!videosLoading && videos.length === 0 && !videoPreview && [0,1,2].map(i => (
            <div className="lux-story-ph" key={i}>
              <div className="lux-story-ph-inner">
                <div className="lux-story-ph-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#c4748e" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#c4748e" strokeWidth="0.9" />
                  </svg>
                </div>
                <div className="lux-story-ph-txt">Coming<br />soon</div>
              </div>
              <div className="lux-shimmer" />
            </div>
          ))}
          {!videosLoading && videos.map((vid, idx) => (
            <div
              className="lux-story-ph"
              key={vid.id}
              style={{ cursor: 'pointer' }}
              onClick={() => openReels(idx)}
            >
              <video
                src={vid.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                muted playsInline
                preload="metadata"
              />
              <div className="lux-story-play">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M5 3.5v9l8-4.5-8-4.5z" fill="#fff" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {videoPreview && (
          <div className="lux-name-field lux-name-field-video">
            <label className="lux-name-label" htmlFor="lux-guest-name-video">Your Name *</label>
            <input
              id="lux-guest-name-video"
              className="lux-name-input"
              type="text"
              value={guestName}
              onChange={e => updateGuestName(e.target.value)}
              placeholder="e.g. Maria Santos"
              maxLength={60}
              autoComplete="name"
            />
            {uploadState.error && <div className="lux-name-error">{uploadState.error}</div>}
          </div>
        )}


        {/* GALLERY — inside white card/widget */}
        <div className="lux-inner-label-row"><span className="lux-inner-label-txt">Shared Memories</span><div className="lux-inner-label-rule" /></div>

        <div className="lux-card">
          <div className="lux-gallery-panel">

          {/* UPLOAD — moved inside Photo Gallery card */}
          <div className="lux-eyebrow"><span className="lux-eyebrow-label">Share Your Photos</span><div className="lux-eyebrow-rule" /></div>
          <div className="lux-upload-simple">
            <button
              className="lux-btn-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="lux-upload-corner tl" />
              <span className="lux-upload-corner tr" />
              <span className="lux-upload-corner bl" />
              <span className="lux-upload-corner br" />
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <line x1="7" y1="11.5" x2="7" y2="2" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
                <path d="M4.5 5L7 2l2.5 3" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <line x1="2" y1="12.5" x2="12" y2="12.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
              </svg>
              Upload Photos
            </button>
            <span className="lux-upload-hint">JPEG · PNG · WEBP · Auto-compressed · Max 20 photos</span>
            <input
              ref={fileInputRef} type="file" multiple accept="image/*"
              style={{ display: "none" }}
              onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
            />

            {previews.length > 0 && (
              <div className="lux-preview-sec">
                <div className="lux-preview-label">
                  {previews.length} photo{previews.length !== 1 ? "s" : ""} ready to send
                </div>
                <div className="lux-preview-grid">
                  {previews.map(p => (
                    <div className="lux-preview-item" key={p.id}>
                      <img src={p.url} alt="" />
                      <button className="lux-preview-remove" onClick={() => removePreview(p.id)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previews.length > 0 && (
              <div className="lux-send-bar">
                <div className="lux-name-field">
                  <label className="lux-name-label" htmlFor="lux-guest-name-photo">Your Name *</label>
                  <input
                    id="lux-guest-name-photo"
                    className="lux-name-input"
                    type="text"
                    value={guestName}
                    onChange={e => updateGuestName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    maxLength={60}
                    autoComplete="name"
                  />
                </div>
                {uploadState.error && (
                  <div style={{ color: '#c45', fontSize: 12, marginBottom: 6, textAlign: 'center' }}>
                    {uploadState.error}
                  </div>
                )}
                <button
                  className="lux-btn-send"
                  onClick={uploadPhotos}
                  disabled={uploadState.active || !guestName.trim()}
                >
                  {uploadState.active
                    ? (uploadState.stage === 'compressing'
                        ? `Compressing… ${uploadState.progress}%`
                        : `Uploading… ${uploadState.progress}%`)
                    : "Send to Gallery"}
                </button>
                <div className="lux-send-hint">
                  {previews.length} photo{previews.length !== 1 ? "s" : ""} will be shared with all guests
                </div>
              </div>
            )}
          </div>

            <div className="lux-gallery-divider" />

            <div className="lux-gallery-bar">
              <div>
                <div className="lux-gallery-title">Photo Gallery</div>
                <div className="lux-gallery-sub">Every frame, forever</div>
              </div>
              <div className="lux-gallery-actions">
                <button
                  className={`lux-btn-action${selectMode ? " active" : ""}`}
                  onClick={toggleSelectMode}
                >
                  {selectMode ? "Done" : "Select"}
                </button>
                {selectMode && photos.length > 0 && (
                  <button className="lux-btn-action" onClick={selectAll}>
                    {selected.size === photos.length ? "Deselect All" : "Select All"}
                  </button>
                )}
                {selected.size > 0 && (
                  <button className="lux-btn-action dl" onClick={downloadSelected}>
                    Download ({selected.size})
                  </button>
                )}
              </div>
            </div>

            {photosLoading ? (
              <div className="lux-no-photos">
                <div className="lux-no-photos-ring">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#c4748e" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="lux-no-photos-txt">Loading gallery…</div>
                <div className="lux-no-photos-hint">Fetching your memories</div>
              </div>
            ) : photos.length === 0 ? (
              <div className="lux-no-photos">
                <div className="lux-no-photos-ring">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#c4748e" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="lux-no-photos-txt">No photos yet</div>
                <div className="lux-no-photos-hint">Be the first to share a memory</div>
              </div>
            ) : (
              <>
                <div className={`lux-photo-grid${selectMode ? " lux-selection-mode" : ""}`}>
                  {visiblePhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className={`lux-photo-item${idx === 0 ? " featured" : ""}${selected.has(idx) ? " selected" : ""}`}
                      onClick={() => openLightbox(idx)}
                    >
                      <img src={photo.url} alt="" loading="lazy" decoding="async" />
                      <div className="lux-photo-hover">
                        <div className="lux-photo-view-icon">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="5.5" cy="5.5" r="3.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
                            <path d="M8 8l2.5 2.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                      <div className="lux-select-check">
                        {selected.has(idx) && (
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 4.5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lux-view-all-wrap">
                  <button className="lux-btn-view-all" onClick={() => setShowAll(v => !v)}>
                    {showAll ? "Show Less" : `View All · ${photos.length} Photos`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="lux-footer">
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
        </footer>
      </div>

      {/* LIGHTBOX — Instagram-style split-panel photo viewer */}
      <div className={`lux-lightbox${lightbox.open ? " open" : ""}`}>

        {/* ── LEFT PANE: full-bleed image canvas ─────────────────────── */}
        <div
          className="lux-lb-image-pane"
          onPointerDown={lbDragStart}
          onPointerMove={lbDragMove}
          onPointerUp={lbDragEnd}
          onPointerCancel={lbDragCancel}
        >
          {/* Top gradient bar with credit + counter */}
          <div className="lux-lb-topbar">
            <span className="lux-lb-credit">
              {currentImg?.uploaderName
                ? <><b>{currentImg.uploaderName}</b></>
                : <span style={{color:'rgba(255,255,255,0.0)'}}>·</span>}
            </span>
            <span className="lux-lb-counter">
              {photos.length > 0 ? `${lightbox.idx + 1} / ${photos.length}` : ""}
            </span>
          </div>

          {/* Close button */}
          <button
            className="lux-lb-close"
            onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>

          {/* Single-photo download button */}
          {currentImg && (
            <button
              className="lux-lb-close"
              style={{ right: 62 }}
              onClick={async () => {
                try {
                  const resp = await fetch(currentImg.url);
                  const blob = await resp.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  const ext = currentImg.url.split('?')[0].split('.').pop() || 'jpg';
                  a.download = currentImg.name || `photo.${ext}`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 300);
                } catch (e) { console.error('Lightbox download failed', e); }
              }}
              aria-label="Download photo"
              title="Download this photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M6 11l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="4" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {/* Prev / Next */}
          <button className="lux-lb-nav lux-lb-prev" onClick={() => navPhotoWithReset(-1)} aria-label="Previous photo">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="lux-lb-nav lux-lb-next" onClick={() => navPhotoWithReset(1)} aria-label="Next photo">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 3l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 3-slot image strip — prev · current · next */}
          {lightbox.open && (
            <div className="lux-lb-img-wrap">
              <div className="lux-lb-strip" ref={lbStripRef}>
                {/* Prev slot */}
                <div className="lux-lb-slot">
                  {photos[(lightbox.idx - 1 + photos.length) % photos.length] && (
                    <img
                      src={photos[(lightbox.idx - 1 + photos.length) % photos.length].url}
                      alt=""
                      draggable={false}
                      decoding="async"
                      loading="eager"
                    />
                  )}
                </div>
                {/* Current slot */}
                <div className="lux-lb-slot current">
                  {currentImg && (
                    <img
                      ref={lbImgRef}
                      className={lightbox.zoomed ? 'zoomed' : ''}
                      src={currentImg.url}
                      alt=""
                      draggable={false}
                      decoding="sync"
                      loading="eager"
                    />
                  )}
                </div>
                {/* Next slot */}
                <div className="lux-lb-slot">
                  {photos[(lightbox.idx + 1) % photos.length] && (
                    <img
                      src={photos[(lightbox.idx + 1) % photos.length].url}
                      alt=""
                      draggable={false}
                      decoding="async"
                      loading="eager"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mobile bottom-right: reactions + comment icon bar (desktop uses sidebar) */}
          <div className="lux-lb-icon-bar">
            {/* Reaction buttons */}
            {REACTIONS_LIST.map(({ emoji, label }) => (
              <div key={emoji} style={{ position: 'relative' }}>
                <button
                  className="lux-reel-icon-btn"
                  onClick={() => {
                    if (!currentImg) return;
                    postReaction(mediaKeyFromItem(currentImg), emoji).catch(() => {});
                  }}
                  type="button"
                  aria-label={'React ' + label}
                >
                  <div className="lux-reel-icon-circle" style={{ width: 38, height: 38, fontSize: 18 }}>
                    {emoji}
                  </div>
                </button>
              </div>
            ))}
            {/* Comment icon */}
            <button
              className="lux-reel-icon-btn"
              onClick={() => setShowLbComments(v => !v)}
              type="button"
              aria-label="Comments"
            >
              <div className="lux-reel-icon-circle" style={{ width: 38, height: 38 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h14l4 4V4a2 2 0 00-2-2z"
                    stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
            </button>
          </div>

          {/* Mobile: comment bottom sheet (same sheet as reels, reused styles) */}
          {showLbComments && currentImg && (
            <div
              className="lux-reel-comment-sheet animating-in"
              onClick={e => e.stopPropagation()}
            >
              <div className="lux-reel-comment-sheet-handle" />
              <button
                className="lux-reel-sheet-close"
                onClick={() => setShowLbComments(false)}
                type="button"
              >✕</button>
              <SocialPanel
                mediaKey={mediaKeyFromItem(currentImg)}
                guestName={guestName}
                onNameSaved={updateGuestName}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT PANE: social sidebar (desktop only, >900px) ──────── */}
        <div className="lux-lb-sidebar">
          <div className="lux-lb-sidebar-header">
            <div>
              <div className="lux-lb-sidebar-credit">
                {currentImg?.uploaderName || 'Wedding Gallery'}
              </div>
              <div className="lux-lb-sidebar-sub">
                {photos.length > 0 ? `Photo ${lightbox.idx + 1} of ${photos.length}` : ''}
              </div>
            </div>
          </div>
          <div className="lux-lb-sidebar-body">
            {lightbox.open && currentImg && (
              <SocialPanel
                mediaKey={mediaKeyFromItem(currentImg)}
                guestName={guestName}
                onNameSaved={updateGuestName}
              />
            )}
          </div>
        </div>

      </div>

      {/* REELS — full-screen vertical video viewer (TikTok/Reels style) */}
      <div className={`lux-reels${reels.open ? " open" : ""}`}>
        <button className="lux-reels-close" onClick={closeReels} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        {/* Download current video */}
        <button
          className="lux-reels-download"
          onClick={downloadCurrentVideo}
          aria-label="Download video"
          title="Download this video"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v13M6 11l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="4" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        </button>

        <button
          className="lux-reels-mute"
          onClick={() => setReelMuted(m => !m)}
          aria-label={reelMuted ? "Unmute" : "Mute"}
        >
          {reelMuted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
              <line x1="16" y1="8" x2="22" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="22" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
              <path d="M16.5 8.5a5 5 0 010 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <path d="M19 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
          )}
        </button>
        <button
          className="lux-reels-nav lux-reels-prev"
          onClick={() => goToReel(reels.idx - 1)}
          disabled={reels.idx <= 0}
          aria-label="Previous video"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M4 11l5-5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className="lux-reels-nav lux-reels-next"
          onClick={() => goToReel(reels.idx + 1)}
          disabled={reels.idx >= videos.length - 1}
          aria-label="Next video"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M4 7l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="lux-reels-scroll" ref={reelContainerRef}>
          {reels.open && videos.map((vid, idx) => (
            <div className="lux-reel-slide" key={vid.id}>
              <video
                ref={el => { if (el) el.dataset.reelIdx = idx; reelRefs.current[idx] = el; }}
                src={vid.url}
                className="lux-reel-video"
                loop playsInline muted={reelMuted}
                preload="metadata"
                onClick={(e) => { e.target.paused ? e.target.play().catch(() => {}) : e.target.pause(); }}
              />
              {vid.uploaderName && (
                <div className="lux-reel-caption">Shared by <b>{vid.uploaderName}</b></div>
              )}
              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open} />
              {/* Facebook Reels-style: icon bar on the right + expandable comment sheet */}
              <ReelSocialBar
                mediaKey={mediaKeyFromItem(vid)}
                guestName={guestName}
                onNameSaved={updateGuestName}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}