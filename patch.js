#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════╗
// ║   WEDDING GALLERY — PREMIUM DESIGN PATCH  v2.0.0               ║
// ║   github.com/raging-code/wedding-gallery                       ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║   Usage:                                                        ║
// ║     node patch.js                  ← auto-clones the repo      ║
// ║     node patch.js ./my-repo        ← patch an existing folder  ║
// ║     node patch.js --restore        ← revert to originals       ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║   What it does:                                                 ║
// ║   1. Clones raging-code/wedding-gallery (or uses local copy)   ║
// ║   2. Backs up all HTML/CSS originals to __backup__/            ║
// ║   3. Injects Cormorant Garamond + Raleway (Google Fonts)       ║
// ║   4. Creates css/premium.css — full luxury design system       ║
// ║   5. Creates js/premium.js  — scroll, reveal, interactions     ║
// ║   6. Patches every HTML file to include the new assets         ║
// ║   7. Writes a patch-log.json with a summary of all changes     ║
// ╚══════════════════════════════════════════════════════════════════╝

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ──────────────────────────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────────────────────────
const REPO_URL  = 'https://github.com/raging-code/wedding-gallery.git';
const REPO_NAME = 'wedding-gallery';
const BACKUP    = '__backup__';
const LOG_FILE  = 'patch-log.json';

// Derive target directory from args
const RESTORE = process.argv.includes('--restore');
const TARGET  = process.argv.find(a => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1])
              || `./${REPO_NAME}`;

// ──────────────────────────────────────────────────────────────────
//  CONSOLE COLORS
// ──────────────────────────────────────────────────────────────────
const C = {
  reset : '\x1b[0m',
  bold  : '\x1b[1m',
  dim   : '\x1b[2m',
  gold  : '\x1b[33m',
  green : '\x1b[32m',
  cyan  : '\x1b[36m',
  red   : '\x1b[31m',
  pink  : '\x1b[35m',
};

function log(icon, msg, color = C.cyan)  { console.log(`  ${color}${icon}${C.reset}  ${msg}`); }
function ok(msg)   { log('✓', msg, C.green); }
function info(msg) { log('◈', msg, C.cyan);  }
function warn(msg) { log('!', msg, C.gold);  }
function err(msg)  { log('✗', msg, C.red);   }
function head(msg) { console.log(`\n${C.bold}${C.gold}  ${msg}${C.reset}\n`); }

// ──────────────────────────────────────────────────────────────────
//  FILE HELPERS
// ──────────────────────────────────────────────────────────────────
function readFile(p)          { return fs.readFileSync(p, 'utf-8'); }
function writeFile(p, c)      { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c, 'utf-8'); }
function exists(p)            { return fs.existsSync(p); }

function findFiles(dir, ext) {
  const out = [];
  (function walk(cur) {
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (['.git', '__backup__', 'node_modules', 'lightcase-2.5.0'].includes(e.name)) continue;
      const full = path.join(cur, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(ext)) out.push(full);
    }
  })(dir);
  return out;
}

// ──────────────────────────────────────────────────────────────────
//  STEP 0 — RESTORE
// ──────────────────────────────────────────────────────────────────
function restore(dir) {
  head('Restoring original files…');
  const backupDir = path.join(dir, BACKUP);
  if (!exists(backupDir)) { err('No backup found. Nothing to restore.'); process.exit(1); }

  let count = 0;
  for (const file of findFiles(backupDir, '.html').concat(findFiles(backupDir, '.css'))) {
    const rel  = path.relative(backupDir, file);
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
    count++;
  }

  // Remove injected files
  [path.join(dir, 'css', 'premium.css'), path.join(dir, 'js', 'premium.js')].forEach(f => {
    if (exists(f)) fs.unlinkSync(f);
  });

  ok(`Restored ${count} file(s). Removed premium.css and premium.js.`);
}

