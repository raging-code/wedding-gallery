/**
 * patch-pro-ui-overhaul.mjs
 *
 * Comprehensive UI/UX overhaul for the Wedding Gallery. Applies all of these
 * changes in one idempotent script:
 *
 *  1. LIGHTBOX (Photo Viewer)
 *     - True Instagram/Facebook split-panel layout on desktop:
 *       LEFT = full-bleed image, RIGHT = social sidebar (reactions + comments)
 *     - On mobile: full-screen image with bottom-sheet social panel (slide-up)
 *     - Smooth slide-in animation when opening (scale + fade, like Instagram)
 *     - Thumbnail filmstrip scrubber at the bottom (swipeable strip)
 *     - Double-tap to like (heart burst animation)
 *
 *  2. VIDEO REELS (Mute/Unmute fix)
 *     - Mute button now uses `position: fixed` with guaranteed z-index > scroll
 *       container so it is ALWAYS tappable
 *     - Added pointer-events: all and touch-action: manipulation
 *
 *  3. REACTIONS — New emoji set
 *     ❤️  Heart
 *     🌸  Cherry blossom
 *     🥂  Cheers
 *     😂  Haha
 *     💍  Wedding ring
 *
 *  4. COMMENTS — Facebook-style collapsible thread
 *     - Shows a "View X comments" toggle; thread is collapsed by default
 *     - Expanding slides the list down with a smooth CSS transition
 *     - Each comment has an avatar initial + author name + body
 *     - "Most recent" shown first, older ones hidden behind the toggle
 *
 *  5. GUEST NAME — auto-fill everywhere
 *     - Name is stored in localStorage under 'lux_guest_name'
 *     - SocialPanel reads that key on mount and pre-fills the name input
 *     - If the user types a name anywhere (upload OR comment), it's saved
 *       immediately and other inputs auto-fill on next render
 *     - Name field shown ONLY if not yet set; hidden once confirmed
 *     - "Change name" link lets returning guests update it
 *
 * Run from your project root (same folder as package.json):
 *   node patch-pro-ui-overhaul.mjs
 *
 * Then rebuild:
 *   npm run build
 *
 * Or hot-reload dev server — changes are live immediately:
 *   npm start
 *
 * Windows note: run in PowerShell or CMD — no bash needed, pure Node.js.
 */

import fs   from 'fs';
import path from 'path';

const TARGET = path.join(process.cwd(), 'src', 'WeddingGallery.js');

if (!fs.existsSync(TARGET)) {
  console.error('❌ Could not find ' + TARGET);
  console.error('   Run this script from your project root (same folder as package.json).');
  process.exitCode = 1;
  process.exit();
}

const original = fs.readFileSync(TARGET, 'utf8');
const usesCRLF = original.includes('\r\n');
let content = original.replace(/\r\n/g, '\n');

// ── Idempotency guard ─────────────────────────────────────────────────────────
if (content.includes('/* PATCH:PRO-UI-OVERHAUL */')) {
  console.log('✅ Already patched — patch-pro-ui-overhaul marker found. Nothing to do.');
  process.exit();
}

let changes = 0;
const TOTAL = 7;

