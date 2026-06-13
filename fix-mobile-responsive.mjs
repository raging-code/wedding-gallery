/**
 * fix-mobile-responsive.mjs
 *
 * Comprehensive mobile responsiveness pass for WeddingGallery.js.
 *
 * Issues fixed:
 *  1.  Hero padding  96px/72px  → 48px/32px on mobile (was eating 25% of screen)
 *  2.  Pretitle margin-bottom 36px → 20px on mobile
 *  3.  Invite section margin 52px  → 24px on mobile
 *  4.  Eyebrow section margin 64px → 36px on mobile
 *  5.  Inner label margin 32px     → 20px on mobile
 *  6.  Page bottom padding 140px   → 72px on mobile
 *  7.  Upload button  → full-width, centered on mobile
 *  8.  Send button    → full-width, centered on mobile
 *  9.  Gallery panel padding → 20px/16px on mobile
 * 10.  Gallery bar    → stacks to column; action buttons wrap cleanly
 * 11.  Gallery action buttons → min 38px touch target
 * 12.  Ghost button → larger touch target
 * 13.  View All button → full-width on mobile
 * 14.  Footer margin-top 100px → 60px on mobile
 * 15.  Lightbox close btn 36×36 → 44×44 (touch minimum)
 * 16.  Lightbox nav arrows 40×40 → 44×56, edge-to-edge on mobile
 * 17.  Lightbox img-wrap max-height 72vh → 60vh (room for filmstrip)
 * 18.  Lightbox zoom button repositioned on mobile
 * 19.  Touch devices: suppress hover-only overlays that never fire
 * 20.  Selection mode: always show check circles on touch
 *
 * Usage:
 *   node fix-mobile-responsive.mjs
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const FILE = resolve('src/WeddingGallery.js');

// ── backup ──────────────────────────────────────────────────────────────────
const backup = FILE + '.bak-mobile-' + Date.now();
copyFileSync(FILE, backup);
console.log('✔ Backup →', backup);

// ── read & normalise CRLF ───────────────────────────────────────────────────
const raw = readFileSync(FILE, 'utf8');
const hasCRLF = raw.includes('\r\n');
let src = hasCRLF ? raw.replace(/\r\n/g, '\n') : raw;

// ── Guard: already patched? ─────────────────────────────────────────────────
if (src.includes('MOBILE RESPONSIVE')) {
  console.log('✔ Already patched — nothing to do.');
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 1 — Inject mobile CSS block at end of LUXURY_CSS
// ═══════════════════════════════════════════════════════════════════════════
const CSS_ANCHOR = '.lux-petal svg { width: 100%; height: 100%; display: block; }\n`';

const MOBILE_CSS =
`\n/* ══ MOBILE RESPONSIVE ═══════════════════════════════════════════════════════

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

  /* Upload CTA — stretch to full width */
  .lux-upload-simple  { align-items: stretch; }
  .lux-btn-upload     { width: 100%; justify-content: center; padding: 18px 20px; }
  .lux-upload-hint    { text-align: center; }

  /* Send bar — stretch to full width */
  .lux-btn-send    { width: 100%; padding: 17px 20px; }
  .lux-send-bar    { padding: 14px 0 4px; }

  /* Gallery card: tighter inner padding */
  .lux-gallery-panel { padding: 20px 16px 24px; }

  /* Gallery bar: stack title + action row */
  .lux-gallery-bar    { flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .lux-gallery-actions { flex-wrap: wrap; gap: 6px; }

  /* Action buttons: 38px min-height for finger tapping */
  .lux-btn-action { padding: 9px 14px; min-height: 38px; font-size: 10px; }

  /* + Add Video ghost button */
  .lux-btn-ghost { padding: 10px 14px; min-height: 38px; }

  /* Stories heading */
  .lux-stories-head { margin-bottom: 10px; }

  /* View All: full-width */
  .lux-view-all-wrap { margin-top: 14px; }
  .lux-btn-view-all  { width: 100%; padding: 14px 20px; }

  /* Footer: reduce large top gap */
  .lux-footer { margin-top: 60px; gap: 14px; }
}

