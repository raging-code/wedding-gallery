/**
 * wedding-gallery-redesign.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Run from the repo root:  node wedding-gallery-redesign.mjs
 *
 * Design direction: "Bound Journal" editorial luxury
 *   Palette  : warm parchment + deep sage + antique gold + warm graphite
 *   Type     : Fraunces (optical editorial serif) + Plus Jakarta Sans (clean geo)
 *   Signature: 2 px sage left-spine — the page reads like a bound wedding journal
 *   Layout   : left-aligned editorial composition (vs. generic centred)
 *   Names    : asymmetric — Claudine italic left-pull, Mark upright right-pull
 *   Connector: "et" (Latin) in place of "&" — more literary, more romantic
 *   Dividers : typographic rule — no diamond ornaments
 *   Buttons  : sage ghost primary — no flat black
 *   Footer   : clean left-aligned typographic statement
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ─── paths ──────────────────────────────────────────────────────────────── */
const TARGET = path.join(__dirname, 'wedding-gallery', 'src', 'WeddingGallery.js');
const BACKUP = TARGET + '.original.bak';
const GUARD  = '/* REDESIGN_JOURNAL_V1_APPLIED */';

/* ─── helpers ────────────────────────────────────────────────────────────── */
function patch(src, label, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    console.warn(`  ⚠  SKIP  "${label}" — match not found (already applied or file changed)`);
    return src;
  }
  // Use function replacement to avoid $ special chars in newStr
  const result = src.replace(oldStr, () => newStr);
  console.log(`  ✓  DONE  "${label}"`);
  return result;
}

/* ─── read ───────────────────────────────────────────────────────────────── */
if (!fs.existsSync(TARGET)) {
  console.error(`✗  File not found: ${TARGET}`);
  console.error('   Run this script from the repo root that contains wedding-gallery/');
  process.exit(1);
}

let src = fs.readFileSync(TARGET, 'utf8');

if (src.includes(GUARD)) {
  console.log('✓ Patch already applied — nothing to do.\n');
  process.exit(0);
}

if (!fs.existsSync(BACKUP)) {
  fs.copyFileSync(TARGET, BACKUP);
  console.log('✓ Backup saved → WeddingGallery.js.original.bak\n');
}

