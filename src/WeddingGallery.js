import { useState, useEffect, useRef } from "react";

/* REDESIGN_JOURNAL_V1_APPLIED */
const LUXURY_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400;1,9..144,500&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

:root {
  /* ── new palette ───────────────────────────── */
  --page-bg:      #F3EFE5;
  --page-deep:    #EAE3D3;
  --chalk:        #FDFCF8;
  --sage:         #5C6B50;
  --sage-mid:     #8A9B7A;
  --sage-pale:    rgba(92,107,80,0.07);
  --sage-border:  rgba(92,107,80,0.22);
  --sage-shadow:  rgba(92,107,80,0.10);
  --gold:         #B89764;
  --gold-light:   #C8AD82;
  --gold-border:  rgba(184,151,100,0.30);
  --gold-pale:    rgba(184,151,100,0.12);
  --ink:          #1B1915;
  --ink-80:       rgba(27,25,21,0.80);
  --ink-60:       rgba(27,25,21,0.60);
  --ink-40:       rgba(27,25,21,0.40);
  --ink-10:       rgba(27,25,21,0.07);
  --white:        #FDFCF8;
  --white-off:    #F9F6F0;
  /* ── legacy aliases (un-patched rules auto-update) ─── */
  --page-bg-deep: #EAE3D3;
  --pink:         #F3EFE5;
  --pink-deep:    #EAE3D3;
  --pink-dark:    #5C6B50;
  --pink-border:  rgba(92,107,80,0.20);
  --pink-shadow:  rgba(92,107,80,0.09);

  --font-display: 'Fraunces', Georgia, serif;
  --font-body:    'Plus Jakarta Sans', system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  background-color: var(--page-bg);
  background-image:
    radial-gradient(ellipse at 15% 10%, rgba(92,107,80,0.05) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 85%, rgba(184,151,100,0.06) 0%, transparent 50%);
  font-family: var(--font-body);
  font-weight: 400;
  overflow-x: hidden;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ── ANIMATIONS ─────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes pinkPulse {
  0%   { box-shadow: 0 0 0 0 rgba(92,107,80,0.40); }
  70%  { box-shadow: 0 0 0 10px rgba(92,107,80,0); }
  100% { box-shadow: 0 0 0 0 rgba(92,107,80,0); }
}

/* ── PAGE WRAPPER ────────────────────────────────── */
.lux-page {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px 100px;
  border-left: 2px solid var(--sage);
}
@media (min-width: 640px) {
  .lux-page { padding: 0 36px 100px; }
}
@media (max-width: 480px) {
  .lux-page { border-left: none; border-top: 2px solid var(--sage); }
}

/* ── HERO ────────────────────────────────────────── */
.lux-hero {
  padding: 60px 0 52px;
  text-align: left;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) both;
}
.lux-pretitle {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 500;
  letter-spacing: 0.38em; text-transform: uppercase;
  color: var(--sage);
  display: flex; align-items: center; justify-content: flex-start; gap: 14px;
  margin-bottom: 32px;
}
.lux-pretitle::before {
  content: ''; display: block; height: 1px; width: 24px;
  background: var(--sage); flex-shrink: 0;
}
.lux-pretitle::after { display: none; }

.lux-names { display: flex; flex-direction: column; align-items: stretch; }
.lux-name {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(54px, 13vw, 102px);
  line-height: 0.88; letter-spacing: -0.02em;
  color: var(--ink);
}
.lux-name.upright {
  font-style: normal;
  text-align: right;
  color: var(--ink-60);
}
.lux-amp-row {
  display: flex; align-items: center; gap: 20px;
  margin: 4px 0;
  padding: 0 2px;
}
.lux-amp-rule { height: 1px; flex: 1; background: var(--ink-10); }
.lux-amp-rule.l { background: var(--ink-10); }
.lux-amp-rule.r { background: var(--ink-10); }
.lux-amp {
  font-family: var(--font-body);
  font-style: normal; font-weight: 300;
  font-size: clamp(10px, 1.8vw, 12px);
  color: var(--sage); letter-spacing: 0.32em;
  text-transform: uppercase; flex-shrink: 0;
}
.lux-date-row {
  margin-top: 28px;
  display: flex; align-items: center; justify-content: flex-start; gap: 10px;
}
.lux-pip { width: 4px; height: 4px; background: var(--sage); border-radius: 50%; flex-shrink: 0; }
.lux-date-txt {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 400; letter-spacing: 0.32em;
  text-transform: uppercase; color: var(--ink-40);
}