/* ── Lightbox: all phones ────────────────────────────────────────────────── */
@media (max-width: 639px) {

  /* Close button: 44×44 minimum touch target */
  .lux-lb-close { width: 44px; height: 44px; top: 12px; right: 12px; }

  /* Nav arrows: edge-to-edge vertical strips, easy to hit with thumb */
  .lux-lb-nav  { width: 44px; height: 56px; font-size: 28px; }
  .lux-lb-prev { left: 0; }
  .lux-lb-next { right: 0; }

  /* Image area: give filmstrip space below */
  .lux-lb-img-wrap { max-height: 60vh; max-width: 100vw; }

  /* Zoom toggle: raise it just above the filmstrip */
  .lux-lb-zoom { bottom: 68px; padding: 10px 18px; }

  /* Filmstrip: slightly larger thumbs for touch precision */
  .lux-lb-filmstrip { padding: 8px 12px 12px; gap: 4px; }
  .lux-lb-thumb     { width: 44px; height: 32px; }
}

/* ── Touch devices: fix hover-only states ────────────────────────────────── */
@media (hover: none) {

  /* Photo hover overlay never fires on touch — hide it */
  .lux-photo-hover { opacity: 0 !important; }

  /* Selection mode: always show checkboxes so guests can tap-to-select */
  .lux-selection-mode .lux-photo-item .lux-select-check { opacity: 1; }
}
`;

const CSS_REPLACEMENT = MOBILE_CSS + '\n`';

if (!src.includes(CSS_ANCHOR)) {
  console.error('✘  Could not find CSS anchor. Was the file already modified?');
  process.exit(1);
}

src = src.replace(CSS_ANCHOR, CSS_REPLACEMENT);
console.log('✔  Patch 1 — Mobile CSS block injected at end of LUXURY_CSS');


// ═══════════════════════════════════════════════════════════════════════════
// PATCH 2 — lux-btn-upload: remove hard hover transform on touch devices
//           (the translateY(-3px) can cause layout jitter on mobile)
// ═══════════════════════════════════════════════════════════════════════════
const UPLOAD_HOVER_OLD =
`.lux-btn-upload:hover { transform: translateY(-3px); box-shadow: 0 14px 44px rgba(28,15,20,0.26); }`;

const UPLOAD_HOVER_NEW =
`.lux-btn-upload:hover { transform: translateY(-3px); box-shadow: 0 14px 44px rgba(28,15,20,0.26); }
@media (hover: none) { .lux-btn-upload:hover { transform: none; } }`;

if (src.includes(UPLOAD_HOVER_OLD)) {
  src = src.replace(UPLOAD_HOVER_OLD, UPLOAD_HOVER_NEW);
  console.log('✔  Patch 2 — Upload button hover transform disabled on touch');
} else {
  console.warn('⚠  Patch 2 skipped — upload hover rule not found (may already be patched)');
}


// ═══════════════════════════════════════════════════════════════════════════
// PATCH 3 — lux-photo-item: disable scale-on-hover on touch
// ═══════════════════════════════════════════════════════════════════════════
const PHOTO_HOVER_OLD =
`.lux-photo-item:hover img { transform: scale(1.05); filter: brightness(1.02); }`;

const PHOTO_HOVER_NEW =
`.lux-photo-item:hover img { transform: scale(1.05); filter: brightness(1.02); }
@media (hover: none) { .lux-photo-item:hover img { transform: none; filter: none; } }`;

if (src.includes(PHOTO_HOVER_OLD)) {
  src = src.replace(PHOTO_HOVER_OLD, PHOTO_HOVER_NEW);
  console.log('✔  Patch 3 — Photo scale-on-hover disabled on touch devices');
} else {
  console.warn('⚠  Patch 3 skipped — photo hover rule not found');
}


// ── restore original line endings ───────────────────────────────────────────
if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(FILE, src, 'utf8');

console.log('');
console.log('✅  All patches applied successfully!');
console.log('');
console.log('Next steps:');
console.log('  npm start     → preview on phone via local network IP');
console.log('  npm run build → production build');
