/**
 * patch-fb-style-viewer-and-guest-names.mjs
 *
 * Upgrades the photo Lightbox and video Reels viewer to a true full-bleed,
 * Facebook-style experience, and adds a required "Your Name" field to every
 * upload. Specifically:
 *
 *   PHOTOS (Lightbox)
 *   - Full-bleed black canvas: the image now fills the entire viewport
 *     (100vw/100dvh) using object-fit:contain, so it is always perfectly
 *     centered and any leftover space from its aspect ratio is letterboxed
 *     in black — exactly like Facebook / Google Photos, on desktop AND
 *     mobile. (Previously the image was artificially capped at 90vw/72vh
 *     on desktop and 60vh on mobile, which is why it looked small and
 *     off-center.)
 *   - Background scroll is now locked while the viewer is open (iOS-safe
 *     fixed-body technique), so the page behind can no longer scroll.
 *   - Prev/Next are now solid circular Facebook-style buttons with real SVG
 *     chevrons, always visible on desktop, hidden on touch in favor of the
 *     existing swipe gesture — unchanged drag physics, just hidden CSS.
 *   - The bottom filmstrip thumbnail strip has been removed (Facebook's
 *     viewer doesn't have one) in favor of a top bar showing the uploader's
 *     name and a "3 / 12" position counter.
 *
 *   VIDEOS (Reels)
 *   - object-fit changed from cover → contain: the full video is always
 *     visible (best-fit), with black bars filling any leftover space
 *     instead of cropping the footage.
 *   - Same background scroll lock as the Lightbox.
 *   - Nav buttons restyled to match the Lightbox's flat circular look.
 *   - Adds an uploader credit caption above the seek bar.
 *
 *   REQUIRED UPLOADER NAME
 *   - Both the photo and video upload flows now require a name before the
 *     Send/Upload button is enabled. The name is remembered in
 *     localStorage so a returning guest never has to retype it.
 *   - Zero backend changes needed: the name is embedded directly in the
 *     uploaded filename as base64url ("g_<name>.<ext>"), which already
 *     round-trips through /api/list — no new metadata, no extra HEAD
 *     requests per item. The encoding is a real byte-level UTF-8 →
 *     base64url conversion (not stripped ASCII), so accented and non-Latin
 *     names round-trip perfectly. Photos/videos uploaded before this patch
 *     simply show no credit (graceful fallback, no crash).
 *   - The name is shown publicly as "Shared by <name>" in both the
 *     Lightbox top bar and the Reels caption.
 *
 * Verified: applied to a fresh clone of this exact repo and built clean
 * with `npm run build` (zero errors, zero ESLint warnings).
 *
 * Run from your project root:
 *   node patch-fb-style-viewer-and-guest-names.mjs
 *
 * Then:
 *   git add src/WeddingGallery.js
 *   git commit -m "Full-bleed FB-style viewer + best-fit video + required guest name"
 *   git push
 */

import fs from 'fs';
import path from 'path';

const TARGET = path.join(process.cwd(), 'src', 'WeddingGallery.js');

if (!fs.existsSync(TARGET)) {
  console.error(`\u274c Could not find ${TARGET}`);
  console.error('   Run this script from your project root (same folder as package.json).');
  process.exitCode = 1;
  process.exit();
}

const original = fs.readFileSync(TARGET, 'utf8');
const usesCRLF = original.includes('\r\n');
// Normalize to LF for matching/patching, restore CRLF at the end if needed.
let content = original.replace(/\r\n/g, '\n');

if (content.includes('.lux-lb-topbar')) {
  console.log('\u2705 Already patched \u2014 .lux-lb-topbar found in WeddingGallery.js. Nothing to do.');
  process.exit();
}

let changes = 0;
const TOTAL_STEPS = 19;

function applyReplace(label, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error(`\u274c Could not find expected code for: ${label}`);
    console.error('   Your file may differ from what this patch expects \u2014 paste the file to Claude for a manual patch.');
    process.exitCode = 1;
    return false;
  }
  content = content.replace(oldStr, newStr);
  changes++;
  console.log(`\u2705 Patched (${changes}/${TOTAL_STEPS}): ${label}`);
  return true;
}

// 1) Guest-name field CSS (inserted before .lux-card)
applyReplace(
  "Guest-name field CSS (inserted before .lux-card)",
  "  font-size: 11.5px; font-weight: 300; letter-spacing: 0.05em; color: var(--ink-40);\n}\n\n/* \u2500\u2500 GALLERY CARD \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.lux-card {\n  background: var(--white);",
  "  font-size: 11.5px; font-weight: 300; letter-spacing: 0.05em; color: var(--ink-40);\n}\n\n/* \u2500\u2500 GUEST NAME FIELD \u2014 required before any upload, remembered locally so\n   a returning guest never has to retype it \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.lux-name-field { margin-bottom: 14px; text-align: left; }\n.lux-name-label {\n  display: block; font-family: var(--font-body); font-size: 10px; font-weight: 400;\n  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-40); margin-bottom: 6px;\n}\n.lux-name-input {\n  width: 100%; padding: 12px 14px; font-family: var(--font-body); font-size: 14px;\n  color: var(--ink); background: rgba(255,255,255,0.65);\n  border: 1px solid var(--pink-border); border-radius: 4px; outline: none;\n  transition: border-color .2s, background .2s;\n}\n.lux-name-input:focus { border-color: var(--gold); background: var(--white); }\n.lux-name-field-video { margin: 10px 2px 4px; max-width: 360px; }\n.lux-name-error { color: #c45; font-size: 11px; margin-top: 6px; }\n\n/* \u2500\u2500 GALLERY CARD \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.lux-card {\n  background: var(--white);"
);

