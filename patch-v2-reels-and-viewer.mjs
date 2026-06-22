/**
 * patch-v2-reels-and-viewer.mjs
 *
 * Fixes every remaining issue after patch-pro-ui-overhaul:
 *
 *  1. LIGHTBOX SWIPE — "black screen on swipe" fix
 *     The old code only moved the current photo with translateX but had
 *     nothing behind it, so you saw black. New approach renders a
 *     3-slot strip (prev · current · next) and translates the whole strip,
 *     exactly like Instagram / Facebook photo viewer on mobile.
 *     Desktop keeps the arrow-button navigation unchanged.
 *
 *  2. REELS — Facebook Reels right-side icon bar
 *     Instead of an always-visible SocialPanel that covers the mute
 *     button, the reel now shows a vertical icon bar on the RIGHT edge
 *     (❤️ with count · 💬 with count · mute/unmute) exactly like
 *     Facebook Reels. Tapping ❤️ fires an optimistic reaction. Long-pressing
 *     ❤️ (≥450ms) opens a floating emoji picker with all 5 reactions.
 *     Tapping 💬 slides up a bottom-sheet comment panel.
 *
 *  3. PHOTO LIGHTBOX — same Facebook-style right-side icon approach on mobile
 *     On mobile (<900px) the sidebar is hidden; instead a right-side icon
 *     bar shows ❤️ and 💬. Long-press ❤️ for the full picker. Tap 💬 for
 *     the bottom-sheet comment panel.
 *
 *  4. COMMENT BOTTOM SHEET
 *     A proper slide-up sheet with a dark scrim backdrop. Full comment
 *     thread + input inside. Dismissible by tapping the scrim or the X.
 *
 * Run from your project root:
 *   node patch-v2-reels-and-viewer.mjs
 *
 * Then:
 *   npm start   (hot reload)
 *   — or —
 *   npm run build
 */

import fs   from 'fs';
import path from 'path';

const TARGET = path.join(process.cwd(), 'src', 'WeddingGallery.js');

if (!fs.existsSync(TARGET)) {
  console.error('❌  Could not find ' + TARGET);
  console.error('    Run this script from your project root (folder with package.json).');
  process.exitCode = 1; process.exit();
}

const original = fs.readFileSync(TARGET, 'utf8');
const usesCRLF = original.includes('\r\n');
let content = original.replace(/\r\n/g, '\n');

if (content.includes('/* PATCH:V2-REELS-VIEWER */')) {
  console.log('✅  Already patched — nothing to do.');
  process.exit();
}

