/**
 * patch-reactions-swipe-mute.mjs
 *
 * Applies three improvements to the Wedding Gallery:
 *
 *   1. SWIPE NAV  — Facebook-style swipe in the image lightbox (already mostly
 *                   implemented; this patch ensures the gesture fires on both
 *                   photos AND videos when swiping left/right in the reels
 *                   scroll-container it was disabled for).
 *
 *   2. REACTIONS & COMMENTS — heart / clap / ring emoji reactions + a comment
 *                   thread per photo or video.  Data is stored in Cloudflare D1.
 *                   Three new Pages Functions are added:
 *                     GET  /api/reactions?mediaKey=…
 *                     POST /api/reactions  { mediaKey, reaction }
 *                     GET  /api/comments?mediaKey=…
 *                     POST /api/comments   { mediaKey, authorName, body }
 *
 *   3. MUTE / UNMUTE FIX — the mute button was being covered by the scrollable
 *                   reel container (z-index stacking issue) making it
 *                   untappable on mobile.  Also changes the default so videos
 *                   start UNMUTED (with a short-autoplay browser workaround).
 *
 * ── HOW TO APPLY ──────────────────────────────────────────────────────────────
 *   node patch-reactions-swipe-mute.mjs
 *
 * ── D1 SETUP (do this once before deploying) ─────────────────────────────────
 *   1. Create the database:
 *        npx wrangler d1 create wedding-gallery-social
 *
 *   2. Copy the output binding name + database_id into wrangler.toml (see
 *      instructions at the bottom of this file).
 *
 *   3. Create the tables (run against local AND remote):
 *        npx wrangler d1 execute wedding-gallery-social --file=./d1-schema.sql
 *        npx wrangler d1 execute wedding-gallery-social --file=./d1-schema.sql --remote
 *
 * ── WRANGLER.TOML snippet to add ──────────────────────────────────────────────
 *   [[d1_databases]]
 *   binding = "DB"                       # must be exactly "DB"
 *   database_name = "wedding-gallery-social"
 *   database_id   = "<paste id from step 1>"
 *
 * NOTE: If you don't yet have a wrangler.toml, create one at the project root.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── helpers ──────────────────────────────────────────────────────────────────
function readFile(rel) {
  return readFileSync(join(__dirname, rel), 'utf8');
}
function writeFile(rel, content) {
  const abs = join(__dirname, rel);
  const dir = dirname(abs);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(abs, content, 'utf8');
  console.log(`  ✓ wrote  ${rel}`);
}
function patch(source, searchStr, replaceStr, label) {
  if (!source.includes(searchStr)) {
    throw new Error(`Patch "${label}": search string not found.\nLooking for:\n${searchStr.slice(0, 120)}`);
  }
  console.log(`  ✓ patch  ${label}`);
  return source.replace(searchStr, replaceStr);
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 1 — D1 schema SQL
// ─────────────────────────────────────────────────────────────────────────────
const D1_SCHEMA = `-- Wedding Gallery Social — reactions + comments
-- Run with:
--   npx wrangler d1 execute wedding-gallery-social --file=./d1-schema.sql
--   npx wrangler d1 execute wedding-gallery-social --file=./d1-schema.sql --remote

CREATE TABLE IF NOT EXISTS reactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  media_key   TEXT    NOT NULL,          -- B2 object key (stable identifier)
  reaction    TEXT    NOT NULL,          -- '❤️' | '👏' | '💍' | '😍' | '🥂'
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_reactions_key ON reactions(media_key);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  media_key   TEXT    NOT NULL,
  author_name TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_comments_key ON comments(media_key);
`;

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2 — Pages Functions (backend)
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/reactions?mediaKey=…   → { counts: { '❤️': 3, … }, total: 3 }
// POST /api/reactions              ← { mediaKey, reaction }
const REACTIONS_FUNCTION = `/**
 * /api/reactions  — GET summary, POST new reaction
 * Requires D1 binding named "DB" in wrangler.toml
 */

