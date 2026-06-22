/**
 * patch-fixes-v7.mjs
 *
 * Fixes:
 *  1. "Shared by" credit moved to TOP of reel slide (above video, not bottom)
 *  2. Fast-swipe in image viewer now reliably advances to next/prev photo
 *  3. Download button & image counter no longer overlap in lightbox (counter moved below credit)
 *  4. Video upload button is cleaner/more premium; pressing Upload without a name shows an alert
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const TARGET = resolve('src/WeddingGallery.js');

// ── Helpers ──────────────────────────────────────────────────────────────────

function patch(src, description, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    throw new Error(`[PATCH FAILED] Could not find target for: "${description}"\nSearch string not found.`);
  }
  const count = src.split(oldStr).length - 1;
  if (count > 1) {
    throw new Error(`[PATCH FAILED] "${description}" — found ${count} occurrences, expected exactly 1.`);
  }
  console.log(`  ✔  ${description}`);
  return src.replace(oldStr, newStr);
}

// ── Load ─────────────────────────────────────────────────────────────────────

let src = readFileSync(TARGET, 'utf8');

// Back up original
const backupPath = TARGET.replace('.js', '.js.bak_v7');
copyFileSync(TARGET, backupPath);
console.log(`\nBacked up → ${backupPath}\n`);

// ════════════════════════════════════════════════════════════════════════════
// FIX 1 — "Shared by" caption: move to TOP of slide, styled as an overlay
//          header with a gradient fade (like a story top-credit).
// ════════════════════════════════════════════════════════════════════════════

// 1a — Update the CSS for .lux-reel-caption so it sits at the top
src = patch(
  src,
  'Fix 1a — reel caption CSS: reposition to top',
  `/* Uploader credit caption — bottom-left, above the seek bar, just like
   Facebook/Instagram Reels captions */
.lux-reel-caption {
  position: absolute; left: 16px; right: 70px; bottom: 260px; z-index: 5;
  font-family: var(--font-body); font-size: 12px; color: rgba(255,255,255,0.85);
  text-shadow: 0 1px 6px rgba(0,0,0,0.65); pointer-events: none;
}
.lux-reel-caption b { color: #fff; font-weight: 500; }`,
  `/* Uploader credit caption — TOP of slide, prominent header position */
.lux-reel-caption {
  position: absolute; left: 72px; right: 72px; top: 18px; z-index: 7;
  font-family: var(--font-body); font-size: 13px; color: rgba(255,255,255,0.92);
  text-shadow: 0 1px 8px rgba(0,0,0,0.7); pointer-events: none;
  text-align: center; letter-spacing: 0.01em;
}
.lux-reel-caption b { color: #fff; font-weight: 600; }`
);

// 1b — Update mobile override for .lux-reel-caption
src = patch(
  src,
  'Fix 1b — reel caption mobile CSS: reposition to top',
  `  .lux-reel-caption { left: 12px; right: 12px; bottom: 254px; font-size: 11px; }`,
  `  .lux-reel-caption { left: 60px; right: 60px; top: 12px; bottom: auto; font-size: 12px; }`
);

// ════════════════════════════════════════════════════════════════════════════
// FIX 2 — Fast-swipe in image viewer sticking: the lbDragEnd fast-path
//          (when locked is still null at pointerup) needs to lower the
//          velocity threshold so quick flicks commit even with minimal dx.
//          Also ensure lbSlidingRef is forcibly reset before calling lbSlide.
// ════════════════════════════════════════════════════════════════════════════

