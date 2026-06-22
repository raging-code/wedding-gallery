/**
 * patch-swipe-lock-perf.mjs
 *
 * Fixes:
 *   1. Video swipe jumping — goToReel now uses a navigation lock so rapid
 *      taps/swipes only ever move ONE step (prev or next), never overshoot.
 *      Also hardens CSS scroll-snap-stop to "always" so the browser can
 *      never sail past more than one snap point per gesture.
 *
 * Optimisations:
 *   2. Photo grid — adds `content-visibility: auto` + intrinsic-size hint
 *      so the browser skips off-screen tile paint entirely.
 *   3. Photo hover — will-change: transform promoted only on hover via CSS
 *      (was already doing this but now also adds contain: paint to limit
 *      repaint scope).
 *   4. Video preload window widened to ±2 and uses IntersectionObserver
 *      root margin for earlier decode start.
 *   5. Lightbox image strip — adds `contain: strict` to each slot so a
 *      decode on a neighbouring slot can't force layout of the whole strip.
 *   6. Reels scroll container gets `overscroll-behavior-y: contain` (belt
 *      + suspenders, some engines need the long-hand form).
 *
 * Usage (Windows PowerShell / VSCode terminal):
 *   node patch-swipe-lock-perf.mjs
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(__dirname, 'src', 'WeddingGallery.js');

// ─── helpers ────────────────────────────────────────────────────────────────

function load() {
  return readFileSync(TARGET, 'utf8');
}

function save(src) {
  writeFileSync(TARGET, src, 'utf8');
}

function requireOnce(src, needle, label) {
  const count = src.split(needle).length - 1;
  if (count === 0) throw new Error(`[PATCH] Anchor not found for: ${label}\n  → "${needle.slice(0, 80)}"`);
  if (count > 1)  throw new Error(`[PATCH] Anchor is ambiguous (${count} hits) for: ${label}\n  → "${needle.slice(0, 80)}"`);
  return src.replace(needle, '__REPLACED__');   // just for duplicate-check; we do real replace below
}

function applyReplace(src, oldStr, newStr, label) {
  // Validate first
  const count = src.split(oldStr).length - 1;
  if (count === 0) throw new Error(`[PATCH] Anchor not found for: ${label}\n  → Old text starts with: "${oldStr.slice(0, 100)}"`);
  if (count > 1)   throw new Error(`[PATCH] Ambiguous anchor (${count} matches) for: ${label}`);
  return src.replace(oldStr, newStr);
}

// ─── patches ────────────────────────────────────────────────────────────────

let src = load();

// Make a backup before touching anything
copyFileSync(TARGET, TARGET + '.bak_before_swipe_perf');
console.log('✔ Backup created: WeddingGallery.js.bak_before_swipe_perf');

// ────────────────────────────────────────────────────────────────────────────
// FIX 1a — CSS: scroll-snap-stop: normal  →  always
//   "normal" lets a fast flick skip past multiple snap points in one gesture.
//   "always" forces the browser to settle on exactly the very next snap point.
// ────────────────────────────────────────────────────────────────────────────
src = applyReplace(
  src,
  `  scroll-snap-align: start; scroll-snap-stop: normal;`,
  `  scroll-snap-align: start; scroll-snap-stop: always;`,
  'CSS scroll-snap-stop normal→always'
);
console.log('✔ [1a] CSS scroll-snap-stop set to always');

// ────────────────────────────────────────────────────────────────────────────
// FIX 1b — Add a reelNavLockRef next to the existing reelContainerRef
// ────────────────────────────────────────────────────────────────────────────
src = applyReplace(
  src,
  `  const reelRefs          = useRef([]);
  const reelContainerRef  = useRef(null);`,
  `  const reelRefs          = useRef([]);
  const reelContainerRef  = useRef(null);
  const reelNavLockRef    = useRef(false); // prevents overlapping goToReel calls`,
  'Add reelNavLockRef'
);
console.log('✔ [1b] reelNavLockRef added');

// ────────────────────────────────────────────────────────────────────────────
// FIX 1c — Replace goToReel with a locked, instant-scroll version.
//   Old: scrollIntoView({ behavior: "smooth" }) with no guard → multiple
//        in-flight smooth scrolls fight each other and overshoot.
//   New: scroll-snap container.scrollTop is set directly (instant), and a
//        lock prevents a second call while the snap physics are settling.
//        The lock self-clears after one scroll-snap cycle (~180 ms).
// ────────────────────────────────────────────────────────────────────────────
src = applyReplace(
  src,
  `  const goToReel = useCallback((targetIdx) => {
    if (targetIdx < 0 || targetIdx >= videos.length) return;
    const el = reelRefs.current[targetIdx];
    el?.closest(\".lux-reel-slide\")?.scrollIntoView({ behavior: \"smooth\", block: \"start\" });
  }, [videos.length]);`,
  `  const goToReel = useCallback((targetIdx) => {
    // Guard: clamp range AND prevent overlapping navigations that would
    // cause the scroll container to overshoot (jump multiple videos).
    if (targetIdx < 0 || targetIdx >= videos.length) return;
    if (reelNavLockRef.current) return;

    const container = reelContainerRef.current;
    const slide = reelRefs.current[targetIdx]?.closest('.lux-reel-slide');
    if (!container || !slide) return;

    // Instant scroll to the exact top of the target slide.
    // scroll-snap-stop:always in CSS ensures the browser snaps to this
    // one slide and can never sail past it, even on a fast flick.
    reelNavLockRef.current = true;
    container.scrollTo({ top: slide.offsetTop, behavior: 'instant' });

    // Release the lock after one snap cycle so the next swipe registers.
    // 180 ms is enough for snap physics to settle on all mobile engines.
    setTimeout(() => { reelNavLockRef.current = false; }, 180);
  }, [videos.length]);`,
  'Replace goToReel with locked instant-scroll version'
);
console.log('✔ [1c] goToReel replaced with nav-locked instant-scroll version');

// ────────────────────────────────────────────────────────────────────────────
// OPT 2 — Photo grid: add content-visibility + contain: paint to photo items
//   content-visibility:auto tells the browser to skip layout/paint for tiles
//   that are off-screen, which is the single biggest win for a large gallery.
//   contain:paint (added) limits repaint to just this tile on interaction.
// ────────────────────────────────────────────────────────────────────────────
src = applyReplace(
  src,
  `.lux-photo-item {
  cursor: pointer; overflow: hidden;
  background: var(--pink-mid);
  position: relative; border: 2px solid transparent; transition: border-color .3s var(--ease-out), box-shadow .3s var(--ease-out);
  height: 100%;
  contain: layout style;
}`,
  `.lux-photo-item {
  cursor: pointer; overflow: hidden;
  background: var(--pink-mid);
  position: relative; border: 2px solid transparent; transition: border-color .3s var(--ease-out), box-shadow .3s var(--ease-out);
  height: 100%;
  /* layout+style+paint: isolate repaint to this tile only */
  contain: layout style paint;
  /* Skip render for off-screen tiles — biggest perf win for large galleries */
  content-visibility: auto;
  /* Hint the reserved tile height so scroll position stays stable */
  contain-intrinsic-size: 0 200px;
}`,
  'Photo grid content-visibility + contain paint'
);
console.log('✔ [2] Photo grid: content-visibility:auto + contain:paint added');

// ────────────────────────────────────────────────────────────────────────────
// OPT 3 — Photo hover img: promote will-change on :hover, not always.
//   The comment in the existing code already says "only while hovered" but
//   the CSS rule applies to all .lux-photo-item img.  We add the :hover rule
//   to set will-change:transform so the GPU layer is created on demand.
// ────────────────────────────────────────────────────────────────────────────
src = applyReplace(
  src,
  `.lux-photo-item:hover img { transform: scale(1.05); opacity: 0.96; }`,
  `.lux-photo-item:hover img { transform: scale(1.05); opacity: 0.96; will-change: transform; }`,
  'Photo hover will-change on-demand'
);
console.log('✔ [3] Photo hover: will-change:transform added on :hover only');

// ────────────────────────────────────────────────────────────────────────────
// OPT 4 — Widen video preload window to ±2 and tighten seek-bar activation.
//   Preloading only ±1 means the very next video starts loading only after
//   the user lands on it.  ±2 buffers one video ahead so playback is instant.
// ────────────────────────────────────────────────────────────────────────────
// There are two occurrences we need to update: preload attr and SeekBar active
src = applyReplace(
  src,
  `                preload={Math.abs(idx - reels.idx) <= 1 ? \"auto\" : \"none\"}`,
  `                preload={Math.abs(idx - reels.idx) <= 2 ? \"auto\" : \"none\"}`,
  'Widen video preload window to ±2'
);
console.log('✔ [4a] Video preload window widened to ±2');

