/**
 * patch-optimize-v1.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Wedding Gallery · Performance optimization patch (no functionality/feature
 * changes — same CSS rules, same selectors, same visual result)
 *
 * WHAT THIS FIXES
 *
 *  1. [BIGGEST WIN] ~63 KB of pure static CSS (zero dynamic interpolation)
 *     currently lives as a JS template literal (`LUXURY_CSS`) inside
 *     src/WeddingGallery.js, and is only injected into the page via a
 *     useEffect AFTER React mounts. Measured impact, confirmed with a real
 *     production build:
 *       - 63,031 raw bytes / 14,447 gzipped bytes of CSS riding inside the
 *         JS bundle instead of a real stylesheet
 *       - It bypasses CRA's CSS pipeline entirely — the production build
 *         currently produces ZERO files under build/static/css/
 *       - The page is guaranteed to flash unstyled on every load: styles
 *         can't apply until JS downloads, parses, executes, mounts, and
 *         runs its effects
 *       - That CSS string ALSO re-imports the exact same Google Fonts URL
 *         that index.html already loads via <link> — a redundant,
 *         render-blocking @import inside a runtime-injected <style> tag
 *     FIX: extract the CSS verbatim into public/css/lux-gallery.css (a real,
 *     CRA-served static file), link it in index.html's <head> so it loads
 *     and can apply before/in parallel with the JS bundle, strip the
 *     redundant @import, and remove the now-unnecessary LUXURY_CSS string +
 *     injection effect from WeddingGallery.js. Every rule, selector, and
 *     value is preserved byte-for-byte — only WHERE it lives changes.
 *
 *  2. [SAFE WIN] No long-lived Cache-Control for CRA's hashed /static/*
 *     build assets (JS/CSS/media). Their filenames already include a
 *     content hash (e.g. main.3ba0dc69.js) — a new deploy always produces
 *     new filenames, so caching them forever is risk-free and saves a
 *     repeat visitor a full re-download of an unchanged bundle.
 *     FIX: add `Cache-Control: public, max-age=31536000, immutable` for
 *     /static/* in _headers. The existing /api/* no-store rule and all
 *     security headers are untouched.
 *
 * WHAT THIS DOES NOT CHANGE
 *   No selectors, values, colors, fonts, spacing, or animations are added,
 *   removed, or modified — the CSS is moved, not edited (apart from deleting
 *   the one duplicate @import line, which fetches nothing new — the exact
 *   same Google Fonts URL is already loaded by index.html). No React
 *   component logic, props, state, or markup changes. No API/backend files
 *   are touched by this patch.
 *
 * USAGE (run from the wedding-gallery project root, VS Code terminal on
 * Windows — PowerShell or Git Bash, Node 18+):
 *   node patch-optimize-v1.mjs
 *
 * Safe to re-run — every change is idempotent (checks before patching).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const ROOT = resolve('.');
const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✘\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const SKIP = '\x1b[90m–\x1b[0m';

let patchCount = 0;
let skipCount  = 0;
let failCount  = 0;

function p(file) { return resolve(ROOT, file); }

function readNormalized(file) {
  const full = p(file);
  if (!existsSync(full)) {
    console.error(`${FAIL}  File not found: ${file}`);
    failCount++;
    return null;
  }
  const raw = readFileSync(full, 'utf8');
  const usesCRLF = raw.includes('\r\n');
  return { raw, usesCRLF, normalized: raw.replace(/\r\n/g, '\n') };
}

function writeNormalized(file, content, usesCRLF) {
  const full = p(file);
  mkdirSync(dirname(full), { recursive: true });
  const out = usesCRLF ? content.replace(/\n/g, '\r\n') : content;
  writeFileSync(full, out, 'utf8');
  console.log(`${PASS}  Written: ${file}`);
  patchCount++;
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Wedding Gallery — Performance optimization patch v1');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// ─────────────────────────────────────────────────────────────────────────
// FIX 1 — extract LUXURY_CSS out of the JS bundle into a real stylesheet
// ─────────────────────────────────────────────────────────────────────────
console.log(`${INFO}  Fix 1/2 — extract LUXURY_CSS into a static stylesheet`);

const JS_FILE   = 'src/WeddingGallery.js';
const CSS_FILE  = 'public/css/lux-gallery.css';
const HTML_FILE = 'public/index.html';

const OPEN_MARKER  = 'const LUXURY_CSS = `';
const CLOSE_MARKER = '\n`';

const DUPLICATE_FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,500;1,9..144,600;1,9..144,700&family=Manrope:wght@200;300;400;500;600&display=swap');";

const INJECTION_EFFECT_OLD = `  useEffect(() => {
    // Only inject once — avoid re-assigning the full CSS string on every
    // StrictMode double-invoke or hot-reload re-mount.
    if (document.getElementById("lux-css")) return;
    const s = document.createElement("style");
    s.id = "lux-css";
    s.textContent = LUXURY_CSS;
    document.head.appendChild(s);
  }, []);

`;

let cssAlreadyExtracted = existsSync(p(CSS_FILE));
let jsLoaded = readNormalized(JS_FILE);

if (!jsLoaded) {
  console.log(`${FAIL}  Aborting Fix 1 — could not read ${JS_FILE}.`);
} else {
  const { normalized: jsSrc, usesCRLF: jsUsesCRLF } = jsLoaded;
  const openIdx = jsSrc.indexOf(OPEN_MARKER);

  if (openIdx === -1) {
    if (cssAlreadyExtracted) {
      console.log(`${SKIP}  ${JS_FILE} — LUXURY_CSS not found (already extracted). Nothing to do.`);
      skipCount++;
    } else {
      console.error(`${FAIL}  Could not find "const LUXURY_CSS = \`" in ${JS_FILE}.`);
      console.error(`${FAIL}  The file may have changed since this script was written — no changes made.`);
      failCount++;
    }
  } else {
    const cssStart = openIdx + OPEN_MARKER.length;
    const closeIdx = jsSrc.indexOf(CLOSE_MARKER, cssStart);
    if (closeIdx === -1) {
      console.error(`${FAIL}  Found the start of LUXURY_CSS but not its closing backtick — no changes made.`);
      failCount++;
    } else {
      const cssBody = jsSrc.slice(cssStart, closeIdx + 1); // include the leading \n before the backtick
      // The whole declaration, including the trailing blank lines CRA's
      // formatting left after the closing backtick, up to (not including)
      // the next real statement.
      const declStart = openIdx;
      const declEnd   = closeIdx + CLOSE_MARKER.length;

      // Sanity check: this must be pure static CSS, no template interpolation.
      if (cssBody.includes('${')) {
        console.error(`${FAIL}  LUXURY_CSS contains `+'${...}'+` interpolation — this script only handles`);
        console.error(`${FAIL}  static CSS. No changes made; extraction skipped for safety.`);
        failCount++;
      } else {
        // ── Write the extracted stylesheet (minus the duplicate font @import) ──
        let cssOut = cssBody;
        if (cssOut.includes(DUPLICATE_FONT_IMPORT)) {
          cssOut = cssOut.replace(
            DUPLICATE_FONT_IMPORT,
            '/* Fonts are loaded via <link> in index.html — no @import needed here. */'
          );
        }
        cssOut = cssOut.trimStart();

        const cssHeader =
