/**
 * wedding-gallery-bugfix.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes 6 issues left over from the Bound Journal redesign.
 * Run from the repo root:  node wedding-gallery-bugfix.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  01 · Story placeholder icon  — hardcoded old-pink bg → sage-pale token
 *  02 · Upload section          — center-aligned → left-aligned (editorial fix)
 *  03 · "Shared Memories"       — InnerDivider → SectionDivider (hierarchy fix)
 *  04 · Date row                — remove redundant second pip
 *  05 · Spine                   — floating content-edge → fixed viewport edge
 *  06 · Hashtag colours         — connector text subtle, couple names in sage
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET = path.join(__dirname, 'src', 'WeddingGallery.js');
const BACKUP = TARGET + '.bugfix.bak';
const GUARD  = '/* BUGFIX_V1_APPLIED */';

function patch(src, label, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    console.warn(`  ⚠  SKIP  "${label}" — match not found`);
    return src;
  }
  const result = src.replace(oldStr, () => newStr);
  console.log(`  ✓  DONE  "${label}"`);
  return result;
}

if (!fs.existsSync(TARGET)) {
  console.error(`✗  File not found: ${TARGET}`);
  console.error('   Run this script from the repo root (the folder that contains src/)');
  process.exit(1);
}

let src = fs.readFileSync(TARGET, 'utf8');

if (src.includes(GUARD)) {
  console.log('✓ Bugfix already applied — nothing to do.\n');
  process.exit(0);
}

if (!fs.existsSync(BACKUP)) {
  fs.copyFileSync(TARGET, BACKUP);
  console.log('✓ Backup saved → WeddingGallery.js.bugfix.bak\n');
}

console.log('Applying bugfix patches…\n');

/* ── 01 · Story placeholder icon: hardcoded old-pink → sage tokens ────────── */
src = patch(
  src,
  '01 · .lux-story-ph-icon — sage-pale bg (was hardcoded pink rgba)',
  `  background: rgba(196,116,142,0.08);
  border: 0.5px dashed var(--pink-dark);`,
  `  background: var(--sage-pale);
  border: 0.5px dashed var(--sage-border);`
);

/* ── 02 · Upload section: left-align to match editorial direction ─────────── */
src = patch(
  src,
  '02 · .lux-upload-simple — left-aligned (was center)',
  `.lux-upload-simple {
  display: flex; flex-direction: column; align-items: center;`,
  `.lux-upload-simple {
  display: flex; flex-direction: column; align-items: flex-start;`
);

/* ── 03 · "Shared Memories": InnerDivider → SectionDivider ───────────────── */
src = patch(
  src,
  '03 · JSX — "Shared Memories" → SectionDivider (was InnerDivider)',
  `        <InnerDivider label="Shared Memories" />`,
  `        <SectionDivider label="Shared Memories" />`
);

/* ── 04 · Date row: drop the redundant trailing pip ──────────────────────── */
src = patch(
  src,
  '04 · JSX — remove redundant second pip from date row',
  `            <div className="lux-pip" />
            <span className="lux-date-txt">Forever begins · 2026</span>
            <div className="lux-pip" />`,
  `            <div className="lux-pip" />
            <span className="lux-date-txt">Forever begins · 2026</span>`
);

/* ── 05 · Spine: floating content-edge → fixed viewport left edge ─────────── */
src = patch(
  src,
  '05 · .lux-page spine → body::before fixed at viewport left edge',
  `.lux-page {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px 100px;
  border-left: 2px solid var(--sage);
}
@media (min-width: 640px) {
  .lux-page { padding: 0 36px 100px; }
}
@media (max-width: 480px) {
  .lux-page { border-left: none; border-top: 2px solid var(--sage); }
}`,
  `.lux-page {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px 100px 28px;
}
@media (min-width: 640px) {
  .lux-page { padding: 0 36px 100px 44px; }
}
body::before {
  content: '';
  position: fixed;
  left: 0; top: 0;
  width: 3px; height: 100vh;
  background: linear-gradient(180deg, var(--sage) 0%, var(--sage-mid) 100%);
  z-index: 9999;
  pointer-events: none;
}`
);

/* ── 06 · Hashtag: connector text subtle ink, couple names highlighted sage ── */
src = patch(
  src,
  '06 · .lux-ht-gold / .lux-ht-ink — connectors subtle, names in sage',
  `.lux-ht-gold { color: var(--sage); }
.lux-ht-ink  { color: var(--gold); }`,
  `.lux-ht-gold { color: var(--ink-40); }   /* #Forever, edfor — recede */
.lux-ht-ink  { color: var(--sage); }        /* MARK, CLAUD — pop    */`
);

/* ── guard + write ─────────────────────────────────────────────────────────── */
src = src.replace(
  '/* REDESIGN_JOURNAL_V1_APPLIED */',
  `/* REDESIGN_JOURNAL_V1_APPLIED */\n/* BUGFIX_V1_APPLIED */`
);

fs.writeFileSync(TARGET, src, 'utf8');

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Bugfix applied (6 patches)

  01  Story card icon   — sage background
  02  Upload section    — left-aligned
  03  Shared Memories   — SectionDivider
  04  Date row          — redundant pip removed
  05  Spine             — fixed viewport edge
  06  Hashtag           — names pop, connectors recede

  Preview
  ───────
  npm start
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