// 2) Lightbox CSS — full-bleed black canvas, Facebook-style circular nav, top credit/counter bar
applyReplace(
  "Lightbox CSS \u2014 full-bleed black canvas, Facebook-style circular nav, top credit/counter bar",
  ".lux-lightbox {\n  position: fixed; inset: 0; z-index: 1000;\n  width: 100vw; height: 100vh; height: 100dvh;\n  background: rgba(7, 2, 5, 0.97);\n  display: none; align-items: center; justify-content: center; flex-direction: column;\n  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);\n}\n.lux-lightbox.open { display: flex; animation: fadeIn .3s ease both; }\n\n.lux-lb-close {\n  position: absolute; top: 18px; right: 20px;\n  width: 36px; height: 36px; border-radius: 50%;\n  background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.12);\n  color: rgba(255,255,255,0.55); cursor: pointer; transition: all .25s;\n  display: flex; align-items: center; justify-content: center;\n}\n.lux-lb-close:hover { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.30); }\n\n.lux-lb-nav {\n  position: absolute; top: 50%; transform: translateY(-50%);\n  width: 40px; height: 40px; z-index: 4;\n  background: transparent; border: 0.5px solid rgba(255,255,255,0.12);\n  color: rgba(255,255,255,0.45); font-size: 22px;\n  display: flex; align-items: center; justify-content: center;\n  cursor: pointer; transition: all .25s;\n}\n.lux-lb-nav:hover { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.34); }\n.lux-lb-prev { left: 12px; }\n.lux-lb-next { right: 12px; }\n\n/* width:100% + position:relative + touch-action:pan-y \u2192 reliable full-bleed\n   centering on every viewport, and lets JS own horizontal swipe gestures\n   while still allowing native vertical scroll/pull-to-refresh. */\n.lux-lb-img-wrap {\n  max-width: 90vw; max-height: 72vh; width: 100%;\n  display: flex; align-items: center; justify-content: center;\n  position: relative; touch-action: pan-y;\n}\n.lux-lb-img {\n  max-width: 100%; max-height: 100%; object-fit: contain;\n  transition: transform .4s var(--ease-cinematic);\n  box-shadow: 0 40px 80px rgba(0,0,0,0.55);\n  will-change: transform; user-select: none; -webkit-user-drag: none;\n}\n.lux-lb-img.zoomed   { transform: scale(2.2); }\n.lux-lb-img.dragging { transition: none; }\n\n/* Filmstrip scrubber */\n.lux-lb-filmstrip {\n  position: absolute; bottom: 0; left: 0; right: 0;\n  display: flex; align-items: center; justify-content: center;\n  gap: 3px; padding: 12px 16px 18px;\n  background: linear-gradient(0deg, rgba(0,0,0,0.72) 0%, transparent 100%);\n  overflow-x: auto; -webkit-overflow-scrolling: touch;\n}\n.lux-lb-filmstrip::-webkit-scrollbar { display: none; }\n\n.lux-lb-thumb {\n  flex-shrink: 0;\n  width: 38px; height: 28px;\n  background: rgba(255,255,255,0.10);\n  border: 1.5px solid transparent;\n  overflow: hidden; cursor: pointer; transition: all .25s; opacity: 0.52;\n}\n.lux-lb-thumb img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block; }\n.lux-lb-thumb.active { border-color: var(--gold); opacity: 1; box-shadow: 0 0 0 1px rgba(184,144,74,0.5); }\n.lux-lb-thumb:hover:not(.active) { opacity: 0.82; border-color: rgba(255,255,255,0.25); }\n\n/* Zoom toggle \u2014 floats above filmstrip */\n.lux-lb-zoom {\n  position: absolute; bottom: 80px;\n  background: transparent; border: 0.5px solid rgba(255,255,255,0.16);\n  color: rgba(255,255,255,0.42);\n  font-family: var(--font-body); font-size: 10px; font-weight: 400;\n  letter-spacing: 0.16em; text-transform: uppercase;\n  padding: 8px 18px; cursor: pointer; transition: all .25s;\n}\n.lux-lb-zoom:hover { color: #fff; border-color: rgba(184,144,74,0.55); }\n\n/* \u2500\u2500 FLOATING PETALS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n@keyframes petalFall {",
  ".lux-lightbox {\n  position: fixed; inset: 0; z-index: 1000;\n  width: 100vw; height: 100vh; height: 100dvh;\n  background: #000;\n  display: none; align-items: center; justify-content: center; flex-direction: column;\n}\n.lux-lightbox.open { display: flex; animation: fadeIn .25s ease both; }\n\n/* Top bar \u2014 gradient fade like Facebook's photo-viewer header. Holds the\n   uploader credit + position counter so the canvas below can be a true\n   full-bleed black letterbox with zero competing chrome. */\n.lux-lb-topbar {\n  position: absolute; top: 0; left: 0; right: 0; z-index: 5;\n  display: flex; align-items: center; justify-content: space-between;\n  padding: 16px 70px 16px 20px;\n  background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%);\n  pointer-events: none;\n}\n.lux-lb-credit {\n  font-family: var(--font-body); font-size: 12px; font-weight: 400;\n  color: rgba(255,255,255,0.78); letter-spacing: 0.02em;\n}\n.lux-lb-credit b { color: #fff; font-weight: 500; }\n.lux-lb-counter {\n  font-family: var(--font-body); font-size: 11px; font-weight: 400;\n  color: rgba(255,255,255,0.55); letter-spacing: 0.06em; white-space: nowrap;\n}\n\n.lux-lb-close {\n  position: absolute; top: 14px; right: 16px; z-index: 6;\n  width: 38px; height: 38px; border-radius: 50%;\n  background: rgba(0,0,0,0.4); border: none;\n  color: rgba(255,255,255,0.85); cursor: pointer; transition: all .2s;\n  display: flex; align-items: center; justify-content: center;\n}\n.lux-lb-close:hover { background: rgba(0,0,0,0.65); color: #fff; }\n\n/* Facebook-style circular nav \u2014 solid dark disc, white chevron, always\n   visible on pointer devices; hidden on touch (see hover:none rule below)\n   in favor of the native swipe gesture, exactly like Facebook's mobile\n   photo viewer. */\n.lux-lb-nav {\n  position: absolute; top: 50%; transform: translateY(-50%);\n  width: 44px; height: 44px; z-index: 4; border-radius: 50%;\n  background: rgba(0,0,0,0.4); border: none;\n  color: #fff;\n  display: flex; align-items: center; justify-content: center;\n  cursor: pointer; transition: all .2s;\n}\n.lux-lb-nav:hover { background: rgba(0,0,0,0.65); }\n.lux-lb-prev { left: 20px; }\n.lux-lb-next { right: 20px; }\n\n/* Full-bleed canvas \u2014 fills the entire viewport edge to edge.\n   object-fit:contain on the <img> does the letterboxing, so any blank\n   space left by the image's own aspect ratio is just the lightbox's black\n   background showing through \u2014 exactly how Facebook/Google Photos render\n   full-screen media, and the image is always perfectly centered. */\n.lux-lb-img-wrap {\n  width: 100vw; height: 100vh; height: 100dvh;\n  display: flex; align-items: center; justify-content: center;\n  position: relative; touch-action: pan-y;\n}\n.lux-lb-img {\n  max-width: 100%; max-height: 100%; object-fit: contain;\n  transition: transform .4s var(--ease-cinematic);\n  will-change: transform; user-select: none; -webkit-user-drag: none;\n}\n.lux-lb-img.zoomed   { transform: scale(2.2); }\n.lux-lb-img.dragging { transition: none; }\n\n/* Zoom toggle \u2014 floats bottom-center now that the filmstrip is gone */\n.lux-lb-zoom {\n  position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 5;\n  background: rgba(0,0,0,0.4); border: none;\n  color: rgba(255,255,255,0.75);\n  font-family: var(--font-body); font-size: 10px; font-weight: 400;\n  letter-spacing: 0.16em; text-transform: uppercase;\n  padding: 9px 20px; border-radius: 999px; cursor: pointer; transition: all .2s;\n}\n.lux-lb-zoom:hover { color: #fff; background: rgba(0,0,0,0.6); }\n\n/* \u2500\u2500 FLOATING PETALS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n@keyframes petalFall {"
);

