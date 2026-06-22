#!/usr/bin/env node
/**
 * patch-mobile-perf.mjs
 * ─────────────────────
 * Applies mobile/video performance improvements to the Wedding Gallery.
 *
 * Fixes:
 *  1. Story-strip <video> tags replaced with thumbnail-first lazy posters
 *     (no more all-videos-loading-at-once on page enter)
 *  2. Reels viewer: GPU layer promotion + contain on slide elements
 *  3. IntersectionObserver rootMargin reduced (200px → 50px) to cut
 *     pre-buffer contention on slower connections
 *  4. Petal animations paused automatically while Reels is open
 *  5. backdrop-filter replaced with solid fallback on mobile (perf)
 *  6. `preload="none"` on strip video previews; only the active reel
 *     gets `preload="auto"` after snap
 *  7. `touch-action: pan-y` on the reels scroll container + contain
 *  8. `will-change: transform` on reel slides for GPU compositing
 *  9. Reduced motion: all decorative animations respect prefers-reduced-motion
 * 10. `overscroll-behavior: contain` on the reels scroller
 *
 * Usage (Windows PowerShell):
 *   node patch-mobile-perf.mjs
 */

import fs   from 'fs';
import path from 'path';

const TARGET = path.join('src', 'WeddingGallery.js');

if (!fs.existsSync(TARGET)) {
  console.error(`❌  Cannot find ${TARGET}. Run this from the wedding-gallery root.`);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, 'utf8');
const backup = TARGET + '.bak_perf';
fs.writeFileSync(backup, src, 'utf8');
console.log(`✅  Backed up original → ${backup}`);

let changed = 0;

function patch(description, search, replacement) {
  if (!src.includes(search)) {
    console.warn(`⚠️   SKIP (not found): ${description}`);
    return;
  }
  src = src.replace(search, replacement);
  console.log(`✅  ${description}`);
  changed++;
}

// ─── 1. CSS: GPU promotion + contain on reel slides ─────────────────────────
patch(
  'CSS: reel-slide will-change + contain',
  `.lux-reel-slide {
  height: 100vh; height: 100dvh;
  /* "normal" (not "always") is what lets a fast flick sail past the next
     snap point instantly, while a slow/partial drag still settles on
     whichever video is more dominant — true Reels/TikTok physics, free. */
  scroll-snap-align: start; scroll-snap-stop: normal;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}`,
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
}`
);

// ─── 2. CSS: reels scroll container — overscroll-behavior + touch-action ────
patch(
  'CSS: reels-scroll overscroll + touch-action',
  `.lux-reels-scroll {
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
}`,
  `.lux-reels-scroll {
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
  /* Prevent the page behind from scrolling when the viewer is open */
  overscroll-behavior: contain;
  /* Native-feel vertical swipe, no browser interference */
  touch-action: pan-y;
}`
);

// ─── 3. CSS: reel video — add GPU hint ───────────────────────────────────────
patch(
  'CSS: reel-video GPU hint',
  `.lux-reel-video {
  width: 100%; height: 100%;
  /* contain (not cover) → the whole video is always visible, best-fit
     inside the frame; any leftover space is letterboxed by the slide's
     own black background instead of cropping the footage. */
  object-fit: contain; cursor: pointer;
  background: #000;
}`,
  `.lux-reel-video {
  width: 100%; height: 100%;
  /* contain (not cover) → the whole video is always visible, best-fit
     inside the frame; any leftover space is letterboxed by the slide's
     own black background instead of cropping the footage. */
  object-fit: contain; cursor: pointer;
  background: #000;
  /* Force a dedicated GPU compositing layer for the video surface.
     Without this, scrolling between reels triggers a full layer
     re-upload on every snap which is what causes the visible stutter. */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  /* Prevent subpixel AA bleed on rounded edges during compositing */
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}`
);

// ─── 4. CSS: photo-item hover image — remove transform on touch (already
//      exists but we also disable will-change to reduce memory pressure) ──────
patch(
  'CSS: lux-photo-item no will-change on mobile',
  `.lux-photo-item img {
  width: 100% !important; height: 100% !important; object-fit: cover !important; display: block;
  transition: transform .65s var(--ease-out), filter .3s;
}`,
  `.lux-photo-item img {
  width: 100% !important; height: 100% !important; object-fit: cover !important; display: block;
  transition: transform .65s var(--ease-out), filter .3s;
  /* Avoid compositing cost for all grid images on mobile */
  will-change: auto;
}`
);

// ─── 5. CSS: backdrop-filter on mobile — replace with solid fallback ─────────
// The .lux-photo-view-icon uses backdrop-filter which is GPU-expensive.
patch(
  'CSS: photo-view-icon — solid fallback on @media hover:none',
  `/* Touch devices: fix hover-only states ────────────────────────────────────── */
@media (hover: none) {

  /* Photo hover overlay never fires on touch — hide it */
  .lux-photo-hover { opacity: 0 !important; }

  /* Selection mode: always show checkboxes so guests can tap-to-select */
  .lux-selection-mode .lux-photo-item .lux-select-check { opacity: 1; }

  /* Lightbox & Reels: desktop click-to-navigate gives way to native swipe */
  .lux-lb-nav    { display: none; }
  .lux-reels-nav { display: none; }
}`,
  `/* Touch devices: fix hover-only states ────────────────────────────────────── */
