import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { flushSync } from 'react-dom';




// ── B2 API config ────────────────────────────────────────────────────────────
// In production these are Cloudflare Pages Functions at /api/*
// In local dev (npm start) you need to run: npx wrangler pages dev build --compatibility-date 2024-01-01
const API_BASE = '';  // empty = same origin (works for both Pages and local wrangler dev)

// ── Guest-name ↔ filename encoding ───────────────────────────────────────
// /api/list only ever round-trips the B2 object key (no custom metadata,
// which would need a HEAD request per item to read back). So the guest's
// name is embedded directly in the uploaded filename instead, as
// "g_<base64url-name>.<ext>". Base64url's alphabet (A-Z a-z 0-9 - _) is a
// subset of the server's own [a-zA-Z0-9._-] filename sanitizer, so it
// passes through untouched — and because it's a real byte-level encoding
// (not stripped ASCII), accented/non-Latin names round-trip perfectly.
function encodeNameForKey(name) {
  const trimmed = (name || '').trim().slice(0, 60);
  const bytes = new TextEncoder().encode(trimmed);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeNameFromKey(key) {
  const base = (key || '').split('/').pop() || '';
  const stripped = base.replace(/^\d+_/, ''); // strip the server's Date.now()_ prefix
  const m = stripped.match(/^g_([A-Za-z0-9_-]+)\./);
  if (!m) return null;
  try {
    let b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const name = new TextDecoder().decode(bytes).trim();
    return name || null;
  } catch { return null; }
}

/** Upload a single file → returns the public B2 URL. `uploaderName` is
 *  required and gets embedded in the stored filename (see above). */
async function b2Upload(file, type, uploaderName) {
  const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : (type === 'video' ? 'mp4' : 'jpg');
  const encodedFilename = `g_${encodeNameForKey(uploaderName)}.${ext}`;

  // 1. Ask our server-side Function for a presigned PUT URL
  const metaRes = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      filename:    encodedFilename,
      contentType: file.type,
      sizeBytes:   file.size,
    }),
  });
  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error || `Upload init failed (${metaRes.status})`);
  }
  const { uploadUrl, publicUrl } = await metaRes.json();

  // 2. PUT the file bytes directly to B2 (no server proxy)
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error(`B2 PUT failed (${putRes.status})`);

  return publicUrl;
}

// __PATCH_COMPRESSION_V1__
// ── Client-side compression (runs before b2Upload) ──────────────────────────
// PHOTOS: Canvas resize + WebP re-encode. Supported on iOS 14+ (Sept 2020+)
//         and all modern desktop/Android browsers — safe default in 2026.
// VIDEOS: ffmpeg.wasm, single-threaded core (no SharedArrayBuffer, so no
//         COOP/COEP headers needed — those would break loading B2 media
//         cross-origin in the gallery itself). Loaded lazily from CDN so
//         there's no npm install / build-config change required.

const PHOTO_MAX_DIMENSION = 2048;   // px, longest edge
const PHOTO_WEBP_QUALITY  = 0.83;
const VIDEO_MAX_OUTPUT_BYTES = 100 * 1024 * 1024; // 100 MB backstop
const VIDEO_SKIP_COMPRESSION_UNDER = 15 * 1024 * 1024; // already small — don't bother
const VIDEO_MAX_HEIGHT = 720; // cap to 720p during re-encode

/** Resize + re-encode an image File to WebP. Falls back to the original
 *  file untouched if the browser can't produce WebP (very old browsers). */
async function compressPhoto(file, onProgress) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/webp', PHOTO_WEBP_QUALITY)
    );

    // Some very old browsers silently return null or a PNG when WebP isn't
    // supported — in that case just keep the original file.
    if (!blob || blob.type !== 'image/webp') {
      onProgress?.(100);
      return file;
    }

    onProgress?.(100);
    const newName = file.name.replace(/\.[a-zA-Z0-9]+$/, '') + '.webp';
    return new File([blob], newName, { type: 'image/webp' });
  } catch (err) {
    console.warn('Photo compression failed, uploading original:', err);
    onProgress?.(100);
    return file;
  }
}

// __PATCH_COMPRESSION_V1_FIX_IMPORT__
// ── ffmpeg.wasm lazy loader (CDN, single-threaded core — no special headers) ─
//
// IMPORTANT: we deliberately do NOT write `import('https://unpkg.com/...')`
// as a literal static import() anywhere in this file. CRA's webpack 4
// parses every `import()` call at build time to try to bundle it, and it
// can't handle an external http(s) module specifier — that fails the
// production build with "doesn't support dynamic import() syntax". Instead
// we inject a real <script type="module"> tag at runtime (a plain string,
// invisible to webpack's static analysis) that does the import itself and
// hands the result back to us via a one-off global.
let _ffmpegInstance = null;
let _ffmpegLoadPromise = null;

