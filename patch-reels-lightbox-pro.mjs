/**
 * patch-reels-lightbox-pro.mjs
 *
 * Upgrades the Reels video viewer and the photo Lightbox to a professional,
 * Facebook-grade interaction model:
 *
 *   REELS (videos)
 *   ─────────────
 *   1. Desktop: adds round Prev/Next chevron buttons (↑/↓), plus full
 *      keyboard support (ArrowUp/ArrowDown). Mouse-wheel / trackpad
 *      scrolling keeps working exactly as before (native scroll-snap).
 *   2. Mobile: untouched — swipe up/down, no buttons (buttons are hidden
 *      automatically on touch devices via `@media (hover:none)`).
 *   3. The "which video is dominant" tracking that already drove autoplay
 *      now also drives `reels.idx`, so the Prev/Next buttons and keyboard
 *      always know exactly which video is showing — even after a manual
 *      swipe/scroll.
 *   4. `scroll-snap-stop` changes from `always` to `normal`, which is the
 *      literal browser primitive for "a slow/partial swipe settles on the
 *      nearest (dominant) video, but a fast flick can sail straight past it
 *      to the next one" — i.e. exactly the Reels/TikTok feel, with zero
 *      custom physics code (and zero risk of janky homemade momentum math).
 *   5. Adds a thin, draggable seek/scrub bar to the bottom of every video
 *      so guests can fast-forward or replay (tap or drag — built on the
 *      Pointer Events API, so it works identically with mouse and touch).
 *
 *   LIGHTBOX (photos)
 *   ─────────────────
 *   6. Desktop: Prev/Next buttons (already existed) are kept, unchanged.
 *   7. Mobile: Prev/Next buttons are hidden; in their place, a real
 *      Facebook-style horizontal swipe is added — the photo follows your
 *      finger 1:1 while dragging. On release: if you dragged past ~⅓ of the
 *      screen width OR flicked fast (judged by velocity, not just
 *      distance), it commits to the next/previous photo. Otherwise it
 *      springs back to the current (dominant) photo.
 *   8. Hardens full-viewport centering (explicit 100dvh + relative
 *      positioning) so the photo is always dead-center in the visible
 *      viewport, including on mobile browsers with dynamic toolbars.
 *
 * Run from your project root:
 *   node patch-reels-lightbox-pro.mjs
 *
 * Then:
 *   git add src/WeddingGallery.js
 *   git commit -m "Pro Reels nav/seek + Facebook-style lightbox swipe"
 *   git push
 */

import fs from 'fs';
import path from 'path';

const TARGET = path.join(process.cwd(), 'src', 'WeddingGallery.js');

if (!fs.existsSync(TARGET)) {
  console.error(`❌ Could not find ${TARGET}`);
  console.error('   Run this script from your project root (same folder as package.json).');
  process.exitCode = 1;
  process.exit();
}

const original = fs.readFileSync(TARGET, 'utf8');
const usesCRLF = original.includes('\r\n');
// Normalize to LF for matching/patching, restore CRLF at the end if needed.
let content = original.replace(/\r\n/g, '\n');

if (content.includes('.lux-reel-seek {')) {
  console.log('✅ Already patched — .lux-reel-seek CSS found in WeddingGallery.js. Nothing to do.');
  process.exit();
}

if (!content.includes('.lux-reels {')) {
  console.error('❌ This patch expects the Reels viewer to already exist (run patch-reels-viewer.mjs first).');
  process.exitCode = 1;
  process.exit();
}

let changes = 0;
const TOTAL = 9;