let n = 0;
const T = 5;
function patch(label, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('❌  Could not find anchor for: ' + label);
    console.error('    Revert WeddingGallery.js to the last commit and re-run.');
    process.exitCode = 1; process.exit();
  }
  content = content.replace(oldStr, newStr);
  console.log('✅  (' + (++n) + '/' + T + ') ' + label);
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Add CSS: swipe strip, reel icon bar, reaction picker, comment sheet
// ══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS — swipe strip + reel icon bar + reaction picker + comment sheet',

  `/* ── Lightbox mobile bottom-sheet social panel ───────────────────────── */
.lux-lb-social {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 5;
  background: linear-gradient(0deg, rgba(0,0,0,0.80) 0%, transparent 100%);
  padding: 48px 20px 24px;
}
@media (max-width: 639px) {
  .lux-lb-social { padding: 40px 14px 20px; }
}

/* Sidebar social panel — different background, fills the sidebar area */
.lux-lb-sidebar .lux-social-panel {
  background: transparent;
  border-top: none;
  padding: 14px 16px 16px;
  height: 100%; display: flex; flex-direction: column;
}
.lux-lb-sidebar .lux-comments-wrap.expanded {
  max-height: none; flex: 1;
}`,

  `/* PATCH:V2-REELS-VIEWER */

/* ── LIGHTBOX SWIPE STRIP ────────────────────────────────────────────────
   Three slots side-by-side: [prev][current][next].
   We translate the whole strip so the adjacent photo slides in from the
   edge — no more black gap. ──────────────────────────────────────────── */
.lux-lb-strip {
  position: absolute; inset: 0;
  display: flex; align-items: center;
  /* starts centred on slot 1 (index 0 = prev, 1 = current, 2 = next) */
  transform: translateX(-100%);
  will-change: transform;
  touch-action: none; user-select: none;
}
.lux-lb-strip.animating {
  transition: transform .32s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.lux-lb-slot {
  flex: 0 0 100%; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.lux-lb-slot img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  display: block; user-select: none; -webkit-user-drag: none;
}

/* ── RIGHT-SIDE ICON BAR (photo lightbox — mobile only) ─────────────────
   Shown when sidebar is hidden (<900px). Mirrors Facebook mobile. ────── */
.lux-lb-icon-bar {
  position: absolute; right: 12px; bottom: 120px; z-index: 8;
  display: none; /* shown via media query below */
  flex-direction: column; align-items: center; gap: 20px;
}
@media (max-width: 900px) {
  .lux-lb-icon-bar { display: flex; }
}
.lux-lb-icon-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: none; border: none; color: #fff; cursor: pointer;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  position: relative;
}
.lux-lb-icon-btn-circle {
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.45); border: 1.5px solid rgba(255,255,255,0.22);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; transition: background .15s, transform .12s;
}
.lux-lb-icon-btn:active .lux-lb-icon-btn-circle { transform: scale(0.90); }
.lux-lb-icon-btn-label {
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  color: rgba(255,255,255,0.82); text-shadow: 0 1px 4px rgba(0,0,0,0.7);
  min-width: 32px; text-align: center;
}

/* ── REEL RIGHT-SIDE ICON BAR ────────────────────────────────────────────
   Facebook Reels layout: vertical stack on the right edge.
   ❤️ (long-press = picker) · 💬 (comment sheet) · 🔊/🔇 (mute) ─────── */
.lux-reel-icon-bar {
  position: absolute; right: 12px; bottom: 100px; z-index: 20;
  display: flex; flex-direction: column; align-items: center; gap: 20px;
  pointer-events: all;
}
.lux-reel-icon-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: none; border: none; color: #fff; cursor: pointer;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  position: relative; pointer-events: all;
}
.lux-reel-icon-circle {
  width: 46px; height: 46px; border-radius: 50%;
  background: rgba(0,0,0,0.42); border: 1.5px solid rgba(255,255,255,0.20);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; transition: background .15s, transform .12s;
  pointer-events: all;
}
.lux-reel-icon-btn:active .lux-reel-icon-circle { transform: scale(0.88); background: rgba(255,255,255,0.15); }
.lux-reel-icon-label {
  font-family: var(--font-body); font-size: 12px; font-weight: 600;
  color: #fff; text-shadow: 0 1px 5px rgba(0,0,0,0.8);
  min-width: 36px; text-align: center;
}
/* Heart animates when you tap-react */
@keyframes heartPop {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.5); }
  60%  { transform: scale(0.88); }
  100% { transform: scale(1); }
}
.lux-reel-icon-btn.heart-pop .lux-reel-icon-circle { animation: heartPop .38s var(--ease-spring) both; }

/* ── REACTION LONG-PRESS PICKER ──────────────────────────────────────────
   Floats above the heart icon. Slide-up + fade in. ──────────────────── */
.lux-rxn-picker {
  position: absolute; bottom: 54px; right: 0;
  display: flex; flex-direction: row; gap: 6px;
  background: rgba(20,20,20,0.92); border: 1px solid rgba(255,255,255,0.14);
  border-radius: 999px; padding: 8px 12px;
  backdrop-filter: blur(12px);
  animation: rxnPickerIn .22s var(--ease-spring) both;
  z-index: 30; pointer-events: all;
  /* keep it on screen — shift left if near edge */
  transform: translateX(0);
  white-space: nowrap;
}
@keyframes rxnPickerIn {
  from { opacity: 0; transform: scale(0.7) translateY(12px); }
  to   { opacity: 1; transform: scale(1)   translateY(0); }
}
.lux-rxn-picker-btn {
  width: 40px; height: 40px; border-radius: 50%;
  background: none; border: none; font-size: 22px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: transform .15s, background .12s;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.lux-rxn-picker-btn:hover,
.lux-rxn-picker-btn:active { background: rgba(255,255,255,0.12); transform: scale(1.3); }

/* Picker scrim — tap outside to dismiss */
.lux-rxn-picker-scrim {
  position: fixed; inset: 0; z-index: 25;
  background: transparent;
}

/* ── COMMENT BOTTOM SHEET ────────────────────────────────────────────────
   Slides up from the bottom. Dark translucent scrim behind it.
   Works for both reels and photo lightbox on mobile. ─────────────────── */
.lux-sheet-scrim {
  position: fixed; inset: 0; z-index: 40;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(2px);
  animation: fadeIn .2s ease both;
}
.lux-comment-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 45;
  background: #1a1a1a; border-radius: 18px 18px 0 0;
  border-top: 1px solid rgba(255,255,255,0.10);
  max-height: 75vh; display: flex; flex-direction: column;
  animation: sheetUp .28s cubic-bezier(0.32, 0.72, 0, 1) both;
  overflow: hidden;
}
@keyframes sheetUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.lux-sheet-handle-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px 8px; flex-shrink: 0;
}
.lux-sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.22);
  margin: 0 auto;
}
.lux-sheet-title {
  font-family: var(--font-body); font-size: 14px; font-weight: 600;
  color: #fff; flex: 1; text-align: center;
}
.lux-sheet-close {
  width: 30px; height: 30px; border-radius: 50%;
  background: rgba(255,255,255,0.10); border: none;
  color: rgba(255,255,255,0.70); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.lux-sheet-close:hover { background: rgba(255,255,255,0.18); color: #fff; }
.lux-sheet-body {
  flex: 1; overflow-y: auto; padding: 0 16px 8px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.14) transparent;
}
.lux-sheet-body::-webkit-scrollbar { width: 3px; }
.lux-sheet-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px; }
.lux-sheet-input-row {
  display: flex; gap: 8px; align-items: center;
  padding: 10px 16px max(12px, env(safe-area-inset-bottom));
  border-top: 0.5px solid rgba(255,255,255,0.10);
  flex-shrink: 0; background: #1a1a1a;
}

/* Sheet social panel — reuse lux-social-panel but strip the border/bg */
.lux-sheet-body .lux-social-panel {
  background: transparent; border-top: none; padding: 6px 0 0;
}
/* Inside the sheet, expand the comment list fully */
.lux-sheet-body .lux-comments-wrap { max-height: none !important; }
.lux-sheet-body .lux-comments-wrap.expanded { max-height: none; overflow-y: visible; }

/* Lightbox mobile bottom-sheet social panel (legacy — kept for sidebar) */
.lux-lb-social {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 5;
  background: linear-gradient(0deg, rgba(0,0,0,0.80) 0%, transparent 100%);
  padding: 48px 20px 24px;
}
@media (max-width: 639px) {
  .lux-lb-social { padding: 40px 14px 20px; }
}

/* Sidebar social panel — fills the sidebar area */
.lux-lb-sidebar .lux-social-panel {
  background: transparent; border-top: none;
  padding: 14px 16px 16px;
  height: 100%; display: flex; flex-direction: column;
}
.lux-lb-sidebar .lux-comments-wrap.expanded {
  max-height: none; flex: 1;
}`
);


// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Replace SocialPanel with ReactionPicker + CommentSheet components
//          and a new hook-based approach
// ══════════════════════════════════════════════════════════════════════════════
patch(
  'Add ReactionPicker + CommentSheet components; update SocialPanel',

  `// ── SocialPanel ───────────────────────────────────────────────────────────────
// Shared by both the Lightbox (photos) and the Reels viewer (videos).
// Props:
//   mediaKey  — stable string ID for the media item
//   guestName — parent-level name state (may already be set from upload flow)
//   onNameSaved — callback so parent can sync its own guestName state
function SocialPanel({ mediaKey, guestName, onNameSaved }) {`,

  `// ── ReactionPicker — floating emoji picker (long-press trigger) ───────────────
function ReactionPicker({ onPick, onDismiss }) {
  return (
    <>
      <div className="lux-rxn-picker-scrim" onPointerDown={onDismiss} />
      <div className="lux-rxn-picker">
        {REACTIONS_LIST.map(({ emoji, label }) => (
          <button
            key={emoji}
            className="lux-rxn-picker-btn"
            aria-label={label}
            type="button"
            onPointerDown={e => { e.stopPropagation(); onPick(emoji); }}
          >{emoji}</button>
        ))}
      </div>
    </>
  );
}

// ── CommentSheet — slide-up bottom sheet with full comment thread ─────────────
function CommentSheet({ mediaKey, guestName, onNameSaved, onClose }) {
  const [comments, setComments]     = useState(null);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending]       = useState(false);
  const [localName, setLocalName]   = useState(() => (guestName || '').trim() || getStoredName());
  const [editingName, setEditingName] = useState(false);
  const inputRef = useRef(null);
  const bodyRef  = useRef(null);

  useEffect(() => {
    if (!mediaKey) return;
    fetchComments(mediaKey).then(d => setComments(d.comments || []));
  }, [mediaKey]);

  // Auto-scroll to bottom when new comment arrives
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [comments]);

  // Auto-focus input on open
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 320); }, []);

  function commitName(name) {
    const t = name.trim(); if (!t) return;
    setLocalName(t); saveStoredName(t); setEditingName(false);
    if (onNameSaved) onNameSaved(t);
  }

  async function handleComment() {
    const name = localName.trim(), body = newComment.trim();
    if (!name || !body || !mediaKey) return;
    setSending(true);
    try {
      const { comment } = await postComment(mediaKey, name, body);
      setComments(prev => [...(prev || []), comment]);
      setNewComment('');
    } catch {} finally { setSending(false); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); }
  }

  const authorName   = localName.trim();
  const commentCount = (comments || []).length;

  return (
    <>
      <div className="lux-sheet-scrim" onPointerDown={onClose} />
      <div className="lux-comment-sheet">
        {/* Handle + title + close */}
        <div className="lux-sheet-handle-row">
          <div style={{width:30}} />
          <span className="lux-sheet-title">
            Comments{commentCount > 0 ? ` (${commentCount})` : ''}
          </span>
          <button className="lux-sheet-close" onClick={onClose} aria-label="Close" type="button">✕</button>
        </div>
        <div style={{padding:'0 16px 4px', flexShrink:0}}>
          <div style={{height:'1px', background:'rgba(255,255,255,0.08)'}} />
        </div>

        {/* Comment thread */}
        <div className="lux-sheet-body" ref={bodyRef}>
          {comments === null && (
            <div style={{padding:'24px 0', textAlign:'center'}}>
              <span className="lux-social-loading" style={{width:80}} />
            </div>
          )}
          {comments !== null && commentCount === 0 && (
            <div style={{padding:'32px 0', textAlign:'center', color:'rgba(255,255,255,0.35)', fontFamily:'var(--font-body)', fontSize:13}}>
              No comments yet — be the first! 💬
            </div>
          )}
          {(comments || []).map(c => (
            <div key={c.id} className="lux-comment" style={{padding:'10px 0'}}>
              <div className="lux-comment-avatar">{(c.author_name||'?')[0].toUpperCase()}</div>
              <div className="lux-comment-content">
                <span className="lux-comment-author">{c.author_name}</span>
                <span className="lux-comment-body">{c.body}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="lux-sheet-input-row">
          {(!authorName || editingName) ? (
            <input
              className="lux-comment-input"
              style={{borderRadius:12, marginRight:0}}
              placeholder="Your name first…"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onBlur={e => { if (e.target.value.trim()) commitName(e.target.value); }}
              onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); commitName(localName); inputRef.current?.focus(); }}}
              autoComplete="name"
            />
          ) : (
            <>
              {authorName && (
                <div style={{
                  flexShrink:0, width:32, height:32, borderRadius:'50%',
                  background:'linear-gradient(135deg, var(--pink-dark), var(--gold))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontFamily:'var(--font-body)', fontSize:13, fontWeight:600,
                }}>
                  {authorName[0].toUpperCase()}
                </div>
              )}
              <input
                ref={inputRef}
                className="lux-comment-input"
                style={{borderRadius:12}}
                placeholder={authorName ? `Comment as ${authorName}…` : 'Enter your name first…'}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending || !authorName}
              />
              <button
                className="lux-comment-send-btn"
                onClick={handleComment}
                disabled={sending || !newComment.trim() || !authorName}
                aria-label="Post" type="button"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── SocialPanel ───────────────────────────────────────────────────────────────
// Used only inside the desktop lightbox sidebar now. The icon bar + sheet
// approach replaces it everywhere else.
// Props:
//   mediaKey  — stable string ID for the media item
//   guestName — parent-level name state (may already be set from upload flow)
//   onNameSaved — callback so parent can sync its own guestName state
function SocialPanel({ mediaKey, guestName, onNameSaved }) {`
);


// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Replace the Lightbox swipe + add mobile icon bar + photo strip
// ══════════════════════════════════════════════════════════════════════════════
patch(
  'Lightbox — 3-slot swipe strip + mobile icon bar',

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
      lbImgRef.current.style.transform = `translateX(${dx}px)`;
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

  `  // ── Lightbox strip swipe (3-slot: prev · current · next) ─────────────────
  // The strip is always offset to show slot[1] (the current photo).
  // While dragging we shift the entire strip so the adjacent photo slides
  // in from the edge — exactly like Instagram / Facebook photo viewer.
  // On commit we snap to the next/prev slot, then immediately reset the
  // strip position without animation so it's ready for the next swipe.
  const lbStripRef = useRef(null);

  function lbDragStart(e) {
    if (lightbox.zoomed || photos.length < 2) return;
    lbDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, locked: null, startTime: Date.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
    const strip = lbStripRef.current;
    if (strip) strip.classList.remove('animating');
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
    const strip = lbStripRef.current;
    // Slot 1 is centred at -100vw; drag shifts from there
    if (strip) strip.style.transform = `translateX(calc(-100% + ${dx}px))`;
  }

  function lbDragEnd(e) {
    const drag = lbDragRef.current;
    if (!drag.active) return;
    drag.active = false;
    const wasHorizontal = drag.locked === 'x';
    if (!wasHorizontal) {
      const strip = lbStripRef.current;
      if (strip) strip.style.transform = 'translateX(-100%)';
      return;
    }
    const dx = e.clientX - drag.startX;
    const elapsed = Math.max(1, Date.now() - drag.startTime);
    const velocity = Math.abs(dx) / elapsed;
    const FLICK = 0.45, FRAC = 0.28;
    const shouldNav = velocity > FLICK || Math.abs(dx) > window.innerWidth * FRAC;
    const strip = lbStripRef.current;
    if (shouldNav) {
      const dir = dx < 0 ? 1 : -1;
      const targetSlot = dir === 1 ? 2 : 0; // slot 2 = next, slot 0 = prev
      if (strip) {
        strip.classList.add('animating');
        strip.style.transform = `translateX(${-targetSlot * 100}%)`;
        // After animation, commit the nav and reset strip silently
        setTimeout(() => {
          navPhotoWithReset(dir);
          if (strip) {
            strip.classList.remove('animating');
            strip.style.transform = 'translateX(-100%)';
          }
        }, 330);
      } else {
        navPhotoWithReset(dir);
      }
    } else {
      // Spring back
      if (strip) {
        strip.classList.add('animating');
        strip.style.transform = 'translateX(-100%)';
        setTimeout(() => strip.classList.remove('animating'), 330);
      }
    }
  }

  function lbDragCancel() {
    lbDragRef.current.active = false;
    const strip = lbStripRef.current;
    if (strip) {
      strip.classList.add('animating');
      strip.style.transform = 'translateX(-100%)';
      setTimeout(() => strip.classList.remove('animating'), 330);
    }
  }`
);


// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Replace Lightbox JSX: strip-based swipe + mobile icon bar
// ══════════════════════════════════════════════════════════════════════════════
patch(
  'Lightbox JSX — 3-slot strip + mobile icon bar + comment sheet',

  `      {/* LIGHTBOX — Instagram-style split-panel photo viewer */}
      <div className={\`lux-lightbox\${lightbox.open ? " open" : ""}\`}>

        {/* ── LEFT PANE: full-bleed image canvas ─────────────────────── */}
        <div
          className="lux-lb-image-pane"
          onPointerDown={lbDragStart}
          onPointerMove={lbDragMove}
          onPointerUp={lbDragEnd}
          onPointerCancel={lbDragCancel}
        >
          {/* Top gradient bar with credit + counter */}
          <div className="lux-lb-topbar">
            <span className="lux-lb-credit">
              {currentImg?.uploaderName
                ? <><b>{currentImg.uploaderName}</b></>
                : <span style={{color:'rgba(255,255,255,0.0)'}}>·</span>}
            </span>
            <span className="lux-lb-counter">
              {photos.length > 0 ? \`\${lightbox.idx + 1} / \${photos.length}\` : ""}
            </span>
          </div>

          {/* Close button */}
          <button
            className="lux-lb-close"
            onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>

          {/* Prev / Next */}
          <button className="lux-lb-nav lux-lb-prev" onClick={() => navPhotoWithReset(-1)} aria-label="Previous photo">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="lux-lb-nav lux-lb-next" onClick={() => navPhotoWithReset(1)} aria-label="Next photo">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 3l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Image */}
          {lightbox.open && currentImg && (
            <img
              ref={lbImgRef}
              className={\`lux-lb-img\${lightbox.zoomed ? " zoomed" : ""}\`}
              src={currentImg.url} alt=""
              draggable={false}
            />
          )}

          {/* Zoom toggle */}
          <button
            className="lux-lb-zoom"
            onClick={() => setLightbox(l => ({ ...l, zoomed: !l.zoomed }))}
          >
            {lightbox.zoomed ? "Zoom Out" : "Zoom In"}
          </button>

          {/* Mobile: bottom-sheet social panel (hidden on desktop — sidebar handles it) */}
          {showLbComments && currentImg && (
            <div className="lux-lb-social">
              <SocialPanel
                mediaKey={mediaKeyFromItem(currentImg)}
                guestName={guestName}
                onNameSaved={updateGuestName}
              />
            </div>
          )}

          {/* Mobile: floating comments toggle button */}
          <button
            className="lux-lb-zoom"
            style={{ right: 'auto', left: '50%', transform: 'translateX(calc(-50% + 60px))', fontSize: '15px', padding: '7px 14px' }}
            onClick={() => setShowLbComments(v => !v)}
            aria-label="Reactions and comments"
          >
            {showLbComments ? '✕ Hide' : '💬'}
          </button>
        </div>

        {/* ── RIGHT PANE: social sidebar (desktop only, >900px) ──────── */}
        <div className="lux-lb-sidebar">
          <div className="lux-lb-sidebar-header">
            <div>
              <div className="lux-lb-sidebar-credit">
                {currentImg?.uploaderName || 'Wedding Gallery'}
              </div>
              <div className="lux-lb-sidebar-sub">
                {photos.length > 0 ? \`Photo \${lightbox.idx + 1} of \${photos.length}\` : ''}
              </div>
            </div>
          </div>
          <div className="lux-lb-sidebar-body">
            {lightbox.open && currentImg && (
              <SocialPanel
                mediaKey={mediaKeyFromItem(currentImg)}
                guestName={guestName}
                onNameSaved={updateGuestName}
              />
            )}
          </div>
        </div>

      </div>`,

  `      {/* LIGHTBOX — Instagram/Facebook photo viewer */}
      <LbCommentSheet
        lightboxOpen={lightbox.open}
        currentImg={currentImg}
        showLbSheet={showLbComments}
        setShowLbSheet={setShowLbComments}
        guestName={guestName}
        updateGuestName={updateGuestName}
        mediaKeyFromItem={mediaKeyFromItem}
      />
      <div className={\`lux-lightbox\${lightbox.open ? " open" : ""}\`}>

        {/* ── LEFT PANE: swipe strip + chrome ────────────────────────── */}
        <div
          className="lux-lb-image-pane"
          onPointerDown={lbDragStart}
          onPointerMove={lbDragMove}
          onPointerUp={lbDragEnd}
          onPointerCancel={lbDragCancel}
        >
          {/* 3-slot swipe strip: [prev][current][next] */}
          {lightbox.open && (
            <div className="lux-lb-strip" ref={lbStripRef}>
              {[-1, 0, 1].map(offset => {
                const idx = (lightbox.idx + offset + photos.length) % photos.length;
                const photo = photos[idx];
                return (
                  <div key={offset} className="lux-lb-slot">
                    {photo && <img src={photo.url} alt="" draggable={false} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Top bar */}
          <div className="lux-lb-topbar">
            <span className="lux-lb-credit">
              {currentImg?.uploaderName
                ? <b>{currentImg.uploaderName}</b>
                : <span style={{opacity:0}}>·</span>}
            </span>
            <span className="lux-lb-counter">
              {photos.length > 0 ? \`\${lightbox.idx + 1} / \${photos.length}\` : ''}
            </span>
          </div>

          {/* Close */}
          <button
            className="lux-lb-close"
            onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Prev / Next (desktop) */}
          <button className="lux-lb-nav lux-lb-prev" onClick={() => navPhotoWithReset(-1)} aria-label="Previous">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="lux-lb-nav lux-lb-next" onClick={() => navPhotoWithReset(1)} aria-label="Next">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 3l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Mobile right-side icon bar (hidden on desktop — sidebar handles it) */}
          {lightbox.open && currentImg && (
            <LbIconBar
              mediaKey={mediaKeyFromItem(currentImg)}
              guestName={guestName}
              onComment={() => setShowLbComments(true)}
            />
          )}
        </div>

        {/* ── RIGHT PANE: social sidebar (desktop >900px) ─────────────── */}
        <div className="lux-lb-sidebar">
          <div className="lux-lb-sidebar-header">
            <div>
              <div className="lux-lb-sidebar-credit">
                {currentImg?.uploaderName || 'Wedding Gallery'}
              </div>
              <div className="lux-lb-sidebar-sub">
                {photos.length > 0 ? \`Photo \${lightbox.idx + 1} of \${photos.length}\` : ''}
              </div>
            </div>
          </div>
          <div className="lux-lb-sidebar-body">
            {lightbox.open && currentImg && (
              <SocialPanel
                mediaKey={mediaKeyFromItem(currentImg)}
                guestName={guestName}
                onNameSaved={updateGuestName}
              />
            )}
          </div>
        </div>

      </div>`
);


