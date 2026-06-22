/**
 * patch-swipe-mute-fix.mjs
 *
 * Run from the repo root:  node patch-swipe-mute-fix.mjs
 *
 * Fixes two bugs in src/WeddingGallery.js:
 *
 * 1. FAST-SWIPE ANIMATION GLITCH (lightbox photo viewer)
 *    - Root cause A: React batches setState() calls made inside a DOM
 *      `transitionend` listener, so the centre-slot image was updated
 *      *after* the strip had already snapped back to resting, causing a
 *      single-frame flash of the wrong photo.
 *      Fix: wrap setLightbox() in flushSync() so the React re-render
 *      happens synchronously before the strip is reset.
 *    - Root cause B: lbSlidingRef.current stayed true for the full 280 ms
 *      CSS transition, causing a second fast swipe to be completely ignored.
 *      Fix: introduce lbAnimIdRef (an incrementing ID) so an in-flight
 *      animation can be cancelled instantly when a new drag starts.
 *
 * 2. MUTE BUTTON UNREACHABLE ON MOBILE + POSITION
 *    - Root cause: -webkit-overflow-scrolling: touch on .lux-reels-scroll
 *      makes iOS create a native UIScrollView that intercepts ALL touch
 *      events inside the container, even over absolutely-positioned siblings
 *      (the mute button) with a higher z-index.  This is a long-standing
 *      iOS WebKit bug.
 *      Fix: remove the deprecated property (no-op on iOS 13+) so the web
 *      layer handles touch events correctly.
 *    - Additionally: move the mute button from the bottom-right (where it
 *      competes with the seek bar and icon bar) to the top-right, mirroring
 *      the close button on the top-left.  Both desktop and mobile.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET    = resolve(__dirname, 'src/WeddingGallery.js');
const BACKUP    = TARGET + '.bak';

// ── Safety: back up the file before making any changes ──────────────────────
if (!existsSync(TARGET)) {
  console.error(`ERROR: ${TARGET} not found.\nRun this script from the repo root.`);
  process.exit(1);
}
copyFileSync(TARGET, BACKUP);
console.log(`Backup created → ${BACKUP}\n`);

let code     = readFileSync(TARGET, 'utf8');
const before = code;
const applied = [];
const failed  = [];

// ── Helper ───────────────────────────────────────────────────────────────────
function patch(label, from, to) {
  if (!code.includes(from)) {
    failed.push(`✗ ${label}  ← anchor not found (already applied or source changed?)`);
    return;
  }
  code = code.replace(from, to);
  applied.push(`✓ ${label}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// BUG 1 — FAST-SWIPE ANIMATION GLITCH
// ═══════════════════════════════════════════════════════════════════════════

// ── Patch 1a: Import flushSync from react-dom ────────────────────────────────
patch(
  'Patch 1a — import flushSync from react-dom',

  `import { useState, useEffect, useRef } from "react";`,

  `import { useState, useEffect, useRef } from "react";
import { flushSync } from 'react-dom';`
);

// ── Patch 1b: Add lbAnimIdRef alongside lbDragRef ───────────────────────────
patch(
  'Patch 1b — add lbAnimIdRef ref',

  `  const lbDragRef          = useRef({ active: false, startX: 0, startY: 0, locked: null, startTime: 0 });`,

  `  const lbDragRef          = useRef({ active: false, startX: 0, startY: 0, locked: null, startTime: 0 });
  // Incremented every time a new slide animation starts; stale onEnd
  // callbacks compare their captured animId against this and bail out.
  const lbAnimIdRef        = useRef(0);`
);

// ── Patch 1c: Rewrite lbSlide with flushSync + animation-ID guard ───────────
patch(
  'Patch 1c — rewrite lbSlide (flushSync + animation ID)',

  `  function lbSlide(dir) {
    if (lbSlidingRef.current || photos.length < 2) return;
    const strip = lbStripRef.current;
    if (!strip) return;

    lbSlidingRef.current = true;
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

      // 2. Update React state (slots re-render with new idx)
      setLightbox(l => ({
        ...l,
        idx: (l.idx + dir + photos.length) % photos.length,
        zoomed: false,
      }));

      // 3. Snap strip back with no transition
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
      if (!lbSlidingRef.current) return;
      strip.removeEventListener('transitionend', onEnd);
      onEnd();
    }, 500);
  }`,

  `  function lbSlide(dir) {
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
  }`
);

// ── Patch 1d: lbDragStart — cancel in-flight animation on new swipe ──────────
patch(
  'Patch 1d — lbDragStart cancels in-flight animation for instant response',

  `  function lbDragStart(e) {
    if (lightbox.zoomed || photos.length < 2 || lbSlidingRef.current) return;
    lbDragRef.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      locked: null, startTime: Date.now(),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }`,

  `  function lbDragStart(e) {
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
  }`
);

// ═══════════════════════════════════════════════════════════════════════════
// BUG 2 — MUTE BUTTON UNREACHABLE ON MOBILE + POSITION
// ═══════════════════════════════════════════════════════════════════════════

// ── Patch 2a: Remove -webkit-overflow-scrolling: touch ──────────────────────
//    This deprecated property makes iOS create a native UIScrollView that
//    swallows ALL touches inside its bounds — including taps on absolutely-
//    positioned siblings (the mute button) with a higher z-index.
//    Removing it is safe: iOS 13+ has inertia scrolling by default.
patch(
  'Patch 2a — remove -webkit-overflow-scrolling: touch from .lux-reels-scroll',

  `.lux-reels-scroll {
  height: 100vh; height: 100dvh;
  overflow-y: auto; scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}`,

  `.lux-reels-scroll {
  height: 100vh; height: 100dvh;
  overflow-y: auto; scroll-snap-type: y mandatory;
  /* -webkit-overflow-scrolling: touch — REMOVED.
     That property caused iOS to create a native UIScrollView that
     intercepted ALL touch events across the full viewport, making the
     mute button (a positioned sibling with z-index 200) untappable on
     iPhone and iPad.  The property is deprecated since iOS 13 and the
     default momentum behaviour is identical without it. */
  scrollbar-width: none;
}`
);

// ── Patch 2b: Move mute button to top-right (desktop) ───────────────────────
patch(
  'Patch 2b — move mute button to top-right (desktop)',

  `.lux-reels-close { top: 18px; left: 16px; }