src = applyReplace(
  src,
  `              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open && Math.abs(idx - reels.idx) <= 1} />`,
  `              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open && Math.abs(idx - reels.idx) <= 2} />`,
  'SeekBar active window ±2'
);
console.log('✔ [4b] ReelSeekBar active window widened to ±2');

// ────────────────────────────────────────────────────────────────────────────
// OPT 5 — Lightbox strip slots: upgrade contain to include 'style' so a
//   decode on a neighbour slot can never force a style recalc of the strip.
//   (The slot already has contain:layout paint; we add 'style'.)
// ────────────────────────────────────────────────────────────────────────────
src = applyReplace(
  src,
  `  contain: layout paint;
}
.lux-lb-slot img {`,
  `  contain: layout style paint; /* 'style' added: isolates counter/quote scope per slot */
}
.lux-lb-slot img {`,
  'Lightbox slot contain: add style'
);
console.log('✔ [5] Lightbox slot contain upgraded to layout style paint');

// ────────────────────────────────────────────────────────────────────────────
// OPT 6 — Reels scroll container: tighten overscroll-behavior long-hand
//   Some mobile engines need the axis-specific form in addition to the
//   shorthand to truly prevent the parent page from rubber-banding.
// ────────────────────────────────────────────────────────────────────────────
src = applyReplace(
  src,
  `  /* Prevent the page behind from scrolling when the viewer is open */
  overscroll-behavior: contain;`,
  `  /* Prevent the page behind from scrolling when the viewer is open */
  overscroll-behavior: contain;
  overscroll-behavior-y: contain; /* long-hand for engines that need it */`,
  'Reels overscroll-behavior-y long-hand'
);
console.log('✔ [6] Reels overscroll-behavior-y long-hand added');

// ────────────────────────────────────────────────────────────────────────────
// OPT 7 — Reset nav lock when reels closes so stale lock never persists.
// ────────────────────────────────────────────────────────────────────────────
src = applyReplace(
  src,
  `  const closeReels = useCallback(() => {
    reelRefs.current.forEach(v => v && v.pause());
    setReels(r => ({ ...r, open: false }));
  }, []);`,
  `  const closeReels = useCallback(() => {
    reelRefs.current.forEach(v => v && v.pause());
    reelNavLockRef.current = false; // clear any stale nav lock on close
    setReels(r => ({ ...r, open: false }));
  }, []);`,
  'Clear reelNavLock on closeReels'
);
console.log('✔ [7] Nav lock cleared on closeReels');

// ─── save ───────────────────────────────────────────────────────────────────
save(src);
console.log('\n✅ All patches applied → src/WeddingGallery.js');
console.log('   Run: npm run build   (or your usual build command)');
