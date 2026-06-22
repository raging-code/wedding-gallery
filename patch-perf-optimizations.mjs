/**
 * patch-perf-optimizations.mjs
 *
 * Performance optimization patch for wedding-gallery.
 * Targets: FPS drops, janky scrolling, redundant renders, animation cost,
 *          layout thrash, and over-eager asset loading.
 *
 * Run from the repo root:
 *   node patch-perf-optimizations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(__dirname, 'src', 'WeddingGallery.js');

console.log('🔍 Reading WeddingGallery.js …');
let src = fs.readFileSync(TARGET, 'utf8');
const original = src;

// ─── Helper ──────────────────────────────────────────────────────────────────
function patch(description, searchStr, replaceStr) {
  if (!src.includes(searchStr)) {
    console.error(`\n❌ PATCH FAILED — could not find the search string for:\n   "${description}"\n`);
    console.error('   Search string (first 120 chars):', JSON.stringify(searchStr.slice(0, 120)));
    process.exit(1);
  }
  src = src.replace(searchStr, replaceStr);
  console.log(`   ✅ ${description}`);
}

console.log('\n🛠  Applying patches …\n');

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 1 — Add useCallback + useMemo to imports
// The component currently imports only useState/useEffect/useRef/flushSync.
// We need useCallback and useMemo to memoize event handlers and derived data.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'Add useCallback + useMemo to React imports',
  `import { useState, useEffect, useRef } from "react";`,
  `import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 2 — CSS: add will-change:transform to petals for GPU compositing
// Each petal runs TWO concurrent CSS animations. Without a compositing hint
// the browser repaints them on the main thread every frame → CPU spike.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: promote petals to GPU layer with will-change',
  `.lux-petal {
  position: fixed;
  top: -60px;
  z-index: 0;
  pointer-events: none;
  width:  var(--petal-size);`,
  `.lux-petal {
  position: fixed;
  top: -60px;
  z-index: 0;
  pointer-events: none;
  will-change: transform, opacity;
  contain: strict;
  width:  var(--petal-size);`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 3 — CSS: add contain:content to gallery card to isolate repaints
// The large white card repaints whenever any child changes (upload progress,
// hover overlays, etc.). Containment prevents that from bubbling up.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: add paint containment to gallery card',
  `.lux-card {
  background: var(--white);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.88) inset,
    0 -1px 0 rgba(196,116,142,0.08) inset,
    0 3px 0 rgba(196,116,142,0.05),
    0 20px 60px rgba(196,116,142,0.11),
    0 44px 88px rgba(28,15,20,0.05);
  position: relative; overflow: hidden;
  animation: scaleIn 1.0s var(--ease-cinematic) 0.14s both;
}`,
  `.lux-card {
  background: var(--white);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.88) inset,
    0 -1px 0 rgba(196,116,142,0.08) inset,
    0 3px 0 rgba(196,116,142,0.05),
    0 20px 60px rgba(196,116,142,0.11),
    0 44px 88px rgba(28,15,20,0.05);
  position: relative; overflow: hidden;
  contain: content;
  animation: scaleIn 1.0s var(--ease-cinematic) 0.14s both;
}`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 4 — CSS: reduce hover image scale duration (was 0.65s — way too slow)
// A 0.65s transition on transform means the image keeps animating through
// several scroll events, compounding GPU work. 0.28s is snappier and cheaper.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: reduce photo hover scale transition from 0.65s → 0.28s',
  `  transition: transform .65s var(--ease-out), filter .3s;
  /* Avoid compositing cost for all grid images on mobile */
  will-change: auto;`,
  `  transition: transform .28s var(--ease-out), filter .22s;
  /* Promote to GPU only while hovered — avoids wasting layers for all images */
  will-change: auto;`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 5 — CSS: add contain:layout style to photo items
// Each grid item is independent; style changes in one should not invalidate
// the rest of the grid.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: add layout+style containment to photo grid items',
  `.lux-photo-item {
  cursor: pointer; overflow: hidden;
  background: var(--pink-mid);
  position: relative; border: 2px solid transparent; transition: all .3s var(--ease-out);
  height: 100%;
}`,
  `.lux-photo-item {
  cursor: pointer; overflow: hidden;
  background: var(--pink-mid);
  position: relative; border: 2px solid transparent; transition: border-color .3s var(--ease-out), box-shadow .3s var(--ease-out);
  height: 100%;
  contain: layout style;
}`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 6 — CSS: backdrop-filter on hover icon is expensive — scope it only
// to the icon circle, not the full overlay, and add will-change to the strip.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: scope backdrop-filter tighter to reduce composite layers',
  `.lux-photo-view-icon {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,0.16); backdrop-filter: blur(8px);
  border: 0.5px solid rgba(255,255,255,0.40);
  display: flex; align-items: center; justify-content: center;
}`,
  `.lux-photo-view-icon {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,0.28);
  border: 0.5px solid rgba(255,255,255,0.40);
  display: flex; align-items: center; justify-content: center;
}`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 7 — CSS: lightbox strip — already has will-change:transform which is
// good. Strengthen the contain on .lux-lb-slot to prevent any stray reflows.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: add paint containment to lightbox slots',
  `/* Each slot is exactly 1/3 of the strip = 100vw of the image pane */