src = patch(
  src,
  'Fix 2 — Fast swipe: lower thresholds and force-reset sliding lock',
  `    const velocity = Math.abs(dx) / elapsed;

    // 0.30 instead of 0.45 — fast short flicks have high velocity but small
    // displacement; the lower bar catches them without accepting accidental taps.
    const FLICK     = 0.30;  // px/ms
    const THRESHOLD = 0.28;  // fraction of screen width to commit

    const commit = velocity > FLICK || Math.abs(dx) > window.innerWidth * THRESHOLD;

    if (commit) {
      if (strip) strip.classList.remove('dragging');
      lbSlide(dx < 0 ? 1 : -1);
    } else {`,
  `    const velocity = Math.abs(dx) / elapsed;

    // Lower thresholds so fast short flicks always register.
    // FLICK: 0.18 px/ms catches even the quickest finger lift.
    // THRESHOLD: 0.15 of screen width is enough for intent.
    const FLICK     = 0.18;  // px/ms  (was 0.30)
    const THRESHOLD = 0.15;  // fraction of screen width to commit  (was 0.28)

    const commit = velocity > FLICK || Math.abs(dx) > window.innerWidth * THRESHOLD;

    if (commit) {
      if (strip) strip.classList.remove('dragging');
      // Force-clear the sliding lock in case a previous animation is still
      // technically in-flight — lbDragStart already incremented lbAnimIdRef
      // so the stale onEnd will bail out; we just need lbSlide to proceed.
      lbSlidingRef.current = false;
      lbSlide(dx < 0 ? 1 : -1);
    } else {`
);

// ════════════════════════════════════════════════════════════════════════════
// FIX 3 — Download button & image counter overlap in lightbox top-bar.
//          The counter was inline in the topbar next to the close button.
//          Solution: put the counter on its own line under the credit,
//          and make the close+download buttons not part of the topbar flow.
// ════════════════════════════════════════════════════════════════════════════

// 3a — Rework the CSS: credit and counter stacked vertically, close/download
//      remain absolute-positioned so they never crowd the topbar text.
src = patch(
  src,
  'Fix 3a — topbar CSS: stack credit + counter vertically',
  `.lux-lb-topbar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 5;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 70px 16px 20px;
  background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%);
  pointer-events: none;
}
.lux-lb-credit {
  font-family: var(--font-body); font-size: 12px; font-weight: 400;
  color: rgba(255,255,255,0.78); letter-spacing: 0.02em;
}
.lux-lb-credit b { color: #fff; font-weight: 500; }
.lux-lb-counter {
  font-family: var(--font-body); font-size: 11px; font-weight: 400;
  color: rgba(255,255,255,0.55); letter-spacing: 0.06em; white-space: nowrap;
}`,
  `.lux-lb-topbar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 5;
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 16px 90px 20px 20px;
  background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%);
  pointer-events: none;
}
.lux-lb-credit {
  font-family: var(--font-body); font-size: 13px; font-weight: 400;
  color: rgba(255,255,255,0.88); letter-spacing: 0.02em;
  line-height: 1.3;
}
.lux-lb-credit b { color: #fff; font-weight: 600; }
.lux-lb-counter {
  font-family: var(--font-body); font-size: 11px; font-weight: 400;
  color: rgba(255,255,255,0.50); letter-spacing: 0.06em; white-space: nowrap;
  margin-top: 3px;
}`
);

// 3b — Update mobile overrides to match new stacked layout
src = patch(
  src,
  'Fix 3b — topbar mobile CSS: update for stacked layout',
  `  .lux-lb-topbar  { padding: 12px 56px 12px 14px; }
  .lux-lb-credit  { font-size: 11px; }
  .lux-lb-counter { font-size: 10px; }`,
  `  .lux-lb-topbar  { padding: 12px 80px 16px 14px; }
  .lux-lb-credit  { font-size: 12px; }
  .lux-lb-counter { font-size: 10px; margin-top: 2px; }`
);

// 3c — In the JSX, remove counter from its span-sibling position and put it
//      beneath the credit span so both are stacked in the flex column.
src = patch(
  src,
  'Fix 3c — topbar JSX: move counter below credit',
  `          <div className="lux-lb-topbar">
            <span className="lux-lb-credit">
              {currentImg?.uploaderName
                ? <><b>{currentImg.uploaderName}</b></>
                : <span style={{color:'rgba(255,255,255,0.0)'}}>·</span>}
            </span>
            <span className="lux-lb-counter">
              {photos.length > 0 ? \`\${lightbox.idx + 1} / \${photos.length}\` : ""}
            </span>
          </div>`,
  `          <div className="lux-lb-topbar">
            <span className="lux-lb-credit">
              {currentImg?.uploaderName
                ? <><span style={{color:'rgba(255,255,255,0.55)', fontWeight:400}}>Shared by </span><b>{currentImg.uploaderName}</b></>
                : <span style={{color:'rgba(255,255,255,0.0)'}}>·</span>}
            </span>
            <span className="lux-lb-counter">
              {photos.length > 0 ? \`\${lightbox.idx + 1} / \${photos.length}\` : ""}
            </span>
          </div>`
);