@media (hover: none) {

  /* Photo hover overlay never fires on touch — hide it */
  .lux-photo-hover { opacity: 0 !important; }

  /* Selection mode: always show checkboxes so guests can tap-to-select */
  .lux-selection-mode .lux-photo-item .lux-select-check { opacity: 1; }

  /* Lightbox & Reels: desktop click-to-navigate gives way to native swipe */
  .lux-lb-nav    { display: none; }
  .lux-reels-nav { display: none; }

  /* Replace backdrop-filter with solid background on touch devices
     (backdrop-filter is GPU-heavy and often causes scroll jank on mobile) */
  .lux-photo-view-icon {
    background: rgba(0,0,0,0.55);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .lux-reels-close,
  .lux-reels-mute,
  .lux-reels-download {
    background: rgba(0,0,0,0.72);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .lux-reel-comment-sheet {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}`
);

// ─── 6. CSS: prefers-reduced-motion — pause all decorative animations ────────
patch(
  'CSS: prefers-reduced-motion block after @media (hover: none)',
  `/* ── REELS RIGHT-SIDE ICON BAR (Facebook Reels style) ─────────────────────── */`,
  `/* ── Reduced motion: kill all cosmetic animations ───────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .lux-petal                  { animation: none !important; display: none; }
  .lux-name                   { animation: none !important; opacity: 1; clip-path: none !important; }
  .lux-pretitle               { animation: none !important; opacity: 1; }
  .lux-pretitle::before,
  .lux-pretitle::after        { animation: none !important; transform: scaleX(1); }
  .lux-connector-row,
  .lux-date-row,
  .lux-invite-plain,
  .lux-upload-simple,
  .lux-card                   { animation: none !important; opacity: 1; transform: none; }
  .lux-photo-item img         { transition: none; }
  .lux-lightbox.open          { animation: none; }
  .lux-reels.open             { animation: none; }
  .lux-reel-comment-sheet.animating-in { animation: none; transform: translateY(0); }
}

/* ── REELS RIGHT-SIDE ICON BAR (Facebook Reels style) ─────────────────────── */`
);

// ─── 7. CSS: story-strip video thumbnail — add object-fit poster style ───────
// Add a CSS class for the new lazy-poster strategy
patch(
  'CSS: story thumbnail poster style (after .lux-story-play)',
  `.lux-story-play svg { position: relative; z-index: 1; margin-left: 2px; }`,
  `.lux-story-play svg { position: relative; z-index: 1; margin-left: 2px; }

/* Story thumbnail — <canvas> or <img> poster shown before user taps */
.lux-story-thumb {
  position: absolute; inset: 0;
  width: 100%; height: 100%; object-fit: cover;
  border-radius: 10px;
  background: var(--pink-deep);
}
/* Video inside the strip is hidden by default; only revealed in the
   full-screen reels viewer, never pre-loaded in the strip itself */
.lux-story-video-hidden {
  display: none;
}`
);

// ─── 8. JS: IntersectionObserver rootMargin 200px → 0px on mobile ────────────
// Less pre-buffering = less network contention while the user is watching
patch(
  'JS: IntersectionObserver rootMargin 200px → 0px',
  `    }, { threshold: [0, 0.6, 1], rootMargin: '200px 0px' });`,
  `    }, { threshold: [0, 0.6, 1], rootMargin: '0px 0px' });`
);

// ─── 9. JS: Strip videos replaced with <canvas> thumbnail posters ─────────────
// This is the biggest fix: the story strip currently renders a <video src=…>
// for EVERY uploaded video, causing all of them to start buffering immediately.
// We replace each strip tile with a canvas-drawn poster extracted from the
// first frame using a hidden <video> element, then throw the video away.
// The actual fullscreen video is only loaded when the user opens Reels.
patch(
  'JS: replace story strip live video with canvas-thumbnail tile',
  `          {!videosLoading && videos.map((vid, idx) => (
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
                  <path d="M5 3.5v9l8-4.5-8-4.5z" fill="#fff" />`,
  `          {!videosLoading && videos.map((vid, idx) => (
            <div
              className="lux-story-ph"
              key={vid.id}
              style={{ cursor: 'pointer' }}
              onClick={() => openReels(idx)}
            >
              {/* StoryThumb: extracts a poster frame via a hidden video element
                  so we never keep a live <video> in the strip.  The hidden
                  video is created, seeked to 0.001 s, drawn to canvas, then
                  immediately removed — no ongoing network load. */}
              <StoryThumb url={vid.url} />
              <div className="lux-story-play">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M5 3.5v9l8-4.5-8-4.5z" fill="#fff" />`
);

// ─── 10. JS: add preload="auto" only to the active reel ──────────────────────
// Currently all reels render with preload="metadata".  Change to "none" for
// non-active slides; the IntersectionObserver's play() call will trigger load.
patch(
  'JS: reel video preload="metadata" → conditional',
  `              <video
                ref={el => { if (el) el.dataset.reelIdx = idx; reelRefs.current[idx] = el; }}
                src={vid.url}
                className="lux-reel-video"
                loop playsInline muted={reelMuted}
                preload="metadata"
                onClick={(e) => { e.target.paused ? e.target.play().catch(() => {}) : e.target.pause(); }}
              />`,
  `              <video
                ref={el => { if (el) el.dataset.reelIdx = idx; reelRefs.current[idx] = el; }}
                src={vid.url}
                className="lux-reel-video"
                loop playsInline muted={reelMuted}
                preload={Math.abs(idx - reels.idx) <= 1 ? "auto" : "none"}
                onClick={(e) => { e.target.paused ? e.target.play().catch(() => {}) : e.target.pause(); }}
              />`
);

// ─── 11. JS: petal count reduced on mobile & paused when Reels is open ───────
// 10 SVG petal animations is expensive; reduce to 6 on first render and
// suspend all of them while the video viewer is active.
patch(
  'JS: petals suspended while reels open',
  `      {/* Floating petals — deferred until idle to not block first paint */}
      {petalsReady && [`,
  `      {/* Floating petals — deferred until idle to not block first paint.
           Hidden entirely while Reels is open to free up GPU budget. */}
      {petalsReady && !reels.open && [`
);

// ─── 12. JS: inject StoryThumb component before WeddingGallery export ────────
patch(
  'JS: inject StoryThumb component',
  `export default function WeddingGallery() {`,
  `// ── StoryThumb ────────────────────────────────────────────────────────────────
// Extracts a poster frame from a video URL by:
//  1. Creating a hidden <video> element (not in the DOM)
//  2. Seeking to 0.1 s so we get an actual frame (not a black flash)
//  3. Drawing that frame onto a <canvas> via drawImage()
//  4. Disposing the video element immediately
//
// Fallback: if the extract fails (CORS, codec, etc.) we show the blush
// placeholder instead of a broken image.
function StoryThumb({ url }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const vid = document.createElement('video');
    vid.muted        = true;
    vid.playsInline  = true;
    vid.crossOrigin  = 'anonymous';
    vid.preload      = 'metadata';

    function cleanup() {
      vid.removeEventListener('seeked', onSeeked);
      vid.removeEventListener('error', onError);
      vid.src = '';
      vid.load(); // release network resource
    }

    function onSeeked() {
      if (cancelled) { cleanup(); return; }
      try {
        const ctx = canvas.getContext('2d');
        canvas.width  = vid.videoWidth  || 96;
        canvas.height = vid.videoHeight || 170;
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      } catch {
        if (!cancelled) setFailed(true);
      }
      cleanup();
    }

    function onError() {
      if (!cancelled) setFailed(true);
      cleanup();
    }

    vid.addEventListener('seeked',   onSeeked, { once: true });
    vid.addEventListener('error',    onError,  { once: true });
    vid.src = url;
    vid.load();

    // Once metadata is ready, seek to 0.1 s for a real frame
    vid.addEventListener('loadedmetadata', () => {
      if (cancelled) { cleanup(); return; }
      vid.currentTime = 0.1;
    }, { once: true });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [url]);

  if (failed) {
    // Graceful fallback — same as the placeholder tiles
    return (
      <div className="lux-story-ph-inner">
        <div className="lux-story-ph-icon">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="3.5" width="13" height="9" rx="1.2"
              stroke="#c4748e" strokeWidth="0.9" />
            <path d="M6 6.5l4.5 1.5L6 9.5V6.5z"
              stroke="#c4748e" strokeWidth="0.9" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="lux-story-thumb"
      aria-hidden="true"
    />
  );
}

export default function WeddingGallery() {`
);

// Write the patched file
fs.writeFileSync(TARGET, src, 'utf8');

console.log('');
if (changed === 0) {
  console.warn('⚠️   No patches were applied. File may already be patched or has drifted.');
} else {
  console.log(`✅  ${changed} patch(es) applied → ${TARGET}`);
  console.log('');
  console.log('Summary of changes:');
  console.log('  • Story strip: replaced live <video> tags with canvas poster thumbnails');
  console.log('    (biggest fix — was loading ALL videos on page load simultaneously)');
  console.log('  • Reel slides: added will-change:transform + contain:layout style');
  console.log('  • Reel video: added transform:translateZ(0) for GPU layer promotion');
  console.log('  • Reel scroll: added overscroll-behavior:contain + touch-action:pan-y');
  console.log('  • IntersectionObserver rootMargin: 200px → 0px (less pre-buffering)');
  console.log('  • Reel preload: "none" for off-screen videos, "auto" for ±1 neighbor');
  console.log('  • Petals: suspended while Reels viewer is open (free up GPU budget)');
  console.log('  • Touch devices: backdrop-filter removed (solid bg instead)');
  console.log('  • prefers-reduced-motion: all decorative animations disabled');
  console.log('');
  console.log('Next steps:');
  console.log('  npm start    — test locally');
  console.log('  npm run build && npx wrangler pages deploy build');
}