/* ── INVITATION TEXT (plain, no card) ────────────── */
.lux-invite-plain {
  margin: 40px 0;
  max-width: 520px;
  text-align: left;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) 0.08s both;
}
.lux-invite-body {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(15px, 3.6vw, 18px);
  line-height: 2.05; letter-spacing: 0.02em;
  color: var(--ink-60);
}
.lux-hashtag-wrap { margin-top: 18px; }
.lux-hashtag {
  font-family: var(--font-display);
  font-style: italic; font-weight: 500;
  font-size: clamp(22px, 5.5vw, 40px);
  line-height: 1.1; letter-spacing: 0.01em;
  display: inline;
}
.lux-ht-gold { color: var(--sage); }
.lux-ht-ink  { color: var(--gold); }
.lux-cta-hint {
  margin-top: 20px;
  font-family: var(--font-body);
  font-size: 13px; font-weight: 400; letter-spacing: 0.08em;
  color: var(--ink-40);
}
.lux-arrow {
  display: block; margin: 12px 0 0;
  width: 1px; height: 28px;
  background: linear-gradient(180deg, var(--sage), transparent);
}

/* ── SECTION DIVIDER ─────────────────────────────── */
.lux-div {
  margin: 56px 0 28px;
  padding-top: 20px;
  border-top: 1px solid var(--ink-10);
}
.lux-div-rule { display: none; }
.lux-div-gem  { display: none; }
.lux-div-label {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 600; letter-spacing: 0.38em;
  text-transform: uppercase; color: var(--sage);
}

/* ── INNER DIVIDER ───────────────────────────────── */
.lux-inner-div {
  margin: 36px 0 24px;
  padding-top: 18px;
  border-top: 1px solid var(--gold-border);
}
.lux-inner-rule { display: none; }
.lux-inner-gem  { display: none; }
.lux-inner-label {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 600; letter-spacing: 0.34em;
  text-transform: uppercase; color: var(--gold);
}

/* ── VIDEO STORIES ───────────────────────────────── */
.lux-stories-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 14px; flex-wrap: wrap; gap: 8px;
}
.lux-stories-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(18px, 4vw, 22px); color: var(--ink);
  letter-spacing: -0.01em;
}
.lux-stories-sub {
  font-family: var(--font-body);
  font-size: 13px; font-weight: 400; letter-spacing: 0.02em;
  color: var(--ink-40); margin-top: 3px;
}
.lux-btn-ghost {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 0.10em; text-transform: uppercase;
  padding: 9px 16px; background: transparent;
  border: 1px solid var(--sage-border); color: var(--sage-mid);
  cursor: pointer; transition: all .25s; border-radius: 2px;
}
.lux-btn-ghost:hover { background: var(--sage-pale); border-color: var(--sage); color: var(--sage); }

.lux-stories-strip {
  display: flex; gap: 10px; overflow-x: auto;
  padding: 4px 2px 14px; scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.lux-stories-strip::-webkit-scrollbar { height: 2px; }
.lux-stories-strip::-webkit-scrollbar-thumb { background: var(--pink-border); border-radius: 2px; }

.lux-story-add {
  flex-shrink: 0; width: 88px; height: 156px;
  border-radius: 3px;
  background: var(--chalk);
  border: 1.5px dashed var(--sage-border);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; cursor: pointer; transition: all .3s; scroll-snap-align: start;
  box-shadow: none;
}
.lux-story-add:hover {
  transform: translateY(-2px);
  border-color: var(--sage);
  box-shadow: 0 6px 20px var(--sage-shadow);
}
.lux-story-add-ring {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--sage-pale);
  border: 1px solid var(--sage-border);
  display: flex; align-items: center; justify-content: center; transition: all .3s;
}
.lux-story-add:hover .lux-story-add-ring { background: var(--sage-pale); border-color: var(--sage); }
.lux-story-add-label {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 500; letter-spacing: 0.02em;
  color: var(--ink-60); text-align: center; line-height: 1.5;
}
.lux-story-ph {
  flex-shrink: 0; width: 88px; height: 156px;
  border-radius: 3px; scroll-snap-align: start;
  overflow: hidden; position: relative;
  background: var(--chalk);
  border: 0.5px solid var(--ink-10);
  border-top: 2px solid var(--sage-border);
  box-shadow: none;
}
.lux-story-ph-inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.lux-story-ph-icon {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(196,116,142,0.08);
  border: 0.5px dashed var(--pink-dark);
  display: flex; align-items: center; justify-content: center;
}
.lux-story-ph-txt {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 400; letter-spacing: 0.02em;
  color: var(--ink-40); text-align: center;
}
.lux-shimmer {
  position: absolute; inset: 0; pointer-events: none;
}
@media (min-width: 480px) {
  .lux-story-add, .lux-story-ph { width: 100px; height: 176px; border-radius: 3px; }
}