.lux-reels-mute  { bottom: 28px; right: 16px; }`,

  `.lux-reels-close { top: 18px; left: 16px; }
.lux-reels-mute  { top: 18px; right: 16px; }   /* moved to top-right, mirrors close btn */`
);

// ── Patch 2c: Move mute button to top-right (mobile, max-width: 639px) ──────
patch(
  'Patch 2c — move mute button to top-right (mobile)',

  `  .lux-reels-close { top: 12px; left: 12px; width: 40px; height: 40px; }
  .lux-reels-mute  { bottom: 20px; right: 12px; width: 40px; height: 40px; }`,

  `  .lux-reels-close { top: 12px; left: 12px; width: 40px; height: 40px; }
  .lux-reels-mute  { top: 12px; right: 12px; width: 40px; height: 40px; }   /* moved to top-right */`
);

// ── Patch 2d: Keep mute visible when sheet is open (it's at top now) ────────
//    The old rule hid the mute whenever the comment sheet was open, which
//    made sense when the button lived at the bottom.  Now that it sits at
//    the top-right it never overlaps the sheet, so keep it visible.
patch(
  'Patch 2d — keep mute visible when comment sheet is open',

  `/* Hide mute when the comment sheet is open (class toggled from JS) */
.lux-reels.sheet-open .lux-reels-mute { opacity: 0; pointer-events: none; }`,

  `/* Mute button now lives at top-right so it never overlaps the bottom sheet;
   keep it visible and tappable even while the sheet is open. */
/* .lux-reels.sheet-open .lux-reels-mute { opacity: 0; pointer-events: none; } */`
);

// ═══════════════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════════════

if (code === before) {
  console.error('No changes were applied — all anchors were missing.');
  console.error('The source may have already been patched, or changed unexpectedly.');
  process.exit(1);
}

writeFileSync(TARGET, code, 'utf8');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Wedding Gallery — patch-swipe-mute-fix applied');
console.log('═══════════════════════════════════════════════════════════════\n');

if (applied.length) {
  console.log('Applied:');
  applied.forEach(m => console.log('  ' + m));
}

if (failed.length) {
  console.log('\nSkipped (anchor not found — may already be patched):');
  failed.forEach(m => console.log('  ' + m));
}

console.log(`\nPatched file : src/WeddingGallery.js`);
console.log(`Backup saved : src/WeddingGallery.js.bak`);
console.log('\nNext step: npm start  (or rebuild & deploy as usual)');