console.log('Applying "Bound Journal" design overhaul…\n');

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 1 — GOOGLE FONTS
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '01 · Google Fonts: Fraunces + Plus Jakarta Sans',
  `@import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Nunito:wght@400;500;600&display=swap');`,
  `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400;1,9..144,500&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 2 — CSS CUSTOM PROPERTIES
   Parchment + sage + antique gold + warm graphite.
   Legacy aliases (--pink-*, --white-off) map old references to new palette
   so un-patched rules automatically inherit the new colours.
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '02 · :root — sage / parchment palette + legacy aliases',
  `:root {
  --page-bg:       #fce8ef;
  --page-bg-deep:  #f9d5e2;
  --white:         #ffffff;
  --white-off:     #fdfbfc;
  --pink:          #fce8ef;
  --pink-deep:     #f9d5e2;
  --pink-dark:     #c4748e;
  --pink-border:   rgba(196,116,142,0.22);
  --pink-shadow:   rgba(196,116,142,0.12);
  --gold:          #b8944f;
  --gold-light:    #d4b47a;
  --gold-border:   rgba(184,148,79,0.28);
  --ink:           #1c0f14;
  --ink-80:        rgba(28,15,20,0.80);
  --ink-60:        rgba(28,15,20,0.60);
  --ink-40:        rgba(28,15,20,0.40);
  --ink-10:        rgba(28,15,20,0.07);

  --font-display: 'Cormorant', Georgia, serif;
  --font-body:    'Nunito', system-ui, sans-serif;
}`,
  `:root {
  /* ── new palette ───────────────────────────── */
  --page-bg:      #F3EFE5;
  --page-deep:    #EAE3D3;
  --chalk:        #FDFCF8;
  --sage:         #5C6B50;
  --sage-mid:     #8A9B7A;
  --sage-pale:    rgba(92,107,80,0.07);
  --sage-border:  rgba(92,107,80,0.22);
  --sage-shadow:  rgba(92,107,80,0.10);
  --gold:         #B89764;
  --gold-light:   #C8AD82;
  --gold-border:  rgba(184,151,100,0.30);
  --gold-pale:    rgba(184,151,100,0.12);
  --ink:          #1B1915;
  --ink-80:       rgba(27,25,21,0.80);
  --ink-60:       rgba(27,25,21,0.60);
  --ink-40:       rgba(27,25,21,0.40);
  --ink-10:       rgba(27,25,21,0.07);
  --white:        #FDFCF8;
  --white-off:    #F9F6F0;
  /* ── legacy aliases (un-patched rules auto-update) ─── */
  --page-bg-deep: #EAE3D3;
  --pink:         #F3EFE5;
  --pink-deep:    #EAE3D3;
  --pink-dark:    #5C6B50;
  --pink-border:  rgba(92,107,80,0.20);
  --pink-shadow:  rgba(92,107,80,0.09);

  --font-display: 'Fraunces', Georgia, serif;
  --font-body:    'Plus Jakarta Sans', system-ui, sans-serif;
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 3 — BODY
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '03 · body — dual-tone ambient radial texture',
  `body {
  background: var(--page-bg);
  font-family: var(--font-body);
  font-weight: 400;
  overflow-x: hidden;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}`,
  `body {
  background-color: var(--page-bg);
  background-image:
    radial-gradient(ellipse at 15% 10%, rgba(92,107,80,0.05) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 85%, rgba(184,151,100,0.06) 0%, transparent 50%);
  font-family: var(--font-body);
  font-weight: 400;
  overflow-x: hidden;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 4 — PAGE WRAPPER (spine rule — the editorial signature)
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '04 · .lux-page — editorial spine + wider canvas',
  `.lux-page {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 0 16px 100px;
}
@media (min-width: 640px) {
  .lux-page { padding: 0 28px 100px; }
}`,
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
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 5 — HERO
   Left-aligned editorial layout replaces the centred generic arrangement.
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '05 · .lux-hero — editorial left-aligned layout',
  `.lux-hero {
  padding: 52px 0 44px;
  text-align: center;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) both;
}`,
  `.lux-hero {
  padding: 60px 0 52px;
  text-align: left;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) both;
}`
);

/* ─── pretitle ─────────────────────────────────────────────────────────── */

src = patch(
  src,
  '06 · .lux-pretitle — editorial category label',
  `.lux-pretitle {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.28em; text-transform: uppercase;
  color: var(--gold);
  display: flex; align-items: center; justify-content: center; gap: 14px;
  margin-bottom: 24px;
}
.lux-pretitle::before, .lux-pretitle::after {
  content: ''; display: block; height: 0.5px; width: 36px;
}
.lux-pretitle::before { background: linear-gradient(90deg, transparent, var(--gold)); }
.lux-pretitle::after  { background: linear-gradient(90deg, var(--gold), transparent); }`,
  `.lux-pretitle {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 500;
  letter-spacing: 0.38em; text-transform: uppercase;
  color: var(--sage);
  display: flex; align-items: center; justify-content: flex-start; gap: 14px;
  margin-bottom: 32px;
}
.lux-pretitle::before {
  content: ''; display: block; height: 1px; width: 24px;
  background: var(--sage); flex-shrink: 0;
}
.lux-pretitle::after { display: none; }`
);

/* ─── names — asymmetric pull ──────────────────────────────────────────── */

src = patch(
  src,
  '07 · .lux-names — asymmetric editorial composition',
  `.lux-names { display: flex; flex-direction: column; align-items: center; }
.lux-name {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(58px, 14vw, 108px);
  line-height: 0.86; letter-spacing: -0.01em;
  color: var(--ink);
}`,
  `.lux-names { display: flex; flex-direction: column; align-items: stretch; }
