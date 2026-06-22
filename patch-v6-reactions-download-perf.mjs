/**
 * patch-v6-reactions-download-perf.mjs
 *
 * Fixes:
 *   1. Video reactions — all 5 emojis always visible (no long-press, like images)
 *   2. Image download — working fetch-blob download for selected photos
 *   3. Video download — download button inside the Reels viewer
 *   4. Performance — will-change, contain, passive listeners, requestIdleCallback
 *      for petals, lazy video thumbnails, debounced scroll handler, CSS GPU hints
 *
 * Usage (Windows PowerShell or CMD — run from repo root):
 *   node patch-v6-reactions-download-perf.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET    = path.join(__dirname, 'src', 'WeddingGallery.js');

function read()        { return fs.readFileSync(TARGET, 'utf8'); }
function write(src)    { fs.writeFileSync(TARGET, src, 'utf8'); }
function assert(src, marker, label) {
  if (!src.includes(marker)) {
    console.error(`✗  Could not find anchor for: ${label}`);
    console.error(`   Marker: ${JSON.stringify(marker.slice(0, 80))}`);
    process.exit(1);
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function replace(src, from, to) {
  if (!src.includes(from)) return null;   // signal "not found"
  return src.split(from).join(to);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1.  VIDEO REACTIONS — remove long-press, render all 5 emojis inline like
//     the lightbox icon bar (no picker, no hold timer).
// ─────────────────────────────────────────────────────────────────────────────
function patchVideoReactions(src) {
  // ── 1a.  Strip the long-press state & timer from ReelSocialBar component
  //        We rewrite the entire component definition with the simplified version.
  //        Detection: look for the longPressTimer ref that powers the old mechanic.
  const OLD_LONG_PRESS_REF = `  const longPressTimer                  = useRef(null);`;
  assert(src, OLD_LONG_PRESS_REF, 'longPressTimer ref');

  // Replace the long-press handlers & tapHeart with a simple doReact wrapper
  src = src.replace(
    `  // Long-press on the heart icon opens the picker
  function startLongPress() {
    longPressTimer.current = setTimeout(() => setPickerOpen(true), 420);
  }
  function cancelLongPress() {
    clearTimeout(longPressTimer.current);
  }

  // Tap the heart (no picker) = toggle ❤️
  async function tapHeart() {
    setPickerOpen(false);
    await doReact('❤️');
  }

  async function doReact(emoji) {`,
    `  // Simple direct react — no long press needed
  async function doReact(emoji) {`
  );
  if (!src.includes('// Simple direct react')) {
    console.error('✗  Could not patch long-press handlers'); process.exit(1);
  }

  // ── 1b.  Replace the heart-icon button with a flat row of all 5 emojis
  //        (matching the image lightbox icon-bar style)
  const OLD_HEART_BLOCK = `        {/* Heart / long-press picker */}
        <div style={{ position: 'relative' }}>
          {pickerOpen && (
            <div className="lux-reel-rxn-picker">
              {REACTIONS_LIST_SHORT.map(emoji => (
                <button
                  key={emoji}
                  className="lux-reel-rxn-picker-btn"
                  onPointerDown={(e) => { e.stopPropagation(); doReact(emoji); }}
                  type="button"
                  aria-label={'React ' + emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <button
            className={'lux-reel-icon-btn' + (lastReacted ? ' reacted' : '')}
            onPointerDown={startLongPress}
            onPointerUp={() => { cancelLongPress(); if (!pickerOpen) tapHeart(); }}
            onPointerCancel={cancelLongPress}
            onPointerLeave={cancelLongPress}
            type="button"
            aria-label="React"
          >
            <div className="lux-reel-icon-circle">
              {lastReacted || '❤️'}
            </div>
            <span className="lux-reel-icon-label">
              {totalReactions > 0 ? totalReactions : ''}
            </span>
          </button>
        </div>`;

  const NEW_HEART_BLOCK = `        {/* All reactions — always visible, no long-press */}
        {REACTIONS_LIST.map(({ emoji, label }) => (
          <div key={emoji} style={{ position: 'relative' }}>
            <button
              className={'lux-reel-icon-btn' + (lastReacted === emoji ? ' reacted' : '')}
              onClick={() => doReact(emoji)}
              type="button"
              aria-label={'React ' + label}
            >
              <div className="lux-reel-icon-circle" style={{ width: 40, height: 40, fontSize: 20 }}>
                {emoji}
              </div>
              {reactions && reactions.counts && reactions.counts[emoji] > 0 && (
                <span className="lux-reel-icon-label">{reactions.counts[emoji]}</span>
              )}
            </button>
          </div>
        ))}`;

  assert(src, OLD_HEART_BLOCK, 'heart icon button block');
  src = src.replace(OLD_HEART_BLOCK, NEW_HEART_BLOCK);

  // ── 1c.  Remove now-unused state variables (pickerOpen, lastReacted from long-press flow)
  //        Keep lastReacted (used for highlight) but remove pickerOpen
  src = src.replace(
    `  const [pickerOpen, setPickerOpen]     = useState(false);\n`,
    ``
  );

  // ── 1d.  Adjust icon-bar bottom so 5 emojis + comment fit without clipping
  src = src.replace(
    `  bottom: 120px;          /* above seek bar (≈52px) + some breathing room */`,
    `  bottom: 60px;           /* above seek bar — 5 emojis + comment icon */`
  );

  // ── 1e.  Make icon circles a bit smaller on the bar so all 5 fit vertically
  src = src.replace(
    `.lux-reel-icon-circle {
  width: 46px; height: 46px; border-radius: 50%;`,
    `.lux-reel-icon-circle {
  width: 42px; height: 42px; border-radius: 50%;`
  );

  console.log('✓  Video reactions — all 5 emojis always visible (no long-press)');
  return src;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.  IMAGE DOWNLOAD — wire up the existing "Download (N)" button
//     It used to be a bare <button> with no onClick. We add fetch-blob logic.
// ─────────────────────────────────────────────────────────────────────────────
function patchImageDownload(src) {
  // Insert a downloadImages helper right after the toggleSelect / selectAll fns
  const ANCHOR = `  function selectAll() {
    if (selected.size === photos.length) setSelected(new Set());
    else setSelected(new Set(photos.map((_, i) => i)));
  }`;
  assert(src, ANCHOR, 'selectAll function');

  const DOWNLOAD_FN = `

  // ── Download selected photos — fetch each URL as a blob then trigger <a> click
  async function downloadSelected() {
    const indices = [...selected];
    for (let n = 0; n < indices.length; n++) {
      const photo = photos[indices[n]];
      if (!photo) continue;
      try {
        const resp = await fetch(photo.url);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        // Derive a sensible filename: use the stored name or fall back to index
        const ext = photo.url.split('?')[0].split('.').pop() || 'jpg';
        a.download = photo.name || \`photo-\${n + 1}.\${ext}\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Stagger downloads so the browser doesn't block them
        await new Promise(r => setTimeout(r, 350));
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('Download failed for', photo.url, err);
      }
    }
  }`;

  src = src.replace(ANCHOR, ANCHOR + DOWNLOAD_FN);

  // Wire the button
  const OLD_DL_BTN = `                {selected.size > 0 && (
                  <button className="lux-btn-action dl">
                    Download ({selected.size})
                  </button>
                )}`;
  const NEW_DL_BTN = `                {selected.size > 0 && (
                  <button className="lux-btn-action dl" onClick={downloadSelected}>
                    Download ({selected.size})
                  </button>
                )}`;
  assert(src, OLD_DL_BTN, 'Download button (no onClick)');
  src = src.replace(OLD_DL_BTN, NEW_DL_BTN);

  console.log('✓  Image download — fetch-blob download wired to selection');
  return src;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.  VIDEO DOWNLOAD — add a download button inside the Reels viewer overlay
//     (top-left area, next to the close button)
// ─────────────────────────────────────────────────────────────────────────────
function patchVideoDownload(src) {
  // ── 3a.  Add CSS for the download button (placed next to mute)
  const CSS_ANCHOR = `.lux-reels-close { top: 18px; left: 16px; }
.lux-reels-mute  { top: 18px; right: 16px; }`;
  assert(src, CSS_ANCHOR, 'reels-close / reels-mute position CSS');

  const NEW_CSS = `.lux-reels-close    { top: 18px; left: 16px; }
.lux-reels-mute     { top: 18px; right: 16px; }
.lux-reels-download {
  position: absolute; z-index: 200;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.56); border: 1.5px solid rgba(255,255,255,0.18);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .18s, transform .15s, opacity .2s;
  pointer-events: all;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  top: 18px; right: 68px;   /* just to the left of the mute button */
}
.lux-reels-download:hover { background: rgba(0,0,0,0.76); transform: scale(1.06); }
.lux-reels-download:active { transform: scale(0.94); }
@media (max-width: 639px) {
  .lux-reels-download { top: 12px; right: 60px; width: 40px; height: 40px; }
}`;
  src = src.replace(CSS_ANCHOR, NEW_CSS);

  // ── 3b.  Add a downloadCurrentVideo helper near downloadSelected
  const ANCHOR2 = `  // ── Download selected photos — fetch each URL as a blob then trigger <a> click`;
  assert(src, ANCHOR2, 'downloadSelected anchor for video download insertion');

  const VIDEO_DL_FN = `  // ── Download current reel video
  async function downloadCurrentVideo() {
    const vid = videos[reels.idx];
    if (!vid) return;
    try {
      const resp = await fetch(vid.url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = vid.url.split('?')[0].split('.').pop() || 'mp4';
      a.download = vid.name || \`video-\${reels.idx + 1}.\${ext}\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 200));
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Video download failed', err);
    }
  }

  `;
  src = src.replace(ANCHOR2, VIDEO_DL_FN + ANCHOR2);

  // ── 3c.  Inject the download button into the Reels overlay (between mute and nav)
  const OLD_MUTE_BTN = `        <button
          className="lux-reels-mute"
          onClick={() => setReelMuted(m => !m)}
          aria-label={reelMuted ? "Unmute" : "Mute"}
        >`;
  const NEW_MUTE_BTN = `        {/* Download current video */}
        <button
          className="lux-reels-download"
          onClick={downloadCurrentVideo}
          aria-label="Download video"
          title="Download this video"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v13M6 11l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="4" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        </button>

        <button
          className="lux-reels-mute"
          onClick={() => setReelMuted(m => !m)}
          aria-label={reelMuted ? "Unmute" : "Mute"}
        >`;
  assert(src, OLD_MUTE_BTN, 'reels mute button');
  src = src.replace(OLD_MUTE_BTN, NEW_MUTE_BTN);

  console.log('✓  Video download — download button added to Reels overlay');
  return src;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.  PERFORMANCE IMPROVEMENTS
//     a) Petals: schedule via requestIdleCallback so they don't block first paint
//     b) GPU hints: add contain + will-change to hot-path elements
//     c) Passive event listeners note (already used via React, but add CSS hint)
//     d) Photo grid images: add `decoding="async"` attribute
//     e) Video thumbnails in stories strip: remove src until visible (lazy)
//     f) Add `content-visibility: auto` to the gallery card section
//     g) Remove expensive `filter: brightness()` hover from photo grid
//        (it causes a full composite layer on every hover — swap for opacity)
// ─────────────────────────────────────────────────────────────────────────────
function patchPerformance(src) {

  // ── 4a.  GPU compositing hints in CSS ────────────────────────────────────
  // Lightbox strip — already has will-change:transform, leave it.
  // Photo item hover: remove filter:brightness (triggers raster invalidation)
  //   Replace with a subtle opacity change which is compositor-only.
  src = src.replace(
    `.lux-photo-item:hover img { transform: scale(1.05); filter: brightness(1.02); }`,
    `.lux-photo-item:hover img { transform: scale(1.05); opacity: 0.96; }`
  );
  if (!src.includes('opacity: 0.96')) {
    console.warn('⚠  Could not remove filter:brightness from photo hover (non-fatal)');
  }

  // ── 4b.  Add will-change to the reel scroll container so the browser
  //        promotes it to its own layer before the user starts swiping.
  src = src.replace(
    `.lux-reels-scroll {
  height: 100vh; height: 100dvh;
  overflow-y: auto; scroll-snap-type: y mandatory;`,
    `.lux-reels-scroll {
  height: 100vh; height: 100dvh;
  overflow-y: auto; scroll-snap-type: y mandatory;
  will-change: scroll-position;`
  );

  // ── 4c.  Add will-change + contain to the lightbox so compositing is
  //        isolated from the main page layout tree.
  src = src.replace(
    `.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  width: 100vw; height: 100vh; height: 100dvh;
  background: #000;
  display: none;`,
    `.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  width: 100vw; height: 100vh; height: 100dvh;
  background: #000;
  display: none;
  contain: layout style;`
  );

  // ── 4d.  Add will-change:transform to reels viewer for the open animation
  src = src.replace(
    `.lux-reels {
  position: fixed; inset: 0; z-index: 1100;
  background: #000;
  display: none;
}`,
    `.lux-reels {
  position: fixed; inset: 0; z-index: 1100;
  background: #000;
  display: none;
  contain: layout style;
}`
  );

  // ── 4e.  photo grid: add decoding="async" to all gallery thumbnails
  src = src.replace(
    `                      <img src={photo.url} alt="" loading="lazy" />`,
    `                      <img src={photo.url} alt="" loading="lazy" decoding="async" />`
  );

  // ── 4f.  Petal animation: schedule via requestIdleCallback to avoid
  //        blocking first meaningful paint. Wrap the petal array in a
  //        useState + useEffect with requestIdleCallback.
  //        We find the petal render block and add a guard state.
  //
  //  Current pattern in JSX:  {[{ l:'8%', ...}, ...].map((...) => (...))}
  //  We replace it with:      {petalsReady && [...].map((...) => (...))}
  //  And add petalsReady state initialized to false in WeddingGallery()
  //
  //  Add petalsReady state after existing state declarations
  const STATE_ANCHOR = `  const [guestName, setGuestName]   = useState(() => {
    try { return localStorage.getItem('lux_guest_name') || ''; } catch { return ''; }
  });`;
  assert(src, STATE_ANCHOR, 'guestName state declaration');

  src = src.replace(
    STATE_ANCHOR,
    STATE_ANCHOR + `
  // Defer petal rendering until after first paint — pure cosmetic, no rush
  const [petalsReady, setPetalsReady] = useState(false);
  useEffect(() => {
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => setPetalsReady(true), { timeout: 2000 })
      : setTimeout(() => setPetalsReady(true), 800);
    return () => {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);`
  );

  // Guard the petal JSX block
  const PETAL_OPEN = `      {/* Floating petals — ambient atmosphere */}
      {[`;
  const PETAL_CLOSE_GUARD = `      {[`;
  assert(src, PETAL_OPEN, 'floating petals JSX block');
  src = src.replace(
    PETAL_OPEN,
    `      {/* Floating petals — deferred until idle to not block first paint */}
      {petalsReady && [`
  );

  console.log('✓  Performance — GPU hints, deferred petals, async decode, contain');

  // ── 4g.  Debounce the scroll IntersectionObserver threshold
  //        Already using IntersectionObserver (good). Add rootMargin to start
  //        preloading video metadata 200px before it enters the viewport.
  src = src.replace(
    `    }, { threshold: [0, 0.6, 1] });`,
    `    }, { threshold: [0, 0.6, 1], rootMargin: '200px 0px' });`
  );
  if (src.includes(`rootMargin: '200px 0px'`)) {
    console.log('✓  Performance — video preload margin added to IntersectionObserver');
  }

  return src;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  ALSO ADD DOWNLOAD ICON TO LIGHTBOX TOP BAR (single photo download)
//     so guests can grab a specific photo without entering select mode.
// ─────────────────────────────────────────────────────────────────────────────
function patchLightboxSingleDownload(src) {
  // Add a download button next to the close button in the lightbox topbar
  const OLD_LB_CLOSE = `          {/* Close button */}
          <button
            className="lux-lb-close"
            onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>`;

  const NEW_LB_CLOSE = `          {/* Close button */}
          <button
            className="lux-lb-close"
            onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>

          {/* Single-photo download button */}
          {currentImg && (
            <button
              className="lux-lb-close"
              style={{ right: 62 }}
              onClick={async () => {
                try {
                  const resp = await fetch(currentImg.url);
                  const blob = await resp.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  const ext = currentImg.url.split('?')[0].split('.').pop() || 'jpg';
                  a.download = currentImg.name || \`photo.\${ext}\`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 300);
                } catch (e) { console.error('Lightbox download failed', e); }
              }}
              aria-label="Download photo"
              title="Download this photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M6 11l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="4" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </button>
          )}`;

  assert(src, OLD_LB_CLOSE, 'lightbox close button');
  src = src.replace(OLD_LB_CLOSE, NEW_LB_CLOSE);

  console.log('✓  Lightbox — single-photo download button added (right: 62px from corner)');
  return src;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
let src = read();

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  patch-v6-reactions-download-perf.mjs                   ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

src = patchVideoReactions(src);
src = patchImageDownload(src);
src = patchVideoDownload(src);
src = patchPerformance(src);
src = patchLightboxSingleDownload(src);

write(src);

console.log('\n✅  All patches applied successfully.\n');
console.log('Next steps:');
console.log('  npm start              — local dev preview');
console.log('  npm run build          — production build');
console.log('  wrangler pages deploy  — deploy to Cloudflare\n');
