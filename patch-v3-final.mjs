/**
 * patch-v3-final.mjs
 * Fixes: (1) swipe shows black instead of next photo
 *         (2) reels social panel covers mute button
 *         (3) reactions.js worker allowlist is stale
 *
 * Run from your project root:
 *   node patch-v3-final.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const GALLERY = join(ROOT, 'src', 'WeddingGallery.js');
const REACTIONS_WORKER = join(ROOT, 'functions', 'api', 'reactions.js');

// ── guard ─────────────────────────────────────────────────────────────────────
if (!existsSync(GALLERY)) {
  console.error('ERROR: src/WeddingGallery.js not found. Run from project root.');
  process.exit(1);
}

// ── helper ────────────────────────────────────────────────────────────────────
function applyPatch(label, file, search, replacement) {
  let src = readFileSync(file, 'utf8');
  if (!src.includes(search)) {
    if (src.includes(replacement.slice(0, 60))) {
      console.log(`  ✓ ${label} — already applied, skipping`);
      return;
    }
    console.error(`  ✗ ${label} — anchor not found! Check the file has not changed.`);
    process.exit(1);
  }
  writeFileSync(file, src.replace(search, replacement), 'utf8');
  console.log(`  ✓ ${label}`);
}

console.log('\n🔧  Applying patch-v3-final …\n');

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 1 — reactions.js worker: update allowed emoji set
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'Worker: update ALLOWED_REACTIONS to match new emoji set',
  REACTIONS_WORKER,
  "const ALLOWED_REACTIONS = new Set(['❤️', '👏', '💍', '😍', '🥂']);",
  "const ALLOWED_REACTIONS = new Set(['❤️', '🌸', '🥂', '😂', '💍']);"
);

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 2 — Add lightbox strip CSS for proper swipe animation
//           Replaces the single .lux-lb-img rule with a three-slide strip
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS: lightbox strip (3-slide prev/current/next)',
  GALLERY,
  `/* Full-bleed canvas — fills the entire viewport edge to edge.
   object-fit:contain on the <img> does the letterboxing, so any blank
   space left by the image's own aspect ratio is just the lightbox's black
   background showing through — exactly how Facebook/Google Photos render
   full-screen media, and the image is always perfectly centered. */
.lux-lb-img-wrap {
  width: 100vw; height: 100vh; height: 100dvh;
  display: flex; align-items: center; justify-content: center;
  position: relative; touch-action: pan-y;
}
.lux-lb-img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  transition: transform .4s var(--ease-cinematic);
  will-change: transform; user-select: none; -webkit-user-drag: none;
}
.lux-lb-img.zoomed   { transform: scale(2.2); }
.lux-lb-img.dragging { transition: none; }`,

  `/* ── Lightbox image strip — three slides side-by-side (prev · cur · next)
   Swiping moves the whole strip, so you always see the adjacent photo
   sliding in from the edge — exactly like Instagram / Facebook web viewer. */
.lux-lb-img-wrap {
  /* Fill the full image pane; the strip inside scrolls horizontally */
  width: 100%; height: 100%;
  overflow: hidden;
  position: relative;
  touch-action: pan-y;
}
/* The strip: three 100%-wide slots laid out in a row */
.lux-lb-strip {
  display: flex;
  width: 300%;       /* 3 × 100% = room for prev + current + next */
  height: 100%;
  /* While not dragging, snap back to the center slot with a nice ease */
  transform: translateX(-33.3333%); /* start centred on the middle (current) */
  will-change: transform;
  transition: transform .32s cubic-bezier(0.22, 1, 0.36, 1);
}
.lux-lb-strip.dragging { transition: none; }
/* Each slot is exactly 1/3 of the strip = 100vw of the image pane */
.lux-lb-slot {
  width: 33.3333%;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  height: 100%;
  background: #000;
}
.lux-lb-slot img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  user-select: none; -webkit-user-drag: none;
  display: block;
}
/* Zoom: applied to the centre slot's image only */
.lux-lb-slot.current img.zoomed { transform: scale(2.2); transition: transform .4s var(--ease-cinematic); }
/* Legacy single-image class kept for safety (no longer rendered) */
.lux-lb-img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }`
);

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 3 — Reels SocialPanel: Facebook Reels style
//           Replace always-visible inline panel with a right-side icon bar
//           that expands into a bottom sheet when tapped
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS: reels social — right-side icon bar + expandable bottom sheet',
  GALLERY,
  `/* ── REELS — full-screen vertical video viewer (TikTok/Reels style) ───────── */`,
  `/* ── REELS RIGHT-SIDE ICON BAR (Facebook Reels style) ─────────────────────── */