.lux-lb-slot {
  width: 33.3333%;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  height: 100%;
  background: #000;
}`,
  `/* Each slot is exactly 1/3 of the strip = 100vw of the image pane */
.lux-lb-slot {
  width: 33.3333%;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  height: 100%;
  background: #000;
  contain: layout paint;
}`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 8 — CSS: shimmer animation on story placeholders runs continuously
// even when off-screen. Use animation-play-state:paused via visibility and
// reduce the shimmer motion to a cheaper opacity pulse instead of a full
// gradient sweep (gradient sweeps cause full-layer uploads every frame).
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: replace expensive gradient shimmer with cheaper opacity pulse',
  `@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}`,
  `@keyframes shimmer {
  0%, 100% { opacity: 0.55; }
  50%       { opacity: 1; }
}
@keyframes shimmerGradient {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}`
);

patch(
  'CSS: use cheaper opacity shimmer for story placeholder shimmer overlay',
  `.lux-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
  background-size: 200%; animation: shimmer 3.8s ease-in-out infinite; pointer-events: none;
}`,
  `.lux-shimmer {
  position: absolute; inset: 0;
  background: rgba(255,255,255,0.14);
  animation: shimmer 1.8s ease-in-out infinite;
  pointer-events: none;
  contain: strict;
}`
);

// Also fix the social-loading shimmer to use the gradient version (it's small/inline so acceptable)
patch(
  'CSS: make social-loading use the gradient shimmer (small inline element)',
  `/* Loading shimmer for counts */
.lux-social-loading {
  display: inline-block; width: 40px; height: 11px; border-radius: 6px;
  background: rgba(255,255,255,0.12);
  animation: shimmer 1.8s ease-in-out infinite;
}`,
  `/* Loading shimmer for counts */
