/**
 * patch-v5-swipe.mjs
 * Fixes the "jump on swipe/arrow nav" bug in the photo lightbox.
 *
 * Root cause: navPhoto() calls setLightbox({idx}) immediately, so React
 * re-renders the strip BEFORE the CSS slide animation plays. The slot
 * images swap to their new src while the strip is mid-air → you see a jump.
 *
 * Fix (animate-first, update-state-after):
 *   1. On commit (swipe or arrow click): animate the strip to the neighbour
 *      slot using a CSS transition (0.28s FB/IG curve).
 *   2. On transitionend: call setLightbox so React re-renders the slots with
 *      the new index already centred.
 *   3. Instantly snap the strip back to -33.333% (no transition) so it's
 *      ready for the next swipe.
 *
 * Run from project root:  node patch-v5-swipe.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const GALLERY = join(process.cwd(), 'src', 'WeddingGallery.js');
if (!existsSync(GALLERY)) {
  console.error('ERROR: src/WeddingGallery.js not found. Run from project root.');
  process.exit(1);
}

let count = 0;
function patch(label, search, replace) {
  const src = readFileSync(GALLERY, 'utf8');
  if (!src.includes(search)) {
    if (src.includes(replace.trimStart().slice(0, 80))) {
      console.log('  \u2713 ' + label + ' \u2014 already applied');
      return;
    }
    console.error('  \u2717 ' + label + ' \u2014 anchor not found!');
    process.exit(1);
  }
  writeFileSync(GALLERY, src.replace(search, replace), 'utf8');
  count++;
  console.log('  \u2713 ' + label);
}

console.log('\n\uD83D\uDD27  patch-v5-swipe \u2026\n');

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1 — CSS: tighten strip transition to FB/IG timing + add .sliding class
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'CSS: strip transition 0.28s FB-style + .sliding class',

  '/* The strip: three 100%-wide slots laid out in a row */\n' +
  '.lux-lb-strip {\n' +
  '  display: flex;\n' +
  '  width: 300%;       /* 3 \u00d7 100% = room for prev + current + next */\n' +
  '  height: 100%;\n' +
  '  /* While not dragging, snap back to the center slot with a nice ease */\n' +
  '  transform: translateX(-33.3333%); /* start centred on the middle (current) */\n' +
  '  will-change: transform;\n' +
  '  transition: transform .32s cubic-bezier(0.22, 1, 0.36, 1);\n' +
  '}\n' +
  '.lux-lb-strip.dragging { transition: none; }',

  '/* The strip: three 100%-wide slots laid out in a row */\n' +
  '.lux-lb-strip {\n' +
  '  display: flex;\n' +
  '  width: 300%;\n' +
  '  height: 100%;\n' +
  '  /* Resting position: centre slot is in view */\n' +
  '  transform: translateX(-33.3333%);\n' +
  '  will-change: transform;\n' +
  '  /* FB/IG timing: snappy deceleration, no bounce */\n' +
  '  transition: transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);\n' +
  '}\n' +
  '.lux-lb-strip.dragging { transition: none; }\n' +
  '/* Programmatic slide: same curve, block pointer events during flight */\n' +
  '.lux-lb-strip.sliding  {\n' +
  '  transition: transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);\n' +
  '  pointer-events: none;\n' +
  '}'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 2 — JS: replace navPhoto + all drag handlers with lbSlide animation
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'JS: animate-first lbSlide + updated drag handlers',

  '  function navPhotoWithReset(dir) {\n' +
  '    setShowLbComments(false);\n' +
  '    navPhoto(dir);\n' +
  '  }\n' +
  '\n' +
  '  function navPhoto(dir) {\n' +
  '    setLightbox(l => ({ ...l, idx: (l.idx + dir + photos.length) % photos.length, zoomed: false }));\n' +
  '  }\n' +
  '\n' +
  '  // Lightbox swipe \u2014 three-slot strip: prev \u00b7 current \u00b7 next\n' +
  '  //  All three images are rendered side-by-side.  The strip sits at\n' +
  '  //  translateX(-33.333%) so the centre slot is always in view.\n' +
  '  //  Dragging shifts the entire strip \u2014 you see the neighbour coming in\n' +
  '  //  from the side exactly like Instagram / Facebook web viewer.\n' +
  '  //  A fast flick or >30% drag commits; anything less springs back.\n' +
  '  const lbStripRef = useRef(null);  // ref to .lux-lb-strip element\n' +
  '\n' +
  '  function lbGetStrip() { return lbStripRef.current; }\n' +
  '\n' +
  '  function lbDragStart(e) {\n' +
  '    if (lightbox.zoomed || photos.length < 2) return;\n' +
  '    lbDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, locked: null, startTime: Date.now() };\n' +
  '    e.currentTarget.setPointerCapture(e.pointerId);\n' +
  '  }\n' +
  '\n' +
  '  function lbDragMove(e) {\n' +
  '    const drag = lbDragRef.current;\n' +
  '    if (!drag.active) return;\n' +
  '    const dx = e.clientX - drag.startX;\n' +
  '    const dy = e.clientY - drag.startY;\n' +
  '\n' +
  '    if (drag.locked === null) {\n' +
  '      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;\n' +
  '      drag.locked = Math.abs(dx) > Math.abs(dy) ? \'x\' : \'y\';\n' +
  '    }\n' +
  '    if (drag.locked !== \'x\') return;\n' +
  '\n' +
  '    const strip = lbGetStrip();\n' +
  '    if (strip) {\n' +
  '      strip.classList.add(\'dragging\');\n' +
  '      // -33.333% is the resting position (centred on middle slot).\n' +
  '      // We express dx as a percentage of the total strip width (300vw)\n' +
  '      // so the slot boundaries line up correctly.\n' +
  '      const pct = (dx / (window.innerWidth * 3)) * 100;\n' +
  '      strip.style.transform = \'translateX(calc(-33.3333% + \' + pct * 3 + \'px))\';\n' +
  '    }\n' +
  '  }\n' +
  '\n' +
  '  function lbDragEnd(e) {\n' +
  '    const drag = lbDragRef.current;\n' +
  '    if (!drag.active) return;\n' +
  '    drag.active = false;\n' +
  '\n' +
  '    const strip = lbGetStrip();\n' +
  '    const wasHorizontal = drag.locked === \'x\';\n' +
  '    if (strip) {\n' +
  '      strip.classList.remove(\'dragging\');\n' +
  '      strip.style.transform = \'\';   // CSS transition springs back to -33.333%\n' +
  '    }\n' +
  '    if (!wasHorizontal) return;\n' +
  '\n' +
  '    const dx = e.clientX - drag.startX;\n' +
  '    const elapsed = Math.max(1, Date.now() - drag.startTime);\n' +
  '    const velocity = Math.abs(dx) / elapsed;\n' +
  '\n' +
  '    const FAST_FLICK_VELOCITY = 0.55;\n' +
  '    const DOMINANT_FRACTION   = 0.30;\n' +
  '\n' +
  '    const passedThreshold = Math.abs(dx) > window.innerWidth * DOMINANT_FRACTION;\n' +
  '    if (velocity > FAST_FLICK_VELOCITY || passedThreshold) {\n' +
  '      navPhotoWithReset(dx < 0 ? 1 : -1);\n' +
  '    }\n' +
  '  }\n' +
  '\n' +
  '  function lbDragCancel() {\n' +
  '    lbDragRef.current.active = false;\n' +
  '    const strip = lbGetStrip();\n' +
  '    if (strip) { strip.classList.remove(\'dragging\'); strip.style.transform = \'\'; }\n' +
  '  }',

  '  // ── lbSlide: core animation — animate FIRST, update state AFTER ──────────\n' +
  '  // dir = +1 (next) or -1 (prev).\n' +
  '  // 1. CSS-transition the strip to the neighbour slot.\n' +
  '  // 2. On transitionend: setLightbox with the new idx.\n' +
  '  // 3. Snap strip back to resting (-33.333%) with no transition,\n' +
  '  //    so the freshly-rendered centre slot appears seamlessly.\n' +
  '  const lbStripRef   = useRef(null);\n' +
  '  const lbSlidingRef = useRef(false); // block re-entrant slides\n' +
  '\n' +
  '  function lbSlide(dir) {\n' +
  '    if (lbSlidingRef.current || photos.length < 2) return;\n' +
  '    const strip = lbStripRef.current;\n' +
  '    if (!strip) return;\n' +
  '\n' +
  '    lbSlidingRef.current = true;\n' +
  '    setShowLbComments(false);\n' +
  '\n' +
  '    // Each slot = 1/3 of strip width in px\n' +
  '    const slotPx    = strip.offsetWidth / 3;\n' +
  '    // Resting offset = -1 slotPx (centre slot in view)\n' +
  '    // Moving right (+1 next) → strip slides left → negative extra px\n' +
  '    const newOffset = -slotPx + (-dir * slotPx);\n' +
  '\n' +
  '    // 1. Kick off the CSS transition\n' +
  '    strip.classList.remove(\'dragging\');\n' +
  '    strip.classList.add(\'sliding\');\n' +
  '    strip.style.transform = \'translateX(\' + newOffset + \'px)\';\n' +
  '\n' +
  '    function onEnd() {\n' +
  '      strip.removeEventListener(\'transitionend\', onEnd);\n' +
  '\n' +
  '      // 2. Update React state (slots re-render with new idx)\n' +
  '      setLightbox(l => ({\n' +
  '        ...l,\n' +
  '        idx: (l.idx + dir + photos.length) % photos.length,\n' +
  '        zoomed: false,\n' +
  '      }));\n' +
  '\n' +
  '      // 3. Snap strip back with no transition\n' +
  '      strip.classList.remove(\'sliding\');\n' +
  '      strip.style.transition = \'none\';\n' +
  '      strip.style.transform  = \'\';\n' +
  '      // Force reflow so "transition:none" is committed before restoring\n' +
  '      void strip.offsetHeight;\n' +
  '      strip.style.transition = \'\';\n' +
  '\n' +
  '      lbSlidingRef.current = false;\n' +
  '    }\n' +
  '\n' +
  '    strip.addEventListener(\'transitionend\', onEnd, { once: true });\n' +
  '\n' +
  '    // Safety fallback if transitionend never fires (tab hidden, etc.)\n' +
  '    setTimeout(() => {\n' +
  '      if (!lbSlidingRef.current) return;\n' +
  '      strip.removeEventListener(\'transitionend\', onEnd);\n' +
  '      onEnd();\n' +
  '    }, 500);\n' +
  '  }\n' +
  '\n' +
  '  function navPhotoWithReset(dir) { lbSlide(dir); }\n' +
  '  function navPhoto(dir)          { lbSlide(dir); }\n' +
  '\n' +
  '  function lbDragStart(e) {\n' +
  '    if (lightbox.zoomed || photos.length < 2 || lbSlidingRef.current) return;\n' +
  '    lbDragRef.current = {\n' +
  '      active: true,\n' +
  '      startX: e.clientX, startY: e.clientY,\n' +
  '      locked: null, startTime: Date.now(),\n' +
  '    };\n' +
  '    e.currentTarget.setPointerCapture(e.pointerId);\n' +
  '  }\n' +
  '\n' +
  '  function lbDragMove(e) {\n' +
  '    const drag = lbDragRef.current;\n' +
  '    if (!drag.active) return;\n' +
  '    const dx = e.clientX - drag.startX;\n' +
  '    const dy = e.clientY - drag.startY;\n' +
  '\n' +
  '    if (drag.locked === null) {\n' +
  '      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;\n' +
  '      drag.locked = Math.abs(dx) > Math.abs(dy) ? \'x\' : \'y\';\n' +
  '    }\n' +
  '    if (drag.locked !== \'x\') return;\n' +
  '\n' +
  '    const strip = lbStripRef.current;\n' +
  '    if (!strip) return;\n' +
  '\n' +
  '    strip.classList.add(\'dragging\');\n' +
  '    strip.classList.remove(\'sliding\');\n' +
  '    // Resting offset in px = -1 slot width; add finger delta\n' +
  '    const slotPx   = strip.offsetWidth / 3;\n' +
  '    const offsetPx = -slotPx + dx;\n' +
  '    strip.style.transform = \'translateX(\' + offsetPx + \'px)\';\n' +
  '  }\n' +
  '\n' +
  '  function lbDragEnd(e) {\n' +
  '    const drag = lbDragRef.current;\n' +
  '    if (!drag.active) return;\n' +
  '    drag.active = false;\n' +
  '\n' +
  '    const strip        = lbStripRef.current;\n' +
  '    const wasHorizontal = drag.locked === \'x\';\n' +
  '\n' +
  '    if (!wasHorizontal) {\n' +
  '      if (strip) { strip.classList.remove(\'dragging\'); strip.style.transform = \'\'; }\n' +
  '      return;\n' +
  '    }\n' +
  '\n' +
  '    const dx       = e.clientX - drag.startX;\n' +
  '    const elapsed  = Math.max(1, Date.now() - drag.startTime);\n' +
  '    const velocity = Math.abs(dx) / elapsed;\n' +
  '\n' +
  '    const FLICK     = 0.45;  // px/ms — fast flick\n' +
  '    const THRESHOLD = 0.28;  // fraction of screen width to commit\n' +
  '\n' +
  '    const commit = velocity > FLICK || Math.abs(dx) > window.innerWidth * THRESHOLD;\n' +
  '\n' +
  '    if (commit) {\n' +
  '      if (strip) strip.classList.remove(\'dragging\');\n' +
  '      lbSlide(dx < 0 ? 1 : -1);\n' +
  '    } else {\n' +
  '      // Spring back to resting with transition\n' +
  '      if (strip) {\n' +
  '        strip.classList.remove(\'dragging\');\n' +
  '        strip.classList.add(\'sliding\');\n' +
  '        strip.style.transform = \'\';\n' +
  '        strip.addEventListener(\'transitionend\', () => strip.classList.remove(\'sliding\'), { once: true });\n' +
  '      }\n' +
  '    }\n' +
  '  }\n' +
  '\n' +
  '  function lbDragCancel() {\n' +
  '    lbDragRef.current.active = false;\n' +
  '    const strip = lbStripRef.current;\n' +
  '    if (!strip) return;\n' +
  '    strip.classList.remove(\'dragging\');\n' +
  '    strip.classList.add(\'sliding\');\n' +
  '    strip.style.transform = \'\';\n' +
  '    strip.addEventListener(\'transitionend\', () => strip.classList.remove(\'sliding\'), { once: true });\n' +
  '  }'
);

console.log('\n\u2705  ' + count + '/2 patches applied.\n');
console.log('  node patch-v5-swipe.mjs   \u2014 run again to verify idempotency');
console.log('  npm start                  \u2014 test locally\n');