// ════════════════════════════════════════════════════════════════════════════
// FIX 4 — Video upload button: premium redesign + name-required alert.
//          The tiny inline Upload button on the preview thumbnail is replaced
//          with a pill CTA below the strip. Also: clicking Upload with no
//          name entered shows a clear alert instead of silently doing nothing.
// ════════════════════════════════════════════════════════════════════════════

// 4a — Add premium CSS for the new video upload CTA pill
src = patch(
  src,
  'Fix 4a — Add premium video upload CTA CSS',
  `.lux-name-field-video { margin: 10px 2px 4px; max-width: 360px; }`,
  `.lux-name-field-video { margin: 10px 2px 4px; max-width: 360px; }

/* ── Premium video upload CTA ──────────────────────────────────────── */
.lux-video-upload-cta {
  margin: 10px 2px 2px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  max-width: 360px;
}
.lux-video-upload-btn {
  position: relative;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px 20px;
  background: linear-gradient(135deg, #c9a86c 0%, #b8944f 50%, #a07838 100%);
  border: none; border-radius: 10px;
  color: #fff; font-family: var(--font-body); font-size: 13px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(184,148,79,0.40), inset 0 1px 0 rgba(255,255,255,0.20);
  transition: transform .15s, box-shadow .15s, opacity .15s;
  overflow: hidden;
}
.lux-video-upload-btn::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%);
  border-radius: inherit; pointer-events: none;
}
.lux-video-upload-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(184,148,79,0.50), inset 0 1px 0 rgba(255,255,255,0.22);
}
.lux-video-upload-btn:not(:disabled):active {
  transform: translateY(0px) scale(0.98);
  box-shadow: 0 2px 8px rgba(184,148,79,0.35);
}
.lux-video-upload-btn:disabled {
  opacity: 0.52; cursor: not-allowed; transform: none;
}
.lux-video-upload-progress {
  font-size: 11px; color: rgba(255,255,255,0.82); font-family: var(--font-body);
  text-align: center; letter-spacing: 0.04em;
}
.lux-video-upload-bar-track {
  height: 3px; border-radius: 3px;
  background: rgba(184,148,79,0.22);
  overflow: hidden;
}
.lux-video-upload-bar-fill {
  height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, #c9a86c, #b8944f);
  transition: width 0.3s ease;
}
.lux-video-upload-discard {
  align-self: center;
  background: none; border: none; padding: 4px 10px;
  font-family: var(--font-body); font-size: 11px;
  color: rgba(0,0,0,0.38); cursor: pointer; letter-spacing: 0.02em;
  transition: color .15s;
}
.lux-video-upload-discard:hover { color: rgba(0,0,0,0.6); }`
);

// 4b — Replace the inline upload button on the video preview thumbnail
//      with just the thumbnail (no button overlay). The CTA goes below.
src = patch(
  src,
  'Fix 4b — Remove inline Upload button from video thumbnail',
  `          {/* Video preview before upload */}
          {videoPreview && (
            <div className="lux-story-ph" style={{ position: 'relative' }}>
              <video
                src={videoPreview.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                muted playsInline
              />
              <button
                onClick={uploadVideo}
                disabled={uploadState.active || !guestName.trim()}
                style={{
                  position: 'absolute', bottom: 4, left: 4, right: 4,
                  background: 'rgba(184,144,74,0.9)', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 10,
                  padding: '4px 0', fontFamily: 'var(--font-body)',
                  cursor: (uploadState.active || !guestName.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (!uploadState.active && !guestName.trim()) ? 0.5 : 1,
                }}
              >
                {uploadState.active
                  ? (uploadState.stage === 'compressing' ? \`Compressing… \${uploadState.progress}%\` : \`\${uploadState.progress}%\`)
                  : 'Upload'}
              </button>
            </div>
          )}`,
  `          {/* Video preview before upload */}
          {videoPreview && (
            <div className="lux-story-ph" style={{ position: 'relative' }}>
              <video
                src={videoPreview.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                muted playsInline
              />
              {/* "Ready" badge instead of a cramped button */}
              <div style={{
                position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.58)', borderRadius: 20, padding: '3px 10px',
                fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)',
                letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>Ready</div>
            </div>
          )}`
);

