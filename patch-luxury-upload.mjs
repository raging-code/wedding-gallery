/**
 * patch-luxury-upload.mjs
 *
 * Applies the luxury "corner registration mark" upload button design.
 * - Wraps the button in .lux-btn-frame with 4 gold corner-mark spans
 * - Replaces the generic upload icon with a bespoke viewfinder/frame icon
 * - Adds .lux-corner CSS for the engraved detail
 * - Updates mobile overrides
 *
 * Usage (run from project root):
 *   node patch-luxury-upload.mjs
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SRC = path.join(process.cwd(), 'src', 'WeddingGallery.js');

// ── Backup ────────────────────────────────────────────────────────────────────
const ts = Date.now();
const BACKUP = `${SRC}.bak-luxupload-${ts}`;
copyFileSync(SRC, BACKUP);
console.log(`📦 Backup created: WeddingGallery.js.bak-luxupload-${ts}`);

let code = readFileSync(SRC, 'utf8');
let patchCount = 0;

function applyPatch(label, oldStr, newStr) {
  if (!code.includes(oldStr)) {
    console.error(`\n❌ PATCH FAILED: "${label}"\n   Could not find the target string.`);
    console.error('   Restore from backup and re-run.\n');
    process.exit(1);
  }
  code = code.replace(oldStr, newStr);
  patchCount++;
  console.log(`✅ [${patchCount}] ${label}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 1 — Replace upload button CSS block
//           (Primary CTA block + mobile desktop media + hover states + hint)
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS: upload button + add corner-frame styles',

  // ── OLD ───────────────────────────────────────────────────────────────────
`/* Primary CTA \u2014 full-width on mobile, auto on desktop */
.lux-btn-upload {
  display: inline-flex; align-items: center; gap: 13px;
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 11px 20px;
  background: var(--ink); color: var(--pink);
  border: none; cursor: pointer;
  transition: all .35s var(--ease-out);
  box-shadow: 0 8px 28px rgba(28,15,20,0.20), 0 1px 0 rgba(255,255,255,0.07) inset;
  position: relative; overflow: hidden;
}
@media (min-width: 640px) {
  .lux-btn-upload { font-size: 11px; letter-spacing: 0.26em; padding: 18px 52px; }
}
/* Gold sweep on hover \u2014 restrained */
.lux-btn-upload::after {
  content: '';
  position: absolute; top: 0; left: -120%; width: 80%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(184,144,74,0.10), transparent);
  transition: left 0.55s var(--ease-out);
}
.lux-btn-upload:hover { transform: translateY(-3px); box-shadow: 0 14px 44px rgba(28,15,20,0.26); }
@media (hover: none) { .lux-btn-upload:hover { transform: none; } }
.lux-btn-upload:hover::after { left: 140%; }

.lux-upload-hint {
  font-family: var(--font-body);
  font-size: 10.5px; font-weight: 300; letter-spacing: 0.07em;
  color: var(--ink-40);
}`,

  // ── NEW ───────────────────────────────────────────────────────────────────
`/* Corner-registration frame wrapper */
.lux-btn-frame {
  position: relative;
  display: inline-block;
  padding: 9px;
}

/* Four engraved corner marks \u2014 luxury registration detail */
.lux-corner {
  position: absolute;
  width: 13px; height: 13px;
  border-color: rgba(184,144,74,0.48);
  border-style: solid;
  pointer-events: none;
  transition: border-color 0.50s var(--ease-out);
}
.lux-btn-frame:hover .lux-corner { border-color: rgba(184,144,74,0.90); }
.lux-corner.tl { top: 0;    left: 0;  border-width: 1px 0 0 1px; }
.lux-corner.tr { top: 0;    right: 0; border-width: 1px 1px 0 0; }
.lux-corner.bl { bottom: 0; left: 0;  border-width: 0 0 1px 1px; }
.lux-corner.br { bottom: 0; right: 0; border-width: 0 1px 1px 0; }