.lux-name {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(54px, 13vw, 102px);
  line-height: 0.88; letter-spacing: -0.02em;
  color: var(--ink);
}
.lux-name.upright {
  font-style: normal;
  text-align: right;
  color: var(--ink-60);
}`
);

/* ─── amp row — "et" connector ─────────────────────────────────────────── */

src = patch(
  src,
  '08 · .lux-amp-row — ink rule with "et" connector',
  `.lux-amp-row {
  display: flex; align-items: center; gap: 18px;
  margin: 10px 0 8px;
}
.lux-amp-rule { height: 0.5px; width: 56px; }
.lux-amp-rule.l { background: linear-gradient(90deg, transparent, var(--gold)); }
.lux-amp-rule.r { background: linear-gradient(90deg, var(--gold), transparent); }
.lux-amp {
  font-family: var(--font-display);
  font-style: italic; font-weight: 400;
  font-size: clamp(15px, 3vw, 22px);
  color: var(--gold); letter-spacing: 0.12em;
}`,
  `.lux-amp-row {
  display: flex; align-items: center; gap: 20px;
  margin: 4px 0;
  padding: 0 2px;
}
.lux-amp-rule { height: 1px; flex: 1; background: var(--ink-10); }
.lux-amp-rule.l { background: var(--ink-10); }
.lux-amp-rule.r { background: var(--ink-10); }
.lux-amp {
  font-family: var(--font-body);
  font-style: normal; font-weight: 300;
  font-size: clamp(10px, 1.8vw, 12px);
  color: var(--sage); letter-spacing: 0.32em;
  text-transform: uppercase; flex-shrink: 0;
}`
);

/* ─── date row ──────────────────────────────────────────────────────────── */

src = patch(
  src,
  '09 · .lux-date-row — left-aligned with round pip',
  `.lux-date-row {
  margin-top: 22px;
  display: flex; align-items: center; justify-content: center; gap: 14px;
}
.lux-pip { width: 5px; height: 5px; background: var(--pink-dark); transform: rotate(45deg); }
.lux-date-txt {
  font-family: var(--font-body);
  font-size: 12px; font-weight: 400; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink-40);
}`,
  `.lux-date-row {
  margin-top: 28px;
  display: flex; align-items: center; justify-content: flex-start; gap: 10px;
}
.lux-pip { width: 4px; height: 4px; background: var(--sage); border-radius: 50%; flex-shrink: 0; }
.lux-date-txt {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 400; letter-spacing: 0.32em;
  text-transform: uppercase; color: var(--ink-40);
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 6 — INVITATION TEXT
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '10 · .lux-invite-plain — left-aligned editorial text block',
  `.lux-invite-plain {
  margin: 32px auto;
  max-width: 540px;
  text-align: center;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) 0.08s both;
}`,
  `.lux-invite-plain {
  margin: 40px 0;
  max-width: 520px;
  text-align: left;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) 0.08s both;
}`
);

src = patch(
  src,
  '11 · .lux-invite-body — refined leading',
  `.lux-invite-body {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(15px, 3.8vw, 19px);
  line-height: 1.95; letter-spacing: 0.01em;
  color: var(--ink-60);
}`,
  `.lux-invite-body {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(15px, 3.6vw, 18px);
  line-height: 2.05; letter-spacing: 0.02em;
  color: var(--ink-60);
}`
);

src = patch(
  src,
  '12 · .lux-hashtag — sage + gold two-tone',
  `.lux-ht-gold { color: var(--gold); }
.lux-ht-ink  { color: var(--ink); }`,
  `.lux-ht-gold { color: var(--sage); }
.lux-ht-ink  { color: var(--gold); }`
);

src = patch(
  src,
  '13 · .lux-arrow — sage directional line',
  `.lux-arrow {
  display: block; margin: 10px auto 0;
  width: 1px; height: 28px;
  background: linear-gradient(180deg, var(--gold), transparent);
}`,
  `.lux-arrow {
  display: block; margin: 12px 0 0;
  width: 1px; height: 28px;
  background: linear-gradient(180deg, var(--sage), transparent);
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 7 — SECTION DIVIDERS
   Diamond ornaments → typographic rule (label interrupts a thin hairline).
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '14 · .lux-div — typographic section divider (no diamonds)',
  `/* ── SECTION DIVIDER ─────────────────────────────── */
.lux-div {
  display: flex; align-items: center; gap: 14px;
  margin: 44px 0 20px;
}
.lux-div-rule {
  flex: 1; height: 0.5px;
  background: linear-gradient(90deg, transparent, rgba(196,116,142,0.4) 50%, transparent);
}
.lux-div-gem { width: 5px; height: 5px; background: var(--pink-dark); transform: rotate(45deg); flex-shrink: 0; }
.lux-div-label {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 600; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--pink-dark); white-space: nowrap;
}`,
  `/* ── SECTION DIVIDER ─────────────────────────────── */
.lux-div {
  margin: 56px 0 28px;
  padding-top: 20px;
  border-top: 1px solid var(--ink-10);
}
.lux-div-rule { display: none; }
.lux-div-gem  { display: none; }
.lux-div-label {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 600; letter-spacing: 0.38em;
  text-transform: uppercase; color: var(--sage);
}`
);

src = patch(
  src,
  '15 · .lux-inner-div — typographic gold inner divider',
  `/* ── INNER DIVIDER ───────────────────────────────── */