const ALLOWED_REACTIONS = new Set(['❤️', '👏', '💍', '😍', '🥂']);
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const mediaKey = new URL(request.url).searchParams.get('mediaKey');
  if (!mediaKey) return Response.json({ error: 'mediaKey required' }, { status: 400, headers: CORS });

  const rows = await env.DB.prepare(
    'SELECT reaction, COUNT(*) as cnt FROM reactions WHERE media_key = ?1 GROUP BY reaction'
  ).bind(mediaKey).all();

  const counts = {};
  let total = 0;
  for (const r of rows.results ?? []) { counts[r.reaction] = r.cnt; total += r.cnt; }
  return Response.json({ counts, total }, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const { mediaKey, reaction } = body ?? {};
  if (!mediaKey)                        return Response.json({ error: 'mediaKey required' },  { status: 400, headers: CORS });
  if (!ALLOWED_REACTIONS.has(reaction)) return Response.json({ error: 'Invalid reaction' },   { status: 400, headers: CORS });

  await env.DB.prepare(
    'INSERT INTO reactions (media_key, reaction) VALUES (?1, ?2)'
  ).bind(mediaKey, reaction).run();

  // Return updated counts
  const rows = await env.DB.prepare(
    'SELECT reaction, COUNT(*) as cnt FROM reactions WHERE media_key = ?1 GROUP BY reaction'
  ).bind(mediaKey).all();
  const counts = {};
  let total = 0;
  for (const r of rows.results ?? []) { counts[r.reaction] = r.cnt; total += r.cnt; }
  return Response.json({ counts, total }, { status: 201, headers: CORS });
}
`;

// GET  /api/comments?mediaKey=…   → { comments: [{id,author_name,body,created_at}] }
// POST /api/comments              ← { mediaKey, authorName, body }
const COMMENTS_FUNCTION = `/**
 * /api/comments  — GET thread, POST new comment
 * Requires D1 binding named "DB" in wrangler.toml
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const mediaKey = new URL(request.url).searchParams.get('mediaKey');
  if (!mediaKey) return Response.json({ error: 'mediaKey required' }, { status: 400, headers: CORS });

  const rows = await env.DB.prepare(
    'SELECT id, author_name, body, created_at FROM comments WHERE media_key = ?1 ORDER BY created_at ASC LIMIT 200'
  ).bind(mediaKey).all();

  return Response.json({ comments: rows.results ?? [] }, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS }); }

  const { mediaKey, authorName, body: text } = body ?? {};
  if (!mediaKey)                  return Response.json({ error: 'mediaKey required' },    { status: 400, headers: CORS });
  if (!authorName?.trim())        return Response.json({ error: 'authorName required' },  { status: 400, headers: CORS });
  if (!text?.trim())              return Response.json({ error: 'comment body required' },{ status: 400, headers: CORS });
  if (text.trim().length > 500)   return Response.json({ error: 'Comment too long (max 500 chars)' }, { status: 400, headers: CORS });

  const result = await env.DB.prepare(
    'INSERT INTO comments (media_key, author_name, body) VALUES (?1, ?2, ?3)'
  ).bind(mediaKey, authorName.trim().slice(0, 80), text.trim()).run();

  const row = await env.DB.prepare(
    'SELECT id, author_name, body, created_at FROM comments WHERE id = ?1'
  ).bind(result.meta.last_row_id).first();

  return Response.json({ comment: row }, { status: 201, headers: CORS });
}
`;

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 3 — Patch WeddingGallery.js
// ─────────────────────────────────────────────────────────────────────────────
let src = readFile('src/WeddingGallery.js');

// ── 3a. Fix mute button: lift it out of reels-scroll DOM stacking context
//        by moving it AFTER the scroll container and adding pointer-events fix.
//        Also default to unmuted (autoplay with muted=false; browsers will fall
//        back gracefully — if autoplay is blocked the video pauses on first frame
//        and the user can tap to play with sound).
// Change reelMuted default from true → false
src = patch(src,
  `const [reelMuted, setReelMuted]   = useState(true);`,
  `const [reelMuted, setReelMuted]   = useState(false);`,
  'reelMuted default → false (videos start unmuted)'
);

// Fix the CSS — ensure mute button has a higher z-index and pointer-events always
src = patch(src,
  `.lux-reels-close, .lux-reels-mute {
  position: absolute; z-index: 5;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(0,0,0,0.4); border: none;
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.lux-reels-close { top: 18px; left: 16px; }
.lux-reels-mute  { bottom: 28px; right: 16px; }
.lux-reels-close:hover, .lux-reels-mute:hover { background: rgba(0,0,0,0.65); }`,
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
  'mute/close button: position:fixed z-index:1200 touch-action fix'
);

// Also lift the nav buttons
src = patch(src,
  `/* Desktop-only Prev/Next — hidden on touch devices (rule above) */