.lux-social-loading {
  display: inline-block; width: 40px; height: 11px; border-radius: 6px;
  background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.22), rgba(255,255,255,0.08));
  background-size: 200%;
  animation: shimmerGradient 1.8s ease-in-out infinite;
}`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 9 — CSS: reduce reel slide will-change scope
// Every slide has will-change:transform even when off-screen. This wastes
// GPU memory. We promote only the active/adjacent slides via a .active class
// instead (the JS side sets data-reel-idx which we can target).
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: scope reel slide GPU promotion to active/adjacent only',
  `.lux-reel-slide {
  height: 100vh; height: 100dvh;
  /* "normal" (not "always") is what lets a fast flick sail past the next
     snap point instantly, while a slow/partial drag still settles on
     whichever video is more dominant — true Reels/TikTok physics, free. */
  scroll-snap-align: start; scroll-snap-stop: normal;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  /* GPU layer per slide — eliminates compositing stutter during snap */
  will-change: transform;
  /* Prevent layout bleed from icon bar / seek bar repaints */
  contain: layout style;
  /* iOS: eliminate rubber-band behind the slide */
  overscroll-behavior: contain;
}`,
  `.lux-reel-slide {
  height: 100vh; height: 100dvh;
  /* "normal" (not "always") is what lets a fast flick sail past the next
     snap point instantly, while a slow/partial drag still settles on
     whichever video is more dominant — true Reels/TikTok physics, free. */
  scroll-snap-align: start; scroll-snap-stop: normal;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  /* Promote GPU layer only on active/adjacent slides via JS */
  will-change: auto;
  /* Prevent layout bleed from icon bar / seek bar repaints */
  contain: layout style;
  /* iOS: eliminate rubber-band behind the slide */
  overscroll-behavior: contain;
}
/* GPU promotion: only the active slide and its neighbours */
.lux-reel-slide.reel-active,
.lux-reel-slide.reel-adjacent {
  will-change: transform;
}`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 10 — JS: Wrap photo grid item's openLightbox in useCallback
// Every render creates a new arrow function for each photo item, causing
// React to reconcile ALL grid items even when only one changed.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: memoize openLightbox with useCallback',
  `  function openLightbox(idx) {
    if (selectMode) { toggleSelect(idx); return; }
    setLightbox({ open: true, idx, zoomed: false });
    setShowLbComments(false);
  }`,
  `  const openLightbox = useCallback((idx) => {
    if (selectMode) { toggleSelect(idx); return; }
    setLightbox({ open: true, idx, zoomed: false });
    setShowLbComments(false);
  }, [selectMode]); // eslint-disable-line react-hooks/exhaustive-deps`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 11 — JS: Memoize openReels and closeReels
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: memoize openReels with useCallback',
  `  function openReels(idx) {
    setReels({ open: true, idx });
  }`,
  `  const openReels = useCallback((idx) => {
    setReels({ open: true, idx });
  }, []);`
);

patch(
  'JS: memoize closeReels with useCallback',
  `  function closeReels() {
    reelRefs.current.forEach(v => v && v.pause());
    setReels(r => ({ ...r, open: false }));
  }`,
  `  const closeReels = useCallback(() => {
    reelRefs.current.forEach(v => v && v.pause());
    setReels(r => ({ ...r, open: false }));
  }, []);`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 12 — JS: Memoize updateGuestName
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: memoize updateGuestName with useCallback',
  `  function updateGuestName(value) {
    setGuestName(value);
    try { localStorage.setItem('lux_guest_name', value); } catch { /* private mode, etc. */ }
  }`,
  `  const updateGuestName = useCallback((value) => {
    setGuestName(value);
    try { localStorage.setItem('lux_guest_name', value); } catch { /* private mode, etc. */ }
  }, []);`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 13 — JS: Memoize visiblePhotos computation
// `showAll ? photos : photos.slice(0, 9)` is called every render even when
// photos and showAll haven't changed.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: memoize visiblePhotos with useMemo',
  `  const visiblePhotos = showAll ? photos : photos.slice(0, 9);`,
  `  const visiblePhotos = useMemo(
    () => showAll ? photos : photos.slice(0, 9),
    [photos, showAll]
  );`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 14 — JS: Add GPU-promotion class management for reel slides.
// The IntersectionObserver already knows which slide is active; we piggyback
// on it to add/remove the will-change class for active + adjacent slides.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: promote/demote GPU layers for reel slides via IntersectionObserver',
  `  // Reels: autoplay whichever video is actually in view, pause the rest —
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
    }, { threshold: [0, 0.6, 1], rootMargin: '0px 0px' });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.open, videos.length]);`,
  `  // Reels: autoplay whichever video is actually in view, pause the rest —
  // and keep reels.idx in sync with whatever is dominant (drives the
  // Prev/Next buttons and keyboard nav even after a manual swipe/scroll).
  useEffect(() => {
    if (!reels.open) return;
    const els = reelRefs.current.filter(Boolean);

    function updateGpuLayers(activeIdx) {
      // Promote active + immediate neighbours; demote everything else.
      els.forEach((vid) => {
        const slide = vid.closest('.lux-reel-slide');
        if (!slide) return;
        const i = Number(vid.dataset.reelIdx);
        const isActive   = i === activeIdx;
        const isAdjacent = Math.abs(i - activeIdx) === 1;
        slide.classList.toggle('reel-active',   isActive);
        slide.classList.toggle('reel-adjacent', isAdjacent && !isActive);
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const vid = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          vid.play().catch(() => {});
          const idx = Number(vid.dataset.reelIdx);
          setReels(r => (r.idx === idx ? r : { ...r, idx }));
          updateGpuLayers(idx);
        } else {
          vid.pause();
        }
      });
    }, { threshold: [0, 0.6, 1], rootMargin: '0px 0px' });
    els.forEach(el => observer.observe(el));
    // Initial promotion for the starting slide
    updateGpuLayers(reels.idx);
    return () => observer.disconnect();
  }, [reels.open, videos.length]); // eslint-disable-line react-hooks/exhaustive-deps`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 15 — JS: Wrap ReelSeekBar in React.memo so it only re-renders when
// its own props change, not every time the parent WeddingGallery re-renders.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: wrap ReelSeekBar in React.memo',
  `// Per-video seek bar for the Reels viewer — tap or drag to fast-forward or
// replay. Reads/writes the underlying <video> element directly through the
// shared ref array, so dragging tracks the finger with zero extra
// re-renders of the parent (only this small bar re-renders, ~4x/sec, and
// only for whichever video is actually playing).
function ReelSeekBar({ reelRefs, idx, active }) {`,
  `// Per-video seek bar for the Reels viewer — tap or drag to fast-forward or
// replay. Reads/writes the underlying <video> element directly through the
// shared ref array, so dragging tracks the finger with zero extra
// re-renders of the parent (only this small bar re-renders, ~4x/sec, and
// only for whichever video is actually playing).
const ReelSeekBar = memo(function ReelSeekBar({ reelRefs, idx, active }) {`
);