function loadEsmFromCdn(specifier, globalName) {
  return new Promise((resolve, reject) => {
    const id = `__esm_${globalName}_${Math.random().toString(36).slice(2)}`;
    window[id] = { resolve, reject };
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import * as mod from '${specifier}';
      window['${id}'].resolve(mod);
    `;
    script.onerror = () => { reject(new Error(`Failed to load ${specifier}`)); delete window[id]; };
    document.head.appendChild(script);
    // resolve()/reject() above fire synchronously-ish once the module graph
    // loads; clean up the temp global+script either way.
    Promise.resolve().then(() => {
      const orig = window[id];
      window[id] = {
        resolve: (m) => { orig.resolve(m); delete window[id]; script.remove(); },
        reject:  (e) => { orig.reject(e);  delete window[id]; script.remove(); },
      };
    });
  });
}

async function loadFFmpeg() {
  if (_ffmpegInstance) return _ffmpegInstance;
  if (_ffmpegLoadPromise) return _ffmpegLoadPromise;

  _ffmpegLoadPromise = (async () => {
    const { FFmpeg } = await loadEsmFromCdn('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js', 'ffmpeg');
    const { toBlobURL } = await loadEsmFromCdn('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js', 'ffmpegutil');

    const ffmpeg = new FFmpeg();
    const base = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    _ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return _ffmpegLoadPromise;
}

/** Re-encode a video File with ffmpeg.wasm: H.264, CRF 26, capped at 720p,
 *  audio down to 128k AAC. Good visual quality at a fraction of the size.
 *  Skips compression entirely for files already under
 *  VIDEO_SKIP_COMPRESSION_UNDER (phone cameras already compress well, and
 *  re-encoding a short clip rarely shrinks it further). If the encode would
 *  still land over VIDEO_MAX_OUTPUT_BYTES, throws so the caller can show a
 *  clear "trim your clip" error instead of silently shipping a huge file. */
async function compressVideo(file, onProgress) {
  if (file.size <= VIDEO_SKIP_COMPRESSION_UNDER) {
    onProgress?.(100);
    return file;
  }

  onProgress?.(0);
  const ffmpeg = await loadFFmpeg();
  onProgress?.(5);

  const inputName  = 'input' + (file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || '.mp4');
  const outputName = 'output.mp4';

  const progressHandler = ({ progress }) => {
    // ffmpeg reports 0..1; map onto 5..95 (load already took 0..5)
    const pct = 5 + Math.min(95, Math.max(0, progress * 90));
    onProgress?.(Math.round(pct));
  };
  ffmpeg.on('progress', progressHandler);

  try {
    const { fetchFile } = await loadEsmFromCdn('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js', 'ffmpegutil2');
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    await ffmpeg.exec([
      '-i', inputName,
      '-vf', `scale=-2:'min(${VIDEO_MAX_HEIGHT},ih)'`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '26',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    // cleanup wasm FS so repeated uploads in one session don't leak memory
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    onProgress?.(100);

    if (blob.size > VIDEO_MAX_OUTPUT_BYTES) {
      throw new Error(
        `Even after compression this clip is ${(blob.size / 1024 / 1024).toFixed(0)}MB — please trim it shorter and try again.`
      );
    }

    const newName = file.name.replace(/\.[a-zA-Z0-9]+$/, '') + '.mp4';
    return new File([blob], newName, { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', progressHandler);
  }
}


// ── Reactions & Comments API helpers ────────────────────────────────────────
// mediaKey is derived from the B2 object key — it's the stable identifier
// that links a photo/video to its social data in D1.

async function fetchReactions(mediaKey) {
  try {
    const res = await fetch(`/api/reactions?mediaKey=${encodeURIComponent(mediaKey)}`);
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
    const res = await fetch(`/api/comments?mediaKey=${encodeURIComponent(mediaKey)}`);
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
/* PATCH:PRO-UI-OVERHAUL */

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
            className={`lux-reaction-btn${poppedEmoji === emoji ? ' popped' : ''}`}
            onClick={() => handleReaction(emoji)}
            aria-label={`React with ${label}`}
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
            : `View all ${commentCount} comments`}
          <svg
            className={`lux-comments-toggle-icon${commentsOpen ? ' open' : ''}`}
            width="10" height="10" viewBox="0 0 10 10" fill="none"
          >
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {comments !== null && commentCount > 0 && (
        <div className={`lux-comments-wrap${commentsOpen || commentCount <= 2 ? ' expanded' : ''}`}>
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
}

// ── ReelSocialBar ────────────────────────────────────────────────────────────
// Facebook-Reels style: right-side icon bar with heart (long-press = picker)
// and comment icon. Comment icon opens a sliding bottom sheet.
const REACTIONS_LIST_SHORT = ['❤️', '🌸', '🥂', '😂', '💍']; // eslint-disable-line no-unused-vars

function ReelSocialBar({ mediaKey, guestName, onNameSaved }) {
  const [reactions, setReactions]       = useState(null);
  const [lastReacted, setLastReacted]   = useState(null);
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [pickerOpen, setPickerOpen]     = useState(false); // eslint-disable-line no-unused-vars
  const [comments, setComments]         = useState(null);
  const [newComment, setNewComment]     = useState('');
  const [sending, setSending]           = useState(false);
  const [localName, setLocalName]       = useState(() => (guestName || '').trim() || getStoredName());
  const [editingName, setEditingName]   = useState(false);
  const longPressTimer                  = useRef(null); // eslint-disable-line no-unused-vars
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
  function closeSheet() { setSheetOpen(false); }

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

  // Simple direct react — no long press needed
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

  const totalReactions = reactions ? Object.values(reactions.counts || {}).reduce((a, b) => a + b, 0) : 0; // eslint-disable-line no-unused-vars
  const commentCount   = (comments || []).length;
  const authorName     = localName.trim();

  return (
    <>
      {/* Right-side icon bar */}
      <div className="lux-reel-icon-bar">

        {/* All reactions — always visible, no long-press */}
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
        ))}

        {/* Comment icon */}
        <button
          className="lux-reel-icon-btn"
          onClick={() => sheetOpen ? closeSheet() : openSheet()}
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

/** List media from all buckets via our server-side Function */
async function b2List(type) {
  const res = await fetch(`${API_BASE}/api/list?type=${type}`);
  if (!res.ok) throw new Error(`List failed (${res.status})`);
  const { items } = await res.json();
  return items.map((item, i) => ({
    id:   i + 1,
    url:  item.url,
    name: item.key.split('/').pop(),
    size: item.size,
    uploaded: item.uploaded,
    uploaderName: decodeNameFromKey(item.key),
  }));
}

// Per-video seek bar for the Reels viewer — tap or drag to fast-forward or
// replay. Reads/writes the underlying <video> element directly through the
// shared ref array, so dragging tracks the finger with zero extra
// re-renders of the parent (only this small bar re-renders, ~4x/sec, and
// only for whichever video is actually playing).
const ReelSeekBar = memo(function ReelSeekBar({ reelRefs, idx, active }) {
  const [progress, setProgress] = useState(0);
  const trackRef   = useRef(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    const video = reelRefs.current[idx];
    if (!video) return;

    let rafId = null;
    const sync = () => {
      if (draggingRef.current) return;
      if (rafId) return; // already scheduled
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setProgress(video.duration ? video.currentTime / video.duration : 0);
      });
    };
    video.addEventListener("timeupdate", sync);
    video.addEventListener("loadedmetadata", sync);
    sync();
    return () => {
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("loadedmetadata", sync);
      if (rafId) cancelAnimationFrame(rafId);
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
        <div className="lux-reel-seek-fill"   style={{ width: `${progress * 100}%` }} />
        <div className="lux-reel-seek-handle" style={{ left:  `${progress * 100}%` }} />
      </div>
    </div>
  );
});

// ── StoryThumb ────────────────────────────────────────────────────────────────
// Extracts a poster frame from a video URL by:
//  1. Creating a hidden <video> element (not in the DOM)
//  2. Seeking to 0.1 s so we get an actual frame (not a black flash)
//  3. Drawing that frame onto a <canvas> via drawImage()
//  4. Disposing the video element immediately
//
// Fallback: if the extract fails (CORS, codec, etc.) we show the blush
// placeholder instead of a broken image.
const StoryThumb = memo(function StoryThumb({ url }) {
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
});

export default function WeddingGallery() {
  const [photos, setPhotos]         = useState([]);
  const [videos, setVideos]         = useState([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [previews, setPreviews]     = useState([]);
  const [uploadState, setUploadState] = useState({ active: false, progress: 0, error: null });
  const [videoPreview, setVideoPreview] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState(new Set());
  const [showAll, setShowAll]       = useState(false);
  const [lightbox, setLightbox]     = useState({ open: false, idx: 0, zoomed: false });
  const [showLbComments, setShowLbComments] = useState(false);
  const [reels, setReels]           = useState({ open: false, idx: 0 });
  const [reelMuted, setReelMuted]   = useState(false);
  const [guestName, setGuestName]   = useState(() => {
    try { return localStorage.getItem('lux_guest_name') || ''; } catch { return ''; }
  });
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
  }, []);
  const fileInputRef     = useRef(null);
  const videoInputRef    = useRef(null);
  const reelRefs          = useRef([]);
  const reelContainerRef  = useRef(null);
  const reelNavLockRef    = useRef(false); // prevents overlapping goToReel calls
  const lbImgRef           = useRef(null);
  const lbDragRef          = useRef({ active: false, startX: 0, startY: 0, locked: null, startTime: 0 });
  // Incremented every time a new slide animation starts; stale onEnd
  // callbacks compare their captured animId against this and bail out.
  const lbAnimIdRef        = useRef(0);

  // Lock background scroll while the Lightbox or Reels viewer is open —
  // uses the iOS-safe "fixed body + restore scrollY" technique so the page
  // behind can never rubber-band/scroll, even on mobile Safari.
  useEffect(() => {
    const shouldLock = lightbox.open || reels.open;
    if (shouldLock) {
      const scrollY = window.scrollY;
      document.body.dataset.lockedScrollY = String(scrollY);
      document.body.style.position = 'fixed';
      document.body.style.top    = `-${scrollY}px`;
      document.body.style.left   = '0';
      document.body.style.right  = '0';
      document.body.style.width  = '100%';
    } else if (document.body.dataset.lockedScrollY !== undefined) {
      const scrollY = parseInt(document.body.dataset.lockedScrollY || '0', 10);
      document.body.style.position = '';
      document.body.style.top    = '';
      document.body.style.left   = '';
      document.body.style.right  = '';
      document.body.style.width  = '';
      delete document.body.dataset.lockedScrollY;
      window.scrollTo(0, scrollY);
    }
  }, [lightbox.open, reels.open]);

  // Load photos from B2 on mount
  useEffect(() => {
    setPhotosLoading(true);
    b2List('photo')
      .then(items => setPhotos(items))
      .catch(err  => console.error('Photo list error:', err))
      .finally(()  => setPhotosLoading(false));
  }, []);

  // Load videos from B2 on mount
  useEffect(() => {
    setVideosLoading(true);
    b2List('video')
      .then(items => setVideos(items))
      .catch(err  => console.error('Video list error:', err))
      .finally(()  => setVideosLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!lightbox.open) return;
      if (e.key === "Escape")     setLightbox(l => ({ ...l, open: false, zoomed: false }));
      if (e.key === "ArrowLeft")  { setShowLbComments(false); setLightbox(l => ({ ...l, idx: (l.idx - 1 + photos.length) % photos.length, zoomed: false })); }
      if (e.key === "ArrowRight") { setShowLbComments(false); setLightbox(l => ({ ...l, idx: (l.idx + 1) % photos.length, zoomed: false })); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, photos.length]);

  // Reels: Escape closes the viewer, ↑ / ↓ move between videos (desktop)
  useEffect(() => {
    if (!reels.open) return;
    const handler = (e) => {
      if (e.key === "Escape")    setReels(r => ({ ...r, open: false }));
      if (e.key === "ArrowUp")   goToReel(reels.idx - 1);
      if (e.key === "ArrowDown") goToReel(reels.idx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reels.open, reels.idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reels: jump straight to the tapped video, no scroll animation
  useEffect(() => {
    if (!reels.open) return;
    requestAnimationFrame(() => {
      const el = reelRefs.current[reels.idx];
      el?.closest(".lux-reel-slide")?.scrollIntoView({ block: "start" });
    });
  }, [reels.open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reels: autoplay whichever video is actually in view, pause the rest —
  // and keep reels.idx in sync with whatever is dominant (drives the
  // Prev/Next buttons and keyboard nav even after a manual swipe/scroll).
  useEffect(() => {
    if (!reels.open) return;
    const els = reelRefs.current.filter(Boolean);

    function updateGpuLayers(activeIdx) {
      // Promote active + immediate neighbours; demote everything else.
      els.forEach((vid) => {
        const slide = vid.closest('.lux-reel-slide');
        if (!slide) return;
        const i = Number(vid.dataset.reelIdx);
        const isActive   = i === activeIdx;
        const isAdjacent = Math.abs(i - activeIdx) === 1;
        slide.classList.toggle('reel-active',   isActive);
        slide.classList.toggle('reel-adjacent', isAdjacent && !isActive);
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const vid = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          vid.play().catch(() => {});
          const idx = Number(vid.dataset.reelIdx);
          setReels(r => (r.idx === idx ? r : { ...r, idx }));
          updateGpuLayers(idx);
        } else {
          vid.pause();
        }
      });
    }, { threshold: [0, 0.6, 1], rootMargin: '0px 0px' });
    els.forEach(el => observer.observe(el));
    // Initial promotion for the starting slide
    updateGpuLayers(reels.idx);
    return () => observer.disconnect();
  }, [reels.open, videos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateGuestName = useCallback((value) => {
    setGuestName(value);
    try { localStorage.setItem('lux_guest_name', value); } catch { /* private mode, etc. */ }
  }, []);

  function handleFiles(fileList) {
    Array.from(fileList).filter(f => f.type.startsWith("image/"))
      .slice(0, 20 - previews.length)
      .forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviews(p => [...p, { url, name: file.name, id: Date.now() + Math.random(), file }]);
      });
  }

  function removePreview(id) { setPreviews(p => p.filter(x => x.id !== id)); }

  function handleVideoFile(fileList) {
    const file = Array.from(fileList).find(f => f.type.startsWith("video/"));
    if (!file) return;
    setVideoPreview({ url: URL.createObjectURL(file), name: file.name, id: Date.now(), file });
  }

  async function uploadPhotos() {
    if (!previews.length) return;
    const name = guestName.trim();
    if (!name) { setUploadState(s => ({ ...s, error: 'Please enter your name first' })); return; }
    setUploadState({ active: true, progress: 0, error: null });
    try {
      const uploaded = [];
      for (let i = 0; i < previews.length; i++) {
        const p = previews[i];
        const compressed = await compressPhoto(p.file);
        const publicUrl = await b2Upload(compressed, 'photo', name);
        uploaded.push({ id: Date.now() + i, url: publicUrl, name: p.name, uploaderName: name });
        setUploadState(s => ({ ...s, progress: Math.round(((i + 1) / previews.length) * 100) }));
        URL.revokeObjectURL(p.url);
      }
      setPhotos(prev => [...uploaded.reverse(), ...prev]);
      setPreviews([]);
      setUploadState({ active: false, progress: 0, error: null });
    } catch (err) {
      setUploadState({ active: false, progress: 0, error: err.message });
    }
  }

  async function uploadVideo() {
    if (!videoPreview) return;
    const name = guestName.trim();
    if (!name) { setUploadState(s => ({ ...s, error: 'Please enter your name first' })); return; }
    setUploadState({ active: true, progress: 0, error: null, stage: 'compressing' });
    try {
      const compressed = await compressVideo(videoPreview.file, (pct) => {
        setUploadState(s => ({ ...s, progress: pct, stage: pct >= 100 ? 'uploading' : 'compressing' }));
      });
      setUploadState(s => ({ ...s, progress: 0, stage: 'uploading' }));
      const publicUrl = await b2Upload(compressed, 'video', name);
      setVideos(prev => [{ id: Date.now(), url: publicUrl, name: videoPreview.name, uploaderName: name }, ...prev]);
      URL.revokeObjectURL(videoPreview.url);
      setVideoPreview(null);
      setUploadState({ active: false, progress: 100, error: null, stage: null });
      setTimeout(() => setUploadState(s => ({ ...s, progress: 0 })), 1500);
    } catch (err) {
      setUploadState({ active: false, progress: 0, error: err.message, stage: null });
    }
  }

  const openReels = useCallback((idx) => {
    setReels({ open: true, idx });
  }, []);

  const closeReels = useCallback(() => {
    reelRefs.current.forEach(v => v && v.pause());
    reelNavLockRef.current = false; // clear any stale nav lock on close
    setReels(r => ({ ...r, open: false }));
  }, []);

  const goToReel = useCallback((targetIdx) => {
    // Guard: clamp range AND prevent overlapping navigations that would
    // cause the scroll container to overshoot (jump multiple videos).
    if (targetIdx < 0 || targetIdx >= videos.length) return;
    if (reelNavLockRef.current) return;

    const container = reelContainerRef.current;
    const slide = reelRefs.current[targetIdx]?.closest('.lux-reel-slide');
    if (!container || !slide) return;

    // Instant scroll to the exact top of the target slide.
    // scroll-snap-stop:always in CSS ensures the browser snaps to this
    // one slide and can never sail past it, even on a fast flick.
    reelNavLockRef.current = true;
    container.scrollTo({ top: slide.offsetTop, behavior: 'instant' });

    // Release the lock after one snap cycle so the next swipe registers.
    // 180 ms is enough for snap physics to settle on all mobile engines.
    setTimeout(() => { reelNavLockRef.current = false; }, 180);
  }, [videos.length]);

  const openLightbox = useCallback((idx) => {
    if (selectMode) { toggleSelect(idx); return; }
    setLightbox({ open: true, idx, zoomed: false });
    setShowLbComments(false);
  }, [selectMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── lbSlide: core animation — animate FIRST, update state AFTER ──────────
  // dir = +1 (next) or -1 (prev).
  // 1. CSS-transition the strip to the neighbour slot.
  // 2. On transitionend: setLightbox with the new idx.
  // 3. Snap strip back to resting (-33.333%) with no transition,
  //    so the freshly-rendered centre slot appears seamlessly.
  const lbStripRef   = useRef(null);
  const lbSlidingRef = useRef(false); // block re-entrant slides

  function lbSlide(dir) {
    if (lbSlidingRef.current || photos.length < 2) return;
    const strip = lbStripRef.current;
    if (!strip) return;

    lbSlidingRef.current = true;
    // Stamp this animation so lbDragStart can cancel it, and any stale
    // onEnd callback (after interruption) sees a mismatched ID and bails.
    const animId = ++lbAnimIdRef.current;
    setShowLbComments(false);

    // Each slot = 1/3 of strip width in px
    const slotPx    = strip.offsetWidth / 3;
    // Resting offset = -1 slotPx (centre slot in view)
    // Moving right (+1 next) → strip slides left → negative extra px
    const newOffset = -slotPx + (-dir * slotPx);

    // 1. Kick off the CSS transition
    strip.classList.remove('dragging');
    strip.classList.add('sliding');
    strip.style.transform = 'translateX(' + newOffset + 'px)';

    function onEnd() {
      strip.removeEventListener('transitionend', onEnd);

      // If this animation was superseded (user swiped again mid-flight), bail.
      if (animId !== lbAnimIdRef.current) return;

      // 2. Force a synchronous React re-render so the centre slot already
      //    has the new image BEFORE we snap the strip back to resting.
      //    Without flushSync the setState is batched/async and the old image
      //    briefly flashes at centre — the glitch you see on fast swipes.
      flushSync(() => {
        setLightbox(l => ({
          ...l,
          idx: (l.idx + dir + photos.length) % photos.length,
          zoomed: false,
        }));
      });

      // 3. Now snap strip back with no transition — centre slot already
      //    shows the correct new image, so there is no visible flash.
      strip.classList.remove('sliding');
      strip.style.transition = 'none';
      strip.style.transform  = '';
      // Force reflow so "transition:none" is committed before restoring
      void strip.offsetHeight;
      strip.style.transition = '';

      lbSlidingRef.current = false;
    }

    strip.addEventListener('transitionend', onEnd, { once: true });

    // Safety fallback if transitionend never fires (tab hidden, etc.)
    setTimeout(() => {
      if (!lbSlidingRef.current || animId !== lbAnimIdRef.current) return;
      strip.removeEventListener('transitionend', onEnd);
      onEnd();
    }, 500);
  }

  function navPhotoWithReset(dir) { lbSlide(dir); }

  function lbDragStart(e) {
    if (lightbox.zoomed || photos.length < 2) return;

    // If a slide animation is in-flight, cancel it instantly so the next
    // swipe feels responsive rather than being silently dropped.
    // Incrementing lbAnimIdRef makes the pending onEnd see a stale animId
    // and exit without touching state or the strip.
    if (lbSlidingRef.current) {
      lbAnimIdRef.current++;
      const strip = lbStripRef.current;
      if (strip) {
        strip.classList.remove('sliding', 'dragging');
        strip.style.transition = 'none';
        strip.style.transform  = '';
        void strip.offsetHeight;   // flush layout so the snap is instant
        strip.style.transition = '';
      }
      lbSlidingRef.current = false;
    }

    lbDragRef.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      locked: null, startTime: Date.now(),
    };
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

    const strip = lbStripRef.current;
    if (!strip) return;

    strip.classList.add('dragging');
    strip.classList.remove('sliding');
    // Resting offset in px = -1 slot width; add finger delta
    const slotPx   = strip.offsetWidth / 3;
    const offsetPx = -slotPx + dx;
    strip.style.transform = 'translateX(' + offsetPx + 'px)';
  }

  function lbDragEnd(e) {
    const drag = lbDragRef.current;
    if (!drag.active) return;
    drag.active = false;

    const strip = lbStripRef.current;

    // Resolve drag axis.  On a fast flick, pointermove may not have fired
    // with > 6 px of movement before pointerup — drag.locked stays null.
    // Fall back to the endpoint displacement so quick flicks still register.
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const elapsed = Math.max(1, Date.now() - drag.startTime);

    let locked = drag.locked;
    if (locked === null && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      locked = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }

    const wasHorizontal = locked === 'x';

    if (!wasHorizontal) {
      if (strip) { strip.classList.remove('dragging'); strip.style.transform = ''; }
      return;
    }

    const velocity = Math.abs(dx) / elapsed;

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
    } else {
      // Spring back to resting with transition
      if (strip) {
        strip.classList.remove('dragging');
        strip.classList.add('sliding');
        strip.style.transform = '';
        strip.addEventListener('transitionend', () => strip.classList.remove('sliding'), { once: true });
      }
    }
  }

  function lbDragCancel() {
    lbDragRef.current.active = false;
    const strip = lbStripRef.current;
    if (!strip) return;
    strip.classList.remove('dragging');
    strip.classList.add('sliding');
    strip.style.transform = '';
    strip.addEventListener('transitionend', () => strip.classList.remove('sliding'), { once: true });
  }

  function toggleSelect(idx) {
    if (!selectMode) return;
    setSelected(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  }

  function toggleSelectMode() {
    setSelectMode(s => { if (s) setSelected(new Set()); return !s; });
  }

  function selectAll() {
    if (selected.size === photos.length) setSelected(new Set());
    else setSelected(new Set(photos.map((_, i) => i)));
  }

  // ── Download current reel video
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
      a.download = vid.name || `video-${reels.idx + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 200));
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Video download failed', err);
    }
  }

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
        a.download = photo.name || `photo-${n + 1}.${ext}`;
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
  }

  const visiblePhotos = useMemo(
    () => showAll ? photos : photos.slice(0, 9),
    [photos, showAll]
  );
  const currentImg = photos[lightbox.idx];

  return (
    <>

      {/* Ambient background canvas */}
      <div className="lux-bg-canvas" />

      {/* Floating petals — deferred until idle to not block first paint.
           Hidden entirely while Reels is open to free up GPU budget. */}
      {petalsReady && !reels.open && (() => {
        // Full set for desktop; trimmed set for mobile/touch to protect FPS.
        const isMobile = window.matchMedia('(max-width: 639px), (hover: none)').matches;
        const allPetals = [
          { l:'8%',  size:10, dur:14, delay:0,    x:40,  r:280, sway:16, swayDur:3.2 },
          { l:'18%', size:7,  dur:18, delay:3,    x:-30, r:320, sway:12, swayDur:2.8 },
          { l:'32%', size:12, dur:12, delay:6,    x:55,  r:240, sway:20, swayDur:3.6 },
          { l:'47%', size:8,  dur:16, delay:1.5,  x:-45, r:300, sway:14, swayDur:3.0 },
          { l:'61%', size:11, dur:13, delay:8,    x:35,  r:260, sway:18, swayDur:2.6 },
          { l:'75%', size:7,  dur:19, delay:4,    x:-25, r:340, sway:10, swayDur:3.4 },
          { l:'88%', size:9,  dur:15, delay:10,   x:50,  r:220, sway:15, swayDur:3.0 },
          { l:'24%', size:6,  dur:20, delay:12,   x:-38, r:380, sway:8,  swayDur:2.4 },
          { l:'54%', size:13, dur:11, delay:7,    x:42,  r:290, sway:22, swayDur:3.8 },
          { l:'90%', size:8,  dur:17, delay:2,    x:-20, r:310, sway:11, swayDur:2.9 },
        ];
        const petalData = isMobile ? allPetals.slice(0, 4) : allPetals;
        return petalData.map((p, i) => (
        <div key={i} className="lux-petal" style={{
          left: p.l,
          '--petal-size':     `${p.size}px`,
          '--petal-dur':      `${p.dur}s`,
          '--petal-delay':    `${p.delay}s`,
          '--petal-x':        `${p.x}px`,
          '--petal-r':        `${p.r}deg`,
          '--petal-sway':     `${p.sway}px`,
          '--petal-sway-dur': `${p.swayDur}s`,
        }}>
          <svg viewBox="0 0 20 24" fill="none">
            <path d="M10 2C10 2 4 7 4 13a6 6 0 0012 0C16 7 10 2 10 2z"
              fill="rgba(196,116,142,0.45)" />
            <path d="M10 2C10 2 4 7 4 13"
              stroke="rgba(184,144,74,0.25)" strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </div>
      ));
      })()}

      <div className="lux-page">

        {/* HERO */}
        <div className="lux-hero">
          <div className="lux-pretitle">Wedding Gallery</div>
          <div className="lux-names">
            <span className="lux-name">Claudine</span>
            <div className="lux-connector-row">
              <div className="lux-connector-rule" />
              <div className="lux-connector-center">
                <span className="lux-connector-amp">and</span>
                <div className="lux-connector-dot" />
              </div>
              <div className="lux-connector-rule r" />
            </div>
            <span className="lux-name">Mark</span>
          </div>
        </div>

        {/* INVITATION TEXT — plain, no card */}
        <div className="lux-invite-plain">
          <p className="lux-invite-body">
            Capture the kilig moments, tawanan, iyakan,<br />
            and every beautiful memory we've made together.<br />
            Don't forget to tag us and use our hashtag:
          </p>
          <div className="lux-hashtag-wrap">
            <span className="lux-hashtag">
              <span className="lux-ht-gold">#Forever</span>
              <span className="lux-ht-ink">MARK</span>
              <span className="lux-ht-gold">edfor</span>
              <span className="lux-ht-ink">CLAUD</span>
            </span>
          </div>
          <div className="lux-cta-hint">Got the perfect shot? Upload it below</div>
          <span className="lux-arrow" />
        </div>

        {/* VIDEO MOMENTS — live from B2 */}
        <div className="lux-stories-head">
          <div>
            <div className="lux-stories-sub">Swipe to watch · tap to play</div>
          </div>
        </div>
        <div className="lux-stories-strip">
          {/* Add Video button */}
          <div className="lux-story-add" onClick={() => videoInputRef.current?.click()}>
            <div className="lux-story-add-ring">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4v10M4 9h10" stroke="#b8944f" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="lux-story-add-label">Add<br />Video</span>
          </div>
          <input
            ref={videoInputRef} type="file" accept="video/*"
            style={{ display: "none" }}
            onChange={e => { handleVideoFile(e.target.files); e.target.value = ""; }}
          />

          {/* Video preview before upload */}
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
          )}

          {/* Uploaded videos */}
          {videosLoading && [0,1,2].map(i => (
            <div className="lux-story-ph" key={i}>
              <div className="lux-story-ph-inner">
                <div className="lux-story-ph-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#c4748e" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#c4748e" strokeWidth="0.9" />
                  </svg>
                </div>
                <div className="lux-story-ph-txt">Loading…</div>
              </div>
              <div className="lux-shimmer" />
            </div>
          ))}
          {!videosLoading && videos.length === 0 && !videoPreview && [0,1,2].map(i => (
            <div className="lux-story-ph" key={i}>
              <div className="lux-story-ph-inner">
                <div className="lux-story-ph-icon">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#c4748e" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#c4748e" strokeWidth="0.9" />
                  </svg>
                </div>
                <div className="lux-story-ph-txt">Coming<br />soon</div>
              </div>
              <div className="lux-shimmer" />
            </div>
          ))}
          {!videosLoading && videos.map((vid, idx) => (
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
                  <path d="M5 3.5v9l8-4.5-8-4.5z" fill="#fff" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {videoPreview && (
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
                    ? `Compressing… ${uploadState.progress}%`
                    : `Uploading… ${uploadState.progress}%`}
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
                    style={{ width: `${uploadState.progress}%` }}
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
        )}


        {/* GALLERY — inside white card/widget */}
        <div className="lux-inner-label-row"><span className="lux-inner-label-txt">Shared Memories</span><div className="lux-inner-label-rule" /></div>

        <div className="lux-card">
          <div className="lux-gallery-panel">

          {/* UPLOAD — moved inside Photo Gallery card */}
          <div className="lux-eyebrow"><span className="lux-eyebrow-label">Share Your Photos</span><div className="lux-eyebrow-rule" /></div>
          <div className="lux-upload-simple">
            <button
              className="lux-btn-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="lux-upload-corner tl" />
              <span className="lux-upload-corner tr" />
              <span className="lux-upload-corner bl" />
              <span className="lux-upload-corner br" />
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <line x1="7" y1="11.5" x2="7" y2="2" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
                <path d="M4.5 5L7 2l2.5 3" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <line x1="2" y1="12.5" x2="12" y2="12.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
              </svg>
              Upload Photos
            </button>
            <span className="lux-upload-hint">JPEG · PNG · WEBP · Auto-compressed · Max 20 photos</span>
            <input
              ref={fileInputRef} type="file" multiple accept="image/*"
              style={{ display: "none" }}
              onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
            />

            {previews.length > 0 && (
              <div className="lux-preview-sec">
                <div className="lux-preview-label">
                  {previews.length} photo{previews.length !== 1 ? "s" : ""} ready to send
                </div>
                <div className="lux-preview-grid">
                  {previews.map(p => (
                    <div className="lux-preview-item" key={p.id}>
                      <img src={p.url} alt="" />
                      <button className="lux-preview-remove" onClick={() => removePreview(p.id)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previews.length > 0 && (
              <div className="lux-send-bar">
                <div className="lux-name-field">
                  <label className="lux-name-label" htmlFor="lux-guest-name-photo">Your Name *</label>
                  <input
                    id="lux-guest-name-photo"
                    className="lux-name-input"
                    type="text"
                    value={guestName}
                    onChange={e => updateGuestName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    maxLength={60}
                    autoComplete="name"
                  />
                </div>
                {uploadState.error && (
                  <div style={{ color: '#c45', fontSize: 12, marginBottom: 6, textAlign: 'center' }}>
                    {uploadState.error}
                  </div>
                )}
                <button
                  className="lux-btn-send"
                  onClick={uploadPhotos}
                  disabled={uploadState.active || !guestName.trim()}
                >
                  {uploadState.active
                    ? (uploadState.stage === 'compressing'
                        ? `Compressing… ${uploadState.progress}%`
                        : `Uploading… ${uploadState.progress}%`)
                    : "Send to Gallery"}
                </button>
                <div className="lux-send-hint">
                  {previews.length} photo{previews.length !== 1 ? "s" : ""} will be shared with all guests
                </div>
              </div>
            )}
          </div>

            <div className="lux-gallery-divider" />

            <div className="lux-gallery-bar">
              <div>
                <div className="lux-gallery-title">Photo Gallery</div>
                <div className="lux-gallery-sub">Every frame, forever</div>
              </div>
              <div className="lux-gallery-actions">
                <button
                  className={`lux-btn-action${selectMode ? " active" : ""}`}
                  onClick={toggleSelectMode}
                >
                  {selectMode ? "Done" : "Select"}
                </button>
                {selectMode && photos.length > 0 && (
                  <button className="lux-btn-action" onClick={selectAll}>
                    {selected.size === photos.length ? "Deselect All" : "Select All"}
                  </button>
                )}
                {selected.size > 0 && (
                  <button className="lux-btn-action dl" onClick={downloadSelected}>
                    Download ({selected.size})
                  </button>
                )}
              </div>
            </div>

            {photosLoading ? (
              <div className="lux-no-photos">
                <div className="lux-no-photos-ring">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#c4748e" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="lux-no-photos-txt">Loading gallery…</div>
                <div className="lux-no-photos-hint">Fetching your memories</div>
              </div>
            ) : photos.length === 0 ? (
              <div className="lux-no-photos">
                <div className="lux-no-photos-ring">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#c4748e" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="lux-no-photos-txt">No photos yet</div>
                <div className="lux-no-photos-hint">Be the first to share a memory</div>
              </div>
            ) : (
              <>
                <div className={`lux-photo-grid${selectMode ? " lux-selection-mode" : ""}`}>
                  {visiblePhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className={`lux-photo-item${idx === 0 ? " featured" : ""}${selected.has(idx) ? " selected" : ""}`}
                      onClick={() => openLightbox(idx)}
                    >
                      <img src={photo.url} alt="" loading="lazy" decoding="async" />
                      <div className="lux-photo-hover">
                        <div className="lux-photo-view-icon">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="5.5" cy="5.5" r="3.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
                            <path d="M8 8l2.5 2.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                      <div className="lux-select-check">
                        {selected.has(idx) && (
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 4.5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lux-view-all-wrap">
                  <button className="lux-btn-view-all" onClick={() => setShowAll(v => !v)}>
                    {showAll ? "Show Less" : `View All · ${photos.length} Photos`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="lux-footer">
          <svg width="180" height="14" viewBox="0 0 180 14">
            <line x1="0" y1="7" x2="74" y2="7" stroke="#b8944f" strokeWidth="0.5" />
            <rect x="82" y="3" width="8" height="8" fill="none" stroke="#b8944f" strokeWidth="0.5" transform="rotate(45 86 7)" />
            <circle cx="86" cy="7" r="1.6" fill="#b8944f" />
            <line x1="98" y1="7" x2="180" y2="7" stroke="#b8944f" strokeWidth="0.5" />
          </svg>
          <div className="lux-footer-names">Claudine &amp; Mark · 2026</div>
          <svg width="110" height="10" viewBox="0 0 110 10">
            <line x1="0" y1="5" x2="44" y2="5" stroke="rgba(184,148,79,0.3)" strokeWidth="0.5" />
            <circle cx="55" cy="5" r="1.8" fill="none" stroke="#b8944f" strokeWidth="0.5" />
            <line x1="66" y1="5" x2="110" y2="5" stroke="rgba(184,148,79,0.3)" strokeWidth="0.5" />
          </svg>
        </footer>
      </div>

      {/* LIGHTBOX — Instagram-style split-panel photo viewer */}
      <div className={`lux-lightbox${lightbox.open ? " open" : ""}`}>

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
                ? <><span style={{color:'rgba(255,255,255,0.55)', fontWeight:400}}>Shared by </span><b>{currentImg.uploaderName}</b></>
                : <span style={{color:'rgba(255,255,255,0.0)'}}>·</span>}
            </span>
            <span className="lux-lb-counter">
              {photos.length > 0 ? `${lightbox.idx + 1} / ${photos.length}` : ""}
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
                  a.download = currentImg.name || `photo.${ext}`;
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
          )}

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

          {/* 3-slot image strip — prev · current · next */}
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
                      decoding="async"
                      loading="lazy"
                      fetchPriority="low"
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
                      decoding="async"
                      loading="eager"
                      fetchPriority="high"
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
                      decoding="async"
                      loading="lazy"
                      fetchPriority="low"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mobile bottom-right: reactions + comment icon bar (desktop uses sidebar) */}
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
          )}
        </div>

        {/* ── RIGHT PANE: social sidebar (desktop only, >900px) ──────── */}
        <div className="lux-lb-sidebar">
          <div className="lux-lb-sidebar-header">
            <div>
              <div className="lux-lb-sidebar-credit">
                {currentImg?.uploaderName || 'Wedding Gallery'}
              </div>
              <div className="lux-lb-sidebar-sub">
                {photos.length > 0 ? `Photo ${lightbox.idx + 1} of ${photos.length}` : ''}
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

      </div>

      {/* REELS — full-screen vertical video viewer (TikTok/Reels style) */}
      <div className={`lux-reels${reels.open ? " open" : ""}`}>
        <button className="lux-reels-close" onClick={closeReels} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        {/* Download current video */}
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
                preload={Math.abs(idx - reels.idx) <= 2 ? "auto" : "none"}
                onClick={(e) => { e.target.paused ? e.target.play().catch(() => {}) : e.target.pause(); }}
              />
              {vid.uploaderName && (
                <div className="lux-reel-caption">Shared by <b>{vid.uploaderName}</b></div>
              )}
              <ReelSeekBar reelRefs={reelRefs} idx={idx} active={reels.open && Math.abs(idx - reels.idx) <= 2} />
              {/* Facebook Reels-style: icon bar on the right + expandable comment sheet */}
              <ReelSocialBar
                mediaKey={mediaKeyFromItem(vid)}
                guestName={guestName}
                onNameSaved={updateGuestName}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}