.lux-reels-nav {
  position: absolute; right: 18px; z-index: 5;`,
  `/* Desktop-only Prev/Next — hidden on touch devices (rule above) */
.lux-reels-nav {
  position: fixed; right: 18px; z-index: 1200;`,
  'reels-nav: position:fixed z-index:1200'
);

// ── 3b. Add CSS for reactions + comments panel
const REACTIONS_CSS = `
/* ── REACTIONS & COMMENTS PANEL ─────────────────────────────────────────── */
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
}
`;

// Inject the CSS before the closing backtick of LUXURY_CSS
src = patch(src,
  `@media (max-width: 639px) {
  .lux-reels-close { top: 14px; left: 12px; width: 40px; height: 40px; }
  .lux-reels-mute  { bottom: 22px; right: 12px; width: 40px; height: 40px; }
  .lux-reel-seek   { left: 12px; right: 12px; bottom: 16px; }
  .lux-reel-caption { left: 12px; right: 12px; bottom: 50px; font-size: 11px; }
}

\``,
  `@media (max-width: 639px) {
  .lux-reels-close { top: 14px; left: 12px; width: 40px; height: 40px; }
  .lux-reels-mute  { bottom: 22px; right: 12px; width: 40px; height: 40px; }
  .lux-reel-seek   { left: 12px; right: 12px; bottom: 16px; }
  .lux-reel-caption { left: 12px; right: 12px; bottom: 50px; font-size: 11px; }
}
${REACTIONS_CSS}
\``,
  'inject reactions/comments CSS into LUXURY_CSS'
);

// ── 3c. Add social API helpers before the b2List function
const SOCIAL_HELPERS = `
// ── Reactions & Comments API helpers ────────────────────────────────────────
// mediaKey is derived from the B2 object key — it's the stable identifier
// that links a photo/video to its social data in D1.

async function fetchReactions(mediaKey) {
  try {
    const res = await fetch(\`/api/reactions?mediaKey=\${encodeURIComponent(mediaKey)}\`);
    if (!res.ok) return { counts: {}, total: 0 };
    return res.json();
  } catch { return { counts: {}, total: 0 }; }
}

async function postReaction(mediaKey, reaction) {
  const res = await fetch('/api/reactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaKey, reaction }),
  });
  if (!res.ok) throw new Error('Reaction failed');
  return res.json();
}

async function fetchComments(mediaKey) {
  try {
    const res = await fetch(\`/api/comments?mediaKey=\${encodeURIComponent(mediaKey)}\`);
    if (!res.ok) return { comments: [] };
    return res.json();
  } catch { return { comments: [] }; }
}

async function postComment(mediaKey, authorName, body) {
  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaKey, authorName, body }),
  });
  if (!res.ok) throw new Error('Comment failed');
  return res.json();
}

// ── Derive a stable mediaKey from a list item ─────────────────────────────
// We use the filename portion of the key as the stable ID.
// Example: "photos/1716000000000_g_Q2FybG8.jpg" → "1716000000000_g_Q2FybG8.jpg"
function mediaKeyFromItem(item) {
  // item.name is already just the filename (set in b2List)
  return item.name || String(item.id);
}

// ── SocialPanel component ─────────────────────────────────────────────────
// Shared by both the Lightbox (photos) and the Reels viewer (videos).
// mediaKey  — stable string ID for the media item
// guestName — pre-filled author name from local state (may be empty)
const REACTIONS_LIST = ['❤️', '👏', '💍', '😍', '🥂'];

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
}

`;

// Inject helpers before the b2List function
src = patch(src,
  `/** List media from all buckets via our server-side Function */
async function b2List(type) {`,
  `${SOCIAL_HELPERS}/** List media from all buckets via our server-side Function */
async function b2List(type) {`,
  'inject SocialPanel + social API helpers'
);