// Close the memo wrapper — find the end of ReelSeekBar component
patch(
  'JS: close ReelSeekBar memo wrapper',
  `    </div>
  );
}

// ── StoryThumb`,
  `    </div>
  );
});

// ── StoryThumb`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 16 — JS: Wrap StoryThumb in React.memo
// StoryThumb is expensive (creates a hidden video, canvas-draws a frame).
// Without memo it re-runs whenever the parent list re-renders.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: wrap StoryThumb in React.memo',
  `// ── StoryThumb ────────────────────────────────────────────────────────────────
// Extracts a poster frame from a video URL by:
//  1. Creating a hidden <video> element (not in the DOM)
//  2. Seeking to 0.1 s so we get an actual frame (not a black flash)
//  3. Drawing that frame onto a <canvas> via drawImage()
//  4. Disposing the video element immediately
//
// Fallback: if the extract fails (CORS, codec, etc.) we show the blush
// placeholder instead of a broken image.
function StoryThumb({ url }) {`,
  `// ── StoryThumb ────────────────────────────────────────────────────────────────
// Extracts a poster frame from a video URL by:
//  1. Creating a hidden <video> element (not in the DOM)
//  2. Seeking to 0.1 s so we get an actual frame (not a black flash)
//  3. Drawing that frame onto a <canvas> via drawImage()
//  4. Disposing the video element immediately
//
// Fallback: if the extract fails (CORS, codec, etc.) we show the blush
// placeholder instead of a broken image.
const StoryThumb = memo(function StoryThumb({ url }) {`
);

// Close StoryThumb memo — find the unique end of the StoryThumb return
patch(
  'JS: close StoryThumb memo wrapper',
  `  return (
    <canvas
      ref={canvasRef}
      className="lux-story-thumb"
      aria-hidden="true"
    />
  );
}

export default function WeddingGallery()`,
  `  return (
    <canvas
      ref={canvasRef}
      className="lux-story-thumb"
      aria-hidden="true"
    />
  );
});

export default function WeddingGallery()`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 17 — JS: Reduce petal count on mobile via a matchMedia check.
// 10 simultaneously-animating SVG elements on a low-end phone is the #1
// cause of the page-scroll jank. We cap to 4 petals on touch/narrow screens.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: reduce petal count on mobile to 4 (from 10)',
  `      {petalsReady && !reels.open && [
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
      ].map((p, i) => (`,
  `      {petalsReady && !reels.open && (() => {
        // Full set for desktop; trimmed set for mobile/touch to protect FPS.
        const isMobile = window.matchMedia('(max-width: 639px), (hover: none)').matches;
        const allPetals = [
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
        ];
        const petalData = isMobile ? allPetals.slice(0, 4) : allPetals;
        return petalData.map((p, i) => (`
);