/* ── UPLOAD SECTION — simple button, no drop container ── */
.lux-upload-simple {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px;
  padding: 8px 0 4px;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) 0.1s both;
}
.lux-btn-upload {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 14px 36px;
  background: transparent; color: var(--sage);
  border: 1.5px solid var(--sage); cursor: pointer; border-radius: 2px;
  transition: all .28s;
  box-shadow: none;
}
.lux-btn-upload:hover {
  background: var(--sage); color: var(--chalk);
  transform: translateY(-1px); box-shadow: 0 6px 22px var(--sage-shadow);
}
.lux-upload-hint {
  font-family: var(--font-body);
  font-size: 13px; font-weight: 400; letter-spacing: 0.02em;
  color: var(--ink-40);
}

/* ── PREVIEW ─────────────────────────────────────── */
.lux-preview-sec {
  width: 100%; margin-top: 4px;
}
.lux-preview-label {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--gold); margin-bottom: 10px;
  display: flex; align-items: center; gap: 8px;
}
.lux-preview-label::before { content: ''; display: block; width: 18px; height: 0.5px; background: var(--gold-border); }
.lux-preview-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 5px;
}
.lux-preview-item {
  aspect-ratio: 1; border-radius: 4px; overflow: hidden;
  position: relative; background: var(--pink-deep);
}
.lux-preview-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lux-preview-remove {
  position: absolute; inset: 0; background: rgba(28,15,20,0.5);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: .2s; border: none; color: white; font-size: 13px; cursor: pointer;
}
.lux-preview-item:hover .lux-preview-remove { opacity: 1; }

/* ── SEND BAR ────────────────────────────────────── */
.lux-send-bar {
  width: 100%; padding: 16px 0 4px;
  text-align: center;
}
.lux-btn-send {
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 14px 48px;
  background: var(--sage); color: var(--chalk);
  border: 1.5px solid var(--sage); cursor: pointer; transition: all .28s; border-radius: 2px;
  box-shadow: 0 4px 18px var(--sage-shadow);
}
.lux-btn-send:hover { transform: translateY(-2px); box-shadow: 0 10px 28px var(--sage-shadow); }
.lux-btn-send:disabled { opacity: .45; cursor: not-allowed; transform: none; }
.lux-send-hint {
  margin-top: 9px;
  font-family: var(--font-body);
  font-size: 13px; font-weight: 400;
  letter-spacing: 0.02em; color: var(--ink-40);
}

/* ── GALLERY CARD — white background ─────────────── */
.lux-card {
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-top: 3px solid var(--sage);
  border-radius: 2px;
  box-shadow: 0 4px 32px rgba(27,25,21,0.06);
  position: relative; overflow: hidden;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) 0.15s both;
}
.lux-corner { display: none; }

.lux-gallery-panel { padding: 24px 18px 26px; }
@media (min-width: 480px) {
  .lux-gallery-panel { padding: 28px 24px 30px; }
}

.lux-gallery-bar {
  display: flex; align-items: flex-start; justify-content: space-between;
  flex-wrap: wrap; gap: 10px; margin-bottom: 18px;
}
.lux-gallery-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(18px, 4vw, 23px); color: var(--ink);
  letter-spacing: -0.01em;
}
.lux-gallery-sub {
  font-family: var(--font-body);
  font-size: 13px; font-weight: 400;
  color: var(--ink-40); margin-top: 3px;
}
.lux-gallery-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.lux-btn-action {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 7px 14px; background: transparent;
  border: 1px solid var(--sage-border); color: var(--ink-60);
  cursor: pointer; transition: all .2s; border-radius: 2px;
}
.lux-btn-action:hover { border-color: var(--sage); background: var(--sage-pale); color: var(--sage); }
.lux-btn-action.active { background: var(--sage); color: var(--chalk); border-color: var(--sage); }
.lux-btn-action.dl { background: var(--sage); color: var(--chalk); border-color: var(--sage); }