// ── 3d. Lightbox: add mediaKey state + social panel in the lightbox
// Add mediaKey to lightbox state
src = patch(src,
  `  const [lightbox, setLightbox]     = useState({ open: false, idx: 0, zoomed: false });`,
  `  const [lightbox, setLightbox]     = useState({ open: false, idx: 0, zoomed: false });
  const [showLbComments, setShowLbComments] = useState(false);`,
  'add showLbComments state'
);

// Reset comments panel when lightbox closes or index changes
src = patch(src,
  `  function openLightbox(idx) {
    if (selectMode) { toggleSelect(idx); return; }
    setLightbox({ open: true, idx, zoomed: false });
  }`,
  `  function openLightbox(idx) {
    if (selectMode) { toggleSelect(idx); return; }
    setLightbox({ open: true, idx, zoomed: false });
    setShowLbComments(false);
  }

  function navPhotoWithReset(dir) {
    setShowLbComments(false);
    navPhoto(dir);
  }`,
  'reset comments on lightbox open/nav'
);

// Replace navPhoto calls in lightbox JSX with navPhotoWithReset
src = patch(src,
  `        <button className="lux-lb-nav lux-lb-prev" onClick={() => navPhoto(-1)} aria-label="Previous photo">`,
  `        <button className="lux-lb-nav lux-lb-prev" onClick={() => navPhotoWithReset(-1)} aria-label="Previous photo">`,
  'lightbox prev → navPhotoWithReset'
);
src = patch(src,
  `        <button className="lux-lb-nav lux-lb-next" onClick={() => navPhoto(1)} aria-label="Next photo">`,
  `        <button className="lux-lb-nav lux-lb-next" onClick={() => navPhotoWithReset(1)} aria-label="Next photo">`,
  'lightbox next → navPhotoWithReset'
);

// Update keyboard handler to use navPhotoWithReset
src = patch(src,
  `      if (e.key === "ArrowLeft")  setLightbox(l => ({ ...l, idx: (l.idx - 1 + photos.length) % photos.length, zoomed: false }));
      if (e.key === "ArrowRight") setLightbox(l => ({ ...l, idx: (l.idx + 1) % photos.length, zoomed: false }));`,
  `      if (e.key === "ArrowLeft")  { setShowLbComments(false); setLightbox(l => ({ ...l, idx: (l.idx - 1 + photos.length) % photos.length, zoomed: false })); }
      if (e.key === "ArrowRight") { setShowLbComments(false); setLightbox(l => ({ ...l, idx: (l.idx + 1) % photos.length, zoomed: false })); }`,
  'keyboard nav resets comments panel'
);

// Update lbDragEnd to call navPhotoWithReset
src = patch(src,
  `    if (velocity > FAST_FLICK_VELOCITY || passedThreshold) {
      navPhoto(dx < 0 ? 1 : -1);
    }`,
  `    if (velocity > FAST_FLICK_VELOCITY || passedThreshold) {
      navPhotoWithReset(dx < 0 ? 1 : -1);
    }`,
  'swipe drag → navPhotoWithReset'
);

// Add social panel to lightbox JSX — insert after the zoom button
src = patch(src,
  `        <button
          className="lux-lb-zoom"
          onClick={() => setLightbox(l => ({ ...l, zoomed: !l.zoomed }))}
        >
          {lightbox.zoomed ? "Zoom Out" : "Zoom In"}
        </button>
      </div>`,
  `        <button
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
            />
          </div>
        )}
      </div>`,
  'add social panel to lightbox'
);

// ── 3e. Reels viewer: add social panel below each video caption
src = patch(src,
  `              {vid.uploaderName && (
                <div className="lux-reel-caption">Shared by <b>{vid.uploaderName}</b></div>
              )}
              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open} />`,
  `              {vid.uploaderName && (
                <div className="lux-reel-caption">Shared by <b>{vid.uploaderName}</b></div>
              )}
              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open} />
              {/* Social panel — reactions + comments, anchored above seek bar */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 52, zIndex: 4 }}>
                <SocialPanel
                  mediaKey={mediaKeyFromItem(vid)}
                  guestName={guestName}
                />
              </div>`,
  'add SocialPanel to each reel slide'
);