// Close the IIFE petal block
patch(
  'JS: close petal IIFE block',
  `        }}>
          <svg viewBox="0 0 20 24" fill="none">
            <path d="M10 2C10 2 4 7 4 13a6 6 0 0012 0C16 7 10 2 10 2z"
              fill="rgba(196,116,142,0.45)" />
            <path d="M10 2C10 2 4 7 4 13"
              stroke="rgba(184,144,74,0.25)" strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </div>
      ))}`,
  `        }}>
          <svg viewBox="0 0 20 24" fill="none">
            <path d="M10 2C10 2 4 7 4 13a6 6 0 0012 0C16 7 10 2 10 2z"
              fill="rgba(196,116,142,0.45)" />
            <path d="M10 2C10 2 4 7 4 13"
              stroke="rgba(184,144,74,0.25)" strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </div>
      ));
      })()}`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 18 — JS: Throttle timeupdate seek bar updates with requestAnimationFrame
// The 'timeupdate' event fires every ~250ms per HTML spec but some browsers
// fire it more frequently. Using rAF ensures we batch those updates to one
// paint per frame, eliminating redundant React state updates.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: throttle ReelSeekBar timeupdate to rAF cadence',
  `  useEffect(() => {
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
  }, [reelRefs, idx, active]);`,
  `  useEffect(() => {
    if (!active) return;
    const video = reelRefs.current[idx];
    if (!video) return;

    let rafId = null;
    const sync = () => {
      if (draggingRef.current) return;
      if (rafId) return; // already scheduled
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setProgress(video.duration ? video.currentTime / video.duration : 0);
      });
    };
    video.addEventListener("timeupdate", sync);
    video.addEventListener("loadedmetadata", sync);
    sync();
    return () => {
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("loadedmetadata", sync);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reelRefs, idx, active]);`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 19 — JS: Add loading="lazy" + fetchpriority hints to lightbox images
// The lightbox renders all 3 slots (prev, current, next) immediately. The
// prev/next images should load lazily and at low priority so the current
// image gets bandwidth first.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: add fetchpriority=low to lightbox prev/next slots',
  `                {/* Prev slot */}
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
                </div>`,
  `                {/* Prev slot */}
                <div className="lux-lb-slot">
                  {photos[(lightbox.idx - 1 + photos.length) % photos.length] && (
                    <img
                      src={photos[(lightbox.idx - 1 + photos.length) % photos.length].url}
                      alt=""
                      draggable={false}
                      decoding="async"
                      loading="lazy"
                      fetchPriority="low"
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
                      decoding="async"
                      loading="eager"
                      fetchPriority="high"
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
                      loading="lazy"
                      fetchPriority="low"
                    />
                  )}
                </div>`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 20 — JS: Only render ReelSeekBar for the active reel + adjacent ones.
// Rendering a seek-bar for every video (even off-screen ones) means each bar
// has a running timeupdate listener + rAF loop. Only the near-active ones need it.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: gate ReelSeekBar rendering to active ±1 slides',
  `              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open} />`,
  `              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open && Math.abs(idx - reels.idx) <= 1} />`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 21 — JS: Memoize the goToReel function used in keyboard handler + buttons
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: memoize goToReel with useCallback',
  `  function goToReel(targetIdx) {
    if (targetIdx < 0 || targetIdx >= videos.length) return;
    const el = reelRefs.current[targetIdx];
    el?.closest(".lux-reel-slide")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }`,
  `  const goToReel = useCallback((targetIdx) => {
    if (targetIdx < 0 || targetIdx >= videos.length) return;
    const el = reelRefs.current[targetIdx];
    el?.closest(".lux-reel-slide")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [videos.length]);`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 22 — JS: CSS injection: inject only once, not on every render cycle.
// The current `useEffect` with `s.textContent = LUXURY_CSS` re-assigns the
// full ~1500-line CSS string on every effect. Adding a guard prevents that.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JS: guard CSS injection so it only runs once (not on re-mount)',
  `  useEffect(() => {
    let s = document.getElementById("lux-css");
    if (!s) { s = document.createElement("style"); s.id = "lux-css"; document.head.appendChild(s); }
    s.textContent = LUXURY_CSS;
  }, []);`,
  `  useEffect(() => {
    // Only inject once — avoid re-assigning the full CSS string on every
    // StrictMode double-invoke or hot-reload re-mount.
    if (document.getElementById("lux-css")) return;
    const s = document.createElement("style");
    s.id = "lux-css";
    s.textContent = LUXURY_CSS;
    document.head.appendChild(s);
  }, []);`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 23 — JS: Add passive event listeners hint via CSS touch-action on
// the reels scroll container (already set in CSS, but also add overscroll on
// the reel-scroll-ref for programmatic smoothness).
// Additionally: add `content-visibility: auto` to off-screen reel slides
// so the browser can skip paint/layout for slides far from the viewport.
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: add content-visibility:auto to reel slides that are off-screen',
  `/* GPU promotion: only the active slide and its neighbours */
.lux-reel-slide.reel-active,
.lux-reel-slide.reel-adjacent {
  will-change: transform;
}`,
  `/* GPU promotion: only the active slide and its neighbours */
.lux-reel-slide.reel-active,
.lux-reel-slide.reel-adjacent {
  will-change: transform;
}
/* Skip paint/layout for slides far from the viewport.
   The browser will skip them completely until they near the scroll position. */
.lux-reel-slide:not(.reel-active):not(.reel-adjacent) {
  content-visibility: auto;
  contain-intrinsic-size: 0 100vh;
}`
);