/* Mobile: 2-col; ≥480: 3-col */
.lux-photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 142px;
  gap: 6px;
}
@media (min-width: 480px) {
  .lux-photo-grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 158px; }
}
@media (min-width: 640px) {
  .lux-photo-grid { grid-auto-rows: 168px; }
}
.lux-photo-item {
  cursor: pointer; border-radius: 2px; overflow: hidden;
  background: var(--page-deep);
  position: relative; border: 2px solid transparent; transition: all .25s;
}
.lux-photo-item.featured { grid-column: span 2; grid-row: span 2; }
.lux-photo-item.selected { border-color: var(--sage); }
.lux-photo-item img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s cubic-bezier(.22,.68,0,1.2); }
.lux-photo-item:hover img { transform: scale(1.05); }
.lux-photo-hover {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(28,15,20,0.38) 100%);
  opacity: 0; transition: opacity .3s;
  display: flex; align-items: flex-end; justify-content: flex-end; padding: 8px;
}
.lux-photo-item:hover .lux-photo-hover { opacity: 1; }
.lux-photo-view-icon {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,0.22); backdrop-filter: blur(6px);
  border: 0.5px solid rgba(255,255,255,0.4);
  display: flex; align-items: center; justify-content: center;
}
.lux-select-check {
  position: absolute; top: 7px; left: 7px;
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(253,252,248,0.92); border: 1.5px solid var(--sage);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: .2s; pointer-events: none;
}
.lux-selection-mode .lux-select-check,
.lux-photo-item:hover .lux-select-check { opacity: 1; }
.lux-photo-item.selected .lux-select-check { opacity: 1; background: var(--sage); border-color: var(--sage); }

.lux-no-photos { grid-column: 1/-1; padding: 52px 0; text-align: center; }
.lux-no-photos-ring {
  width: 50px; height: 50px; border-radius: 50%;
  border: 0.5px solid var(--pink-border);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px;
  background: var(--sage-pale);
}
.lux-no-photos-txt {
  font-family: var(--font-display); font-style: italic;
  font-size: clamp(16px, 3.5vw, 19px); color: var(--ink-60);
}
.lux-no-photos-hint {
  font-family: var(--font-body);
  font-size: 13px; font-weight: 400;
  color: var(--ink-40); margin-top: 6px;
}
.lux-view-all-wrap { text-align: center; margin-top: 20px; }
.lux-btn-view-all {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  padding: 10px 32px; background: transparent;
  border: 1px solid var(--sage-border); color: var(--sage-mid);
  cursor: pointer; transition: .22s; border-radius: 2px;
}
.lux-btn-view-all:hover { color: var(--sage); border-color: var(--sage); background: var(--sage-pale); }

/* ── FOOTER ──────────────────────────────────────── */
.lux-footer {
  text-align: left; margin-top: 96px; padding-top: 36px;
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  border-top: 1px solid var(--ink-10);
}
.lux-footer-rule {
  width: 36px; height: 2px; background: var(--sage); margin-bottom: 6px;
}
.lux-footer-names {
  font-family: var(--font-display); font-style: italic; font-weight: 300;
  font-size: clamp(13px, 2.8vw, 16px); color: var(--ink-40); letter-spacing: 0.06em;
}

/* ── LIGHTBOX ────────────────────────────────────── */
.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(10,4,7,0.96);
  display: none; align-items: center; justify-content: center; flex-direction: column;
  backdrop-filter: blur(4px);
}
.lux-lightbox.open { display: flex; animation: fadeIn .3s ease both; }
.lux-lb-close {
  position: absolute; top: 18px; right: 20px;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.08); border: 0.5px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.65); font-size: 15px; cursor: pointer; transition: all .2s;
  display: flex; align-items: center; justify-content: center;
}
.lux-lb-close:hover { background: rgba(255,255,255,0.14); color: #fff; }
.lux-lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 42px; height: 42px; border-radius: 50%;
  background: transparent; border: 0.5px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.5); font-size: 22px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.lux-lb-nav:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.4); }
