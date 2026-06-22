/**
 * patch-fastswipe-v2.mjs
 *
 * Fixes:
 *  1. Fast-swipe "stuck" bug — when the user flicks very quickly, pointermove
 *     may fire with < 6 px of movement before pointerup, so drag.locked stays
 *     null and lbDragEnd bails with an early return.  Fix: resolve axis in
 *     lbDragEnd from the pointerup endpoint if lock is still null.
 *
 *  2. FLICK threshold lowered 0.45 → 0.30 px/ms so very fast short flicks
 *     (small displacement, high velocity) still commit.
 *
 *  3. touch-action: pan-y added to .lux-lb-image-pane — without this, iOS
 *     can decide the touch is a scroll and fire pointercancel, aborting the
 *     swipe before we ever see it.
 *
 *  4. decoding="async" + loading="eager" on prev/next strip images so the
 *     browser decodes them off the main thread — smoother transitions.
 *     Current image keeps decoding="sync" (guaranteed visible on swap).
 *
 * Usage:
 *   node patch-fastswipe-v2.mjs
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const FILE  = 'src/WeddingGallery.js';
const BACKUP = 'src/WeddingGallery.js.bak2';

// ─── helpers ────────────────────────────────────────────────────────────────

function apply(src, label, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    throw new Error(`[PATCH ${label}] Anchor not found — file may already be patched or has changed.\n\nLooked for:\n${oldStr.slice(0, 120)}`);
  }
  const count = src.split(oldStr).length - 1;
  if (count > 1) {
    throw new Error(`[PATCH ${label}] Anchor matches ${count} times — must be unique.`);
  }
  console.log(`  ✅  ${label}`);
  return src.replace(oldStr, newStr);
}

// ─── load ───────────────────────────────────────────────────────────────────

let src = readFileSync(FILE, 'utf8');
copyFileSync(FILE, BACKUP);
console.log(`\n🔧  Applying patches to ${FILE} (backup → ${BACKUP})\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH 1 — touch-action on .lux-lb-image-pane
//   iOS needs pan-y here; without it the browser may call pointercancel the
//   moment it suspects a scroll, aborting the pointer sequence entirely.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src = apply(src,
  'touch-action on .lux-lb-image-pane',
  `.lux-lb-image-pane {
  flex: 1; min-width: 0;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  background: #000; overflow: hidden;
}`,
  `.lux-lb-image-pane {
  flex: 1; min-width: 0;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  background: #000; overflow: hidden;
  /* Tell iOS we handle horizontal gestures here — prevents pointercancel */
  touch-action: pan-y;
}`
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH 2 — Fix lbDragEnd: resolve direction when drag.locked is still null
//           (fast flick) + lower FLICK threshold
//
//  Root cause: on a very fast flick the finger lifts before pointermove fires
//  a 6-px delta, so drag.locked stays null.  lbDragEnd then sees
//  wasHorizontal = false and returns early — the swipe is silently dropped.
//
//  Fix: compute dx/dy first, then if locked is null fall back to the endpoint
//  displacement to decide axis.  Also lower FLICK 0.45 → 0.30 because very
//  fast short flicks have high velocity / small displacement.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src = apply(src,
  'lbDragEnd: fast-lock + FLICK threshold',
  `    const strip        = lbStripRef.current;
    const wasHorizontal = drag.locked === 'x';

    if (!wasHorizontal) {
      if (strip) { strip.classList.remove('dragging'); strip.style.transform = ''; }
      return;
    }

    const dx       = e.clientX - drag.startX;
    const elapsed  = Math.max(1, Date.now() - drag.startTime);
    const velocity = Math.abs(dx) / elapsed;

    const FLICK     = 0.45;  // px/ms — fast flick
    const THRESHOLD = 0.28;  // fraction of screen width to commit`,
  `    const strip = lbStripRef.current;

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
    const THRESHOLD = 0.28;  // fraction of screen width to commit`
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH 3 — decoding hints on prev strip image
//   decoding="async" lets the browser decode off the main thread so the
//   transition stays at 60 fps even on low-end devices.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src = apply(src,
  'decoding hint — prev slot img',
  `                    <img
                      src={photos[(lightbox.idx - 1 + photos.length) % photos.length].url}
                      alt=""
                      draggable={false}
                    />`,
  `                    <img
                      src={photos[(lightbox.idx - 1 + photos.length) % photos.length].url}
                      alt=""
                      draggable={false}
                      decoding="async"
                      loading="eager"
                    />`
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH 4 — decoding="sync" on current slot image
//   The current image must be fully decoded before it's visible so we use
//   sync here — the browser will not show a blank frame while decoding.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src = apply(src,
  'decoding hint — current slot img',
  `                    <img
                      ref={lbImgRef}
                      className={lightbox.zoomed ? 'zoomed' : ''}
                      src={currentImg.url}
                      alt=""
                      draggable={false}
                    />`,
  `                    <img
                      ref={lbImgRef}
                      className={lightbox.zoomed ? 'zoomed' : ''}
                      src={currentImg.url}
                      alt=""
                      draggable={false}
                      decoding="sync"
                      loading="eager"
                    />`
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH 5 — decoding hints on next strip image
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src = apply(src,
  'decoding hint — next slot img',
  `                    <img
                      src={photos[(lightbox.idx + 1) % photos.length].url}
                      alt=""
                      draggable={false}
                    />`,
  `                    <img
                      src={photos[(lightbox.idx + 1) % photos.length].url}
                      alt=""
                      draggable={false}
                      decoding="async"
                      loading="eager"
                    />`
);

// ─── write ──────────────────────────────────────────────────────────────────

writeFileSync(FILE, src, 'utf8');
console.log('\n✅  All 5 patches applied.  File written.\n');
console.log('Next steps:');
console.log('  git add src/WeddingGallery.js');
console.log('  git commit -m "fix: fast-swipe lock + touch-action + decoding hints"');
console.log('  git push\n');