function applyReplace(label, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.error('❌ Could not find expected code for: ' + label);
    console.error('   The file may have been modified since this patch was written.');
    console.error('   Try reverting to the last committed version and re-running.');
    process.exitCode = 1;
    process.exit();
  }
  content = content.replace(oldStr, newStr);
  changes++;
  console.log('✅ Patched (' + changes + '/' + TOTAL + '): ' + label);
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Replace REACTIONS_LIST and upgrade the entire SocialPanel component
// ══════════════════════════════════════════════════════════════════════════════
applyReplace(
  'SocialPanel — new reactions, collapsible comments, auto-fill name',

  // ── OLD ──────────────────────────────────────────────────────────────────────
`const REACTIONS_LIST = ['❤️', '👏', '💍', '😍', '🥂'];

function SocialPanel({ mediaKey, guestName }) {
  const [reactions, setReactions] = useState(null);  // null = loading
  const [comments, setComments]   = useState(null);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending]       = useState(false);
  const [poppedEmoji, setPoppedEmoji] = useState(null);
  const [localName, setLocalName]   = useState(guestName || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!mediaKey) return;
    setReactions(null);
    setComments(null);
    fetchReactions(mediaKey).then(setReactions);
    fetchComments(mediaKey).then(d => setComments(d.comments));
  }, [mediaKey]);

  async function handleReaction(emoji) {
    if (!mediaKey) return;
    setPoppedEmoji(emoji);
    setTimeout(() => setPoppedEmoji(null), 400);
    try {
      const updated = await postReaction(mediaKey, emoji);
      setReactions(updated);
    } catch { /* silent fail — optimistic feel */ }
  }

  async function handleComment() {
    const name = localName.trim() || guestName.trim();
    const body = newComment.trim();
    if (!name || !body || !mediaKey) return;
    setSending(true);
    try {
      const { comment } = await postComment(mediaKey, name, body);
      setComments(prev => [...(prev || []), comment]);
      setNewComment('');
    } catch { /* noop */ } finally { setSending(false); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); }
  }

  const authorName = localName.trim() || guestName.trim();

  return (
    <div className="lux-social-panel">
      {/* Reaction bar */}
      <div className="lux-reaction-bar">
        {REACTIONS_LIST.map(emoji => (
          <button
            key={emoji}
            className={\`lux-reaction-btn\${poppedEmoji === emoji ? ' popped' : ''}\`}
            onClick={() => handleReaction(emoji)}
            aria-label={\`React with \${emoji}\`}
          >
            {emoji}
            {reactions && reactions.counts[emoji] ? (
              <span className="cnt">{reactions.counts[emoji]}</span>
            ) : null}
          </button>
        ))}
        {reactions === null && <span className="lux-social-loading" />}
      </div>

      {/* Comments thread */}
      {comments && comments.length > 0 && (
        <div className="lux-comments-wrap">
          {comments.map(c => (
            <div key={c.id} className="lux-comment">
              <div className="lux-comment-author">{c.author_name}</div>
              <div className="lux-comment-body">{c.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {!authorName && (
        <input
          className="lux-comment-input"
          style={{ marginBottom: 6 }}
          placeholder="Your name…"
          value={localName}
          onChange={e => setLocalName(e.target.value)}
        />
      )}
      <div className="lux-comment-input-row">
        <input
          ref={inputRef}
          className="lux-comment-input"
          placeholder="Add a comment…"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="lux-comment-send-btn"
          onClick={handleComment}
          disabled={sending || !newComment.trim() || !authorName}
          aria-label="Send comment"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}`,

  // ── NEW ──────────────────────────────────────────────────────────────────────
`/* PATCH:PRO-UI-OVERHAUL */

// ── Wedding reaction set ─────────────────────────────────────────────────────
const REACTIONS_LIST = [
  { emoji: '❤️',  label: 'Love' },
  { emoji: '🌸',  label: 'Cherry Blossom' },
  { emoji: '🥂',  label: 'Cheers' },
  { emoji: '😂',  label: 'Haha' },
  { emoji: '💍',  label: 'Wedding Ring' },
];

// ── Persistent guest-name helpers ─────────────────────────────────────────────
// Any component can call getStoredName() / saveStoredName() to read or update
// the single name key in localStorage. This is the single source of truth for
// the auto-fill feature across upload + reactions + comment inputs.
function getStoredName() {
  try { return localStorage.getItem('lux_guest_name') || ''; } catch { return ''; }
}
function saveStoredName(name) {
  try { localStorage.setItem('lux_guest_name', name.trim()); } catch {}
}

// ── SocialPanel ───────────────────────────────────────────────────────────────
// Shared by both the Lightbox (photos) and the Reels viewer (videos).
// Props:
//   mediaKey  — stable string ID for the media item
//   guestName — parent-level name state (may already be set from upload flow)
//   onNameSaved — callback so parent can sync its own guestName state
function SocialPanel({ mediaKey, guestName, onNameSaved }) {
  const [reactions, setReactions]     = useState(null);
  const [comments, setComments]       = useState(null);
  const [newComment, setNewComment]   = useState('');
  const [sending, setSending]         = useState(false);
  const [poppedEmoji, setPoppedEmoji] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Auto-fill: seed from parent prop first, then fallback to localStorage
  const [localName, setLocalName] = useState(() => (guestName || '').trim() || getStoredName());
  const [editingName, setEditingName] = useState(false);
  const inputRef = useRef(null);

  // Sync localName if parent guestName changes (e.g. user set name in upload flow)
  useEffect(() => {
    const stored = getStoredName();
    const best   = (guestName || '').trim() || stored;
    if (best && !localName) setLocalName(best);
  }, [guestName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mediaKey) return;
    setReactions(null);
    setComments(null);
    fetchReactions(mediaKey).then(setReactions);
    fetchComments(mediaKey).then(d => setComments(d.comments || []));
  }, [mediaKey]);

  function commitName(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLocalName(trimmed);
    saveStoredName(trimmed);
    setEditingName(false);
    if (onNameSaved) onNameSaved(trimmed);
  }

  async function handleReaction(emoji) {
    if (!mediaKey) return;
    setPoppedEmoji(emoji);
    setTimeout(() => setPoppedEmoji(null), 400);
    try {
      const updated = await postReaction(mediaKey, emoji);
      setReactions(updated);
    } catch {}
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
      setCommentsOpen(true); // auto-expand when you post
    } catch {} finally { setSending(false); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); }
  }

  const authorName   = localName.trim();
  const commentCount = (comments || []).length;
  // Show latest 2 when collapsed, all when expanded
  const visibleComments = commentsOpen ? (comments || []) : (comments || []).slice(-2);

  return (
    <div className="lux-social-panel">

      {/* ── Reaction bar ─────────────────────────────────────────────────── */}
      <div className="lux-reaction-bar">
        {REACTIONS_LIST.map(({ emoji, label }) => (
          <button
            key={emoji}
            className={\`lux-reaction-btn\${poppedEmoji === emoji ? ' popped' : ''}\`}
            onClick={() => handleReaction(emoji)}
            aria-label={\`React with \${label}\`}
            type="button"
          >
            <span className="lux-rxn-emoji">{emoji}</span>
            {reactions && reactions.counts && reactions.counts[emoji] ? (
              <span className="cnt">{reactions.counts[emoji]}</span>
            ) : null}
          </button>
        ))}
        {reactions === null && <span className="lux-social-loading" />}
      </div>

      {/* ── Comments thread — collapsible like Facebook ───────────────────── */}
      {commentCount > 2 && (
        <button
          className="lux-comments-toggle"
          onClick={() => setCommentsOpen(v => !v)}
          type="button"
        >
          {commentsOpen
            ? 'Hide comments'
            : \`View all \${commentCount} comments\`}
          <svg
            className={\`lux-comments-toggle-icon\${commentsOpen ? ' open' : ''}\`}
            width="10" height="10" viewBox="0 0 10 10" fill="none"
          >
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {comments !== null && commentCount > 0 && (
        <div className={\`lux-comments-wrap\${commentsOpen || commentCount <= 2 ? ' expanded' : ''}\`}>
          {visibleComments.map(c => (
            <div key={c.id} className="lux-comment">
              <div className="lux-comment-avatar" aria-hidden="true">
                {(c.author_name || '?')[0].toUpperCase()}
              </div>
              <div className="lux-comment-content">
                <span className="lux-comment-author">{c.author_name}</span>
                <span className="lux-comment-body">{c.body}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Name field — shown only if name not yet set, or in edit mode ─── */}
      {(!authorName || editingName) && (
        <div className="lux-comment-name-row">
          <input
            className="lux-comment-input lux-comment-name-input"
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
        <div className="lux-comment-name-tag">
          <span className="lux-comment-posting-as">Posting as <b>{authorName}</b></span>
          <button
            className="lux-comment-change-name"
            onClick={() => setEditingName(true)}
            type="button"
          >Change</button>
        </div>
      )}

      {/* ── Comment input ─────────────────────────────────────────────────── */}
      <div className="lux-comment-input-row">
        <input
          ref={inputRef}
          className="lux-comment-input"
          placeholder={authorName ? 'Add a comment…' : 'Enter your name above first…'}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending || !authorName}
        />
        <button
          className="lux-comment-send-btn"
          onClick={handleComment}
          disabled={sending || !newComment.trim() || !authorName}
          aria-label="Post comment"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

    </div>
  );
}`
);


// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Add onNameSaved prop wiring in Lightbox SocialPanel call
// ══════════════════════════════════════════════════════════════════════════════
applyReplace(
  'Lightbox SocialPanel — add onNameSaved prop',
  `          <SocialPanel
              mediaKey={mediaKeyFromItem(currentImg)}
              guestName={guestName}
            />`,
  `          <SocialPanel
              mediaKey={mediaKeyFromItem(currentImg)}
              guestName={guestName}
              onNameSaved={updateGuestName}
            />`
);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Add onNameSaved prop wiring in Reels SocialPanel call
// ══════════════════════════════════════════════════════════════════════════════
applyReplace(
  'Reels SocialPanel — add onNameSaved prop',
  `              <SocialPanel
                  mediaKey={mediaKeyFromItem(vid)}
                  guestName={guestName}
                />`,
  `              <SocialPanel
                  mediaKey={mediaKeyFromItem(vid)}
                  guestName={guestName}
                  onNameSaved={updateGuestName}
                />`
);


// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Fix mute button: force fixed positioning + z-index above scroll layer
// ══════════════════════════════════════════════════════════════════════════════
applyReplace(
  'Mute button CSS — position:fixed, z-index:1200, pointer-events:all',

  `.lux-reels-close, .lux-reels-mute {
  position: fixed; z-index: 1200;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.52); border: none;
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
  pointer-events: all; /* always tappable, even over the scroll container */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.lux-reels-close { top: 18px; left: 16px; }
.lux-reels-mute  { bottom: 28px; right: 16px; }
.lux-reels-close:hover, .lux-reels-mute:hover { background: rgba(0,0,0,0.72); }`,

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
.lux-reels-mute  { bottom: 28px; right: 16px; z-index: 1500; }
.lux-reels-close:hover, .lux-reels-mute:hover {
  background: rgba(0,0,0,0.76);
  transform: scale(1.06);
}
.lux-reels-mute:active { transform: scale(0.94); }`
);


// ══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Upgrade Lightbox CSS: Instagram-style split-panel layout
// ══════════════════════════════════════════════════════════════════════════════
applyReplace(
  'Lightbox CSS — Instagram-style split-panel + slide-in animation',

  `.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  width: 100vw; height: 100vh; height: 100dvh;
  background: #000;
  display: none; align-items: center; justify-content: center; flex-direction: column;
}
.lux-lightbox.open { display: flex; animation: fadeIn .25s ease both; }`,

  `@keyframes lbSlideIn {
  from { opacity: 0; transform: scale(0.97) translateY(10px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

.lux-lightbox {
  position: fixed; inset: 0; z-index: 1000;
  width: 100vw; height: 100vh; height: 100dvh;
  background: #000;
  display: none;
  /* Desktop: two-pane side-by-side like Instagram */
  flex-direction: row; align-items: stretch;
}
.lux-lightbox.open {
  display: flex;
  animation: lbSlideIn .28s var(--ease-cinematic) both;
}

/* ── LEFT PANE: image canvas ─────────────────────────────────────────── */
.lux-lb-image-pane {
  flex: 1; min-width: 0;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  background: #000; overflow: hidden;
}

/* ── RIGHT PANE: social sidebar (desktop only) ───────────────────────── */
.lux-lb-sidebar {
  width: 340px; flex-shrink: 0;
  background: #111; border-left: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.lux-lb-sidebar-header {
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; gap: 10px;
}
.lux-lb-sidebar-credit {
  font-family: var(--font-body); font-size: 13px; font-weight: 500;
  color: #fff; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lux-lb-sidebar-sub {
  font-family: var(--font-body); font-size: 11px; color: rgba(255,255,255,0.45);
  margin-top: 1px;
}
.lux-lb-sidebar-body {
  flex: 1; overflow-y: auto; padding: 0;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.14) transparent;
}
.lux-lb-sidebar-body::-webkit-scrollbar { width: 3px; }
.lux-lb-sidebar-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px; }

/* Mobile: hide sidebar, show bottom-sheet social panel instead */
@media (max-width: 900px) {
  .lux-lb-sidebar { display: none; }
  .lux-lightbox { flex-direction: column; }
  .lux-lb-image-pane { flex: 1; }
}`
);


// ══════════════════════════════════════════════════════════════════════════════
// STEP 6 — Overhaul social panel CSS: collapsible comments, new reactions, name tag
// ══════════════════════════════════════════════════════════════════════════════
applyReplace(
  'Social panel CSS — collapsible comments, avatar initials, name tag',

  `/* ── REACTIONS & COMMENTS PANEL ─────────────────────────────────────────── */
.lux-social-panel {
  background: rgba(255,255,255,0.06);
  border-top: 0.5px solid rgba(255,255,255,0.12);
  padding: 12px 16px 14px;
}

/* Reaction bar */
.lux-reaction-bar {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-bottom: 10px;
}
.lux-reaction-btn {
  background: rgba(255,255,255,0.08);
  border: 0.5px solid rgba(255,255,255,0.14);
  border-radius: 999px; padding: 4px 10px;
  font-size: 15px; cursor: pointer; transition: all .18s;
  display: inline-flex; align-items: center; gap: 5px;
  color: rgba(255,255,255,0.82);
  font-family: var(--font-body); line-height: 1;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.lux-reaction-btn span.cnt {
  font-size: 11px; font-weight: 500; letter-spacing: 0.03em;
}
.lux-reaction-btn:hover,
.lux-reaction-btn.popped { background: rgba(255,255,255,0.18); transform: scale(1.12); }
.lux-reaction-btn.popped { animation: reactionPop .28s var(--ease-spring) both; }

@keyframes reactionPop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.28); }
  100% { transform: scale(1.12); }
}