.lux-inner-div {
  display: flex; align-items: center; gap: 14px;
  padding: 0 20px; margin: 26px 0;
}
.lux-inner-rule { flex: 1; height: 0.5px; background: rgba(184,148,79,0.22); }
.lux-inner-gem { width: 4px; height: 4px; background: var(--pink-dark); transform: rotate(45deg); flex-shrink: 0; }
.lux-inner-label {
  font-family: var(--font-body);
  font-size: 11px; font-weight: 600; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--pink-dark); white-space: nowrap;
}`,
  `/* ── INNER DIVIDER ───────────────────────────────── */
.lux-inner-div {
  margin: 36px 0 24px;
  padding-top: 18px;
  border-top: 1px solid var(--gold-border);
}
.lux-inner-rule { display: none; }
.lux-inner-gem  { display: none; }
.lux-inner-label {
  font-family: var(--font-body);
  font-size: 10px; font-weight: 600; letter-spacing: 0.34em;
  text-transform: uppercase; color: var(--gold);
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 8 — VIDEO STORIES STRIP
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '16 · .lux-stories-title — lighter Fraunces weight',
  `.lux-stories-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 400;
  font-size: clamp(18px, 4vw, 22px); color: var(--ink);
}`,
  `.lux-stories-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(18px, 4vw, 22px); color: var(--ink);
  letter-spacing: -0.01em;
}`
);

src = patch(
  src,
  '17 · .lux-btn-ghost — sage ghost button',
  `.lux-btn-ghost {
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  letter-spacing: 0.04em;
  padding: 9px 16px; background: var(--white);
  border: 0.5px solid var(--pink-border); color: var(--ink-80);
  cursor: pointer; transition: all .25s; border-radius: 6px;
}
.lux-btn-ghost:hover { background: var(--pink-deep); border-color: var(--pink-dark); }`,
  `.lux-btn-ghost {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 0.10em; text-transform: uppercase;
  padding: 9px 16px; background: transparent;
  border: 1px solid var(--sage-border); color: var(--sage-mid);
  cursor: pointer; transition: all .25s; border-radius: 2px;
}
.lux-btn-ghost:hover { background: var(--sage-pale); border-color: var(--sage); color: var(--sage); }`
);

src = patch(
  src,
  '18 · .lux-story-add — dashed sage border (add card)',
  `.lux-story-add {
  flex-shrink: 0; width: 88px; height: 156px;
  border-radius: 14px;
  background: var(--white);
  border: 0.5px solid var(--pink-border);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; cursor: pointer; transition: all .3s; scroll-snap-align: start;
  box-shadow: 0 2px 12px var(--pink-shadow);
}
.lux-story-add:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px var(--pink-shadow);
}`,
  `.lux-story-add {
  flex-shrink: 0; width: 88px; height: 156px;
  border-radius: 3px;
  background: var(--chalk);
  border: 1.5px dashed var(--sage-border);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; cursor: pointer; transition: all .3s; scroll-snap-align: start;
  box-shadow: none;
}
.lux-story-add:hover {
  transform: translateY(-2px);
  border-color: var(--sage);
  box-shadow: 0 6px 20px var(--sage-shadow);
}`
);

src = patch(
  src,
  '19 · .lux-story-add-ring — sage ring',
  `.lux-story-add-ring {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(196,116,142,0.1);
  border: 0.5px solid var(--pink-dark);
  display: flex; align-items: center; justify-content: center; transition: all .3s;
}
.lux-story-add:hover .lux-story-add-ring { animation: pinkPulse 1.2s ease-out infinite; }`,
  `.lux-story-add-ring {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--sage-pale);
  border: 1px solid var(--sage-border);
  display: flex; align-items: center; justify-content: center; transition: all .3s;
}
.lux-story-add:hover .lux-story-add-ring { background: var(--sage-pale); border-color: var(--sage); }`
);

src = patch(
  src,
  '20 · .lux-story-ph — clean parchment placeholder',
  `.lux-story-ph {
  flex-shrink: 0; width: 88px; height: 156px;
  border-radius: 14px; scroll-snap-align: start;
  overflow: hidden; position: relative;
  background: var(--white);
  border: 0.5px solid var(--pink-border);
  box-shadow: 0 2px 12px var(--pink-shadow);
}`,
  `.lux-story-ph {
  flex-shrink: 0; width: 88px; height: 156px;
  border-radius: 3px; scroll-snap-align: start;
  overflow: hidden; position: relative;
  background: var(--chalk);
  border: 0.5px solid var(--ink-10);
  border-top: 2px solid var(--sage-border);
  box-shadow: none;
}`
);