/* Primary CTA */
.lux-btn-upload {
  display: inline-flex; align-items: center; gap: 13px;
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 20px 42px;
  background: var(--ink); color: var(--pink);
  border: none; cursor: pointer;
  transition: all .45s var(--ease-out);
  box-shadow: 0 8px 32px rgba(28,15,20,0.22), 0 1px 0 rgba(255,255,255,0.06) inset;
  position: relative; overflow: hidden;
}
@media (min-width: 640px) {
  .lux-btn-upload { font-size: 11px; letter-spacing: 0.26em; padding: 22px 58px; }
}
/* Gold sweep on hover \u2014 slow, deliberate */
.lux-btn-upload::after {
  content: '';
  position: absolute; top: 0; left: -120%; width: 80%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(184,144,74,0.09), transparent);
  transition: left 0.70s var(--ease-out);
}
.lux-btn-upload:hover { transform: translateY(-2px); box-shadow: 0 14px 44px rgba(28,15,20,0.28); }
@media (hover: none) { .lux-btn-upload:hover { transform: none; } }
.lux-btn-upload:hover::after { left: 140%; }

.lux-upload-hint {
  font-family: var(--font-body);
  font-size: 10.5px; font-weight: 300; letter-spacing: 0.07em;
  color: var(--ink-40);
}`
);

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 2 — Replace JSX button with corner-frame wrapper + bespoke icon
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'JSX: wrap button in .lux-btn-frame, swap icon',

  // ── OLD ───────────────────────────────────────────────────────────────────
`            <button
              className="lux-btn-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 16V9" stroke="#fce8ef" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 12l3-3 3 3" stroke="#fce8ef" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 19h14" stroke="#fce8ef" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M7 10.5A5 5 0 0 1 17 10.5" stroke="rgba(252,232,239,0.6)" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              Upload Photos
            </button>`,

  // ── NEW ───────────────────────────────────────────────────────────────────
`            <div className="lux-btn-frame">
              <span className="lux-corner tl" />
              <span className="lux-corner tr" />
              <span className="lux-corner bl" />
              <span className="lux-corner br" />
              <button
                className="lux-btn-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                {/* Bespoke viewfinder / registration-mark icon */}
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  {/* Corner brackets */}
                  <path d="M2 6V2H6"   stroke="rgba(184,144,74,0.88)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2H18V6" stroke="rgba(184,144,74,0.88)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 14V18H6" stroke="rgba(184,144,74,0.88)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 14V18H14" stroke="rgba(184,144,74,0.88)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* Centre register dot */}
                  <rect x="8.5" y="8.5" width="3" height="3" rx="0.5" fill="rgba(252,232,239,0.60)"/>
                </svg>
                Upload Photos
              </button>
            </div>`
);

// ══════════════════════════════════════════════════════════════════════════════
// PATCH 3 — Mobile overrides: add .lux-btn-frame & .lux-corner adjustments
// ══════════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS: mobile overrides for corner frame',

  // ── OLD ───────────────────────────────────────────────────────────────────
`  /* Upload CTA \u2014 compact pill, centered like desktop */
  .lux-btn-upload     { padding: 14px 32px; justify-content: center; }
  .lux-upload-hint    { text-align: center; }`,

  // ── NEW ───────────────────────────────────────────────────────────────────
`  /* Upload CTA \u2014 compact, centered on mobile */
  .lux-btn-frame      { padding: 7px; }
  .lux-corner         { width: 11px; height: 11px; }
  .lux-btn-upload     { padding: 16px 32px; justify-content: center; }
  .lux-upload-hint    { text-align: center; }`
);

// ── Write & done ─────────────────────────────────────────────────────────────
writeFileSync(SRC, code, 'utf8');

console.log(`
\u2728  All ${patchCount} patches applied successfully!
\u{1F4C1}  File written: src/WeddingGallery.js
\u{1F4E6}  Backup at:    WeddingGallery.js.bak-luxupload-${ts}

Next steps:
  npm start        \u2192 preview in browser
  npm run build    \u2192 production build
`);