/* Container — right edge, vertically centred, never covers mute/close */
.lux-reel-icon-bar {
  position: absolute;
  right: 14px;
  bottom: 120px;          /* above seek bar (≈52px) + some breathing room */
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  pointer-events: none;   /* bar itself is transparent to touches … */
}
.lux-reel-icon-btn {
  pointer-events: all;    /* … but each button is individually tappable */
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: none; border: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.lux-reel-icon-circle {
  width: 46px; height: 46px; border-radius: 50%;
  background: rgba(0,0,0,0.45);
  border: 1.5px solid rgba(255,255,255,0.18);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; line-height: 1;
  color: #fff;
  transition: background .18s, transform .15s;
  -webkit-tap-highlight-color: transparent;
}
.lux-reel-icon-btn:active .lux-reel-icon-circle {
  transform: scale(0.88);
  background: rgba(255,255,255,0.16);
}
.lux-reel-icon-btn.reacted .lux-reel-icon-circle {
  background: rgba(255,80,120,0.35);
  border-color: rgba(255,100,140,0.50);
  animation: reelReactPop .3s cubic-bezier(0.34,1.56,0.64,1) both;
}
@keyframes reelReactPop {
  0%   { transform: scale(1); }
  45%  { transform: scale(1.38); }
  70%  { transform: scale(0.90); }
  100% { transform: scale(1.12); }
}
.lux-reel-icon-label {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 500;
  color: rgba(255,255,255,0.85);
  text-shadow: 0 1px 4px rgba(0,0,0,0.7);
  white-space: nowrap;
}

/* Long-press reaction picker — appears above the heart icon */
.lux-reel-rxn-picker {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  display: flex; gap: 7px; align-items: center;
  background: rgba(20,20,20,0.90);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 999px;
  padding: 8px 12px;
  pointer-events: all;
  animation: pickerPop .2s cubic-bezier(0.34,1.56,0.64,1) both;
  white-space: nowrap;
}
@keyframes pickerPop {
  from { opacity: 0; transform: scale(0.7) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.lux-reel-rxn-picker-btn {
  background: none; border: none; cursor: pointer; padding: 2px;
  font-size: 26px; line-height: 1;
  transition: transform .15s;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.lux-reel-rxn-picker-btn:active { transform: scale(1.35); }

/* Comment bottom sheet for reels — slides up from bottom */
.lux-reel-comment-sheet {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  z-index: 20;
  background: rgba(12,12,12,0.95);
  border-top: 1px solid rgba(255,255,255,0.10);
  border-radius: 18px 18px 0 0;
  padding: 16px 16px 32px;
  max-height: 65vh;
  overflow-y: auto;
  animation: sheetUp .28s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes sheetUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.lux-reel-comment-sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.22);
  margin: 0 auto 14px;
}
.lux-reel-sheet-close {
  position: absolute; top: 14px; right: 16px;
  background: none; border: none; color: rgba(255,255,255,0.55);
  font-size: 20px; cursor: pointer; line-height: 1;
  -webkit-tap-highlight-color: transparent;
}

/* ── REELS — full-screen vertical video viewer (TikTok/Reels style) ───────── */`
);

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 4 — New ReelSocialBar component (replaces inline SocialPanel in reels)
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'JS: add ReelSocialBar component (Facebook Reels icon bar + sheet)',
  GALLERY,
  `/** List media from all buckets via our server-side Function */`,
  `// ── ReelSocialBar ────────────────────────────────────────────────────────────
// Facebook-Reels style: right-side icon bar with heart (long-press = picker)
// and comment icon. Comment icon opens a sliding bottom sheet.
const REACTIONS_LIST_SHORT = ['❤️', '🌸', '🥂', '😂', '💍'];

function ReelSocialBar({ mediaKey, guestName, onNameSaved }) {
  const [reactions, setReactions]       = useState(null);
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [lastReacted, setLastReacted]   = useState(null);
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [comments, setComments]         = useState(null);
  const [newComment, setNewComment]     = useState('');
  const [sending, setSending]           = useState(false);
  const [localName, setLocalName]       = useState(() => (guestName || '').trim() || getStoredName());
  const [editingName, setEditingName]   = useState(false);
  const longPressTimer                  = useRef(null);

  // Sync name from parent
  useEffect(() => {
    const best = (guestName || '').trim() || getStoredName();
    if (best && !localName) setLocalName(best);
  }, [guestName]); // eslint-disable-line

  useEffect(() => {
    if (!mediaKey) return;
    setReactions(null); setComments(null);
    fetchReactions(mediaKey).then(setReactions);
    fetchComments(mediaKey).then(d => setComments(d.comments || []));
  }, [mediaKey]);

  // Long-press on the heart icon opens the picker
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

  async function doReact(emoji) {
    if (!mediaKey) return;
    setLastReacted(emoji);
    setPickerOpen(false);
    try {
      const updated = await postReaction(mediaKey, emoji);
      setReactions(updated);
    } catch {}
  }

  function commitName(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLocalName(trimmed); saveStoredName(trimmed); setEditingName(false);
    if (onNameSaved) onNameSaved(trimmed);
  }

  async function handleComment() {
    const name = localName.trim();
    const body = newComment.trim();
    if (!name || !body || !mediaKey) return;
    setSending(true);
    try {
      const { comment } = await postComment(mediaKey, name, body);
      setComments(prev => [...(prev || []), comment]);
      setNewComment('');
    } catch {} finally { setSending(false); }
  }

  const totalReactions = reactions ? Object.values(reactions.counts || {}).reduce((a, b) => a + b, 0) : 0;
  const commentCount   = (comments || []).length;
  const authorName     = localName.trim();

  return (
    <>
      {/* Right-side icon bar */}
      <div className="lux-reel-icon-bar">

        {/* Heart / long-press picker */}
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
        </div>

        {/* Comment icon */}
        <button
          className="lux-reel-icon-btn"
          onClick={() => { setSheetOpen(v => !v); setPickerOpen(false); }}
          type="button"
          aria-label="Comments"
        >
          <div className="lux-reel-icon-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h14l4 4V4a2 2 0 00-2-2z"
                stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <span className="lux-reel-icon-label">
            {commentCount > 0 ? commentCount : ''}
          </span>
        </button>

      </div>

      {/* Comment bottom sheet */}
      {sheetOpen && (
        <div className="lux-reel-comment-sheet" onClick={e => e.stopPropagation()}>
          <div className="lux-reel-comment-sheet-handle" />
          <button
            className="lux-reel-sheet-close"
            onClick={() => setSheetOpen(false)}
            type="button"
          >✕</button>

          {/* Comments list */}
          {comments !== null && commentCount > 0 && (
            <div style={{ marginBottom: 14 }}>
              {comments.map(c => (
                <div key={c.id} className="lux-comment" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <div className="lux-comment-avatar">{(c.author_name || '?')[0].toUpperCase()}</div>
                  <div className="lux-comment-content">
                    <span className="lux-comment-author">{c.author_name}</span>
                    <span className="lux-comment-body">{c.body}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {comments !== null && commentCount === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 14 }}>
              No comments yet — be the first!
            </p>
          )}

          {/* Name field */}
          {(!authorName || editingName) && (
            <div style={{ marginBottom: 8 }}>
              <input
                className="lux-comment-input"
                placeholder="Your name (required)…"
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={e => { if (e.target.value.trim()) commitName(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitName(localName); } }}
                autoComplete="name"
              />
            </div>
          )}
          {authorName && !editingName && (
            <div className="lux-comment-name-tag" style={{ marginBottom: 8 }}>
              <span className="lux-comment-posting-as">Posting as <b>{authorName}</b></span>
              <button className="lux-comment-change-name" onClick={() => setEditingName(true)} type="button">Change</button>
            </div>
          )}

          {/* Comment input */}
          <div className="lux-comment-input-row">
            <input
              className="lux-comment-input"
              placeholder={authorName ? 'Add a comment…' : 'Enter your name above first…'}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              disabled={sending || !authorName}
            />
            <button
              className="lux-comment-send-btn"
              onClick={handleComment}
              disabled={sending || !newComment.trim() || !authorName}
              type="button"
              aria-label="Post comment"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** List media from all buckets via our server-side Function */`
);

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 5 — Replace inline SocialPanel in reels with ReelSocialBar
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'JSX: replace inline SocialPanel in reel slide with ReelSocialBar',
  GALLERY,
  `              {vid.uploaderName && (
                <div className="lux-reel-caption">Shared by <b>{vid.uploaderName}</b></div>
              )}
              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open} />
              {/* Social panel — reactions + comments, anchored above seek bar */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 52, zIndex: 4 }}>
                <SocialPanel
                  mediaKey={mediaKeyFromItem(vid)}
                  guestName={guestName}
                  onNameSaved={updateGuestName}
                />
              </div>`,
  `              {vid.uploaderName && (
                <div className="lux-reel-caption">Shared by <b>{vid.uploaderName}</b></div>
              )}
              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open} />
              {/* Facebook Reels-style: icon bar on the right + expandable comment sheet */}
              <ReelSocialBar
                mediaKey={mediaKeyFromItem(vid)}
                guestName={guestName}
                onNameSaved={updateGuestName}
              />`
);

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 6 — Replace lbDragStart/Move/End with strip-based swipe logic
//           and update JSX to render the 3-slot strip
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'JS: lightbox swipe — replace single-image translate with 3-slot strip',
  GALLERY,
  `  // Lightbox swipe — mirrors Facebook's photo viewer:
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
      navPhotoWithReset(dx < 0 ? 1 : -1);
    }
    // Otherwise: the transform reset above (with the transition re-enabled
    // by removing "dragging") animates it right back to the dominant photo.
  }

  function lbDragCancel() {
    lbDragRef.current.active = false;
    const img = lbImgRef.current;
    if (img) { img.classList.remove("dragging"); img.style.transform = ""; }
  }`,

  `  // Lightbox swipe — three-slot strip: prev · current · next
  //  All three images are rendered side-by-side.  The strip sits at
  //  translateX(-33.333%) so the centre slot is always in view.
  //  Dragging shifts the entire strip — you see the neighbour coming in
  //  from the side exactly like Instagram / Facebook web viewer.
  //  A fast flick or >30% drag commits; anything less springs back.
  const lbStripRef = useRef(null);  // ref to .lux-lb-strip element

  function lbGetStrip() { return lbStripRef.current; }

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
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (drag.locked !== 'x') return;

    const strip = lbGetStrip();
    if (strip) {
      strip.classList.add('dragging');
      // -33.333% is the resting position (centred on middle slot).
      // We express dx as a percentage of the total strip width (300vw)
      // so the slot boundaries line up correctly.
      const pct = (dx / (window.innerWidth * 3)) * 100;
      strip.style.transform = 'translateX(calc(-33.3333% + ' + pct * 3 + 'px))';
    }
  }

  function lbDragEnd(e) {
    const drag = lbDragRef.current;
    if (!drag.active) return;
    drag.active = false;

    const strip = lbGetStrip();
    const wasHorizontal = drag.locked === 'x';
    if (strip) {
      strip.classList.remove('dragging');
      strip.style.transform = '';   // CSS transition springs back to -33.333%
    }
    if (!wasHorizontal) return;

    const dx = e.clientX - drag.startX;
    const elapsed = Math.max(1, Date.now() - drag.startTime);
    const velocity = Math.abs(dx) / elapsed;

    const FAST_FLICK_VELOCITY = 0.55;
    const DOMINANT_FRACTION   = 0.30;

    const passedThreshold = Math.abs(dx) > window.innerWidth * DOMINANT_FRACTION;
    if (velocity > FAST_FLICK_VELOCITY || passedThreshold) {
      navPhotoWithReset(dx < 0 ? 1 : -1);
    }
  }

  function lbDragCancel() {
    lbDragRef.current.active = false;
    const strip = lbGetStrip();
    if (strip) { strip.classList.remove('dragging'); strip.style.transform = ''; }
  }`
);

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 7 — Replace the single <img> in the lightbox with the 3-slot strip JSX
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'JSX: lightbox image area — single img → 3-slot strip (prev/cur/next)',
  GALLERY,
  `          {/* Image */}
          {lightbox.open && currentImg && (
            <img
              ref={lbImgRef}
              className={\`lux-lb-img\${lightbox.zoomed ? " zoomed" : ""}\`}
              src={currentImg.url} alt=""
              draggable={false}
            />
          )}`,

  `          {/* 3-slot image strip — prev · current · next */}
          {lightbox.open && (
            <div className="lux-lb-img-wrap">
              <div className="lux-lb-strip" ref={lbStripRef}>
                {/* Prev slot */}
                <div className="lux-lb-slot">
                  {photos[(lightbox.idx - 1 + photos.length) % photos.length] && (
                    <img
                      src={photos[(lightbox.idx - 1 + photos.length) % photos.length].url}
                      alt=""
                      draggable={false}
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
                    />
                  )}
                </div>
              </div>
            </div>
          )}`
);

console.log('\n✅  All patches applied successfully!\n');
console.log('Next steps:');
console.log('  1. npm start          — test locally');
console.log('  2. npm run build      — verify clean build');
console.log('  3. npx wrangler pages deploy build   — deploy\n');