function applyReplace(label, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error(`❌ Could not find expected code for: ${label}`);
    console.error('   Your file may differ from what this patch expects — paste the file to Claude for a manual patch.');
    process.exitCode = 1;
    return false;
  }
  content = content.replace(oldStr, newStr);
  changes++;
  console.log(`✅ Patched: ${label}`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// 1) Reels CSS: scroll-snap-stop → normal, Prev/Next nav buttons, seek bar,
//    and hide desktop-only nav chrome on touch devices.
// ─────────────────────────────────────────────────────────────────────────
applyReplace(
  'Reels CSS — nav buttons, seek bar, scroll-snap-stop, touch hide rules',
  `/* ── Touch devices: fix hover-only states ────────────────────────────────── */
@media (hover: none) {

  /* Photo hover overlay never fires on touch — hide it */
  .lux-photo-hover { opacity: 0 !important; }

  /* Selection mode: always show checkboxes so guests can tap-to-select */
  .lux-selection-mode .lux-photo-item .lux-select-check { opacity: 1; }
}

/* ── REELS — full-screen vertical video viewer (TikTok/Reels style) ───────── */
.lux-reels {
  position: fixed; inset: 0; z-index: 1100;
  background: #000;
  display: none;
}
.lux-reels.open { display: block; animation: fadeIn .25s ease both; }

.lux-reels-scroll {
  height: 100vh; height: 100dvh;
  overflow-y: auto; scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.lux-reels-scroll::-webkit-scrollbar { display: none; }

.lux-reel-slide {
  height: 100vh; height: 100dvh;
  scroll-snap-align: start; scroll-snap-stop: always;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.lux-reel-video {
  width: 100%; height: 100%;
  object-fit: cover; cursor: pointer;
  background: #000;
}

.lux-reels-close, .lux-reels-mute {
  position: absolute; z-index: 5;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(0,0,0,0.35); border: 0.5px solid rgba(255,255,255,0.25);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .25s; backdrop-filter: blur(4px);
}
.lux-reels-close { top: 18px; left: 16px; }
.lux-reels-mute  { bottom: 28px; right: 16px; }
.lux-reels-close:hover, .lux-reels-mute:hover { background: rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.45); }

@media (max-width: 639px) {
  .lux-reels-close { top: 14px; left: 12px; width: 40px; height: 40px; }
  .lux-reels-mute  { bottom: 22px; right: 12px; width: 40px; height: 40px; }
}`,
  `/* ── Touch devices: fix hover-only states ────────────────────────────────── */
@media (hover: none) {

  /* Photo hover overlay never fires on touch — hide it */
  .lux-photo-hover { opacity: 0 !important; }

  /* Selection mode: always show checkboxes so guests can tap-to-select */
  .lux-selection-mode .lux-photo-item .lux-select-check { opacity: 1; }

  /* Lightbox & Reels: desktop click-to-navigate gives way to native swipe */
  .lux-lb-nav    { display: none; }
  .lux-reels-nav { display: none; }
}

/* ── REELS — full-screen vertical video viewer (TikTok/Reels style) ───────── */
.lux-reels {
  position: fixed; inset: 0; z-index: 1100;
  background: #000;
  display: none;
}
.lux-reels.open { display: block; animation: fadeIn .25s ease both; }

.lux-reels-scroll {
  height: 100vh; height: 100dvh;
  overflow-y: auto; scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
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
  object-fit: cover; cursor: pointer;
  background: #000;
}

.lux-reels-close, .lux-reels-mute {
  position: absolute; z-index: 5;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(0,0,0,0.35); border: 0.5px solid rgba(255,255,255,0.25);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .25s; backdrop-filter: blur(4px);
}
.lux-reels-close { top: 18px; left: 16px; }
.lux-reels-mute  { bottom: 28px; right: 16px; }
.lux-reels-close:hover, .lux-reels-mute:hover { background: rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.45); }

/* Desktop-only Prev/Next — hidden on touch devices (rule above) */
.lux-reels-nav {
  position: absolute; right: 18px; z-index: 5;
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(0,0,0,0.35); border: 0.5px solid rgba(255,255,255,0.25);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .25s; backdrop-filter: blur(4px);
}
.lux-reels-nav:hover    { background: rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.45); }
.lux-reels-nav:disabled { opacity: 0.22; cursor: default; pointer-events: none; }
.lux-reels-prev { top: calc(50% - 56px); }
.lux-reels-next { top: calc(50% + 14px); }

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
  .lux-reels-close { top: 14px; left: 12px; width: 40px; height: 40px; }
  .lux-reels-mute  { bottom: 22px; right: 12px; width: 40px; height: 40px; }
  .lux-reel-seek   { left: 12px; right: 12px; bottom: 16px; }
}`
);

// ─────────────────────────────────────────────────────────────────────────
// 2) Lightbox CSS: harden full-viewport centering, add swipe/drag support.
// ─────────────────────────────────────────────────────────────────────────
applyReplace(
  'Lightbox CSS — centering hardening + drag-swipe support',
  `.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(7, 2, 5, 0.97);
  display: none; align-items: center; justify-content: center; flex-direction: column;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.lux-lightbox.open { display: flex; animation: fadeIn .3s ease both; }

.lux-lb-close {
  position: absolute; top: 18px; right: 20px;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.55); cursor: pointer; transition: all .25s;
  display: flex; align-items: center; justify-content: center;
}
.lux-lb-close:hover { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.30); }

.lux-lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px;
  background: transparent; border: 0.5px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.45); font-size: 22px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .25s;
}
.lux-lb-nav:hover { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.34); }
.lux-lb-prev { left: 12px; }
.lux-lb-next { right: 12px; }

.lux-lb-img-wrap { max-width: 90vw; max-height: 72vh; display: flex; align-items: center; justify-content: center; }
.lux-lb-img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  transition: transform .4s var(--ease-cinematic);
  box-shadow: 0 40px 80px rgba(0,0,0,0.55);
}
.lux-lb-img.zoomed { transform: scale(2.2); }`,
  `.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  width: 100vw; height: 100vh; height: 100dvh;
  background: rgba(7, 2, 5, 0.97);
  display: none; align-items: center; justify-content: center; flex-direction: column;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.lux-lightbox.open { display: flex; animation: fadeIn .3s ease both; }

.lux-lb-close {
  position: absolute; top: 18px; right: 20px;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.55); cursor: pointer; transition: all .25s;
  display: flex; align-items: center; justify-content: center;
}
.lux-lb-close:hover { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.30); }

.lux-lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px; z-index: 4;
  background: transparent; border: 0.5px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.45); font-size: 22px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .25s;
}
.lux-lb-nav:hover { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.34); }
.lux-lb-prev { left: 12px; }
.lux-lb-next { right: 12px; }

/* width:100% + position:relative + touch-action:pan-y → reliable full-bleed
   centering on every viewport, and lets JS own horizontal swipe gestures
   while still allowing native vertical scroll/pull-to-refresh. */
.lux-lb-img-wrap {
  max-width: 90vw; max-height: 72vh; width: 100%;
  display: flex; align-items: center; justify-content: center;
  position: relative; touch-action: pan-y;
}
.lux-lb-img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  transition: transform .4s var(--ease-cinematic);
  box-shadow: 0 40px 80px rgba(0,0,0,0.55);
  will-change: transform; user-select: none; -webkit-user-drag: none;
}
.lux-lb-img.zoomed   { transform: scale(2.2); }
.lux-lb-img.dragging { transition: none; }`
);

// ─────────────────────────────────────────────────────────────────────────
// 3) New refs: lightbox image ref + drag-tracking ref.
// ─────────────────────────────────────────────────────────────────────────
applyReplace(
  'New refs (lbImgRef, lbDragRef)',
  `  const reelRefs          = useRef([]);
  const reelContainerRef  = useRef(null);`,
  `  const reelRefs          = useRef([]);
  const reelContainerRef  = useRef(null);
  const lbImgRef           = useRef(null);
  const lbDragRef          = useRef({ active: false, startX: 0, startY: 0, locked: null, startTime: 0 });`
);

// ─────────────────────────────────────────────────────────────────────────
// 4) Reels: Escape + ↑/↓ keyboard navigation (goToReel defined further down,
//    function declarations are hoisted so this is safe to reference early).
// ─────────────────────────────────────────────────────────────────────────
applyReplace(
  'Reels keyboard handler — add ArrowUp/ArrowDown',
  `  // Reels: Escape closes the viewer
  useEffect(() => {
    if (!reels.open) return;
    const handler = (e) => {
      if (e.key === "Escape") setReels(r => ({ ...r, open: false }));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reels.open]);`,
  `  // Reels: Escape closes the viewer, ↑ / ↓ move between videos (desktop)
  useEffect(() => {
    if (!reels.open) return;
    const handler = (e) => {
      if (e.key === "Escape")    setReels(r => ({ ...r, open: false }));
      if (e.key === "ArrowUp")   goToReel(reels.idx - 1);
      if (e.key === "ArrowDown") goToReel(reels.idx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reels.open, reels.idx]); // eslint-disable-line react-hooks/exhaustive-deps`
);

// ─────────────────────────────────────────────────────────────────────────
// 5) Reels: IntersectionObserver now also syncs reels.idx to whichever
//    video is dominant, so Prev/Next + keyboard always know "where we are".
// ─────────────────────────────────────────────────────────────────────────
applyReplace(
  'Reels IntersectionObserver — sync reels.idx to the dominant video',
  `  // Reels: autoplay whichever video is actually in view, pause the rest
  useEffect(() => {
    if (!reels.open) return;
    const els = reelRefs.current.filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const vid = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      });
    }, { threshold: [0, 0.6, 1] });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.open, videos.length]);`,
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
    }, { threshold: [0, 0.6, 1] });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.open, videos.length]);`
);

// ─────────────────────────────────────────────────────────────────────────
// 6) Helpers: goToReel() for Prev/Next buttons + keyboard.
// ─────────────────────────────────────────────────────────────────────────
applyReplace(
  'goToReel() helper',
  `  function closeReels() {
    reelRefs.current.forEach(v => v && v.pause());
    setReels(r => ({ ...r, open: false }));
  }`,
  `  function closeReels() {
    reelRefs.current.forEach(v => v && v.pause());
    setReels(r => ({ ...r, open: false }));
  }

  function goToReel(targetIdx) {
    if (targetIdx < 0 || targetIdx >= videos.length) return;
    const el = reelRefs.current[targetIdx];
    el?.closest(".lux-reel-slide")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }`
);

// ─────────────────────────────────────────────────────────────────────────
// 7) Helpers: Facebook-style swipe-drag for the Lightbox (Pointer Events —
//    one code path for mouse AND touch). Direct-to-DOM via refs while
//    dragging (no setState), so it stays glassy-smooth at 60fps; a single
//    setState only fires on release if the swipe actually commits.
// ─────────────────────────────────────────────────────────────────────────
applyReplace(
  'Lightbox swipe-drag handlers',
  `  function navPhoto(dir) {
    setLightbox(l => ({ ...l, idx: (l.idx + dir + photos.length) % photos.length, zoomed: false }));
  }`,
  `  function navPhoto(dir) {
    setLightbox(l => ({ ...l, idx: (l.idx + dir + photos.length) % photos.length, zoomed: false }));
  }

  // Lightbox swipe — mirrors Facebook's photo viewer:
  //  • the photo follows your finger while dragging
  //  • release before the "dominant" threshold (~⅓ of the screen) →
  //    springs back to the photo you started on
  //  • release past that threshold, OR a fast flick (judged by velocity,
  //    not distance) → commits instantly to the next/previous photo
  function lbDragStart(e) {
    if (lightbox.zoomed || photos.length < 2) return;
    lbDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, locked: null, startTime: Date.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function lbDragMove(e) {
    const drag = lbDragRef.current;
    if (!drag.active) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.locked === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // ignore micro-jitter / taps
      drag.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (drag.locked !== "x") return; // a vertical gesture — not ours to handle

    if (lbImgRef.current) {
      lbImgRef.current.classList.add("dragging");
      lbImgRef.current.style.transform = \`translateX(\${dx}px)\`;
    }
  }

  function lbDragEnd(e) {
    const drag = lbDragRef.current;
    if (!drag.active) return;
    drag.active = false;

    const img = lbImgRef.current;
    const wasHorizontal = drag.locked === "x";
    if (img) { img.classList.remove("dragging"); img.style.transform = ""; }
    if (!wasHorizontal) return;

    const dx = e.clientX - drag.startX;
    const elapsed = Math.max(1, Date.now() - drag.startTime);
    const velocity = Math.abs(dx) / elapsed; // px/ms

    const FAST_FLICK_VELOCITY = 0.55;  // px/ms — a quick flick commits instantly
    const DOMINANT_FRACTION   = 0.32;  // dragged past ~⅓ of the screen = committed

    const passedThreshold = Math.abs(dx) > window.innerWidth * DOMINANT_FRACTION;
    if (velocity > FAST_FLICK_VELOCITY || passedThreshold) {
      navPhoto(dx < 0 ? 1 : -1);
    }
    // Otherwise: the transform reset above (with the transition re-enabled
    // by removing "dragging") animates it right back to the dominant photo.
  }

  function lbDragCancel() {
    lbDragRef.current.active = false;
    const img = lbImgRef.current;
    if (img) { img.classList.remove("dragging"); img.style.transform = ""; }
  }`
);

// ─────────────────────────────────────────────────────────────────────────
// 8) Lightbox JSX: wire up the ref + pointer handlers on the image wrap.
// ─────────────────────────────────────────────────────────────────────────
applyReplace(
  'Lightbox JSX — swipe handlers + image ref',
  `        <div className="lux-lb-img-wrap">
          {lightbox.open && currentImg && (
            <img
              className={\`lux-lb-img\${lightbox.zoomed ? " zoomed" : ""}\`}
              src={currentImg.url} alt=""
            />
          )}
        </div>`,
  `        <div
          className="lux-lb-img-wrap"
          onPointerDown={lbDragStart}
          onPointerMove={lbDragMove}
          onPointerUp={lbDragEnd}
          onPointerCancel={lbDragCancel}
        >
          {lightbox.open && currentImg && (
            <img
              ref={lbImgRef}
              className={\`lux-lb-img\${lightbox.zoomed ? " zoomed" : ""}\`}
              src={currentImg.url} alt=""
              draggable={false}
            />
          )}
        </div>`
);

// ─────────────────────────────────────────────────────────────────────────
// 9) Reels JSX: Prev/Next buttons, per-video dataset index, seek bar — and
//    a new ReelSeekBar component definition inserted just above the
//    WeddingGallery component.
// ─────────────────────────────────────────────────────────────────────────
applyReplace(
  'ReelSeekBar component definition',
  `export default function WeddingGallery() {`,
  `// Per-video seek bar for the Reels viewer — tap or drag to fast-forward or
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
        <div className="lux-reel-seek-fill"   style={{ width: \`\${progress * 100}%\` }} />
        <div className="lux-reel-seek-handle" style={{ left:  \`\${progress * 100}%\` }} />
      </div>
    </div>
  );
}

export default function WeddingGallery() {`
);

applyReplace(
  'Reels JSX — Prev/Next buttons, dataset index, seek bar',
  `        <div className="lux-reels-scroll" ref={reelContainerRef}>
          {reels.open && videos.map((vid, idx) => (
            <div className="lux-reel-slide" key={vid.id}>
              <video
                ref={el => (reelRefs.current[idx] = el)}
                src={vid.url}
                className="lux-reel-video"
                loop playsInline muted={reelMuted}
                preload="metadata"
                onClick={(e) => { e.target.paused ? e.target.play().catch(() => {}) : e.target.pause(); }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}`,
  `        <button
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
              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}`
);

if (changes < TOTAL) {
  console.error(`\n❌ Patch incomplete — only ${changes}/${TOTAL} sections matched. File NOT written.`);
  process.exitCode = 1;
  process.exit();
}

const output = usesCRLF ? content.replace(/\n/g, '\r\n') : content;
fs.writeFileSync(TARGET, output, 'utf8');

console.log(`\n🎉 Done! All ${TOTAL}/${TOTAL} sections patched successfully.`);
console.log('\nWhat changed:');
console.log('  • Reels: Prev/Next buttons + ↑/↓ keys on desktop, hidden on touch');
console.log('  • Reels: fast flick now sails past the next snap point instantly,');
console.log('    a slow/partial swipe still settles on the dominant video');
console.log('  • Reels: draggable gold seek bar on every video');
console.log('  • Lightbox: Facebook-style horizontal swipe on touch devices');
console.log('  • Lightbox: hardened full-viewport centering');
console.log('\nNext steps:');
console.log('  git add src/WeddingGallery.js');
console.log('  git commit -m "Pro Reels nav/seek + Facebook-style lightbox swipe"');
console.log('  git push');
