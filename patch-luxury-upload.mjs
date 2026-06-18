import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SRC = join(process.cwd(), 'src', 'WeddingGallery.js');

// Read raw → detect CRLF → normalize to LF for matching
const raw = readFileSync(SRC, 'utf8');
const hasCRLF = raw.includes('\r\n');
let src = raw.replace(/\r\n/g, '\n');

// ── idempotency guard ─────────────────────────────────────────────────────────
if (src.includes('lux-upload-corner')) {
  console.log('✅ Already patched — nothing to do.');
  process.exit(0);
}

// ── backup ────────────────────────────────────────────────────────────────────
const bakPath = SRC + '.bak-luxbtn-' + Date.now();
writeFileSync(bakPath, raw, 'utf8');
const bakName = bakPath.split(/[/\\]/).pop();
console.log('📦 Backup created:', bakName);

// ── patch helper ──────────────────────────────────────────────────────────────
function patch(label, search, replace) {
  const idx = src.indexOf(search);
  if (idx === -1) {
    console.error(`\n❌ PATCH FAILED: "${label}"`);
    console.error('   Target string not found in file.');
    console.error(`   Restore from: ${bakName}`);
    process.exit(1);
  }
  src = src.slice(0, idx) + replace + src.slice(idx + search.length);
  console.log(`✅ Applied: "${label}"`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 1 — CSS: insert corner mark styles (inserted before .lux-upload-hint)
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'CSS: corner registration marks',
  `.lux-btn-upload:hover::after { left: 140%; }

.lux-upload-hint {`,
  `.lux-btn-upload:hover::after { left: 140%; }

/* Corner registration marks — photo-frame L-brackets at each corner */
.lux-upload-corner {
  position: absolute;
  width: 8px; height: 8px;
  pointer-events: none; z-index: 2;
  opacity: 0.55;
  transition: opacity 0.35s var(--ease-out);
}
.lux-btn-upload:hover .lux-upload-corner { opacity: 1; }
.lux-upload-corner::before,
.lux-upload-corner::after {
  content: '';
  position: absolute;
  background: var(--gold-light);
}
.lux-upload-corner::before { width: 1px; height: 8px; }
.lux-upload-corner::after  { width: 8px; height: 1px; }
.lux-upload-corner.tl { top: 8px; left: 8px; }
.lux-upload-corner.tl::before { top: 0; left: 0; }
.lux-upload-corner.tl::after  { top: 0; left: 0; }
.lux-upload-corner.tr { top: 8px; right: 8px; }
.lux-upload-corner.tr::before { top: 0; right: 0; }
.lux-upload-corner.tr::after  { top: 0; right: 0; }
.lux-upload-corner.bl { bottom: 8px; left: 8px; }
.lux-upload-corner.bl::before { bottom: 0; left: 0; }
.lux-upload-corner.bl::after  { bottom: 0; left: 0; }
.lux-upload-corner.br { bottom: 8px; right: 8px; }
.lux-upload-corner.br::before { bottom: 0; right: 0; }
.lux-upload-corner.br::after  { bottom: 0; right: 0; }

.lux-upload-hint {`
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 2 — JSX: swap generic icon for bespoke icon + add corner spans
// ═══════════════════════════════════════════════════════════════════════════════
patch(
  'JSX: bespoke icon + corner spans',
  `              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 16V9" stroke="#fce8ef" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 12l3-3 3 3" stroke="#fce8ef" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 19h14" stroke="#fce8ef" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M7 10.5A5 5 0 0 1 17 10.5" stroke="rgba(252,232,239,0.6)" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              Upload Photos`,
  `              <span className="lux-upload-corner tl" />
              <span className="lux-upload-corner tr" />
              <span className="lux-upload-corner bl" />
              <span className="lux-upload-corner br" />
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <line x1="7" y1="11.5" x2="7" y2="2" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
                <path d="M4.5 5L7 2l2.5 3" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <line x1="2" y1="12.5" x2="12" y2="12.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
              </svg>
              Upload Photos`
);

// ── write back (restore original line endings) ────────────────────────────────
const out = hasCRLF ? src.replace(/\n/g, '\r\n') : src;
writeFileSync(SRC, out, 'utf8');

console.log('\n🎉 Patch complete! Run your dev server to see the updated upload button.');
