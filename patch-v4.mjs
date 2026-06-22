/**
 * patch-v4.mjs  — 8 targeted fixes
 *
 * 1. Mute button: move it OUT of the fixed layer so the comment sheet
 *    can never sit above it — switch to position:absolute inside the
 *    .lux-reels wrapper, which already has z-index:1100 and is fixed.
 *    Root cause: comment sheet is position:absolute z-index:20 inside
 *    .lux-reel-slide which creates a new stacking context that beats
 *    anything position:fixed on the page with lower z-index.
 *
 * 2. Reels prev/next arrows: move from right side to left side.
 *
 * 3. Comment sheet background: solid #111 so nothing shows through.
 *
 * 4. Hide mute button when comment sheet is open (via CSS class toggle).
 *
 * 5. Swipe-down on comment sheet to close it.
 *
 * 6. Lightbox: replace zoom+comment buttons with same icon-bar as reels.
 *    (reactions row + comment icon button that opens the bottom sheet).
 *
 * 7. Remove the "Zoom In / Zoom Out" text button from lightbox.
 *    Native pinch-to-zoom + double-tap is handled by the browser.
 *
 * 8. Lightbox mobile: reactions + comment icon shown at bottom-right of
 *    image pane (same style as reels bar), not buried inside the sheet.
 *
 * Run:  node patch-v4.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT    = process.cwd();
const GALLERY = join(ROOT, 'src', 'WeddingGallery.js');

if (!existsSync(GALLERY)) {
  console.error('ERROR: src/WeddingGallery.js not found. Run from project root.');
  process.exit(1);
}

let applied = 0;
function applyPatch(label, search, replacement) {
  let src = readFileSync(GALLERY, 'utf8');
  if (!src.includes(search)) {
    if (src.includes(replacement.slice(0, 80))) {
      console.log('  ✓ ' + label + ' — already applied, skipping');
      return;
    }
    console.error('  ✗ ' + label + ' — anchor not found!');
    process.exit(1);
  }
  writeFileSync(GALLERY, src.replace(search, replacement), 'utf8');
  applied++;
  console.log('  ✓ ' + label);
}

console.log('\n🔧  Applying patch-v4 …\n');

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 1 — Fix mute button stacking context bug
//
// Root cause: .lux-reel-slide has position:relative, which creates a NEW
// stacking context. Any child with z-index beats position:fixed elements
// that come BEFORE the parent in the DOM. The comment sheet (z-index:20)
// inside .lux-reel-slide therefore sits ABOVE the mute button even though
// the mute button has z-index:1500 in its own layer — because they are in
// DIFFERENT stacking contexts.
//
// Fix: change mute + close buttons from position:fixed to position:absolute
// and move them into .lux-reels (the outermost fixed wrapper) as direct
// children, so they are NEVER inside a reel-slide stacking context.
// They are already rendered as direct children of .lux-reels in the JSX,
// so only the CSS position needs to change.
// ═══════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS fix 1: mute/close — position:absolute in .lux-reels not position:fixed',
  `.lux-reels-close, .lux-reels-mute {
  position: fixed; z-index: 1400; /* above scroll container AND social panel */
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.56); border: 1.5px solid rgba(255,255,255,0.18);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .18s, transform .15s;
  pointer-events: all !important; /* ALWAYS tappable — critical fix */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  isolation: isolate; /* own stacking context prevents being buried */
}
.lux-reels-close { top: 18px; left: 16px; }
.lux-reels-mute  { bottom: 28px; right: 16px; z-index: 1500; }`,

  `/* Mute + close live as DIRECT children of .lux-reels (position:fixed,
   z-index:1100). Using position:absolute here means they are positioned
   relative to .lux-reels itself — they are NEVER inside a reel-slide
   stacking context, so the comment sheet can never cover them. */