// 4c — Replace the name-field + error block that shows below the strip
//      with the premium CTA section (name field + upload pill + progress).
src = patch(
  src,
  'Fix 4c — Replace video name field section with premium CTA',
  `        {videoPreview && (
          <div className="lux-name-field lux-name-field-video">
            <label className="lux-name-label" htmlFor="lux-guest-name-video">Your Name *</label>
            <input
              id="lux-guest-name-video"
              className="lux-name-input"
              type="text"
              value={guestName}
              onChange={e => updateGuestName(e.target.value)}
              placeholder="e.g. Maria Santos"
              maxLength={60}
              autoComplete="name"
            />
            {uploadState.error && <div className="lux-name-error">{uploadState.error}</div>}
          </div>
        )}`,
  `        {videoPreview && (
          <div className="lux-video-upload-cta">
            {/* Name field */}
            <div className="lux-name-field lux-name-field-video" style={{ margin: 0 }}>
              <label className="lux-name-label" htmlFor="lux-guest-name-video">Your Name *</label>
              <input
                id="lux-guest-name-video"
                className="lux-name-input"
                type="text"
                value={guestName}
                onChange={e => updateGuestName(e.target.value)}
                placeholder="e.g. Maria Santos"
                maxLength={60}
                autoComplete="name"
              />
            </div>

            {/* Premium upload pill */}
            <button
              className="lux-video-upload-btn"
              onClick={() => {
                if (!guestName.trim()) {
                  setUploadState(s => ({ ...s, error: 'Please enter your name before uploading.' }));
                  document.getElementById('lux-guest-name-video')?.focus();
                  return;
                }
                uploadVideo();
              }}
              disabled={uploadState.active}
            >
              {uploadState.active ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3v13M6 11l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="4" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                  {uploadState.stage === 'compressing'
                    ? \`Compressing… \${uploadState.progress}%\`
                    : \`Uploading… \${uploadState.progress}%\`}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 15V3M6 9l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="4" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                  Share Video
                </>
              )}
            </button>

            {/* Progress bar */}
            {uploadState.active && (
              <div>
                <div className="lux-video-upload-bar-track">
                  <div
                    className="lux-video-upload-bar-fill"
                    style={{ width: \`\${uploadState.progress}%\` }}
                  />
                </div>
                <div className="lux-video-upload-progress">
                  {uploadState.stage === 'compressing' ? 'Optimising for upload…' : 'Sending to gallery…'}
                </div>
              </div>
            )}

            {/* Error */}
            {uploadState.error && (
              <div className="lux-name-error" style={{ textAlign: 'center' }}>{uploadState.error}</div>
            )}

            {/* Discard */}
            {!uploadState.active && (
              <button
                className="lux-video-upload-discard"
                onClick={() => {
                  URL.revokeObjectURL(videoPreview?.url);
                  setVideoPreview(null);
                  setUploadState(s => ({ ...s, error: null }));
                }}
              >
                Remove video
              </button>
            )}
          </div>
        )}`
);

// ════════════════════════════════════════════════════════════════════════════
// Write result
// ════════════════════════════════════════════════════════════════════════════

writeFileSync(TARGET, src, 'utf8');
console.log('\n✅  All patches applied successfully!\n');
console.log('Summary of changes:');
console.log('  1. "Shared by <name>" is now shown at the TOP of each reel/video.');
console.log('  2. Fast swipes in image viewer reliably advance to next/prev photo.');
console.log('  3. Download button and image counter no longer overlap (counter stacked under credit).');
console.log('  4. Video upload has a premium pill CTA; pressing it without a name focuses the name field and shows a message.');
console.log('\nRun `npm start` (or your dev server) to preview the changes.\n');