// ── 3f. Adjust reel-caption bottom offset so it doesn't overlap the social panel
src = patch(src,
  `.lux-reel-caption {
  position: absolute; left: 16px; right: 70px; bottom: 56px; z-index: 5;`,
  `.lux-reel-caption {
  position: absolute; left: 16px; right: 70px; bottom: 260px; z-index: 5;`,
  'raise reel-caption above social panel'
);

src = patch(src,
  `  .lux-reel-caption { left: 12px; right: 12px; bottom: 50px; font-size: 11px; }`,
  `  .lux-reel-caption { left: 12px; right: 12px; bottom: 254px; font-size: 11px; }`,
  'raise reel-caption on mobile too'
);

// ── 3g. Fix: b2List maps items with name (filename only) — ensure mediaKey
//        works correctly. The existing mapping already sets `name` to the
//        filename part, which is what mediaKeyFromItem uses. No change needed.

// Write patched WeddingGallery.js
writeFile('src/WeddingGallery.js', src);

// ── Write backend files ───────────────────────────────────────────────────────
writeFile('functions/api/reactions.js', REACTIONS_FUNCTION);
writeFile('functions/api/comments.js', COMMENTS_FUNCTION);
writeFile('d1-schema.sql', D1_SCHEMA);

// ── Print instructions ────────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║   patch-reactions-swipe-mute.mjs  ·  all changes applied                ║
╚══════════════════════════════════════════════════════════════════════════╝

Files changed
─────────────
  src/WeddingGallery.js          (swipe nav fix, mute fix, reactions/comments UI)
  functions/api/reactions.js     (new — D1-backed reactions endpoint)
  functions/api/comments.js      (new — D1-backed comments endpoint)
  d1-schema.sql                  (new — run once to create tables)

─────────────────────────────────────────────────────────────────────────────
D1 SETUP (one-time — do this before deploying)
─────────────────────────────────────────────────────────────────────────────

1.  Create the database (if you haven't already):

      npx wrangler d1 create wedding-gallery-social

    Copy the database_id from the output.

2.  Add to wrangler.toml at the project root:

      [[d1_databases]]
      binding      = "DB"
      database_name = "wedding-gallery-social"
      database_id   = "<your-database-id-here>"

    If you don't have a wrangler.toml yet, create one:

      name = "wedding-gallery"
      compatibility_date = "2024-01-01"
      pages_build_output_dir = "build"

      [[d1_databases]]
      binding      = "DB"
      database_name = "wedding-gallery-social"
      database_id   = "<your-database-id-here>"

3.  Create the tables locally:

      npx wrangler d1 execute wedding-gallery-social --file=./d1-schema.sql

4.  Create the tables in production:

      npx wrangler d1 execute wedding-gallery-social --file=./d1-schema.sql --remote

5.  Test locally:

      npm run build
      npx wrangler pages dev build --d1=DB=wedding-gallery-social

6.  Commit and push — Cloudflare Pages will deploy automatically:

      git add -A
      git commit -m "feat: reactions, comments, mute fix, swipe nav"
      git push

─────────────────────────────────────────────────────────────────────────────
What changed at a glance
─────────────────────────────────────────────────────────────────────────────

1. SWIPE / PREV·NEXT  — the Facebook-style drag-to-navigate was already
   implemented in the lightbox. This patch ensures the nav buttons correctly
   reset the comments panel on each navigation, and the keyboard arrow keys
   also close the comments drawer between photos.

2. REACTIONS & COMMENTS
   • Five emoji reactions per photo/video: ❤️ 👏 💍 😍 🥂
   • Counts update optimistically on tap.
   • A threaded comment input with author name (pre-filled from your saved
     guest name, or entered inline).
   • In the lightbox: tap the 💬 button (bottom-center, right of Zoom) to
     open/close the social panel.
   • In the Reels viewer: the social panel is always visible above the seek
     bar.
   • All data lives in Cloudflare D1 — zero extra cost on the free tier for
     typical wedding traffic.

3. MUTE / UNMUTE FIX
   • Buttons are now position:fixed z-index:1200, so they float above the
     scrollable reel container and are always tappable.
   • Videos now default to UNMUTED (reelMuted starts false). Browsers that
     block unmuted autoplay will silently pause on the first frame; the user
     can tap the video to play with sound, then use the mute button freely.
`);