.lux-reels-close, .lux-reels-mute {
  position: absolute; z-index: 200;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.56); border: 1.5px solid rgba(255,255,255,0.18);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .18s, transform .15s, opacity .2s;
  pointer-events: all;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.lux-reels-close { top: 18px; left: 16px; }
.lux-reels-mute  { bottom: 28px; right: 16px; }
/* Hide mute when the comment sheet is open (class toggled from JS) */
.lux-reels.sheet-open .lux-reels-mute { opacity: 0; pointer-events: none; }`
);

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 2 — Reels prev/next: move to LEFT side
// ═══════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS fix 2: reels nav arrows move to left side',
  `/* Desktop-only Prev/Next — hidden on touch devices (rule above) */
.lux-reels-nav {
  position: fixed; right: 18px; z-index: 1200;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.4); border: none;
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.lux-reels-nav:hover    { background: rgba(0,0,0,0.65); }
.lux-reels-nav:disabled { opacity: 0.22; cursor: default; pointer-events: none; }
.lux-reels-prev { top: calc(50% - 56px); }
.lux-reels-next { top: calc(50% + 14px); }`,

  `/* Desktop-only Prev/Next — LEFT side, hidden on touch (rule above) */
.lux-reels-nav {
  position: absolute; left: 18px; z-index: 200;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.4); border: none;
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.lux-reels-nav:hover    { background: rgba(0,0,0,0.65); }
.lux-reels-nav:disabled { opacity: 0.22; cursor: default; pointer-events: none; }
.lux-reels-prev { top: calc(50% - 56px); }
.lux-reels-next { top: calc(50% + 14px); }`
);

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 3 — Comment sheet: solid background + swipe-down to close CSS
// ═══════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS fix 3: comment sheet solid background + swipe-close transition',
  `/* Comment bottom sheet for reels — slides up from bottom */
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
}`,

  `/* Comment bottom sheet for reels/lightbox — slides up from bottom */
.lux-reel-comment-sheet {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  z-index: 20;
  /* Fully solid — nothing bleeds through */
  background: #111;
  border-top: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px 18px 0 0;
  padding: 16px 16px 36px;
  max-height: 70vh;
  overflow-y: auto;
  /* Swipe-down to close: the JS adds .closing which triggers slide-down */
  transition: transform .28s cubic-bezier(0.4,0,0.6,1);
}
.lux-reel-comment-sheet.animating-in  {
  animation: sheetUp .28s cubic-bezier(0.22,1,0.36,1) both;
}
.lux-reel-comment-sheet.closing {
  transform: translateY(100%);
}
@keyframes sheetUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.lux-reel-comment-sheet-handle {
  width: 40px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.28);
  margin: 0 auto 16px;
  cursor: grab;
  touch-action: none; /* we handle the drag ourselves */
}
.lux-reel-sheet-close {
  position: absolute; top: 14px; right: 16px;
  background: none; border: none; color: rgba(255,255,255,0.55);
  font-size: 20px; cursor: pointer; line-height: 1;
  -webkit-tap-highlight-color: transparent;
}`
);

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 4 — Lightbox: new CSS for image-pane icon bar (reactions + comment)
//           and mobile comment bottom sheet (same as reels, reused class)
//           Also remove .lux-lb-zoom rule since we're deleting that button.
// ═══════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS fix 4: lightbox icon bar (reactions+comment) + remove zoom button CSS',
  `/* Zoom toggle — floats bottom-center now that the filmstrip is gone */