// 3) Mobile lightbox media query — remove the 60vh height cap and filmstrip rules
applyReplace(
  "Mobile lightbox media query \u2014 remove the 60vh height cap and filmstrip rules",
  "/* \u2500\u2500 Lightbox: all phones \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n@media (max-width: 639px) {\n\n  /* Close button: 44\u00d744 minimum touch target */\n  .lux-lb-close { width: 44px; height: 44px; top: 12px; right: 12px; }\n\n  /* Nav arrows: edge-to-edge vertical strips, easy to hit with thumb */\n  .lux-lb-nav  { width: 44px; height: 56px; font-size: 28px; }\n  .lux-lb-prev { left: 0; }\n  .lux-lb-next { right: 0; }\n\n  /* Image area: give filmstrip space below */\n  .lux-lb-img-wrap { max-height: 60vh; max-width: 100vw; }\n\n  /* Zoom toggle: raise it just above the filmstrip */\n  .lux-lb-zoom { bottom: 68px; padding: 10px 18px; }\n\n  /* Filmstrip: slightly larger thumbs for touch precision */\n  .lux-lb-filmstrip { padding: 8px 12px 12px; gap: 4px; }\n  .lux-lb-thumb     { width: 44px; height: 32px; }\n}\n\n/* \u2500\u2500 Touch devices: fix hover-only states \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */",
  "/* \u2500\u2500 Lightbox: all phones \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n@media (max-width: 639px) {\n\n  /* Top bar: tighter padding, smaller type */\n  .lux-lb-topbar  { padding: 12px 56px 12px 14px; }\n  .lux-lb-credit  { font-size: 11px; }\n  .lux-lb-counter { font-size: 10px; }\n\n  /* Close button: 44\u00d744 minimum touch target */\n  .lux-lb-close { width: 40px; height: 40px; top: 10px; right: 10px; }\n\n  /* Zoom toggle: raise it slightly off the safe-area edge */\n  .lux-lb-zoom { bottom: 18px; padding: 8px 16px; }\n}\n\n/* \u2500\u2500 Touch devices: fix hover-only states \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */"
);