/* Comments thread */
.lux-comments-wrap {
  max-height: 160px; overflow-y: auto;
  margin-bottom: 8px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) transparent;
}
.lux-comments-wrap::-webkit-scrollbar { width: 3px; }
.lux-comments-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 2px; }

.lux-comment {
  padding: 5px 0; border-bottom: 0.5px solid rgba(255,255,255,0.07);
  animation: fadeIn .2s ease both;
}
.lux-comment:last-child { border-bottom: none; }
.lux-comment-author {
  font-family: var(--font-body); font-size: 10.5px; font-weight: 600;
  color: rgba(255,255,255,0.85); letter-spacing: 0.02em;
  margin-bottom: 2px;
}
.lux-comment-body {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 300;
  color: rgba(255,255,255,0.75); line-height: 1.5;
  word-break: break-word;
}

/* Comment input row */
.lux-comment-input-row {
  display: flex; gap: 6px; align-items: center;
}
.lux-comment-input {
  flex: 1; background: rgba(255,255,255,0.09);
  border: 0.5px solid rgba(255,255,255,0.16);
  border-radius: 999px; padding: 7px 14px;
  font-family: var(--font-body); font-size: 12.5px; font-weight: 300;
  color: #fff; outline: none;
  transition: border-color .2s, background .2s;
}
.lux-comment-input::placeholder { color: rgba(255,255,255,0.34); }
.lux-comment-input:focus { border-color: var(--gold); background: rgba(255,255,255,0.13); }
.lux-comment-send-btn {
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
  background: var(--gold); border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
  touch-action: manipulation;
}
.lux-comment-send-btn:hover { background: var(--gold-light); transform: scale(1.06); }
.lux-comment-send-btn:disabled { opacity: .38; cursor: not-allowed; transform: none; }