.lux-lb-zoom {
  position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 5;
  background: rgba(0,0,0,0.4); border: none;
  color: rgba(255,255,255,0.75);
  font-family: var(--font-body); font-size: 10px; font-weight: 400;
  letter-spacing: 0.16em; text-transform: uppercase;
  padding: 9px 20px; border-radius: 999px; cursor: pointer; transition: all .2s;
}
.lux-lb-zoom:hover { color: #fff; background: rgba(0,0,0,0.6); }`,

  `/* Lightbox bottom-right icon bar — same pill style as reels bar */
.lux-lb-icon-bar {
  position: absolute;
  right: 14px;
  bottom: 28px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  pointer-events: none;
}
.lux-lb-icon-bar .lux-reel-icon-btn { pointer-events: all; }
/* On desktop the sidebar handles reactions/comments — hide the bar */
@media (min-width: 901px) { .lux-lb-icon-bar { display: none; } }`
);

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 5 — JS: ReelSocialBar — add swipe-down-to-close + sheet-open class
//           on .lux-reels so mute hides, and double-tap close on handle
// ═══════════════════════════════════════════════════════════════════════════
applyPatch(
  'JS fix 5: ReelSocialBar — swipe-down-close + hide mute when sheet open',
  `function ReelSocialBar({ mediaKey, guestName, onNameSaved }) {
  const [reactions, setReactions]       = useState(null);
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [lastReacted, setLastReacted]   = useState(null);
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [comments, setComments]         = useState(null);
  const [newComment, setNewComment]     = useState('');
  const [sending, setSending]           = useState(false);
  const [localName, setLocalName]       = useState(() => (guestName || '').trim() || getStoredName());
  const [editingName, setEditingName]   = useState(false);
  const longPressTimer                  = useRef(null);`,

  `function ReelSocialBar({ mediaKey, guestName, onNameSaved }) {
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
  const sheetRef                        = useRef(null);
  const swipeStartY                     = useRef(null);

  // Add/remove 'sheet-open' on the .lux-reels parent so CSS can hide mute
  useEffect(() => {
    const reelsEl = document.querySelector('.lux-reels');
    if (!reelsEl) return;
    if (sheetOpen) reelsEl.classList.add('sheet-open');
    else           reelsEl.classList.remove('sheet-open');
    return () => reelsEl.classList.remove('sheet-open');
  }, [sheetOpen]);

  // Swipe-down on the sheet handle to dismiss
  function handleSwipeStart(e) {
    swipeStartY.current = e.touches ? e.touches[0].clientY : e.clientY;
  }
  function handleSwipeMove(e) {
    if (swipeStartY.current === null) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dy = y - swipeStartY.current;
    if (dy > 0 && sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(' + dy + 'px)';
    }
  }
  function handleSwipeEnd(e) {
    if (swipeStartY.current === null) return;
    const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const dy = y - swipeStartY.current;
    swipeStartY.current = null;
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (dy > 80) closeSheet();  // dragged down >80px = close
  }

  function openSheet()  { setSheetOpen(true);  setPickerOpen(false); }
  function closeSheet() { setSheetOpen(false); }`
);

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 6 — JS: Update openSheet/closeSheet calls + add ref + swipe handlers
//           to the sheet div, and toggle animating-in class
// ═══════════════════════════════════════════════════════════════════════════
applyPatch(
  'JS fix 6: ReelSocialBar — wire up sheetRef and swipe handlers on sheet',
  `      {/* Comment bottom sheet */}
      {sheetOpen && (
        <div className="lux-reel-comment-sheet" onClick={e => e.stopPropagation()}>
          <div className="lux-reel-comment-sheet-handle" />
          <button
            className="lux-reel-sheet-close"
            onClick={() => setSheetOpen(false)}
            type="button"
          >✕</button>`,

  `      {/* Comment bottom sheet */}
      {sheetOpen && (
        <div
          ref={sheetRef}
          className="lux-reel-comment-sheet animating-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle — swipe down to dismiss */}
          <div
            className="lux-reel-comment-sheet-handle"
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
            onPointerDown={handleSwipeStart}
            onPointerMove={handleSwipeMove}
            onPointerUp={handleSwipeEnd}
          />
          <button
            className="lux-reel-sheet-close"
            onClick={closeSheet}
            type="button"
          >✕</button>`
);

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 7 — JS: Update icon bar buttons to use openSheet / closeSheet
// ═══════════════════════════════════════════════════════════════════════════
applyPatch(
  'JS fix 7: ReelSocialBar icon bar — use openSheet/closeSheet helpers',
  `        {/* Comment icon */}
        <button
          className="lux-reel-icon-btn"
          onClick={() => { setSheetOpen(v => !v); setPickerOpen(false); }}
          type="button"
          aria-label="Comments"
        >`,

  `        {/* Comment icon */}
        <button
          className="lux-reel-icon-btn"
          onClick={() => sheetOpen ? closeSheet() : openSheet()}
          type="button"
          aria-label="Comments"
        >`
);

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 8 — JSX: Remove the Zoom toggle button from lightbox image pane
//           and replace old mobile comment toggle with new icon bar
// ═══════════════════════════════════════════════════════════════════════════
applyPatch(
  'JSX fix 8: lightbox — remove zoom button, replace mobile comment toggle with icon bar',
  `          {/* Zoom toggle */}
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
          </button>`,

  `          {/* Mobile bottom-right: reactions + comment icon bar (desktop uses sidebar) */}
          <div className="lux-lb-icon-bar">
            {/* Reaction buttons */}
            {REACTIONS_LIST.map(({ emoji, label }) => (
              <div key={emoji} style={{ position: 'relative' }}>
                <button
                  className="lux-reel-icon-btn"
                  onClick={() => {
                    if (!currentImg) return;
                    postReaction(mediaKeyFromItem(currentImg), emoji).catch(() => {});
                  }}
                  type="button"
                  aria-label={'React ' + label}
                >
                  <div className="lux-reel-icon-circle" style={{ width: 38, height: 38, fontSize: 18 }}>
                    {emoji}
                  </div>
                </button>
              </div>
            ))}
            {/* Comment icon */}
            <button
              className="lux-reel-icon-btn"
              onClick={() => setShowLbComments(v => !v)}
              type="button"
              aria-label="Comments"
            >
              <div className="lux-reel-icon-circle" style={{ width: 38, height: 38 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h14l4 4V4a2 2 0 00-2-2z"
                    stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
            </button>
          </div>

          {/* Mobile: comment bottom sheet (same sheet as reels, reused styles) */}
          {showLbComments && currentImg && (
            <div
              className="lux-reel-comment-sheet animating-in"
              onClick={e => e.stopPropagation()}
            >
              <div className="lux-reel-comment-sheet-handle" />
              <button
                className="lux-reel-sheet-close"
                onClick={() => setShowLbComments(false)}
                type="button"
              >✕</button>
              <SocialPanel
                mediaKey={mediaKeyFromItem(currentImg)}
                guestName={guestName}
                onNameSaved={updateGuestName}
              />
            </div>
          )}`
);