.lux-lb-prev { left: 12px; }
.lux-lb-next { right: 12px; }
.lux-lb-img-wrap { max-width: 92vw; max-height: 78vh; display: flex; align-items: center; justify-content: center; }
.lux-lb-img { max-width: 100%; max-height: 100%; object-fit: contain; transition: transform .35s cubic-bezier(.22,.68,0,1.2); border-radius: 2px; }
.lux-lb-img.zoomed { transform: scale(2.2); }
.lux-lb-bottom { position: absolute; bottom: 20px; display: flex; gap: 10px; align-items: center; }
.lux-lb-counter {
  font-family: var(--font-body);
  font-size: 13px; font-weight: 400; letter-spacing: 0.1em;
  text-transform: uppercase; color: rgba(255,255,255,0.38);
}
.lux-lb-zoom {
  background: transparent; border: 0.5px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.52);
  font-family: var(--font-body); font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase;
  padding: 8px 18px; cursor: pointer; transition: all .2s; border-radius: 2px;
}
.lux-lb-zoom:hover { color: #fff; border-color: rgba(255,255,255,0.55); }
`;

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
    <div className="lux-div">
      <span className="lux-div-label">{label}</span>
    </div>
  );
}

function InnerDivider({ label }) {
  return (
    <div className="lux-inner-div">
      <span className="lux-inner-label">{label}</span>
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
    if (!document.getElementById("lux-css")) {
      const s = document.createElement("style");
      s.id = "lux-css"; s.textContent = LUXURY_CSS;
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
      <div className="lux-page">

        {/* HERO */}
        <div className="lux-hero">
          <div className="lux-pretitle">Wedding Gallery</div>
          <div className="lux-names">
            <span className="lux-name">Claudine</span>
            <div className="lux-amp-row">
              <div className="lux-amp-rule l" />
              <span className="lux-amp">et</span>
              <div className="lux-amp-rule r" />
            </div>
            <span className="lux-name upright">Mark</span>
          </div>
          <div className="lux-date-row">
            <div className="lux-pip" />
            <span className="lux-date-txt">Forever begins · 2026</span>
            <div className="lux-pip" />
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

        {/* VIDEO MOMENTS */}
        <SectionDivider label="Video Moments" />
        <div className="lux-stories-head">
          <div>
            <div className="lux-stories-title">Moments in Motion</div>
            <div className="lux-stories-sub">Swipe to watch · tap to play</div>
          </div>
          <button className="lux-btn-ghost">+ Add Video</button>
        </div>
        <div className="lux-stories-strip">
          <div className="lux-story-add" onClick={() => {}}>
            <div className="lux-story-add-ring">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4v10M4 9h10" stroke="#5C6B50" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="lux-story-add-label">Add<br />Video</span>
          </div>
          {[0, 1, 2].map(i => (
            <div className="lux-story-ph" key={i}>
              <div className="lux-story-ph-inner">
                <div className="lux-story-ph-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#5C6B50" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#5C6B50" strokeWidth="0.9" />
                  </svg>
                </div>
                <div className="lux-story-ph-txt">Coming<br />soon</div>
              </div>
              <div className="lux-shimmer" />
            </div>
          ))}
        </div>

        {/* UPLOAD — simple button only, no drop container */}
        <SectionDivider label="Share Your Photos" />
        <div className="lux-upload-simple">
          <button
            className="lux-btn-upload"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 12l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 19h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M7 10.5A5 5 0 0 1 17 10.5" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            Upload Photos
          </button>
          <span className="lux-upload-hint">JPEG · PNG · WEBP · Up to 5 MB · Max 20 photos</span>
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
                    <img src={p.url} alt="preview" />
                    <button className="lux-preview-remove" onClick={() => removePreview(p.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previews.length > 0 && (
            <div className="lux-send-bar">
              <button className="lux-btn-send">Send to Gallery</button>
              <div className="lux-send-hint">
                {previews.length} photo{previews.length !== 1 ? "s" : ""} will be shared with all guests
              </div>
            </div>
          )}
        </div>

        {/* GALLERY — inside white card/widget */}
        <InnerDivider label="Shared Memories" />

        <div className="lux-card">
          <div className="lux-gallery-panel">
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
                  <button className="lux-btn-action dl">
                    Download ({selected.size})
                  </button>
                )}
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="lux-no-photos">
                <div className="lux-no-photos-ring">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#5C6B50" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#5C6B50" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#5C6B50" strokeWidth="0.75" strokeLinecap="round" />
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
                      <img src={photo.url} alt="wedding photo" loading="lazy" />
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
          <div className="lux-footer-rule" />
          <div className="lux-footer-names">Claudine et Mark · 2026</div>
        </footer>
      </div>

      {/* LIGHTBOX */}
      <div className={`lux-lightbox${lightbox.open ? " open" : ""}`}>
        <button className="lux-lb-close" onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="lux-lb-nav lux-lb-prev" onClick={() => navPhoto(-1)}>‹</button>
        <button className="lux-lb-nav lux-lb-next" onClick={() => navPhoto(1)}>›</button>
        <div className="lux-lb-img-wrap">
          {lightbox.open && currentImg && (
            <img
              className={`lux-lb-img${lightbox.zoomed ? " zoomed" : ""}`}
              src={currentImg.url} alt="wedding photo"
            />
          )}
        </div>
        <div className="lux-lb-bottom">
          <span className="lux-lb-counter">{lightbox.idx + 1} / {photos.length}</span>
          <button
            className="lux-lb-zoom"
            onClick={() => setLightbox(l => ({ ...l, zoomed: !l.zoomed }))}
          >
            {lightbox.zoomed ? "Zoom Out" : "Zoom In"}
          </button>
        </div>
      </div>
    </>
  );
}