// 4) Reels CSS — best-fit video (object-fit:contain), flat Facebook-style nav buttons, caption class
applyReplace(
  "Reels CSS \u2014 best-fit video (object-fit:contain), flat Facebook-style nav buttons, caption class",
  "}\n.lux-reel-video {\n  width: 100%; height: 100%;\n  object-fit: cover; cursor: pointer;\n  background: #000;\n}\n\n.lux-reels-close, .lux-reels-mute {\n  position: absolute; z-index: 5;\n  width: 38px; height: 38px; border-radius: 50%;\n  background: rgba(0,0,0,0.35); border: 0.5px solid rgba(255,255,255,0.25);\n  color: #fff; display: flex; align-items: center; justify-content: center;\n  cursor: pointer; transition: all .25s; backdrop-filter: blur(4px);\n}\n.lux-reels-close { top: 18px; left: 16px; }\n.lux-reels-mute  { bottom: 28px; right: 16px; }\n.lux-reels-close:hover, .lux-reels-mute:hover { background: rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.45); }\n\n/* Desktop-only Prev/Next \u2014 hidden on touch devices (rule above) */\n.lux-reels-nav {\n  position: absolute; right: 18px; z-index: 5;\n  width: 42px; height: 42px; border-radius: 50%;\n  background: rgba(0,0,0,0.35); border: 0.5px solid rgba(255,255,255,0.25);\n  color: #fff; display: flex; align-items: center; justify-content: center;\n  cursor: pointer; transition: all .25s; backdrop-filter: blur(4px);\n}\n.lux-reels-nav:hover    { background: rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.45); }\n.lux-reels-nav:disabled { opacity: 0.22; cursor: default; pointer-events: none; }\n.lux-reels-prev { top: calc(50% - 56px); }\n.lux-reels-next { top: calc(50% + 14px); }\n\n/* Per-video seek/scrub bar \u2014 tap or drag to fast-forward or replay */\n.lux-reel-seek {\n  position: absolute; left: 14px; right: 14px; bottom: 18px; z-index: 6;",
  "}\n.lux-reel-video {\n  width: 100%; height: 100%;\n  /* contain (not cover) \u2192 the whole video is always visible, best-fit\n     inside the frame; any leftover space is letterboxed by the slide's\n     own black background instead of cropping the footage. */\n  object-fit: contain; cursor: pointer;\n  background: #000;\n}\n\n.lux-reels-close, .lux-reels-mute {\n  position: absolute; z-index: 5;\n  width: 38px; height: 38px; border-radius: 50%;\n  background: rgba(0,0,0,0.4); border: none;\n  color: #fff; display: flex; align-items: center; justify-content: center;\n  cursor: pointer; transition: all .2s;\n}\n.lux-reels-close { top: 18px; left: 16px; }\n.lux-reels-mute  { bottom: 28px; right: 16px; }\n.lux-reels-close:hover, .lux-reels-mute:hover { background: rgba(0,0,0,0.65); }\n\n/* Desktop-only Prev/Next \u2014 hidden on touch devices (rule above) */\n.lux-reels-nav {\n  position: absolute; right: 18px; z-index: 5;\n  width: 44px; height: 44px; border-radius: 50%;\n  background: rgba(0,0,0,0.4); border: none;\n  color: #fff; display: flex; align-items: center; justify-content: center;\n  cursor: pointer; transition: all .2s;\n}\n.lux-reels-nav:hover    { background: rgba(0,0,0,0.65); }\n.lux-reels-nav:disabled { opacity: 0.22; cursor: default; pointer-events: none; }\n.lux-reels-prev { top: calc(50% - 56px); }\n.lux-reels-next { top: calc(50% + 14px); }\n\n/* Uploader credit caption \u2014 bottom-left, above the seek bar, just like\n   Facebook/Instagram Reels captions */\n.lux-reel-caption {\n  position: absolute; left: 16px; right: 70px; bottom: 56px; z-index: 5;\n  font-family: var(--font-body); font-size: 12px; color: rgba(255,255,255,0.85);\n  text-shadow: 0 1px 6px rgba(0,0,0,0.65); pointer-events: none;\n}\n.lux-reel-caption b { color: #fff; font-weight: 500; }\n\n/* Per-video seek/scrub bar \u2014 tap or drag to fast-forward or replay */\n.lux-reel-seek {\n  position: absolute; left: 14px; right: 14px; bottom: 18px; z-index: 6;"
);

// 5) Mobile reels media query — caption position
applyReplace(
  "Mobile reels media query \u2014 caption position",
  "  .lux-reels-close { top: 14px; left: 12px; width: 40px; height: 40px; }\n  .lux-reels-mute  { bottom: 22px; right: 12px; width: 40px; height: 40px; }\n  .lux-reel-seek   { left: 12px; right: 12px; bottom: 16px; }\n}\n\n`",
  "  .lux-reels-close { top: 14px; left: 12px; width: 40px; height: 40px; }\n  .lux-reels-mute  { bottom: 22px; right: 12px; width: 40px; height: 40px; }\n  .lux-reel-seek   { left: 12px; right: 12px; bottom: 16px; }\n  .lux-reel-caption { left: 12px; right: 12px; bottom: 50px; font-size: 11px; }\n}\n\n`"
);