// ══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Replace Reels JSX: add right-side icon bar, remove inline SocialPanel
//          and add the LbCommentSheet / LbIconBar / ReelIconBar components
// ══════════════════════════════════════════════════════════════════════════════
patch(
  'Reels JSX — Facebook-style icon bar; add helper components',

  `      {/* REELS — full-screen vertical video viewer (TikTok/Reels style) */}
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
        <button
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
              {vid.uploaderName && (
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
              </div>
            </div>
          ))}
        </div>
      </div>`,

  `      {/* REELS — full-screen vertical video viewer */}
      <div className={\`lux-reels\${reels.open ? " open" : ""}\`}>
        {/* Close — fixed, always on top */}
        <button className="lux-reels-close" onClick={closeReels} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
        {/* Desktop prev/next */}
        <button className="lux-reels-nav lux-reels-prev" onClick={() => goToReel(reels.idx - 1)} disabled={reels.idx <= 0} aria-label="Previous">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M4 11l5-5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="lux-reels-nav lux-reels-next" onClick={() => goToReel(reels.idx + 1)} disabled={reels.idx >= videos.length - 1} aria-label="Next">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M4 7l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="lux-reels-scroll" ref={reelContainerRef}>
          {reels.open && videos.map((vid, vidIdx) => (
            <ReelSlide
              key={vid.id}
              vid={vid}
              vidIdx={vidIdx}
              reelRefs={reelRefs}
              reelMuted={reelMuted}
              setReelMuted={setReelMuted}
              reelsOpen={reels.open}
              guestName={guestName}
              updateGuestName={updateGuestName}
              mediaKeyFromItem={mediaKeyFromItem}
            />
          ))}
        </div>
      </div>`
);