src = patch(
  src,
  '21 · .lux-shimmer — remove generic animation',
  `.lux-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%);
  background-size: 200%; animation: shimmer 3s ease-in-out infinite; pointer-events: none;
}`,
  `.lux-shimmer {
  position: absolute; inset: 0; pointer-events: none;
}`
);

/* Responsive story card width */
src = patch(
  src,
  '22 · story card responsive sizes — border-radius fix',
  `@media (min-width: 480px) {
  .lux-story-add, .lux-story-ph { width: 100px; height: 176px; }
}`,
  `@media (min-width: 480px) {
  .lux-story-add, .lux-story-ph { width: 100px; height: 176px; border-radius: 3px; }
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 9 — UPLOAD & SEND
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '23 · .lux-btn-upload — sage ghost primary button',
  `.lux-btn-upload {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--font-body); font-size: 15px; font-weight: 600;
  letter-spacing: 0.03em;
  padding: 14px 36px;
  background: var(--ink); color: #fce8ef;
  border: none; cursor: pointer; border-radius: 2px;
  transition: all .25s;
  box-shadow: 0 4px 18px rgba(28,15,20,0.18);
}
.lux-btn-upload:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(28,15,20,0.22); }`,
  `.lux-btn-upload {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 14px 36px;
  background: transparent; color: var(--sage);
  border: 1.5px solid var(--sage); cursor: pointer; border-radius: 2px;
  transition: all .28s;
  box-shadow: none;
}
.lux-btn-upload:hover {
  background: var(--sage); color: var(--chalk);
  transform: translateY(-1px); box-shadow: 0 6px 22px var(--sage-shadow);
}`
);

src = patch(
  src,
  '24 · .lux-btn-send — sage filled send button',
  `.lux-btn-send {
  font-family: var(--font-body); font-size: 14px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  padding: 14px 48px;
  background: var(--ink); color: #fce8ef;
  border: none; cursor: pointer; transition: all .25s; border-radius: 2px;
  box-shadow: 0 4px 20px rgba(28,15,20,0.18);
}
.lux-btn-send:hover { transform: translateY(-2px); box-shadow: 0 10px 36px rgba(28,15,20,0.24); }
.lux-btn-send:disabled { opacity: .45; cursor: not-allowed; transform: none; }`,
  `.lux-btn-send {
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 14px 48px;
  background: var(--sage); color: var(--chalk);
  border: 1.5px solid var(--sage); cursor: pointer; transition: all .28s; border-radius: 2px;
  box-shadow: 0 4px 18px var(--sage-shadow);
}
.lux-btn-send:hover { transform: translateY(-2px); box-shadow: 0 10px 28px var(--sage-shadow); }
.lux-btn-send:disabled { opacity: .45; cursor: not-allowed; transform: none; }`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 10 — GALLERY CARD
   Remove corner bracket ornaments → editorial sage top-border.
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '25 · .lux-card — editorial sage top border (no corner brackets)',
  `.lux-card {
  background: var(--white);
  border: 0.5px solid var(--pink-border);
  border-radius: 4px;
  box-shadow: 0 2px 0 rgba(196,116,142,0.12), 0 20px 56px rgba(196,116,142,0.10);
  position: relative; overflow: hidden;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) 0.15s both;
}
.lux-corner {
  position: absolute; width: 20px; height: 20px; pointer-events: none; z-index: 2;
}
.lux-corner.tl { top: 9px; left: 9px;   border-top: 0.5px solid var(--gold); border-left: 0.5px solid var(--gold); }
.lux-corner.tr { top: 9px; right: 9px;  border-top: 0.5px solid var(--gold); border-right: 0.5px solid var(--gold); }
.lux-corner.bl { bottom: 9px; left: 9px;  border-bottom: 0.5px solid var(--gold); border-left: 0.5px solid var(--gold); }
.lux-corner.br { bottom: 9px; right: 9px; border-bottom: 0.5px solid var(--gold); border-right: 0.5px solid var(--gold); }`,
  `.lux-card {
  background: var(--chalk);
  border: 1px solid var(--ink-10);
  border-top: 3px solid var(--sage);
  border-radius: 2px;
  box-shadow: 0 4px 32px rgba(27,25,21,0.06);
  position: relative; overflow: hidden;
  animation: fadeUp 1s cubic-bezier(.22,.68,0,1.2) 0.15s both;
}
.lux-corner { display: none; }`
);

/* Gallery title */
src = patch(
  src,
  '26 · .lux-gallery-title — Fraunces lighter italic',
  `.lux-gallery-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 400;
  font-size: clamp(18px, 4vw, 22px); color: var(--ink);
}`,
  `.lux-gallery-title {
  font-family: var(--font-display);
  font-style: italic; font-weight: 300;
  font-size: clamp(18px, 4vw, 23px); color: var(--ink);
  letter-spacing: -0.01em;
}`
);

/* Gallery action buttons */
src = patch(
  src,
  '27 · .lux-btn-action — sage ghost action buttons',
  `.lux-btn-action {
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  letter-spacing: 0.02em;
  padding: 7px 14px; background: rgba(196,116,142,0.08);
  border: 0.5px solid var(--pink-border); color: var(--ink-80);
  cursor: pointer; transition: all .2s; border-radius: 5px;
}
.lux-btn-action:hover { border-color: var(--pink-dark); background: rgba(196,116,142,0.14); }
.lux-btn-action.active { background: var(--ink); color: #fce8ef; border-color: var(--ink); }
.lux-btn-action.dl { background: var(--ink); color: #fce8ef; border-color: var(--ink); }`,
  `.lux-btn-action {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 7px 14px; background: transparent;
  border: 1px solid var(--sage-border); color: var(--ink-60);
  cursor: pointer; transition: all .2s; border-radius: 2px;
}
.lux-btn-action:hover { border-color: var(--sage); background: var(--sage-pale); color: var(--sage); }
.lux-btn-action.active { background: var(--sage); color: var(--chalk); border-color: var(--sage); }
.lux-btn-action.dl { background: var(--sage); color: var(--chalk); border-color: var(--sage); }`
);

/* Photo grid gap */
src = patch(
  src,
  '28 · .lux-photo-grid — refined 6px gap',
  `/* Mobile: 2-col; ≥480: 3-col */
.lux-photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 138px;
  gap: 4px;
}
@media (min-width: 480px) {
  .lux-photo-grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 154px; }
}
@media (min-width: 640px) {
  .lux-photo-grid { grid-auto-rows: 164px; }
}`,
  `/* Mobile: 2-col; ≥480: 3-col */
.lux-photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 142px;
  gap: 6px;
}
@media (min-width: 480px) {
  .lux-photo-grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 158px; }
}
@media (min-width: 640px) {
  .lux-photo-grid { grid-auto-rows: 168px; }
}`
);

/* Photo item */
src = patch(
  src,
  '29 · .lux-photo-item — parchment background, sage selection',
  `.lux-photo-item {
  cursor: pointer; border-radius: 3px; overflow: hidden;
  background: var(--pink-deep);
  position: relative; border: 2px solid transparent; transition: all .25s;
}
.lux-photo-item.featured { grid-column: span 2; grid-row: span 2; }
.lux-photo-item.selected { border-color: var(--gold); }`,
  `.lux-photo-item {
  cursor: pointer; border-radius: 2px; overflow: hidden;
  background: var(--page-deep);
  position: relative; border: 2px solid transparent; transition: all .25s;
}
.lux-photo-item.featured { grid-column: span 2; grid-row: span 2; }
.lux-photo-item.selected { border-color: var(--sage); }`
);

/* Select check */
src = patch(
  src,
  '30 · .lux-select-check — sage check indicator',
  `.lux-select-check {
  position: absolute; top: 7px; left: 7px;
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(255,255,255,0.9); border: 1.5px solid var(--gold);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: .2s; pointer-events: none;
}
.lux-selection-mode .lux-select-check,
.lux-photo-item:hover .lux-select-check { opacity: 1; }
.lux-photo-item.selected .lux-select-check { opacity: 1; background: var(--gold); border-color: var(--gold); }`,
  `.lux-select-check {
  position: absolute; top: 7px; left: 7px;
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(253,252,248,0.92); border: 1.5px solid var(--sage);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: .2s; pointer-events: none;
}
.lux-selection-mode .lux-select-check,
.lux-photo-item:hover .lux-select-check { opacity: 1; }
.lux-photo-item.selected .lux-select-check { opacity: 1; background: var(--sage); border-color: var(--sage); }`
);

/* No-photos ring — hardcoded pink RGBA */
src = patch(
  src,
  '31 · .lux-no-photos-ring — sage-tinted background',
  `  background: rgba(196,116,142,0.07);
}
.lux-no-photos-txt {`,
  `  background: var(--sage-pale);
}
.lux-no-photos-txt {`
);

/* View-all button */
src = patch(
  src,
  '32 · .lux-btn-view-all — sage ghost view-all',
  `.lux-view-all-wrap { text-align: center; margin-top: 18px; }
.lux-btn-view-all {
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  padding: 10px 28px; background: rgba(196,116,142,0.07);
  border: 0.5px solid var(--pink-border); color: var(--ink-60);
  cursor: pointer; transition: .22s; border-radius: 5px;
}
.lux-btn-view-all:hover { color: var(--ink); border-color: var(--pink-dark); background: rgba(196,116,142,0.13); }`,
  `.lux-view-all-wrap { text-align: center; margin-top: 20px; }
.lux-btn-view-all {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  padding: 10px 32px; background: transparent;
  border: 1px solid var(--sage-border); color: var(--sage-mid);
  cursor: pointer; transition: .22s; border-radius: 2px;
}
.lux-btn-view-all:hover { color: var(--sage); border-color: var(--sage); background: var(--sage-pale); }`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 11 — FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '33 · .lux-footer — editorial left-aligned statement footer',
  `/* ── FOOTER ──────────────────────────────────────── */
.lux-footer {
  text-align: center; margin-top: 72px; padding-top: 28px;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.lux-footer-names {
  font-family: var(--font-display); font-style: italic; font-weight: 300;
  font-size: clamp(13px, 3vw, 15px); color: var(--ink-60); letter-spacing: 0.06em;
}`,
  `/* ── FOOTER ──────────────────────────────────────── */
.lux-footer {
  text-align: left; margin-top: 96px; padding-top: 36px;
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  border-top: 1px solid var(--ink-10);
}
.lux-footer-rule {
  width: 36px; height: 2px; background: var(--sage); margin-bottom: 6px;
}
.lux-footer-names {
  font-family: var(--font-display); font-style: italic; font-weight: 300;
  font-size: clamp(13px, 2.8vw, 16px); color: var(--ink-40); letter-spacing: 0.06em;
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 12 — LIGHTBOX refinements
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '34 · .lux-lb-zoom — refined control',
  `.lux-lb-zoom {
  background: transparent; border: 0.5px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.48);
  font-family: var(--font-body); font-size: 13px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 8px 18px; cursor: pointer; transition: all .2s; border-radius: 2px;
}
.lux-lb-zoom:hover { color: #fff; border-color: rgba(255,255,255,0.5); }`,
  `.lux-lb-zoom {
  background: transparent; border: 0.5px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.52);
  font-family: var(--font-body); font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase;
  padding: 8px 18px; cursor: pointer; transition: all .2s; border-radius: 2px;
}
.lux-lb-zoom:hover { color: #fff; border-color: rgba(255,255,255,0.55); }`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 13 — PULSE ANIMATION (sage colours)
   ═══════════════════════════════════════════════════════════════════════════ */

src = patch(
  src,
  '35 · @keyframes pinkPulse — sage pulse',
  `@keyframes pinkPulse {
  0%   { box-shadow: 0 0 0 0 rgba(196,116,142,0.5); }
  70%  { box-shadow: 0 0 0 10px rgba(196,116,142,0); }
  100% { box-shadow: 0 0 0 0 rgba(196,116,142,0); }
}`,
  `@keyframes pinkPulse {
  0%   { box-shadow: 0 0 0 0 rgba(92,107,80,0.40); }
  70%  { box-shadow: 0 0 0 10px rgba(92,107,80,0); }
  100% { box-shadow: 0 0 0 0 rgba(92,107,80,0); }
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 14 — JSX STRUCTURAL PATCHES
   ═══════════════════════════════════════════════════════════════════════════ */

/* "&" → "et" in the amp span */
src = patch(
  src,
  '36 · JSX — "&" → "et" (literary connector)',
  `<span className="lux-amp">&amp;</span>`,
  `<span className="lux-amp">et</span>`
);

/* Mark → upright + right-aligned */
src = patch(
  src,
  '37 · JSX — Mark name gets "upright" class',
  `            <span className="lux-name">Mark</span>`,
  `            <span className="lux-name upright">Mark</span>`
);

/* Remove corner bracket ornaments */
src = patch(
  src,
  '38 · JSX — remove corner bracket ornaments from gallery card',
  `          <div className="lux-corner tl" /><div className="lux-corner tr" />
          <div className="lux-corner bl" /><div className="lux-corner br" />

          `,
  `          `
);

/* Footer: replace SVG ornaments with clean typographic footer */
src = patch(
  src,
  '39 · JSX — footer: SVG ornaments → editorial typographic footer',
  `        <footer className="lux-footer">
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
        </footer>`,
  `        <footer className="lux-footer">
          <div className="lux-footer-rule" />
          <div className="lux-footer-names">Claudine et Mark · 2026</div>
        </footer>`
);

/* Upload button SVG: hardcoded pink strokes → currentColor */
src = patch(
  src,
  '40 · JSX — upload button SVG strokes → currentColor',
  `            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V9" stroke="#fce8ef" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 12l3-3 3 3" stroke="#fce8ef" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 19h14" stroke="#fce8ef" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M7 10.5A5 5 0 0 1 17 10.5" stroke="rgba(252,232,239,0.6)" strokeWidth="1" strokeLinecap="round"/>
            </svg>`,
  `            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 12l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 19h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M7 10.5A5 5 0 0 1 17 10.5" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" strokeLinecap="round"/>
            </svg>`
);

/* Add video ring SVG: old gold → new sage */
src = patch(
  src,
  '41 · JSX — add-video ring SVG stroke → sage',
  `                <path d="M9 4v10M4 9h10" stroke="#b8944f" strokeWidth="1.4" strokeLinecap="round" />`,
  `                <path d="M9 4v10M4 9h10" stroke="#5C6B50" strokeWidth="1.4" strokeLinecap="round" />`
);

/* Story placeholder icon: old pink → sage */
src = patch(
  src,
  '42 · JSX — story placeholder SVG strokes → sage',
  `                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#c4748e" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#c4748e" strokeWidth="0.9" />
                  </svg>`,
  `                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.2" stroke="#5C6B50" strokeWidth="0.9" />
                    <path d="M6 6.5l4.5 1.5L6 9.5V6.5z" stroke="#5C6B50" strokeWidth="0.9" />
                  </svg>`
);

/* No-photos icon: old pink → sage */
src = patch(
  src,
  '43 · JSX — no-photos gallery icon strokes → sage',
  `                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#c4748e" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#c4748e" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>`,
  `                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1.5" y="3.5" width="17" height="13" rx="1.8" stroke="#5C6B50" strokeWidth="0.75" />
                    <circle cx="7" cy="8.5" r="1.8" stroke="#5C6B50" strokeWidth="0.75" />
                    <path d="M1.5 13.5l4.5-3.5 3.5 3.5 4-5L18.5 14" stroke="#5C6B50" strokeWidth="0.75" strokeLinecap="round" />
                  </svg>`
);

/* SectionDivider component: remove gem/rule elements */
src = patch(
  src,
  '44 · JSX — SectionDivider simplified (label only, no gems)',
  `function SectionDivider({ label }) {
  return (
    <div className="lux-div">
      <div className="lux-div-rule" />
      <div className="lux-div-gem" />
      <span className="lux-div-label">{label}</span>
      <div className="lux-div-gem" />
      <div className="lux-div-rule" />
    </div>
  );
}`,
  `function SectionDivider({ label }) {
  return (
    <div className="lux-div">
      <span className="lux-div-label">{label}</span>
    </div>
  );
}`
);

/* InnerDivider component: remove gem/rule elements */
src = patch(
  src,
  '45 · JSX — InnerDivider simplified (label only, no gems)',
  `function InnerDivider({ label }) {
  return (
    <div className="lux-inner-div">
      <div className="lux-inner-rule" />
      <div className="lux-inner-gem" />
      <span className="lux-inner-label">{label}</span>
      <div className="lux-inner-gem" />
      <div className="lux-inner-rule" />
    </div>
  );
}`,
  `function InnerDivider({ label }) {
  return (
    <div className="lux-inner-div">
      <span className="lux-inner-label">{label}</span>
    </div>
  );
}`
);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 15 — GUARD + WRITE
   ═══════════════════════════════════════════════════════════════════════════ */

src = src.replace(
  'const LUXURY_CSS = `',
  `${GUARD}\nconst LUXURY_CSS = \``
);

fs.writeFileSync(TARGET, src, 'utf8');

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  "Bound Journal" redesign applied (45 patches)

  What changed
  ────────────
  Palette   Warm parchment + deep sage + antique gold
  Type      Fraunces (optical serif) + Plus Jakarta Sans
  Spine     2px sage left-border — the editorial binding
  Hero      Left-aligned; Claudine italic ↔ Mark upright
  Connector "et" replaces "&" — more literary
  Dividers  Typographic rule; diamond ornaments removed
  Upload    Sage ghost button (was flat black)
  Send      Sage filled button
  Gallery   Editorial sage top-border; no corner brackets
  Footer    Clean left-aligned statement; no SVG ornaments
  SVGs      All hardcoded pink/gold → sage/gold tokens

  Preview
  ───────
  cd wedding-gallery && npm start
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
