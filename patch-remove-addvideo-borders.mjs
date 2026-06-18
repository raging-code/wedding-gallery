/**
 * patch-remove-addvideo-borders.mjs
 *
 * 1. Removes the "+ Add Video" ghost button from the Video Moments header
 *    (and its now-unused .lux-btn-ghost CSS, desktop + mobile).
 * 2. Removes the decorative border design around the Photo Gallery card:
 *    - the engraved hairline frame with notched corners (SVG overlay)
 *    - the card's outer 0.5px border
 *    - the top-edge gold shimmer line
 *    The card keeps its background and drop shadow, just without the
 *    ornamental border treatment.
 *
 * Usage (run from project root):
 *   node patch-remove-addvideo-borders.mjs
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import path from 'path';

const SRC = path.join(process.cwd(), 'src', 'WeddingGallery.js');

// ── Backup ────────────────────────────────────────────────────────────────
const ts = Date.now();
const BACKUP = `${SRC}.bak-removeaddvideoborders-${ts}`;
copyFileSync(SRC, BACKUP);
console.log(`📦 Backup created: WeddingGallery.js.bak-removeaddvideoborders-${ts}`);

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

// ════════════════════════════════════════════════════════════════════════
// PATCH 1 — Remove "+ Add Video" button (JSX)
// ════════════════════════════════════════════════════════════════════════
applyPatch(
  'JSX: remove "+ Add Video" ghost button',

  `          </div>
          <button className="lux-btn-ghost">+ Add Video</button>
        </div>`,

  `          </div>
        </div>`
);

// ════════════════════════════════════════════════════════════════════════
// PATCH 2 — Remove now-unused .lux-btn-ghost CSS (desktop)
// ════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS: remove .lux-btn-ghost rules (desktop)',

  `.lux-btn-ghost {
  font-family: var(--font-body); font-size: 10px; font-weight: 500;
  letter-spacing: 0.18em; text-transform: uppercase;
  padding: 9px 16px; background: transparent;
  border: 0.5px solid var(--gold-border); color: var(--gold);
  cursor: pointer; transition: all .3s;
}
.lux-btn-ghost:hover { background: var(--gold-glow); border-color: var(--gold); }

/* Stories strip */`,

  `/* Stories strip */`
);

// ════════════════════════════════════════════════════════════════════════
// PATCH 3 — Remove now-unused .lux-btn-ghost mobile override
// ════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS: remove .lux-btn-ghost mobile override',

  `  /* + Add Video ghost button */
  .lux-btn-ghost { padding: 10px 14px; min-height: 38px; }

  /* Stories heading */`,

  `  /* Stories heading */`
);

// ════════════════════════════════════════════════════════════════════════
// PATCH 4 — Remove the engraved corner-notched frame SVG from the gallery
//           card (JSX)
// ════════════════════════════════════════════════════════════════════════
applyPatch(
  'JSX: remove engraved border-frame SVG from Photo Gallery card',

  `        <div className="lux-card">
          {/* Engraved hairline frame — continuous with notched corners */}
          <svg className="lux-card-frame" viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{position:'absolute',inset:10,width:'calc(100% - 20px)',height:'calc(100% - 20px)',pointerEvents:'none',zIndex:2}}>
            <rect x="0.5" y="0.5" width="99" height="99" fill="none"
              stroke="rgba(184,144,74,0.28)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
            {/* Corner notches */}
            {[['0.5','0.5'],['99.5','0.5'],['0.5','99.5'],['99.5','99.5']].map(([cx,cy],i)=>(
              <circle key={i} cx={cx} cy={cy} r="1.5" fill="none"
                stroke="rgba(184,144,74,0.45)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          <div className="lux-gallery-panel">`,

  `        <div className="lux-card">
          <div className="lux-gallery-panel">`
);

// ════════════════════════════════════════════════════════════════════════
// PATCH 5 — Strip the border / shimmer / frame-rule from .lux-card CSS
// ════════════════════════════════════════════════════════════════════════
applyPatch(
  'CSS: remove .lux-card border, gold shimmer, and .lux-card-frame rule',

  `/* ── GALLERY CARD — engraved SVG frame ──────────────────────────────────── */
.lux-card {
  background: var(--white);
  border: 0.5px solid rgba(196,116,142,0.16);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.88) inset,
    0 -1px 0 rgba(196,116,142,0.08) inset,
    0 3px 0 rgba(196,116,142,0.05),
    0 20px 60px rgba(196,116,142,0.11),
    0 44px 88px rgba(28,15,20,0.05);
  position: relative; overflow: hidden;
  animation: scaleIn 1.0s var(--ease-cinematic) 0.14s both;
}

/* Top-edge gold shimmer */
.lux-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--gold-pale) 25%, var(--gold-light) 50%, var(--gold-pale) 75%, transparent 100%);
  opacity: 0.75; z-index: 1;
}

/* Engraved inner-frame: a continuous fine inset rectangle */
.lux-card-frame {
  position: absolute; inset: 10px; pointer-events: none; z-index: 2;
}

`,

  `/* ── GALLERY CARD ─────────────────────────────────────────────────────── */
.lux-card {
  background: var(--white);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.88) inset,
    0 -1px 0 rgba(196,116,142,0.08) inset,
    0 3px 0 rgba(196,116,142,0.05),
    0 20px 60px rgba(196,116,142,0.11),
    0 44px 88px rgba(28,15,20,0.05);
  position: relative; overflow: hidden;
  animation: scaleIn 1.0s var(--ease-cinematic) 0.14s both;
}

`
);

// ── Done ─────────────────────────────────────────────────────────────────
writeFileSync(SRC, code, 'utf8');
console.log(`\n🎉 All ${patchCount} patches applied successfully to src/WeddingGallery.js`);
console.log('   Run "npm start" to preview, or "npm run build" to build for deploy.');