// ══════════════════════════════════════════════════════════════════════════════
// Append helper components before the closing export default line
// ══════════════════════════════════════════════════════════════════════════════
// We need to add the LbIconBar, LbCommentSheet, and ReelSlide components.
// These are pure React components — we insert them before `export default`.
const HELPER_COMPONENTS = `
// ── LbIconBar — mobile right-side icon bar for photo lightbox ─────────────────
function LbIconBar({ mediaKey, guestName, onComment }) {
  const [reactions, setReactions] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [heartPop, setHeartPop]     = useState(false);
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (!mediaKey) return;
    fetchReactions(mediaKey).then(setReactions);
  }, [mediaKey]);

  async function fireReaction(emoji) {
    setPickerOpen(false);
    setHeartPop(true); setTimeout(() => setHeartPop(false), 450);
    try { const updated = await postReaction(mediaKey, emoji); setReactions(updated); } catch {}
  }

  function onHeartPointerDown(e) {
    e.preventDefault();
    longPressTimer.current = setTimeout(() => setPickerOpen(true), 450);
  }
  function onHeartPointerUp() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (!pickerOpen) fireReaction('❤️');
  }
  function onHeartPointerCancel() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  const total = reactions ? Object.values(reactions.counts || {}).reduce((a,b)=>a+b,0) : null;

  return (
    <div className="lux-lb-icon-bar">
      {pickerOpen && <ReactionPicker onPick={fireReaction} onDismiss={() => setPickerOpen(false)} />}
      {/* Heart / reactions */}
      <button
        className={\`lux-lb-icon-btn\${heartPop ? ' heart-pop' : ''}\`}
        onPointerDown={onHeartPointerDown}
        onPointerUp={onHeartPointerUp}
        onPointerCancel={onHeartPointerCancel}
        aria-label="React (hold for more)"
        type="button"
        style={{touchAction:'none'}}
      >
        <div className="lux-lb-icon-btn-circle">❤️</div>
        {total > 0 && <span className="lux-lb-icon-btn-label">{total}</span>}
      </button>
      {/* Comments */}
      <button
        className="lux-lb-icon-btn"
        onClick={onComment}
        aria-label="Comments"
        type="button"
      >
        <div className="lux-lb-icon-btn-circle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="lux-lb-icon-btn-label" style={{opacity:0.7}}>💬</span>
      </button>
    </div>
  );
}

// ── LbCommentSheet wrapper — renders the comment sheet outside the lightbox DOM
function LbCommentSheet({ lightboxOpen, currentImg, showLbSheet, setShowLbSheet, guestName, updateGuestName, mediaKeyFromItem }) {
  if (!lightboxOpen || !currentImg || !showLbSheet) return null;
  return (
    <CommentSheet
      mediaKey={mediaKeyFromItem(currentImg)}
      guestName={guestName}
      onNameSaved={updateGuestName}
      onClose={() => setShowLbSheet(false)}
    />
  );
}

// ── ReelSlide — individual reel with its own icon bar + comment sheet ─────────
function ReelSlide({ vid, vidIdx, reelRefs, reelMuted, setReelMuted, reelsOpen, guestName, updateGuestName, mediaKeyFromItem }) {
  const [reactions, setReactions]   = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [heartPop, setHeartPop]     = useState(false);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const longPressTimer = useRef(null);
  const mediaKey = mediaKeyFromItem(vid);

  useEffect(() => {
    if (!reelsOpen) return;
    fetchReactions(mediaKey).then(setReactions);
  }, [reelsOpen, mediaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fireReaction(emoji) {
    setPickerOpen(false);
    setHeartPop(true); setTimeout(() => setHeartPop(false), 450);
    try { const updated = await postReaction(mediaKey, emoji); setReactions(updated); } catch {}
  }

  function onHeartPointerDown(e) {
    e.preventDefault();
    longPressTimer.current = setTimeout(() => setPickerOpen(true), 450);
  }
  function onHeartPointerUp() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (!pickerOpen) fireReaction('❤️');
  }
  function onHeartPointerCancel() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  const total = reactions ? Object.values(reactions.counts || {}).reduce((a,b)=>a+b,0) : null;

  return (
    <>
      {sheetOpen && (
        <CommentSheet
          mediaKey={mediaKey}
          guestName={guestName}
          onNameSaved={updateGuestName}
          onClose={() => setSheetOpen(false)}
        />
      )}
      <div className="lux-reel-slide">
        <video
          ref={el => { if (el) el.dataset.reelIdx = vidIdx; reelRefs.current[vidIdx] = el; }}
          src={vid.url}
          className="lux-reel-video"
          loop playsInline muted={reelMuted}
          preload="metadata"
          onClick={e => { e.target.paused ? e.target.play().catch(()=>{}) : e.target.pause(); }}
        />
        {vid.uploaderName && (
          <div className="lux-reel-caption">Shared by <b>{vid.uploaderName}</b></div>
        )}
        <ReelSeekBar reelRefs={reelRefs} idx={vidIdx} active={reelsOpen} />

        {/* Right-side Facebook Reels icon bar */}
        <div className="lux-reel-icon-bar">
          {pickerOpen && <ReactionPicker onPick={fireReaction} onDismiss={() => setPickerOpen(false)} />}

          {/* ❤️ — tap to react, hold for picker */}
          <button
            className={\`lux-reel-icon-btn\${heartPop ? ' heart-pop' : ''}\`}
            onPointerDown={onHeartPointerDown}
            onPointerUp={onHeartPointerUp}
            onPointerCancel={onHeartPointerCancel}
            aria-label="React (hold for more)"
            type="button"
            style={{touchAction:'none'}}
          >
            <div className="lux-reel-icon-circle">❤️</div>
            {total !== null && total > 0 && <span className="lux-reel-icon-label">{total}</span>}
          </button>

          {/* 💬 Comment */}
          <button
            className="lux-reel-icon-btn"
            onClick={() => setSheetOpen(true)}
            aria-label="Comments"
            type="button"
          >
            <div className="lux-reel-icon-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="lux-reel-icon-label" style={{opacity:0.75}}>💬</span>
          </button>

          {/* 🔊/🔇 Mute — always tappable */}
          <button
            className="lux-reel-icon-btn"
            onClick={() => setReelMuted(m => !m)}
            aria-label={reelMuted ? 'Unmute' : 'Mute'}
            type="button"
          >
            <div className="lux-reel-icon-circle" style={{fontSize:18}}>
              {reelMuted
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor"/><line x1="16" y1="8" x2="22" y2="16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><line x1="22" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 010 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none"/><path d="M19 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
              }
            </div>
            <span className="lux-reel-icon-label" style={{fontSize:10, opacity:0.6}}>{reelMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
`;