// ──────────────────────────────────────────────────────────────────
//  STEP 1 — CLONE OR VERIFY REPO
// ──────────────────────────────────────────────────────────────────
function ensureRepo(dir) {
  if (exists(dir)) {
    const hasHtml = findFiles(dir, '.html').length > 0;
    if (hasHtml) { ok(`Using existing repo at: ${dir}`); return; }
  }

  info(`Cloning ${REPO_URL} …`);
  try {
    execSync(`git clone "${REPO_URL}" "${dir}"`, { stdio: 'inherit' });
    ok('Clone complete.');
  } catch (e) {
    err('Git clone failed. Please clone manually, then run:');
    console.log(`\n    git clone ${REPO_URL}`);
    console.log(`    node patch.js ./${REPO_NAME}\n`);
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────────────
//  STEP 2 — BACKUP
// ──────────────────────────────────────────────────────────────────
function createBackup(dir) {
  const backupDir = path.join(dir, BACKUP);
  if (exists(backupDir)) { warn('Backup already exists — skipping.'); return; }

  const files = findFiles(dir, '.html').concat(findFiles(dir, '.css'));
  for (const file of files) {
    const rel  = path.relative(dir, file);
    const dest = path.join(backupDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
  ok(`Backed up ${files.length} file(s) → ${BACKUP}/`);
}

// ──────────────────────────────────────────────────────────────────
//  STEP 3 — EXTRACT COLOR THEME (for the log; we preserve all colors)
// ──────────────────────────────────────────────────────────────────
function extractColors(dir) {
  const rxHex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  const freq  = {};

  for (const file of findFiles(dir, '.css')) {
    const content = readFile(file);
    let m;
    while ((m = rxHex.exec(content)) !== null) {
      const hex = m[0].toUpperCase();
      freq[hex] = (freq[hex] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c]) => c);
}

// ──────────────────────────────────────────────────────────────────
//  STEP 4 — PATCH HTML FILES
// ──────────────────────────────────────────────────────────────────
const FONTS_SNIPPET = `
  <!-- ┌─────────────────────────────────────────────────────┐ -->
  <!-- │  Premium Design Upgrade — Google Fonts             │ -->
  <!-- └─────────────────────────────────────────────────────┘ -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Raleway:wght@200;300;400;500;600&display=swap" rel="stylesheet">`;

function premiumCssLink(htmlFile, cssDir) {
  // Compute relative path from HTML to css/premium.css
  const rel = path.relative(path.dirname(htmlFile), cssDir).replace(/\\/g, '/');
  return `  <link rel="stylesheet" href="${rel}/premium.css">`;
}

function premiumJsTag(htmlFile, jsDir) {
  const rel = path.relative(path.dirname(htmlFile), jsDir).replace(/\\/g, '/');
  return `  <!-- Premium interactions -->\n  <script src="${rel}/premium.js"></script>`;
}

function patchHtml(filePath, cssDir, jsDir) {
  let html = readFile(filePath);
  let changed = false;

  // Inject Google Fonts (before </head>)
  if (!html.includes('Cormorant+Garamond')) {
    html = html.replace(/(<\/head>)/i, `${FONTS_SNIPPET}\n$1`);
    changed = true;
  }

  // Inject premium.css (just before </head>)
  const cssTag = premiumCssLink(filePath, cssDir);
  if (!html.includes('premium.css')) {
    html = html.replace(/(<\/head>)/i, `${cssTag}\n$1`);
    changed = true;
  }

  // Inject premium.js (just before </body>)
  const jsTag = premiumJsTag(filePath, jsDir);
  if (!html.includes('premium.js')) {
    html = html.replace(/(<\/body>)/i, `${jsTag}\n$1`);
    changed = true;
  }

  if (changed) {
    writeFile(filePath, html);
    ok(`Patched: ${path.relative(TARGET, filePath)}`);
  } else {
    warn(`Already patched: ${path.relative(TARGET, filePath)}`);
  }

  return changed;
}

// ──────────────────────────────────────────────────────────────────
//  STEP 5 — WRITE css/premium.css
// ──────────────────────────────────────────────────────────────────
const PREMIUM_CSS = `/* =======================================================================
   WEDDING GALLERY — PREMIUM DESIGN SYSTEM
   Generated by patch.js v2.0.0  |  raging-code/wedding-gallery

   Philosophy:
     Elevate what exists. Preserve the existing color story.
     Enhance typography, spacing, motion, and craft.
     Every rule is scoped to avoid breaking existing layout logic.

   Fonts injected via HTML:
     Display  → Cormorant Garamond (300 / 400 / 500, normal + italic)
     Body     → Raleway            (200 / 300 / 400 / 500 / 600)
   ======================================================================= */


/* ─────────────────────────────────────────────────────────────────────
   1. DESIGN TOKENS
   ───────────────────────────────────────────────────────────────────── */
:root {
  /* Typography stacks */
  --pf-display : 'Cormorant Garamond', 'Garamond', 'Book Antiqua', Georgia, serif;
  --pf-body    : 'Raleway', 'Helvetica Neue', Arial, sans-serif;

  /* Gold accent — harmonises with rose, champagne, blush palettes */
  --pf-gold        : #C4A35A;
  --pf-gold-light  : #E5D4A8;
  --pf-gold-muted  : rgba(196, 163, 90, 0.28);

  /* Easing curves */
  --pf-ease        : cubic-bezier(0.16, 1, 0.3, 1);
  --pf-ease-spring : cubic-bezier(0.34, 1.56, 0.64, 1);
  --pf-ease-in-out : cubic-bezier(0.45, 0, 0.55, 1);

  /* Elevation */
  --pf-shadow-subtle : 0 2px 12px rgba(0, 0, 0, 0.06);
  --pf-shadow-soft   : 0 6px 28px rgba(0, 0, 0, 0.09);
  --pf-shadow-float  : 0 18px 56px rgba(0, 0, 0, 0.14);
  --pf-shadow-deep   : 0 36px 80px rgba(0, 0, 0, 0.20);
}


/* ─────────────────────────────────────────────────────────────────────
   2. BASE RESET & RENDERING
   ───────────────────────────────────────────────────────────────────── */
html {
  scroll-behavior: smooth;
}

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family       : var(--pf-body) !important;
  font-weight       : 300 !important;
  line-height       : 1.85 !important;
  letter-spacing    : 0.01em !important;
  -webkit-font-smoothing  : antialiased !important;
  -moz-osx-font-smoothing : grayscale !important;
  text-rendering    : optimizeLegibility !important;
}

/* Thin, elegant scrollbar */
::-webkit-scrollbar              { width: 3px; }
::-webkit-scrollbar-track        { background: transparent; }
::-webkit-scrollbar-thumb        { background: var(--pf-gold-muted); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover  { background: var(--pf-gold); }


/* ─────────────────────────────────────────────────────────────────────
   3. TYPOGRAPHY SYSTEM
   ───────────────────────────────────────────────────────────────────── */
h1, h2, h3, h4, h5, h6 {
  font-family  : var(--pf-display) !important;
  font-weight  : 300 !important;
  line-height  : 1.15 !important;
  letter-spacing: 0.04em !important;
}

h1 { font-size: clamp(2.8rem,  7vw, 6.0rem) !important; }
h2 { font-size: clamp(2.0rem,  4vw, 3.4rem) !important; }
h3 { font-size: clamp(1.5rem,  3vw, 2.4rem) !important; }
h4 { font-size: clamp(1.2rem,  2vw, 1.7rem) !important; }
h5 { font-size: clamp(1.0rem, 1.5vw, 1.3rem)!important; }
h6 { font-size: clamp(0.9rem,  1vw, 1.1rem) !important; }

p {
  font-family  : var(--pf-body) !important;
  font-weight  : 300 !important;
  line-height  : 1.9 !important;
  letter-spacing: 0.01em !important;
}

a {
  transition: opacity 260ms ease, color 260ms ease !important;
  text-decoration-thickness: 1px !important;
  text-underline-offset: 3px !important;
}


/* ─────────────────────────────────────────────────────────────────────
   4. NAVIGATION
   Transparent → frosted-glass on scroll (class .pf-scrolled added by JS)
   ───────────────────────────────────────────────────────────────────── */
nav,
.navbar,
.navigation,
.nav-bar,
#navbar,
#nav,
header:not([class*="page"]):not([class*="content"]) {
  position   : fixed !important;
  top        : 0 !important;
  left       : 0 !important;
  right      : 0 !important;
  z-index    : 9900 !important;
  padding    : 1.8rem 4rem !important;
  background : transparent !important;
  border-bottom: none !important;
  transition :
    padding    500ms var(--pf-ease),
    background 500ms var(--pf-ease),
    box-shadow 500ms var(--pf-ease) !important;
}

nav.pf-scrolled,
.navbar.pf-scrolled,
.navigation.pf-scrolled,
#navbar.pf-scrolled,
#nav.pf-scrolled,
header.pf-scrolled {
  padding    : 1.1rem 4rem !important;
  background : rgba(255, 255, 255, 0.84) !important;
  backdrop-filter: blur(28px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
  box-shadow : 0 1px 0 rgba(0,0,0,0.07), 0 4px 20px rgba(0,0,0,0.05) !important;
}

/* Logo / brand */
nav .logo, nav .brand, nav .site-name,
.navbar-brand, .navbar .logo, nav > a:first-child {
  font-family  : var(--pf-display) !important;
  font-weight  : 400 !important;
  font-size    : 1.35rem !important;
  letter-spacing: 0.08em !important;
  text-decoration: none !important;
}

/* Nav links */
nav a:not(.logo):not(.brand):not([class*="btn"]),
nav ul li a,
.navbar-nav a,
.nav-links a {
  font-family   : var(--pf-body) !important;
  font-weight   : 400 !important;
  font-size     : 0.70rem !important;
  letter-spacing: 0.20em !important;
  text-transform: uppercase !important;
  text-decoration: none !important;
  padding       : 0.3rem 0 !important;
  margin        : 0 1.4rem !important;
  position      : relative !important;
  opacity       : 0.80 !important;
  transition    : opacity 300ms ease, letter-spacing 300ms ease !important;
}

/* Underline slide-in */
nav a:not(.logo):not(.brand):not([class*="btn"])::after,
nav ul li a::after {
  content      : '' !important;
  position     : absolute !important;
  bottom       : -1px !important;
  left         : 0 !important;
  right        : 0 !important;
  height       : 1px !important;
  background   : var(--pf-gold) !important;
  transform    : scaleX(0) !important;
  transform-origin: left !important;
  transition   : transform 360ms var(--pf-ease) !important;
}

nav a:not(.logo):not(.brand):not([class*="btn"]):hover,
nav ul li a:hover {
  opacity       : 1 !important;
  letter-spacing: 0.25em !important;
}

nav a:not(.logo):not(.brand):not([class*="btn"]):hover::after,
nav ul li a:hover::after {
  transform: scaleX(1) !important;
}


/* ─────────────────────────────────────────────────────────────────────
   5. HERO / BANNER
   ───────────────────────────────────────────────────────────────────── */
.hero,
#hero,
.banner,
.jumbotron,
.cover,
.intro,
.fullscreen,
.hero-section {
  min-height       : 100vh !important;
  display          : flex !important;
  align-items      : center !important;
  justify-content  : center !important;
  text-align       : center !important;
  position         : relative !important;
  overflow         : hidden !important;
  background-size  : cover !important;
  background-position: center center !important;
}

/* Atmospheric gradient veil */
.hero::before,
#hero::before,
.banner::before,
.jumbotron::before,
.cover::before {
  content  : '' !important;
  position : absolute !important;
  inset    : 0 !important;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.24) 0%,
    rgba(0, 0, 0, 0.06) 45%,
    rgba(0, 0, 0, 0.34) 100%
  ) !important;
  pointer-events: none !important;
  z-index  : 1 !important;
}

.hero > *,
#hero > *,
.banner > *,
.jumbotron > *,
.cover > * {
  position : relative !important;
  z-index  : 2 !important;
}

/* Hero headline */
.hero h1, #hero h1,
.banner h1, .jumbotron h1,
.cover h1, .hero-title,
.hero .title {
  font-family   : var(--pf-display) !important;
  font-size     : clamp(3.2rem, 9vw, 9rem) !important;
  font-weight   : 300 !important;
  font-style    : italic !important;
  letter-spacing: 0.04em !important;
  line-height   : 1.0 !important;
  color         : #fff !important;
  text-shadow   : 0 2px 48px rgba(0, 0, 0, 0.22) !important;
  margin-bottom : 1.5rem !important;
}

/* Hero sub-text */
.hero h2, .hero h3, #hero h2,
.banner .subtitle, .banner h2,
.hero p, .hero .lead,
.hero-subtitle {
  font-family   : var(--pf-body) !important;
  font-weight   : 200 !important;
  font-size     : clamp(0.7rem, 1.8vw, 0.9rem) !important;
  letter-spacing: 0.36em !important;
  text-transform: uppercase !important;
  color         : rgba(255, 255, 255, 0.88) !important;
  text-shadow   : 0 1px 16px rgba(0,0,0,0.28) !important;
  line-height   : 2.2 !important;
}

/* Hairline gold separator in hero */
.hero .separator,
.hero hr,
#hero hr {
  width       : 60px !important;
  border      : none !important;
  border-top  : 1px solid var(--pf-gold) !important;
  margin      : 1.8rem auto !important;
  opacity     : 0.7 !important;
}


/* ─────────────────────────────────────────────────────────────────────
   6. SECTION LAYOUT & ORNAMENTAL HEADINGS
   ───────────────────────────────────────────────────────────────────── */
section,
.section {
  padding: 8rem 5rem !important;
}

/* Centered section h2 with ornament */
section h2,
.section h2,
.section-title,
.gallery-section h2 {
  font-family   : var(--pf-display) !important;
  font-weight   : 300 !important;
  text-align    : center !important;
  margin-bottom : 0 !important;
  position      : relative !important;
}

/* Gold ornamental divider beneath headings */
section h2::after,
.section h2::after,
.section-title::after {
  content     : '— \u25C6 —' !important;
  display     : block !important;
  font-size   : 0.58rem !important;
  letter-spacing: 0.55em !important;
  color       : var(--pf-gold) !important;
  margin-top  : 1.3rem !important;
  margin-bottom: 3rem !important;
  font-family : var(--pf-body) !important;
  font-weight : 300 !important;
  font-style  : normal !important;
}

/* Eyebrow / pre-label */
.eyebrow, .pre-title, .section-label, .kicker, .overline {
  font-family   : var(--pf-body) !important;
  font-weight   : 400 !important;
  font-size     : 0.65rem !important;
  letter-spacing: 0.40em !important;
  text-transform: uppercase !important;
  opacity       : 0.45 !important;
  display       : block !important;
  text-align    : center !important;
  margin-bottom : 1rem !important;
}

/* Lead paragraph */
.lead, .intro-text {
  font-family   : var(--pf-display) !important;
  font-weight   : 300 !important;
  font-style    : italic !important;
  font-size     : clamp(1.1rem, 2.5vw, 1.5rem) !important;
  line-height   : 1.7 !important;
  text-align    : center !important;
  max-width     : 680px !important;
  margin        : 0 auto 2.5rem !important;
}

/* Thin divider rule between sections */
section + section::before,
.section + .section::before {
  content     : '' !important;
  display     : block !important;
  width       : 1px !important;
  height      : 60px !important;
  background  : var(--pf-gold-muted) !important;
  margin      : 0 auto !important;
}


/* ─────────────────────────────────────────────────────────────────────
   7. PREMIUM GALLERY GRID
   Masonry-style columns, elegant hover states, reveal circle
   ───────────────────────────────────────────────────────────────────── */

/* Grid container */
.gallery,
#gallery,
.photos,
.photo-grid,
.image-gallery,
.image-grid,
[class*="gallery-container"],
[class*="gallery-grid"] {
  column-count : 3 !important;
  column-gap   : 1.2rem !important;
  padding      : 1rem 5rem 5rem !important;
  display      : block !important;
  width        : 100% !important;
}

/* Individual item */
.gallery a,
.gallery-item,
.gallery > div,
.gallery figure,
.photo-item,
.photo-card,
[id*="gallery"] > a,
[class*="gallery"] > a {
  break-inside : avoid !important;
  display      : block !important;
  margin-bottom: 1.2rem !important;
  position     : relative !important;
  overflow     : hidden !important;
  border-radius: 1px !important;
  cursor       : pointer !important;
  /* Force GPU compositing layer for silky transitions */
  transform    : translateZ(0) !important;
  will-change  : transform !important;
}

/* The image itself */
.gallery img,
.gallery-item img,
.photo-item img,
[id*="gallery"] img,
[class*="gallery"] img {
  width      : 100% !important;
  height     : auto !important;
  display    : block !important;
  transition :
    transform 900ms var(--pf-ease),
    filter    500ms ease !important;
  filter     : brightness(0.95) saturate(1.06) !important;
  will-change: transform !important;
}

/* ── Hover: image scale ── */
.gallery a:hover img,
.gallery-item:hover img,
.photo-item:hover img,
[id*="gallery"] a:hover img {
  transform : scale(1.065) !important;
  filter    : brightness(1.00) saturate(1.10) !important;
}

/* ── Hover: dark veil overlay (::after) ── */
.gallery a::after,
.gallery-item::after,
.photo-item::after,
[id*="gallery"] a::after {
  content    : '' !important;
  position   : absolute !important;
  inset      : 0 !important;
  background : rgba(15, 12, 10, 0) !important;
  transition : background 450ms ease !important;
  pointer-events: none !important;
  z-index    : 1 !important;
}

.gallery a:hover::after,
.gallery-item:hover::after,
.photo-item:hover::after,
[id*="gallery"] a:hover::after {
  background: rgba(15, 12, 10, 0.20) !important;
}

/* ── Hover: frosted-glass circle (::before) ── */
.gallery a::before,
.gallery-item::before,
[id*="gallery"] a::before {
  content      : '' !important;
  position     : absolute !important;
  top          : 50% !important;
  left         : 50% !important;
  width        : 54px !important;
  height       : 54px !important;
  border       : 1.5px solid rgba(255, 255, 255, 0.82) !important;
  border-radius: 50% !important;
  z-index      : 2 !important;
  transform    : translate(-50%, -50%) scale(0) !important;
  transition   : transform 420ms var(--pf-ease-spring) !important;
  background   : rgba(255, 255, 255, 0.10) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}

.gallery a:hover::before,
.gallery-item:hover::before,
[id*="gallery"] a:hover::before {
  transform: translate(-50%, -50%) scale(1) !important;
}

/* Caption on gallery items */
.gallery figcaption,
.gallery-item figcaption,
.gallery-caption,
.photo-caption {
  font-family   : var(--pf-body) !important;
  font-weight   : 300 !important;
  font-size     : 0.72rem !important;
  letter-spacing: 0.08em !important;
  padding       : 0.8rem 0.6rem 0.5rem !important;
  opacity       : 0.6 !important;
  transition    : opacity 300ms ease !important;
  text-align    : center !important;
}

.gallery a:hover figcaption,
.gallery-item:hover figcaption {
  opacity: 0.9 !important;
}


/* ─────────────────────────────────────────────────────────────────────
   8. LIGHTBOX ENHANCEMENTS
   Compatible with: Lightcase · Lightbox2 · Fancybox · custom modals
   ───────────────────────────────────────────────────────────────────── */

/* — Lightcase — */
#lightcase-overlay {
  background: rgba(8, 6, 5, 0.94) !important;
  backdrop-filter: blur(6px) !important;
}
#lightcase-case {
  border-radius: 1px !important;
  box-shadow   : var(--pf-shadow-deep) !important;
}
#lightcase-info #lightcase-caption {
  font-family   : var(--pf-body) !important;
  font-weight   : 300 !important;
  font-size     : 0.78rem !important;
  letter-spacing: 0.08em !important;
  color         : rgba(255, 255, 255, 0.60) !important;
}
#lightcase-nav a span {
  border-color : rgba(255, 255, 255, 0.50) !important;
  transition   : border-color 260ms ease !important;
}
#lightcase-nav a:hover span {
  border-color : var(--pf-gold) !important;
}
#lightcase-close span {
  border-color: rgba(255,255,255,0.45) !important;
}

/* — Lightbox2 — */
.lb-overlay {
  background: rgba(8, 6, 5, 0.94) !important;
}
.lb-container  { border-radius: 1px !important; }
.lb-caption {
  font-family : var(--pf-body) !important;
  font-weight : 300 !important;
  font-size   : 0.80rem !important;
  letter-spacing: 0.05em !important;
  color       : rgba(255,255,255,0.65) !important;
}

/* — Fancybox — */
.fancybox__backdrop {
  background: rgba(8, 6, 5, 0.96) !important;
}
.fancybox__caption {
  font-family   : var(--pf-body) !important;
  font-weight   : 300 !important;
  letter-spacing: 0.06em !important;
}

/* Generic modal/overlay */
[class*="modal-backdrop"],
[class*="overlay"]:not(.hero):not(.cover) {
  background: rgba(8, 6, 5, 0.88) !important;
  backdrop-filter: blur(4px) !important;
}


/* ─────────────────────────────────────────────────────────────────────
   9. BUTTONS & CALL-TO-ACTION
   ───────────────────────────────────────────────────────────────────── */
.btn,
.button,
a.btn,
a.button,
input[type="submit"],
input[type="button"],
button:not([class*="close"]):not([class*="dismiss"]):not([class*="toggle"]) {
  font-family   : var(--pf-body) !important;
  font-weight   : 500 !important;
  font-size     : 0.68rem !important;
  letter-spacing: 0.22em !important;
  text-transform: uppercase !important;
  border-radius : 0 !important;
  padding       : 0.95rem 2.6rem !important;
  transition    :
    background    300ms ease,
    color         300ms ease,
    border-color  300ms ease,
    transform     260ms ease,
    box-shadow    300ms ease !important;
  cursor        : pointer !important;
}

.btn:hover,
a.btn:hover,
.button:hover,
input[type="submit"]:hover {
  transform  : translateY(-2px) !important;
  box-shadow : var(--pf-shadow-soft) !important;
}

.btn:active,
a.btn:active {
  transform: translateY(0) !important;
}


/* ─────────────────────────────────────────────────────────────────────
   10. FORMS
   ───────────────────────────────────────────────────────────────────── */
input[type="text"],
input[type="email"],
input[type="tel"],
input[type="password"],
textarea,
select {
  font-family  : var(--pf-body) !important;
  font-weight  : 300 !important;
  font-size    : 0.9rem !important;
  letter-spacing: 0.03em !important;
  border-radius: 0 !important;
  transition   : border-color 300ms ease, box-shadow 300ms ease !important;
}

input[type="text"]:focus,
input[type="email"]:focus,
textarea:focus {
  outline    : none !important;
  box-shadow : 0 2px 0 var(--pf-gold) !important;
}

label {
  font-family   : var(--pf-body) !important;
  font-weight   : 500 !important;
  font-size     : 0.68rem !important;
  letter-spacing: 0.18em !important;
  text-transform: uppercase !important;
}


/* ─────────────────────────────────────────────────────────────────────
   11. FOOTER
   ───────────────────────────────────────────────────────────────────── */
footer,
.footer,
#footer {
  padding    : 6rem 5rem 3.5rem !important;
  text-align : center !important;
  position   : relative !important;
}

/* Gold diamond ornament above footer content */
footer::before,
.footer::before {
  content      : '\25C6' !important;  /* ◆ */
  display      : block !important;
  font-size    : 0.55rem !important;
  color        : var(--pf-gold) !important;
  letter-spacing: 0.3em !important;
  margin-bottom: 3rem !important;
  opacity      : 0.60 !important;
}

footer p,
.footer p,
.footer-text {
  font-family   : var(--pf-body) !important;
  font-weight   : 300 !important;
  font-size     : 0.73rem !important;
  letter-spacing: 0.12em !important;
  opacity       : 0.45 !important;
  margin-bottom : 0.5rem !important;
}

footer a,
.footer a,
.footer-nav a {
  font-family   : var(--pf-body) !important;
  font-weight   : 400 !important;
  font-size     : 0.68rem !important;
  letter-spacing: 0.22em !important;
  text-transform: uppercase !important;
  text-decoration: none !important;
  margin        : 0 1.2rem !important;
  opacity       : 0.55 !important;
  transition    : opacity 250ms ease !important;
}

footer a:hover,
.footer a:hover {
  opacity: 1 !important;
}


/* ─────────────────────────────────────────────────────────────────────
   12. SCROLL REVEAL ANIMATIONS
   Classes added dynamically by premium.js IntersectionObserver
   ───────────────────────────────────────────────────────────────────── */
.pf-reveal {
  opacity   : 0;
  transform : translateY(22px);
  transition:
    opacity   750ms var(--pf-ease),
    transform 750ms var(--pf-ease);
}

.pf-reveal.pf-visible {
  opacity   : 1;
  transform : translateY(0);
}

/* Stagger gallery items (0–8 repeat) */
.pf-reveal:nth-child(9n+1) { transition-delay: 40ms;  }
.pf-reveal:nth-child(9n+2) { transition-delay: 80ms;  }
.pf-reveal:nth-child(9n+3) { transition-delay: 120ms; }
.pf-reveal:nth-child(9n+4) { transition-delay: 160ms; }
.pf-reveal:nth-child(9n+5) { transition-delay: 200ms; }
.pf-reveal:nth-child(9n+6) { transition-delay: 240ms; }
.pf-reveal:nth-child(9n+7) { transition-delay: 280ms; }
.pf-reveal:nth-child(9n+8) { transition-delay: 320ms; }
.pf-reveal:nth-child(9n)   { transition-delay: 360ms; }


/* ─────────────────────────────────────────────────────────────────────
   13. BACK-TO-TOP BUTTON (injected by premium.js)
   ───────────────────────────────────────────────────────────────────── */
.pf-backtop {
  position    : fixed !important;
  bottom      : 2.5rem !important;
  right       : 2.5rem !important;
  width       : 46px !important;
  height      : 46px !important;
  border-radius: 50% !important;
  background  : rgba(255, 255, 255, 0.90) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border      : 1px solid rgba(0, 0, 0, 0.09) !important;
  cursor      : pointer !important;
  display     : flex !important;
  align-items : center !important;
  justify-content: center !important;
  z-index     : 9999 !important;
  opacity     : 0 !important;
  transform   : translateY(10px) !important;
  transition  :
    opacity   400ms ease,
    transform 400ms ease,
    box-shadow 300ms ease !important;
  box-shadow  : var(--pf-shadow-soft) !important;
  color       : rgba(0, 0, 0, 0.55) !important;
  font-size   : 1.05rem !important;
  line-height : 1 !important;
  font-family : var(--pf-body) !important;
  font-weight : 200 !important;
}

.pf-backtop.pf-visible {
  opacity  : 1 !important;
  transform: translateY(0) !important;
}

.pf-backtop:hover {
  box-shadow: var(--pf-shadow-float) !important;
  transform : translateY(-3px) !important;
  color     : rgba(0, 0, 0, 0.88) !important;
}


/* ─────────────────────────────────────────────────────────────────────
   14. PAGE ENTRANCE
   ───────────────────────────────────────────────────────────────────── */
@keyframes pf-pagein {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);    }
}

.pf-pagein {
  animation: pf-pagein 700ms var(--pf-ease) both;
}


/* ─────────────────────────────────────────────────────────────────────
   15. RESPONSIVE BREAKPOINTS
   ───────────────────────────────────────────────────────────────────── */
@media (max-width: 1280px) {
  nav, .navbar, .navigation { padding: 1.6rem 3rem !important; }
  nav.pf-scrolled, .navbar.pf-scrolled { padding: 1.0rem 3rem !important; }
  section, .section { padding: 7rem 3.5rem !important; }
  .gallery, #gallery, .photos { padding: 1rem 3rem 4rem !important; }
  footer, .footer { padding: 5rem 3.5rem 3rem !important; }
}

@media (max-width: 1024px) {
  nav, .navbar { padding: 1.4rem 2.5rem !important; }
  nav.pf-scrolled, .navbar.pf-scrolled { padding: 0.9rem 2.5rem !important; }
  .gallery, #gallery, .photos {
    column-count: 2 !important;
    padding: 1rem 2.5rem 3.5rem !important;
  }
}

@media (max-width: 768px) {
  nav, .navbar { padding: 1.2rem 1.5rem !important; }
  nav.pf-scrolled, .navbar.pf-scrolled { padding: 0.8rem 1.5rem !important; }
  section, .section { padding: 5rem 1.5rem !important; }
  .gallery, #gallery, .photos {
    column-count: 2 !important;
    column-gap: 0.75rem !important;
    padding: 0.75rem 1rem 2.5rem !important;
  }
  footer, .footer { padding: 4rem 1.5rem 2.5rem !important; }
}

@media (max-width: 520px) {
  .gallery, #gallery, .photos {
    column-count: 1 !important;
    padding: 0.5rem 0.75rem 2rem !important;
  }
  section, .section { padding: 4rem 1.2rem !important; }
  .pf-backtop { bottom: 1.5rem !important; right: 1.5rem !important; }
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration    : 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration   : 0.01ms !important;
  }
  .pf-reveal { opacity: 1 !important; transform: none !important; }
}
`;


// ──────────────────────────────────────────────────────────────────
//  STEP 6 — WRITE js/premium.js
// ──────────────────────────────────────────────────────────────────
const PREMIUM_JS = `/**
 * ================================================================
 *  WEDDING GALLERY — PREMIUM INTERACTIONS  v2.0.0
 *  Auto-generated by patch.js | raging-code/wedding-gallery
 * ================================================================
 */
(function () {
  'use strict';

  /* ── Selectors ─────────────────────────────────────────────── */
  const NAV_SEL     = 'nav, .navbar, .navigation, #navbar, #nav';
  const HERO_SEL    = '.hero, #hero, .banner, .jumbotron, .cover, .fullscreen';
  const GALLERY_SEL = '.gallery a, .gallery-item, .photo-item, [id*="gallery"] a, [class*="gallery"] a';
  const SECTION_SEL = 'section h2, section h3, section p:not(:empty), .section-title';

  /* ── 1. NAV SCROLL EFFECT ──────────────────────────────────── */
  function initNav () {
    const nav = document.querySelector(NAV_SEL);
    if (!nav) return;
    const update = () => nav.classList.toggle('pf-scrolled', window.scrollY > 72);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ── 2. SCROLL REVEAL (IntersectionObserver) ─────────────── */
  function initReveal () {
    if (!('IntersectionObserver' in window)) return;

    /* Gallery items */
    document.querySelectorAll(GALLERY_SEL).forEach(el => el.classList.add('pf-reveal'));
    /* Section text */
    document.querySelectorAll(SECTION_SEL).forEach(el => el.classList.add('pf-reveal'));

    const io = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('pf-visible');
        io.unobserve(entry.target);
      }),
      { threshold: 0.07, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.pf-reveal').forEach(el => io.observe(el));
  }

  /* ── 3. BACK-TO-TOP BUTTON ────────────────────────────────── */
  function initBackToTop () {
    const btn = document.createElement('button');
    btn.className = 'pf-backtop';
    btn.setAttribute('aria-label', 'Back to top');
    btn.textContent = '\u2191'; /* ↑ */
    document.body.appendChild(btn);

    window.addEventListener('scroll',
      () => btn.classList.toggle('pf-visible', window.scrollY > 500),
      { passive: true }
    );

    btn.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: 'smooth' })
    );
  }

  /* ── 4. SMOOTH ANCHOR SCROLLING ───────────────────────────── */
  function initSmoothAnchors () {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const id  = link.getAttribute('href');
        const tgt = id.length > 1 && document.querySelector(id);
        if (!tgt) return;
        e.preventDefault();
        const offset = 80; /* nav height */
        const top    = tgt.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ── 5. SUBTLE HERO PARALLAX ──────────────────────────────── */
  function initParallax () {
    const hero = document.querySelector(HERO_SEL);
    if (!hero) return;
    /* Only apply if hero uses background-image, not a child <img> */
    const bg = window.getComputedStyle(hero).backgroundImage;
    if (!bg || bg === 'none') return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > window.innerHeight) return; /* skip once out of view */
      hero.style.backgroundPositionY = -window.scrollY * 0.38 + 'px';
    }, { passive: true });
  }

  /* ── 6. IMAGE LAZY LOAD (native with fallback) ────────────── */
  function initLazyLoad () {
    document.querySelectorAll('img:not([loading])').forEach(img => {
      img.setAttribute('loading', 'lazy');
    });
  }

  /* ── 7. PAGE FADE-IN ──────────────────────────────────────── */
  function initPageFadeIn () {
    document.body.classList.add('pf-pagein');
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  function init () {
    initNav();
    initReveal();
    initBackToTop();
    initSmoothAnchors();
    initParallax();
    initLazyLoad();
    initPageFadeIn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
`;


// ──────────────────────────────────────────────────────────────────
//  MAIN
// ──────────────────────────────────────────────────────────────────
function main () {
  const hr = `  ${C.dim}${'─'.repeat(60)}${C.reset}`;

  console.log(`\n${C.bold}${C.gold}`);
  console.log(`  ╔══════════════════════════════════════════════════════╗`);
  console.log(`  ║   WEDDING GALLERY · PREMIUM DESIGN PATCH  v2.0.0   ║`);
  console.log(`  ╚══════════════════════════════════════════════════════╝`);
  console.log(`${C.reset}`);

  // ── RESTORE MODE ─────────────────────────────────────────────
  if (RESTORE) { restore(TARGET); return; }

  // ── 1. ENSURE REPO ────────────────────────────────────────────
  head('Step 1 · Repository');
  ensureRepo(TARGET);

  // ── 2. BACKUP ──────────────────────────────────────────────────
  head('Step 2 · Backup');
  createBackup(TARGET);

  // ── 3. EXTRACT COLOR THEME ────────────────────────────────────
  head('Step 3 · Color Theme');
  const colors = extractColors(TARGET);
  if (colors.length) {
    info(`Detected palette: ${colors.join('  ')}`);
    info('Existing colors preserved. Adding gold accent layer only.');
  }

  // ── 4. WRITE premium.css ────────────────────────────────────
  head('Step 4 · Premium CSS');
  const cssDir = path.join(TARGET, 'css');
  writeFile(path.join(cssDir, 'premium.css'), PREMIUM_CSS);
  ok(`Written: css/premium.css  (${(Buffer.byteLength(PREMIUM_CSS) / 1024).toFixed(1)} KB)`);

  // ── 5. WRITE premium.js ─────────────────────────────────────
  head('Step 5 · Premium JS');
  const jsDir = path.join(TARGET, 'js');
  writeFile(path.join(jsDir, 'premium.js'), PREMIUM_JS);
  ok(`Written: js/premium.js  (${(Buffer.byteLength(PREMIUM_JS) / 1024).toFixed(1)} KB)`);

  // ── 6. PATCH HTML FILES ──────────────────────────────────────
  head('Step 6 · HTML Patching');
  const htmlFiles = findFiles(TARGET, '.html');
  if (!htmlFiles.length) {
    warn('No HTML files found. Check that TARGET is the repo root.');
    return;
  }

  const patchLog = { timestamp: new Date().toISOString(), target: TARGET, colors, files: [] };
  for (const file of htmlFiles) {
    const changed = patchHtml(file, cssDir, jsDir);
    patchLog.files.push({ file: path.relative(TARGET, file), changed });
  }

  // ── 7. WRITE PATCH LOG ──────────────────────────────────────
  writeFile(path.join(TARGET, LOG_FILE), JSON.stringify(patchLog, null, 2));

  // ── SUMMARY ───────────────────────────────────────────────────
  console.log(`\n${hr}`);
  console.log(`${C.bold}${C.green}`);
  console.log(`  ✦  Premium upgrade complete!  ✦`);
  console.log(`${C.reset}`);
  console.log(`  ${C.dim}Patched files:${C.reset}   ${htmlFiles.length} HTML file(s)`);
  console.log(`  ${C.dim}New assets:${C.reset}      css/premium.css · js/premium.js`);
  console.log(`  ${C.dim}Backup:${C.reset}          ${BACKUP}/`);
  console.log(`  ${C.dim}Log:${C.reset}             ${LOG_FILE}`);
  console.log(`\n  ${C.gold}Design upgrades applied:${C.reset}`);
  console.log(`  ${C.dim}·${C.reset} Cormorant Garamond (display) + Raleway (body) — Google Fonts`);
  console.log(`  ${C.dim}·${C.reset} Premium gallery grid: masonry columns, hover overlays, scale`);
  console.log(`  ${C.dim}·${C.reset} Frosted-glass navigation with scroll-aware transparency`);
  console.log(`  ${C.dim}·${C.reset} Full-viewport hero with cinematic veil overlay`);
  console.log(`  ${C.dim}·${C.reset} Gold ornamental "— ◆ —" dividers on section headings`);
  console.log(`  ${C.dim}·${C.reset} IntersectionObserver scroll-reveal with staggered timing`);
  console.log(`  ${C.dim}·${C.reset} Subtle hero parallax (background-position scroll)`);
  console.log(`  ${C.dim}·${C.reset} Frosted back-to-top button`);
  console.log(`  ${C.dim}·${C.reset} Elegant thin custom scrollbar`);
  console.log(`  ${C.dim}·${C.reset} Enhanced lightbox (Lightcase / Lightbox2 / Fancybox)`);
  console.log(`  ${C.dim}·${C.reset} Premium form inputs with gold focus glow`);
  console.log(`  ${C.dim}·${C.reset} Responsive breakpoints: 1280 · 1024 · 768 · 520px`);
  console.log(`  ${C.dim}·${C.reset} prefers-reduced-motion respected`);
  console.log(`  ${C.dim}·${C.reset} Native lazy-loading added to all images`);
  console.log(`\n  ${C.dim}To revert at any time:${C.reset}  node patch.js --restore\n`);
  console.log(hr);
}

main();