// 6) Name↔filename encode/decode helpers + b2Upload() now requires an uploaderName
applyReplace(
  "Name\u2194filename encode/decode helpers + b2Upload() now requires an uploaderName",
  "// In local dev (npm start) you need to run: npx wrangler pages dev build --compatibility-date 2024-01-01\nconst API_BASE = '';  // empty = same origin (works for both Pages and local wrangler dev)\n\n/** Upload a single file \u2192 returns the public B2 URL */\nasync function b2Upload(file, type) {\n  // 1. Ask our server-side Function for a presigned PUT URL\n  const metaRes = await fetch(`${API_BASE}/api/upload`, {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({\n      type,\n      filename:    file.name,\n      contentType: file.type,\n      sizeBytes:   file.size,\n    }),",
  "// In local dev (npm start) you need to run: npx wrangler pages dev build --compatibility-date 2024-01-01\nconst API_BASE = '';  // empty = same origin (works for both Pages and local wrangler dev)\n\n// \u2500\u2500 Guest-name \u2194 filename encoding \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// /api/list only ever round-trips the B2 object key (no custom metadata,\n// which would need a HEAD request per item to read back). So the guest's\n// name is embedded directly in the uploaded filename instead, as\n// \"g_<base64url-name>.<ext>\". Base64url's alphabet (A-Z a-z 0-9 - _) is a\n// subset of the server's own [a-zA-Z0-9._-] filename sanitizer, so it\n// passes through untouched \u2014 and because it's a real byte-level encoding\n// (not stripped ASCII), accented/non-Latin names round-trip perfectly.\nfunction encodeNameForKey(name) {\n  const trimmed = (name || '').trim().slice(0, 60);\n  const bytes = new TextEncoder().encode(trimmed);\n  let binary = '';\n  bytes.forEach(b => { binary += String.fromCharCode(b); });\n  return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');\n}\nfunction decodeNameFromKey(key) {\n  const base = (key || '').split('/').pop() || '';\n  const stripped = base.replace(/^\\d+_/, ''); // strip the server's Date.now()_ prefix\n  const m = stripped.match(/^g_([A-Za-z0-9_-]+)\\./);\n  if (!m) return null;\n  try {\n    let b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');\n    while (b64.length % 4) b64 += '=';\n    const binary = atob(b64);\n    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));\n    const name = new TextDecoder().decode(bytes).trim();\n    return name || null;\n  } catch { return null; }\n}\n\n/** Upload a single file \u2192 returns the public B2 URL. `uploaderName` is\n *  required and gets embedded in the stored filename (see above). */\nasync function b2Upload(file, type, uploaderName) {\n  const extMatch = file.name.match(/\\.([a-zA-Z0-9]+)$/);\n  const ext = extMatch ? extMatch[1].toLowerCase() : (type === 'video' ? 'mp4' : 'jpg');\n  const encodedFilename = `g_${encodeNameForKey(uploaderName)}.${ext}`;\n\n  // 1. Ask our server-side Function for a presigned PUT URL\n  const metaRes = await fetch(`${API_BASE}/api/upload`, {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({\n      type,\n      filename:    encodedFilename,\n      contentType: file.type,\n      sizeBytes:   file.size,\n    }),"
);

// 7) b2List() — decode the uploader's name back out of the object key
applyReplace(
  "b2List() \u2014 decode the uploader's name back out of the object key",
  "    name: item.key.split('/').pop(),\n    size: item.size,\n    uploaded: item.uploaded,\n  }));\n}\n",
  "    name: item.key.split('/').pop(),\n    size: item.size,\n    uploaded: item.uploaded,\n    uploaderName: decodeNameFromKey(item.key),\n  }));\n}\n"
);

// 8) Component state — add guestName (persisted to localStorage)
applyReplace(
  "Component state \u2014 add guestName (persisted to localStorage)",
  "  const [lightbox, setLightbox]     = useState({ open: false, idx: 0, zoomed: false });\n  const [reels, setReels]           = useState({ open: false, idx: 0 });\n  const [reelMuted, setReelMuted]   = useState(true);\n  const fileInputRef     = useRef(null);\n  const videoInputRef    = useRef(null);\n  const reelRefs          = useRef([]);",
  "  const [lightbox, setLightbox]     = useState({ open: false, idx: 0, zoomed: false });\n  const [reels, setReels]           = useState({ open: false, idx: 0 });\n  const [reelMuted, setReelMuted]   = useState(true);\n  const [guestName, setGuestName]   = useState(() => {\n    try { return localStorage.getItem('lux_guest_name') || ''; } catch { return ''; }\n  });\n  const fileInputRef     = useRef(null);\n  const videoInputRef    = useRef(null);\n  const reelRefs          = useRef([]);"
);