// Insert helper components right before "export default function WeddingGallery"
const EXPORT_ANCHOR = 'export default function WeddingGallery()';
if (!content.includes(EXPORT_ANCHOR)) {
  console.error('❌  Could not find export default function WeddingGallery()');
  process.exitCode = 1; process.exit();
}
content = content.replace(EXPORT_ANCHOR, HELPER_COMPONENTS + '\n' + EXPORT_ANCHOR);
console.log('✅  (helper components injected before export default)');

// ── Write ──────────────────────────────────────────────────────────────────────
const final = usesCRLF ? content.replace(/\n/g, '\r\n') : content;
fs.writeFileSync(TARGET, final, 'utf8');

console.log('');
console.log('══════════════════════════════════════════════════════');
console.log('✅  patch-v2-reels-and-viewer applied!');
console.log('');
console.log('   What changed:');
console.log('   • Lightbox swipe — 3-slot strip (prev·current·next)');
console.log('     No more black screen on swipe. Adjacent photo slides in.');
console.log('   • Lightbox mobile — right-side ❤️ + 💬 icon bar');
console.log('     Tap ❤️ = instant heart. Hold ❤️ = full emoji picker.');
console.log('     Tap 💬 = comment bottom sheet slides up.');
console.log('   • Reels — Facebook-style right-side icon bar');
console.log('     ❤️ (long-press picker) · 💬 (sheet) · 🔊/🔇 (mute)');
console.log('     Old inline SocialPanel removed — no more blocked mute.');
console.log('   • Reaction picker — floating pill, 5 wedding emojis');
console.log('   • Comment sheet — slide-up bottom sheet with dark scrim');
console.log('     Full thread + avatar initials + auto-fill name');
console.log('');
console.log('   Also update functions/api/reactions.js line 6:');
console.log("   const ALLOWED_REACTIONS = new Set(['❤️','🌸','🥂','😂','💍']);");
console.log('');
console.log('   Next:');
console.log('     npm start         ← hot reload');
console.log('     npm run build     ← production');
console.log('══════════════════════════════════════════════════════');