// ═══════════════════════════════════════════════════════════════════════════
// PATCH 9 — Mobile responsive: adjust close/mute for small screens
//           (they are now position:absolute so offsets are the same)
// ═══════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS fix 9: mobile small-screen reels close/mute sizing (already absolute)',
  `@media (max-width: 639px) {
  .lux-reels-close { top: 14px; left: 12px; width: 40px; height: 40px; }
  .lux-reels-mute  { bottom: 22px; right: 12px; width: 40px; height: 40px; }
  .lux-reel-seek   { left: 12px; right: 12px; bottom: 16px; }
  .lux-reel-caption { left: 12px; right: 12px; bottom: 254px; font-size: 11px; }
}`,
  `@media (max-width: 639px) {
  .lux-reels-close { top: 12px; left: 12px; width: 40px; height: 40px; }
  .lux-reels-mute  { bottom: 20px; right: 12px; width: 40px; height: 40px; }
  .lux-reel-seek   { left: 12px; right: 12px; bottom: 16px; }
  .lux-reel-caption { left: 12px; right: 12px; bottom: 254px; font-size: 11px; }
}`
);

console.log('\n✅  All ' + applied + ' patches applied!\n');
console.log('Next steps:');
console.log('  npm start        — test locally');
console.log('  npm run build    — verify clean build\n');