// 9) Scroll-lock effect — lock background scroll while the Lightbox/Reels is open
applyReplace(
  "Scroll-lock effect \u2014 lock background scroll while the Lightbox/Reels is open",
  "    s.textContent = LUXURY_CSS;\n  }, []);\n\n  // Load photos from B2 on mount\n  useEffect(() => {\n    setPhotosLoading(true);",
  "    s.textContent = LUXURY_CSS;\n  }, []);\n\n  // Lock background scroll while the Lightbox or Reels viewer is open \u2014\n  // uses the iOS-safe \"fixed body + restore scrollY\" technique so the page\n  // behind can never rubber-band/scroll, even on mobile Safari.\n  useEffect(() => {\n    const shouldLock = lightbox.open || reels.open;\n    if (shouldLock) {\n      const scrollY = window.scrollY;\n      document.body.dataset.lockedScrollY = String(scrollY);\n      document.body.style.position = 'fixed';\n      document.body.style.top    = `-${scrollY}px`;\n      document.body.style.left   = '0';\n      document.body.style.right  = '0';\n      document.body.style.width  = '100%';\n    } else if (document.body.dataset.lockedScrollY !== undefined) {\n      const scrollY = parseInt(document.body.dataset.lockedScrollY || '0', 10);\n      document.body.style.position = '';\n      document.body.style.top    = '';\n      document.body.style.left   = '';\n      document.body.style.right  = '';\n      document.body.style.width  = '';\n      delete document.body.dataset.lockedScrollY;\n      window.scrollTo(0, scrollY);\n    }\n  }, [lightbox.open, reels.open]);\n\n  // Load photos from B2 on mount\n  useEffect(() => {\n    setPhotosLoading(true);"
);

// 10) updateGuestName() helper
applyReplace(
  "updateGuestName() helper",
  "    return () => observer.disconnect();\n  }, [reels.open, videos.length]);\n\n  function handleFiles(fileList) {\n    Array.from(fileList).filter(f => f.type.startsWith(\"image/\"))\n      .slice(0, 20 - previews.length)",
  "    return () => observer.disconnect();\n  }, [reels.open, videos.length]);\n\n  function updateGuestName(value) {\n    setGuestName(value);\n    try { localStorage.setItem('lux_guest_name', value); } catch { /* private mode, etc. */ }\n  }\n\n  function handleFiles(fileList) {\n    Array.from(fileList).filter(f => f.type.startsWith(\"image/\"))\n      .slice(0, 20 - previews.length)"
);

// 11) uploadPhotos() — require a name and pass it through to b2Upload
applyReplace(
  "uploadPhotos() \u2014 require a name and pass it through to b2Upload",
  "\n  async function uploadPhotos() {\n    if (!previews.length) return;\n    setUploadState({ active: true, progress: 0, error: null });\n    try {\n      const uploaded = [];\n      for (let i = 0; i < previews.length; i++) {\n        const p = previews[i];\n        const publicUrl = await b2Upload(p.file, 'photo');\n        uploaded.push({ id: Date.now() + i, url: publicUrl, name: p.name });\n        setUploadState(s => ({ ...s, progress: Math.round(((i + 1) / previews.length) * 100) }));\n        URL.revokeObjectURL(p.url);\n      }",
  "\n  async function uploadPhotos() {\n    if (!previews.length) return;\n    const name = guestName.trim();\n    if (!name) { setUploadState(s => ({ ...s, error: 'Please enter your name first' })); return; }\n    setUploadState({ active: true, progress: 0, error: null });\n    try {\n      const uploaded = [];\n      for (let i = 0; i < previews.length; i++) {\n        const p = previews[i];\n        const publicUrl = await b2Upload(p.file, 'photo', name);\n        uploaded.push({ id: Date.now() + i, url: publicUrl, name: p.name, uploaderName: name });\n        setUploadState(s => ({ ...s, progress: Math.round(((i + 1) / previews.length) * 100) }));\n        URL.revokeObjectURL(p.url);\n      }"
);

// 12) uploadVideo() — require a name and pass it through to b2Upload
applyReplace(
  "uploadVideo() \u2014 require a name and pass it through to b2Upload",
  "\n  async function uploadVideo() {\n    if (!videoPreview) return;\n    setUploadState({ active: true, progress: 0, error: null });\n    try {\n      const publicUrl = await b2Upload(videoPreview.file, 'video');\n      setVideos(prev => [{ id: Date.now(), url: publicUrl, name: videoPreview.name }, ...prev]);\n      URL.revokeObjectURL(videoPreview.url);\n      setVideoPreview(null);\n      setUploadState({ active: false, progress: 100, error: null });",
  "\n  async function uploadVideo() {\n    if (!videoPreview) return;\n    const name = guestName.trim();\n    if (!name) { setUploadState(s => ({ ...s, error: 'Please enter your name first' })); return; }\n    setUploadState({ active: true, progress: 0, error: null });\n    try {\n      const publicUrl = await b2Upload(videoPreview.file, 'video', name);\n      setVideos(prev => [{ id: Date.now(), url: publicUrl, name: videoPreview.name, uploaderName: name }, ...prev]);\n      URL.revokeObjectURL(videoPreview.url);\n      setVideoPreview(null);\n      setUploadState({ active: false, progress: 100, error: null });"
);