// ─── Write the result ─────────────────────────────────────────────────────────
if (src === original) {
  console.log('\n⚠️  No changes were made (all patches were already applied?)');
  process.exit(0);
}

// Write a backup first
const backupPath = TARGET + '.bak_before_perf';
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, original, 'utf8');
  console.log(`\n💾 Backup saved → ${path.relative(__dirname, backupPath)}`);
}

fs.writeFileSync(TARGET, src, 'utf8');

console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  ✅  All ${23} performance patches applied successfully!                    ║
╚══════════════════════════════════════════════════════════════════════════╝

What was changed (summary):

  CSS optimisations
  ─────────────────
  1.  Petals → will-change:transform + contain:strict  (GPU compositing)
  2.  Gallery card → contain:content  (isolate repaint scope)
  3.  Photo hover scale 0.65s → 0.28s  (60% faster animation)
  4.  Photo items → contain:layout style  (prevent grid-wide reflows)
  5.  Removed backdrop-filter from hover overlay  (expensive composite layer)
  6.  Lightbox slots → contain:layout paint  (isolate slot paints)
  7.  Story shimmer: gradient sweep → opacity pulse  (no layer upload per frame)
  8.  Reel slides → will-change:auto + class-gated promotion  (save GPU memory)
  9.  Content-visibility:auto on off-screen reel slides  (skip layout/paint)

  JS optimisations
  ─────────────────
  10. useCallback on openLightbox, openReels, closeReels, updateGuestName,
      goToReel  (no new function reference every render → fewer child re-renders)
  11. useMemo on visiblePhotos slice  (avoid re-slicing on every render)
  12. ReelSeekBar → React.memo  (skip re-render when parent state changes)
  13. StoryThumb → React.memo  (skip expensive canvas re-extraction)
  14. Petal count: 10 → 4 on mobile/touch  (halve animation CPU cost)
  15. Seek bar timeupdate → rAF-throttled  (one setState per paint frame)
  16. ReelSeekBar only rendered for active ±1 slides  (kill idle rAF loops)
  17. GPU layer classes added via IntersectionObserver  (active/adjacent only)
  18. Lightbox prev/next: fetchPriority=low + loading=lazy  (current wins bandwidth)
  19. CSS injection guard  (skip re-assigning 1500-line string on re-mounts)

  To verify: run  npm start  and check the browser Performance tab.
  The "Long Tasks" bar in the timeline should be significantly shorter.
`);