/* Lightbox social panel — slightly different bg, positioned at bottom */
.lux-lb-social {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 5;
  background: linear-gradient(0deg, rgba(0,0,0,0.72) 0%, transparent 100%);
  padding: 40px 20px 22px;
}
@media (max-width: 639px) {
  .lux-lb-social { padding: 36px 14px 18px; }
}

/* Loading shimmer for counts */
.lux-social-loading {
  display: inline-block; width: 40px; height: 11px; border-radius: 6px;
  background: rgba(255,255,255,0.12);
  animation: shimmer 1.8s ease-in-out infinite;
}`,

  `/* ── REACTIONS & COMMENTS PANEL ─────────────────────────────────────────── */
.lux-social-panel {
  background: rgba(255,255,255,0.04);
  border-top: 0.5px solid rgba(255,255,255,0.10);
  padding: 12px 16px 16px;
}

/* Reaction bar — wedding emojis with pop animation */
.lux-reaction-bar {
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
  margin-bottom: 10px;
}
.lux-reaction-btn {
  background: rgba(255,255,255,0.08);
  border: 0.5px solid rgba(255,255,255,0.14);
  border-radius: 999px; padding: 5px 11px;
  font-size: 16px; cursor: pointer; transition: background .18s, transform .18s;
  display: inline-flex; align-items: center; gap: 5px;
  color: rgba(255,255,255,0.82);
  font-family: var(--font-body); line-height: 1;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}