// 13) Video upload button — visual disabled state when no name is set
applyReplace(
  "Video upload button \u2014 visual disabled state when no name is set",
  "              />\n              <button\n                onClick={uploadVideo}\n                disabled={uploadState.active}\n                style={{\n                  position: 'absolute', bottom: 4, left: 4, right: 4,\n                  background: 'rgba(184,144,74,0.9)', color: '#fff',\n                  border: 'none', borderRadius: 6, fontSize: 10,\n                  padding: '4px 0', cursor: 'pointer', fontFamily: 'var(--font-body)'\n                }}\n              >\n                {uploadState.active ? `${uploadState.progress}%` : 'Upload'}",
  "              />\n              <button\n                onClick={uploadVideo}\n                disabled={uploadState.active || !guestName.trim()}\n                style={{\n                  position: 'absolute', bottom: 4, left: 4, right: 4,\n                  background: 'rgba(184,144,74,0.9)', color: '#fff',\n                  border: 'none', borderRadius: 6, fontSize: 10,\n                  padding: '4px 0', fontFamily: 'var(--font-body)',\n                  cursor: (uploadState.active || !guestName.trim()) ? 'not-allowed' : 'pointer',\n                  opacity: (!uploadState.active && !guestName.trim()) ? 0.5 : 1,\n                }}\n              >\n                {uploadState.active ? `${uploadState.progress}%` : 'Upload'}"
);

// 14) Video upload — required name field JSX
applyReplace(
  "Video upload \u2014 required name field JSX",
  "          ))}\n        </div>\n\n\n        {/* GALLERY \u2014 inside white card/widget */}\n        <div className=\"lux-inner-label-row\"><span className=\"lux-inner-label-txt\">Shared Memories</span><div className=\"lux-inner-label-rule\" /></div>",
  "          ))}\n        </div>\n\n        {videoPreview && (\n          <div className=\"lux-name-field lux-name-field-video\">\n            <label className=\"lux-name-label\" htmlFor=\"lux-guest-name-video\">Your Name *</label>\n            <input\n              id=\"lux-guest-name-video\"\n              className=\"lux-name-input\"\n              type=\"text\"\n              value={guestName}\n              onChange={e => updateGuestName(e.target.value)}\n              placeholder=\"e.g. Maria Santos\"\n              maxLength={60}\n              autoComplete=\"name\"\n            />\n            {uploadState.error && <div className=\"lux-name-error\">{uploadState.error}</div>}\n          </div>\n        )}\n\n\n        {/* GALLERY \u2014 inside white card/widget */}\n        <div className=\"lux-inner-label-row\"><span className=\"lux-inner-label-txt\">Shared Memories</span><div className=\"lux-inner-label-rule\" /></div>"
);

// 15) Photo upload — required name field JSX (above the Send button)
applyReplace(
  "Photo upload \u2014 required name field JSX (above the Send button)",
  "\n            {previews.length > 0 && (\n              <div className=\"lux-send-bar\">\n                {uploadState.error && (\n                  <div style={{ color: '#c45', fontSize: 12, marginBottom: 6, textAlign: 'center' }}>\n                    {uploadState.error}",
  "\n            {previews.length > 0 && (\n              <div className=\"lux-send-bar\">\n                <div className=\"lux-name-field\">\n                  <label className=\"lux-name-label\" htmlFor=\"lux-guest-name-photo\">Your Name *</label>\n                  <input\n                    id=\"lux-guest-name-photo\"\n                    className=\"lux-name-input\"\n                    type=\"text\"\n                    value={guestName}\n                    onChange={e => updateGuestName(e.target.value)}\n                    placeholder=\"e.g. Maria Santos\"\n                    maxLength={60}\n                    autoComplete=\"name\"\n                  />\n                </div>\n                {uploadState.error && (\n                  <div style={{ color: '#c45', fontSize: 12, marginBottom: 6, textAlign: 'center' }}>\n                    {uploadState.error}"
);

// 16) Photo Send button — disabled until a name is entered
applyReplace(
  "Photo Send button \u2014 disabled until a name is entered",
  "                <button\n                  className=\"lux-btn-send\"\n                  onClick={uploadPhotos}\n                  disabled={uploadState.active}\n                >\n                  {uploadState.active\n                    ? `Uploading\u2026 ${uploadState.progress}%`",
  "                <button\n                  className=\"lux-btn-send\"\n                  onClick={uploadPhotos}\n                  disabled={uploadState.active || !guestName.trim()}\n                >\n                  {uploadState.active\n                    ? `Uploading\u2026 ${uploadState.progress}%`"
);