`/* ─────────────────────────────────────────────────────────────────────────
   lux-gallery.css
   Extracted from WeddingGallery.js's LUXURY_CSS template string —
   identical rules, now served as a real stylesheet instead of being
   injected via JS after mount. See patch-optimize-v1.mjs for why.
   ───────────────────────────────────────────────────────────────────────── */

`;

        if (existsSync(p(CSS_FILE))) {
          console.log(`${SKIP}  ${CSS_FILE} already exists — leaving it as-is, not overwriting.`);
          skipCount++;
        } else {
          writeNormalized(CSS_FILE, cssHeader + cssOut, false);
        }

        // ── Remove LUXURY_CSS declaration + its injection effect from the JS ──
        let patchedJs = jsSrc.slice(0, declStart) + jsSrc.slice(declEnd);

        if (patchedJs.includes(INJECTION_EFFECT_OLD)) {
          patchedJs = patchedJs.replace(INJECTION_EFFECT_OLD, '');
          console.log(`    └─ Removed the LUXURY_CSS injection useEffect (no longer needed)`);
        } else {
          console.log(`${WARN}  Could not find the exact LUXURY_CSS injection useEffect to remove.`);
          console.log(`${WARN}  The CSS declaration was still removed from the top of the file, but you`);
          console.log(`${WARN}  should manually delete the useEffect that did:`);
          console.log(`${WARN}    document.getElementById("lux-css") ... s.textContent = LUXURY_CSS;`);
        }

        // Collapse the now-empty space left at the very top of the file down
        // to a single blank line, so the file doesn't start with 1500+ blank lines.
        patchedJs = patchedJs.replace(/^\n+/, '\n');

        writeNormalized(JS_FILE, patchedJs, jsUsesCRLF);
        console.log(`    └─ Removed the LUXURY_CSS declaration (${cssBody.length.toLocaleString()} chars) from ${JS_FILE}`);
      }
    }
  }
}