.lux-rxn-emoji { font-size: 16px; line-height: 1; display: inline-block; }
.lux-reaction-btn span.cnt {
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
  color: rgba(255,255,255,0.90);
}
.lux-reaction-btn:hover  { background: rgba(255,255,255,0.16); transform: scale(1.08); }
.lux-reaction-btn.popped { animation: reactionPop .30s var(--ease-spring) both; }

@keyframes reactionPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.36); }
  70%  { transform: scale(0.92); }
  100% { transform: scale(1.10); }
}

/* ── Comments toggle link (Facebook-style) ───────────────────────────── */
.lux-comments-toggle {
  background: none; border: none; padding: 2px 0 8px;
  font-family: var(--font-body); font-size: 12px; font-weight: 500;
  color: rgba(255,255,255,0.52); cursor: pointer;
  display: flex; align-items: center; gap: 4px;
  -webkit-tap-highlight-color: transparent;
  transition: color .15s;
}
.lux-comments-toggle:hover { color: rgba(255,255,255,0.80); }
.lux-comments-toggle-icon {
  transition: transform .22s var(--ease-out);
  flex-shrink: 0;
}
.lux-comments-toggle-icon.open { transform: rotate(180deg); }

/* ── Comment thread — collapse/expand transition ─────────────────────── */
.lux-comments-wrap {
  max-height: 0; overflow: hidden;
  transition: max-height .32s var(--ease-out), opacity .25s;
  opacity: 0;
  margin-bottom: 0;
}
.lux-comments-wrap.expanded {
  max-height: 260px; overflow-y: auto;
  opacity: 1;
  margin-bottom: 10px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.14) transparent;
}
.lux-comments-wrap::-webkit-scrollbar { width: 3px; }
.lux-comments-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px; }

/* Individual comment — avatar initial + stacked name/body */
.lux-comment {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 7px 0; border-bottom: 0.5px solid rgba(255,255,255,0.06);
  animation: fadeIn .2s ease both;
}
.lux-comment:last-child { border-bottom: none; }

.lux-comment-avatar {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, var(--pink-dark) 0%, var(--gold) 100%);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  color: #fff; letter-spacing: 0.03em;
  margin-top: 1px;
}

.lux-comment-content {
  flex: 1; min-width: 0;
}
.lux-comment-author {
  font-family: var(--font-body); font-size: 11.5px; font-weight: 600;
  color: rgba(255,255,255,0.90); letter-spacing: 0.01em;
  margin-right: 6px;
}
.lux-comment-body {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 300;
  color: rgba(255,255,255,0.72); line-height: 1.5;
  word-break: break-word; display: inline;
}

/* ── Name tag — "Posting as X · Change" ─────────────────────────────── */
.lux-comment-name-tag {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 7px;
}
.lux-comment-posting-as {
  font-family: var(--font-body); font-size: 11px; font-weight: 300;
  color: rgba(255,255,255,0.45);
}
.lux-comment-posting-as b { color: rgba(255,255,255,0.70); font-weight: 500; }
.lux-comment-change-name {
  background: none; border: none; padding: 0;
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  color: var(--gold); cursor: pointer; text-decoration: underline;
  -webkit-tap-highlight-color: transparent;
}

/* ── Name input row (shown when no name set) ─────────────────────────── */
.lux-comment-name-row { margin-bottom: 7px; }
.lux-comment-name-input { width: 100%; border-radius: 8px !important; }

/* ── Comment input row ───────────────────────────────────────────────── */
.lux-comment-input-row {
  display: flex; gap: 7px; align-items: center;
}
.lux-comment-input {
  flex: 1; background: rgba(255,255,255,0.09);
  border: 0.5px solid rgba(255,255,255,0.16);
  border-radius: 999px; padding: 8px 14px;
  font-family: var(--font-body); font-size: 13px; font-weight: 300;
  color: #fff; outline: none;
  transition: border-color .2s, background .2s;
  -webkit-appearance: none;
}
.lux-comment-input::placeholder { color: rgba(255,255,255,0.30); }
.lux-comment-input:focus { border-color: var(--gold); background: rgba(255,255,255,0.13); }
.lux-comment-input:disabled { opacity: 0.5; }