// 17) Lightbox JSX — top credit/counter bar + new SVG chevron nav buttons
applyReplace(
  "Lightbox JSX \u2014 top credit/counter bar + new SVG chevron nav buttons",
  "        </footer>\n      </div>\n\n      {/* LIGHTBOX */}\n      <div className={`lux-lightbox${lightbox.open ? \" open\" : \"\"}`}>\n        <button className=\"lux-lb-close\" onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))}>\n          <svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" fill=\"none\">\n            <path d=\"M1.5 1.5l9 9M10.5 1.5l-9 9\" stroke=\"currentColor\" strokeWidth=\"1.2\" strokeLinecap=\"round\" />\n          </svg>\n        </button>\n        <button className=\"lux-lb-nav lux-lb-prev\" onClick={() => navPhoto(-1)}>\u2039</button>\n        <button className=\"lux-lb-nav lux-lb-next\" onClick={() => navPhoto(1)}>\u203a</button>\n        <div\n          className=\"lux-lb-img-wrap\"\n          onPointerDown={lbDragStart}",
  "        </footer>\n      </div>\n\n      {/* LIGHTBOX \u2014 full-bleed, Facebook-style photo viewer */}\n      <div className={`lux-lightbox${lightbox.open ? \" open\" : \"\"}`}>\n        <div className=\"lux-lb-topbar\">\n          <span className=\"lux-lb-credit\">\n            {currentImg?.uploaderName ? <>Shared by <b>{currentImg.uploaderName}</b></> : \"\"}\n          </span>\n          <span className=\"lux-lb-counter\">\n            {photos.length > 0 ? `${lightbox.idx + 1} / ${photos.length}` : \"\"}\n          </span>\n        </div>\n        <button className=\"lux-lb-close\" onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))} aria-label=\"Close\">\n          <svg width=\"14\" height=\"14\" viewBox=\"0 0 12 12\" fill=\"none\">\n            <path d=\"M1.5 1.5l9 9M10.5 1.5l-9 9\" stroke=\"currentColor\" strokeWidth=\"1.3\" strokeLinecap=\"round\" />\n          </svg>\n        </button>\n        <button className=\"lux-lb-nav lux-lb-prev\" onClick={() => navPhoto(-1)} aria-label=\"Previous photo\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 18 18\" fill=\"none\">\n            <path d=\"M11 3l-6 6 6 6\" stroke=\"currentColor\" strokeWidth=\"1.8\" strokeLinecap=\"round\" strokeLinejoin=\"round\" />\n          </svg>\n        </button>\n        <button className=\"lux-lb-nav lux-lb-next\" onClick={() => navPhoto(1)} aria-label=\"Next photo\">\n          <svg width=\"18\" height=\"18\" viewBox=\"0 0 18 18\" fill=\"none\">\n            <path d=\"M7 3l6 6-6 6\" stroke=\"currentColor\" strokeWidth=\"1.8\" strokeLinecap=\"round\" strokeLinejoin=\"round\" />\n          </svg>\n        </button>\n        <div\n          className=\"lux-lb-img-wrap\"\n          onPointerDown={lbDragStart}"
);

// 18) Lightbox JSX — remove the filmstrip thumbnail strip
applyReplace(
  "Lightbox JSX \u2014 remove the filmstrip thumbnail strip",
  "        >\n          {lightbox.zoomed ? \"Zoom Out\" : \"Zoom In\"}\n        </button>\n        <div className=\"lux-lb-filmstrip\">\n          {photos.map((photo, idx) => (\n            <div\n              key={photo.id}\n              className={`lux-lb-thumb${lightbox.idx === idx ? \" active\" : \"\"}`}\n              onClick={() => setLightbox(l => ({ ...l, idx, zoomed: false }))}\n            >\n              <img src={photo.url} alt=\"\" />\n            </div>\n          ))}\n        </div>\n      </div>\n\n      {/* REELS \u2014 full-screen vertical video viewer (TikTok/Reels style) */}",
  "        >\n          {lightbox.zoomed ? \"Zoom Out\" : \"Zoom In\"}\n        </button>\n      </div>\n\n      {/* REELS \u2014 full-screen vertical video viewer (TikTok/Reels style) */}"
);

// 19) Reels JSX — uploader credit caption on each video
applyReplace(
  "Reels JSX \u2014 uploader credit caption on each video",
  "                preload=\"metadata\"\n                onClick={(e) => { e.target.paused ? e.target.play().catch(() => {}) : e.target.pause(); }}\n              />\n              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open} />\n            </div>\n          ))}",
  "                preload=\"metadata\"\n                onClick={(e) => { e.target.paused ? e.target.play().catch(() => {}) : e.target.pause(); }}\n              />\n              {vid.uploaderName && (\n                <div className=\"lux-reel-caption\">Shared by <b>{vid.uploaderName}</b></div>\n              )}\n              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open} />\n            </div>\n          ))}"
);

if (changes < TOTAL_STEPS) {
  console.error(`\n\u274c Patch incomplete \u2014 only ${changes}/${TOTAL_STEPS} sections matched. File NOT written.`);
  process.exitCode = 1;
  process.exit();
}

const output = usesCRLF ? content.replace(/\n/g, '\r\n') : content;
fs.writeFileSync(TARGET, output, 'utf8');

console.log(`\n\ud83c\udf89 Done! All ${TOTAL_STEPS} sections patched successfully.`);
console.log('\nWhat changed, in one line each:');
console.log('  \u2022 Lightbox \u2192 full-bleed black canvas, FB-style nav, no more filmstrip');
console.log('  \u2022 Reels video \u2192 best-fit (letterboxed), no more cropping');
console.log('  \u2022 Background scroll is now locked while either viewer is open');
console.log('  \u2022 Uploading a photo or video now requires a name, shown as "Shared by \u2026"');
console.log('\nNext steps:');
console.log('  git add src/WeddingGallery.js');
console.log('  git commit -m "Full-bleed FB-style viewer + best-fit video + required guest name"');
console.log('  git push');