// ── Link the new stylesheet in index.html (only if extraction succeeded /
//    already happened, and the link isn't already there) ──────────────────
let htmlLoaded = readNormalized(HTML_FILE);
if (htmlLoaded && existsSync(p(CSS_FILE))) {
  const { normalized: htmlSrc, usesCRLF: htmlUsesCRLF } = htmlLoaded;
  const LINK_TAG = '<link rel="stylesheet" href="%PUBLIC_URL%/css/lux-gallery.css">';

  if (htmlSrc.includes(LINK_TAG) || htmlSrc.includes('css/lux-gallery.css')) {
    console.log(`${SKIP}  ${HTML_FILE} — stylesheet link already present.`);
    skipCount++;
  } else {
    const ANCHOR = '    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />\n';
    if (htmlSrc.includes(ANCHOR)) {
      const patchedHtml = htmlSrc.replace(
        ANCHOR,
        ANCHOR + '    ' + LINK_TAG + '\n'
      );
      writeNormalized(HTML_FILE, patchedHtml, htmlUsesCRLF);
      console.log(`    └─ Added <link> for lux-gallery.css to <head>, before the JS bundle`);
    } else {
      console.error(`${FAIL}  Could not find the expected anchor line in ${HTML_FILE} — no changes made.`);
      console.error(`${FAIL}  Add this manually inside <head>, before the closing </head> tag:`);
      console.error(`${FAIL}    ${LINK_TAG}`);
      failCount++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// FIX 2 — long-lived immutable cache for CRA's content-hashed /static/* files
// ─────────────────────────────────────────────────────────────────────────
console.log('');
console.log(`${INFO}  Fix 2/2 — long-lived cache for hashed /static/* build assets`);

const HEADERS_FILE = 'public/_headers';
const HEADERS_FILE_ROOT = '_headers';
const headersPath = existsSync(p(HEADERS_FILE)) ? HEADERS_FILE
  : existsSync(p(HEADERS_FILE_ROOT)) ? HEADERS_FILE_ROOT
  : null;

if (!headersPath) {
  console.error(`${FAIL}  Could not find _headers (checked public/_headers and ./_headers) — no changes made.`);
  failCount++;
} else {
  const loaded = readNormalized(headersPath);
  if (loaded) {
    const { normalized: src, usesCRLF } = loaded;
    const STATIC_CACHE_BLOCK =
`/static/*
  # Filenames are content-hashed by the build (e.g. main.<hash>.js) — a new
  # deploy always produces new filenames, so caching these forever is safe.
  Cache-Control: public, max-age=31536000, immutable
`;

    if (src.includes('Cache-Control: public, max-age=31536000, immutable')) {
      console.log(`${SKIP}  ${headersPath} — immutable cache rule already present.`);
      skipCount++;
    } else {
      const API_BLOCK_ANCHOR = '/api/*\n  Cache-Control: no-store\n  # API responses must not be cached or shared\n  Pragma: no-cache\n';
      let patched;
      if (src.includes(API_BLOCK_ANCHOR)) {
        // Insert right before the /api/* block, so the file reads
        // general-asset rules first, then the no-cache API override.
        patched = src.replace(API_BLOCK_ANCHOR, STATIC_CACHE_BLOCK + '\n' + API_BLOCK_ANCHOR);
      } else {
        // Anchor not found verbatim (already-modified file) — append safely.
        patched = src.replace(/\n*$/, '\n') + '\n' + STATIC_CACHE_BLOCK;
      }
      writeNormalized(headersPath, patched, usesCRLF);
      console.log(`    └─ Added immutable long-cache rule for /static/*`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Done — ${patchCount} change(s) applied, ${skipCount} skipped, ${failCount} failed.`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

if (failCount > 0) {
  console.log(`${WARN}  Some patches could not be applied — see ✘ lines above.`);
  console.log(`${WARN}  No partial/corrupt changes were written for those steps.`);
}

console.log('Next steps:');
console.log('  npm run build   (optional — confirm it still builds cleanly)');
console.log('  git status');
console.log('  git add -A');
console.log('  git commit -m "perf: extract CSS from JS bundle to a real stylesheet, cache static assets"');
console.log('  git push');
console.log('');
console.log('What changed, visually: nothing. Same fonts, same colors, same layout.');
console.log('What changed, technically: ~63 KB of CSS no longer rides inside the JS');
console.log('bundle and no longer waits for a React effect to apply — it loads as a');
console.log('normal stylesheet, so the page can paint styled sooner.');
console.log('');