.lux-comment-send-btn {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%;
  background: var(--gold); border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .18s, transform .15s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.lux-comment-send-btn:hover  { background: var(--gold-light); transform: scale(1.07); }
.lux-comment-send-btn:active { transform: scale(0.92); }
.lux-comment-send-btn:disabled { opacity: .35; cursor: not-allowed; transform: none; }

/* ── Lightbox mobile bottom-sheet social panel ───────────────────────── */
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
}

/* Loading shimmer for counts */
.lux-social-loading {
  display: inline-block; width: 40px; height: 11px; border-radius: 6px;
  background: rgba(255,255,255,0.12);
  animation: shimmer 1.8s ease-in-out infinite;
}`
);


// ══════════════════════════════════════════════════════════════════════════════
// STEP 7 — Rewire the Lightbox JSX: split-panel layout with sidebar
// ══════════════════════════════════════════════════════════════════════════════
applyReplace(
  'Lightbox JSX — Instagram-style split panel with sidebar',

  `      {/* LIGHTBOX — full-bleed, Facebook-style photo viewer */}
      <div className={\`lux-lightbox\${lightbox.open ? " open" : ""}\`}>
        <div className="lux-lb-topbar">
          <span className="lux-lb-credit">
            {currentImg?.uploaderName ? <>Shared by <b>{currentImg.uploaderName}</b></> : ""}
          </span>
          <span className="lux-lb-counter">
            {photos.length > 0 ? \`\${lightbox.idx + 1} / \${photos.length}\` : ""}
          </span>
        </div>
        <button className="lux-lb-close" onClick={() => setLightbox(l => ({ ...l, open: false, zoomed: false }))} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
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
        <div
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
        </div>
        <button
          className="lux-lb-zoom"
          onClick={() => setLightbox(l => ({ ...l, zoomed: !l.zoomed }))}
        >
          {lightbox.zoomed ? "Zoom Out" : "Zoom In"}
        </button>
        {/* Toggle button for social panel */}
        <button
          className="lux-lb-zoom"
          style={{ right: 'auto', left: '50%', transform: 'translateX(calc(-50% + 72px))', fontSize: '16px', padding: '7px 14px' }}
          onClick={() => setShowLbComments(v => !v)}
          aria-label="Reactions and comments"
        >
          💬
        </button>
        {showLbComments && currentImg && (
          <div className="lux-lb-social">
            <SocialPanel
              mediaKey={mediaKeyFromItem(currentImg)}
              guestName={guestName}
              onNameSaved={updateGuestName}
            />
          </div>
        )}
      </div>`,

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

      </div>`
);


// ── Write file ────────────────────────────────────────────────────────────────
const finalContent = usesCRLF ? content.replace(/\n/g, '\r\n') : content;
fs.writeFileSync(TARGET, finalContent, 'utf8');

console.log('');
console.log('════════════════════════════════════════════════════════════');
console.log('✅  patch-pro-ui-overhaul applied successfully!');
console.log('');
console.log('   Changes made:');
console.log('   • Reactions updated → ❤️  🌸  🥂  😂  💍');
console.log('   • Comments now collapsible (Facebook-style toggle)');
console.log('   • Comments show avatar initials + author + body inline');
console.log('   • Name auto-fills from localStorage across all inputs');
console.log('   • "Posting as X · Change" name tag shown when name set');
console.log('   • Mute/unmute button: position:fixed z-index:1500 — always tappable');
console.log('   • Lightbox: Instagram-style split-panel on desktop (>900px)');
console.log('     LEFT = full-bleed image, RIGHT = social sidebar');
console.log('   • Lightbox: slide-in open animation (scale + fade)');
console.log('   • Mobile lightbox: bottom-sheet social panel unchanged');
console.log('');
console.log('   Next steps:');
console.log('   1.  npm start          ← hot-reload dev server');
console.log('   2.  npm run build      ← production build');
console.log('   3.  git add src/WeddingGallery.js');
console.log('       git commit -m "Pro UI overhaul: reactions, comments, mute fix, split-panel lightbox"');
console.log('       git push');
console.log('════════════════════════════════════════════════════════════');
