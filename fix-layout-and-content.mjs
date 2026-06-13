/**
 * fix-layout-and-content.mjs
 *
 * 1. Maximize viewport on mobile — removes side padding/"border" feel on
 *    small screens so the page fills the full width without needing to
 *    pinch-zoom out.
 * 2. Enlarges the "Claudine" and "Mark" hero names.
 * 3. Removes the text:
 *      - "Forever begins · 2026"
 *      - "Video Moments"
 *      - "Moments in Motion"
 * 4. Moves the "Upload Photos" button (and the whole upload block) inside
 *    the Photo Gallery card, above the photo grid.
 *
 * Usage:
 *   node fix-layout-and-content.mjs
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const FILE = resolve('src/WeddingGallery.js');

// ── backup ───────────────────────────────────────────────────────────────
const backup = FILE + '.bak-layout-' + Date.now();
copyFileSync(FILE, backup);
console.log('✔ Backup →', backup);

let src = readFileSync(FILE, 'utf8');
const original = src;

function replace(label, find, replacement, { required = true } = {}) {
  if (!src.includes(find)) {
    if (required) throw new Error(`Pattern not found for: ${label}`);
    console.log(`… skipped (already applied?): ${label}`);
    return;
  }
  src = src.replace(find, replacement);
  console.log(`✔ ${label}`);
}

/* ────────────────────────────────────────────────────────────────────────
   1. MAXIMIZE MOBILE VIEWPORT — kill the side "border" on phones
   ──────────────────────────────────────────────────────────────────────── */
replace(
  '1. Page wrapper — remove side padding on phones',
  `.lux-page {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px 140px;
}
@media (min-width: 640px)  { .lux-page { padding: 0 40px 140px; } }
@media (min-width: 960px)  { .lux-page { padding: 0 56px 140px; } }`,
  `.lux-page {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 12px 140px;
}
@media (min-width: 640px)  { .lux-page { padding: 0 40px 140px; } }
@media (min-width: 960px)  { .lux-page { padding: 0 56px 140px; } }
@media (max-width: 479px)  { .lux-page { padding: 0 8px 72px; } }`
);

/* Gallery card: shrink inner padding further on very small screens so the
   card itself doesn't add extra "border" feel */
replace(
  '1b. Gallery panel — tighter padding on small phones',
  `  /* Gallery card: tighter inner padding */
  .lux-gallery-panel { padding: 20px 16px 24px; }`,
  `  /* Gallery card: tighter inner padding */
  .lux-gallery-panel { padding: 16px 10px 20px; }`
);

/* ────────────────────────────────────────────────────────────────────────
   2. ENLARGE "Claudine" and "Mark"
   ──────────────────────────────────────────────────────────────────────── */
replace(
  '2a. Enlarge "Claudine" (first name)',
  `.lux-name {
  font-family: var(--font-hero);
  font-style: italic; font-weight: 400;
  font-size: clamp(58px, 14vw, 120px);
  line-height: 1.05; letter-spacing: -0.02em;
  color: var(--ink);
  display: block;
  animation: pressReveal 1.0s var(--ease-press) both;
}`,
  `.lux-name {
  font-family: var(--font-hero);
  font-style: italic; font-weight: 400;
  font-size: clamp(72px, 18vw, 150px);
  line-height: 1.05; letter-spacing: -0.02em;
  color: var(--ink);
  display: block;
  animation: pressReveal 1.0s var(--ease-press) both;
}`
);

replace(
  '2b. Enlarge "Mark" (second name)',
  `.lux-name:last-child  {
  animation-delay: 0.52s;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(64px, 16vw, 132px);
  letter-spacing: 0.015em;
  padding-right: 0.12em; /* room for italic glyph overhang — prevents 'k' clip */
  color: var(--ink-60);
}`,
  `.lux-name:last-child  {
  animation-delay: 0.52s;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(78px, 20vw, 164px);
  letter-spacing: 0.015em;
  padding-right: 0.12em; /* room for italic glyph overhang — prevents 'k' clip */
  color: var(--ink-60);
}`
);

/* ────────────────────────────────────────────────────────────────────────
   3. REMOVE TEXT: "Forever begins · 2026", "Video Moments", "Moments in Motion"
   ──────────────────────────────────────────────────────────────────────── */
replace(
  '3a. Remove "Forever begins · 2026" date row',
  `          <div className="lux-date-row">
            <span className="lux-date-txt">Forever begins · 2026</span>
          </div>
`,
  ''
);

replace(
  '3b. Remove "Video Moments" eyebrow label',
  `        {/* VIDEO MOMENTS */}
        <div className="lux-eyebrow"><span className="lux-eyebrow-label">Video Moments</span><div className="lux-eyebrow-rule" /></div>
        <div className="lux-stories-head">
          <div>
            <div className="lux-stories-title">Moments in Motion</div>
            <div className="lux-stories-sub">Swipe to watch · tap to play</div>
          </div>
          <button className="lux-btn-ghost">+ Add Video</button>
        </div>`,
  `        {/* VIDEO MOMENTS */}
        <div className="lux-stories-head">
          <div>
            <div className="lux-stories-sub">Swipe to watch · tap to play</div>
          </div>
          <button className="lux-btn-ghost">+ Add Video</button>
        </div>`
);

/* ────────────────────────────────────────────────────────────────────────
   4. MOVE UPLOAD BLOCK INSIDE THE PHOTO GALLERY CARD
   ──────────────────────────────────────────────────────────────────────── */

// Extract the upload block (between the "Share Your Photos" eyebrow and the
// closing </div> of .lux-upload-simple) so it can be relocated.
const uploadBlockMatch = src.match(
  /\n {8}\{\/\* UPLOAD — simple button only, no drop container \*\/\}\n[\s\S]*?\n {8}<\/div>\n/
);
if (!uploadBlockMatch) {
  throw new Error('Could not locate the upload block to move.');
}
const uploadBlock = uploadBlockMatch[0];

// Remove it from its original location
src = src.replace(uploadBlock, '\n');
console.log('✔ 4a. Removed upload block from original location');

// Re-indent the block by 2 extra spaces (it now lives one level deeper,
// inside .lux-gallery-panel) and drop the now-stale section comment.
const reindentedUpload = uploadBlock
  .replace('{/* UPLOAD — simple button only, no drop container */}', '{/* UPLOAD — moved inside Photo Gallery card */}')
  .split('\n')
  .map(line => (line.trim() === '' ? line : '  ' + line))
  .join('\n');

// Insert it inside the gallery panel, right after the gallery bar header.
replace(
  '4b. Insert upload block inside Photo Gallery card',
  `          <div className="lux-gallery-panel">
            <div className="lux-gallery-bar">`,
  `          <div className="lux-gallery-panel">
${reindentedUpload}
            <div className="lux-gallery-bar">`
);

/* ────────────────────────────────────────────────────────────────────────
   write out
   ──────────────────────────────────────────────────────────────────────── */
if (src === original) {
  console.log('No changes were made — file already up to date.');
} else {
  writeFileSync(FILE, src, 'utf8');
  console.log('✔ Wrote changes to', FILE);
}
