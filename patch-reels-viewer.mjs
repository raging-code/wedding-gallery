/**
 * patch-reels-viewer.mjs
 *
 * Adds a full-screen, vertical, swipeable video viewer (TikTok/Reels style)
 * to the wedding gallery:
 *   - Tapping a video in the "Swipe to watch" strip now opens a full-screen
 *     player instead of inline native controls.
 *   - Videos autoplay (muted by default) as they scroll into view, pause
 *     when they leave, and loop.
 *   - Swipe up/down (native scroll-snap) moves between videos.
 *   - Tap a video to pause/resume it; a mute/unmute button persists across
 *     swipes; a close (×) button returns to the gallery.
 *
 * Run from your project root:
 *   node patch-reels-viewer.mjs
 *
 * Then:
 *   git add src/WeddingGallery.js
 *   git commit -m "Add full-screen Reels-style video viewer"
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

if (content.includes('.lux-reels {')) {
  console.log('✅ Already patched — .lux-reels CSS found in WeddingGallery.js. Nothing to do.');
  process.exit();
}

let changes = 0;

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

// 1) Play-icon overlay CSS on story thumbnails
applyReplace(
  'story thumbnail play-icon CSS',
  `.lux-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
  background-size: 200%; animation: shimmer 3.8s ease-in-out infinite; pointer-events: none;
}

@media (min-width: 480px) {
  .lux-story-add, .lux-story-ph { width: 112px; height: 196px; }
}`,
  `.lux-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
  background-size: 200%; animation: shimmer 3.8s ease-in-out infinite; pointer-events: none;
}

/* Play-icon overlay on video story thumbnails */
.lux-story-play {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.lux-story-play::before {
  content: '';
  position: absolute; width: 38px; height: 38px; border-radius: 50%;
  background: rgba(0,0,0,0.32); border: 0.5px solid rgba(255,255,255,0.5);
}
.lux-story-play svg { position: relative; z-index: 1; margin-left: 2px; }

@media (min-width: 480px) {
  .lux-story-add, .lux-story-ph { width: 112px; height: 196px; }
}`
);

// 2) Full-screen Reels viewer CSS
applyReplace(
  'Reels viewer CSS',
  `/* ── Touch devices: fix hover-only states ────────────────────────────────── */
@media (hover: none) {

  /* Photo hover overlay never fires on touch — hide it */
  .lux-photo-hover { opacity: 0 !important; }

  /* Selection mode: always show checkboxes so guests can tap-to-select */
  .lux-selection-mode .lux-photo-item .lux-select-check { opacity: 1; }
}

\``,
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
}

\``
);

// 3) State + refs
applyReplace(
  'reels state declarations',
  `  const [lightbox, setLightbox]     = useState({ open: false, idx: 0, zoomed: false });
  const fileInputRef     = useRef(null);
  const videoInputRef    = useRef(null);`,
  `  const [lightbox, setLightbox]     = useState({ open: false, idx: 0, zoomed: false });
  const [reels, setReels]           = useState({ open: false, idx: 0 });
  const [reelMuted, setReelMuted]   = useState(true);
  const fileInputRef     = useRef(null);
  const videoInputRef    = useRef(null);
  const reelRefs          = useRef([]);
  const reelContainerRef  = useRef(null);`
);

// 4) Effects: escape-to-close, scroll-to-tapped-video, IntersectionObserver autoplay
applyReplace(
  'reels effects (escape / scroll-to / autoplay observer)',
  `  }, [lightbox, photos.length]);`,
  `  }, [lightbox, photos.length]);

  // Reels: Escape closes the viewer
  useEffect(() => {
    if (!reels.open) return;
    const handler = (e) => {
      if (e.key === "Escape") setReels(r => ({ ...r, open: false }));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reels.open]);

  // Reels: jump straight to the tapped video, no scroll animation
  useEffect(() => {
    if (!reels.open) return;
    requestAnimationFrame(() => {
      const el = reelRefs.current[reels.idx];
      el?.closest(".lux-reel-slide")?.scrollIntoView({ block: "start" });
    });
  }, [reels.open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reels: autoplay whichever video is actually in view, pause the rest
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
  }, [reels.open, videos.length]);`
);

// 5) Helper functions
applyReplace(
  'openReels / closeReels helpers',
  `  function openLightbox(idx) {`,
  `  function openReels(idx) {
    setReels({ open: true, idx });
  }

  function closeReels() {
    reelRefs.current.forEach(v => v && v.pause());
    setReels(r => ({ ...r, open: false }));
  }

  function openLightbox(idx) {`
);

// 6) Story strip: remove native controls, add tap-to-open play icon
applyReplace(
  'story strip thumbnail markup',
  `          {!videosLoading && videos.map(vid => (
            <div className="lux-story-ph" key={vid.id} style={{ cursor: 'pointer' }}>
              <video
                src={vid.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                controls muted playsInline
                preload="metadata"
              />
            </div>
          ))}`,
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
                  <path d="M5 3.5v9l8-4.5-8-4.5z" fill="#fff" />
                </svg>
              </div>
            </div>
          ))}`
);

// 7) Reels viewer markup, inserted right after the Lightbox
applyReplace(
  'Reels viewer JSX',
  `        <div className="lux-lb-filmstrip">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className={\`lux-lb-thumb\${lightbox.idx === idx ? " active" : ""}\`}
              onClick={() => setLightbox(l => ({ ...l, idx, zoomed: false }))}
            >
              <img src={photo.url} alt="" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}`,
  `        <div className="lux-lb-filmstrip">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className={\`lux-lb-thumb\${lightbox.idx === idx ? " active" : ""}\`}
              onClick={() => setLightbox(l => ({ ...l, idx, zoomed: false }))}
            >
              <img src={photo.url} alt="" />
            </div>
          ))}
        </div>
      </div>

      {/* REELS — full-screen vertical video viewer (TikTok/Reels style) */}
      <div className={\`lux-reels\${reels.open ? " open" : ""}\`}>
        <button className="lux-reels-close" onClick={closeReels} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="lux-reels-mute"
          onClick={() => setReelMuted(m => !m)}
          aria-label={reelMuted ? "Unmute" : "Mute"}
        >
          {reelMuted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
              <line x1="16" y1="8" x2="22" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="22" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
              <path d="M16.5 8.5a5 5 0 010 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <path d="M19 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
          )}
        </button>
        <div className="lux-reels-scroll" ref={reelContainerRef}>
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
}`
);

if (changes < 7) {
  console.error(`\n❌ Patch incomplete — only ${changes}/7 sections matched. File NOT written.`);
  process.exitCode = 1;
  process.exit();
}

const output = usesCRLF ? content.replace(/\n/g, '\r\n') : content;
fs.writeFileSync(TARGET, output, 'utf8');

console.log(`\n🎉 Done! All 7 sections patched successfully.`);
console.log('\nNext steps:');
console.log('  git add src/WeddingGallery.js');
console.log('  git commit -m "Add full-screen Reels-style video viewer"');
console.log('  git push');
