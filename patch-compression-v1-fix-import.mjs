#!/usr/bin/env node
/**
 * patch-compression-v1-fix-import.mjs
 *
 * FIXES a build break introduced by patch-compression-v1.mjs.
 *
 * Cloudflare Pages build error was:
 *   "The target environment doesn't support dynamic import() syntax so
 *    it's not possible to use external type 'module' within a script"
 *
 * Root cause: CRA's webpack 4 statically parses every `import()` call at
 * build time to bundle it. It can't handle an external http(s) module
 * specifier like `import('https://unpkg.com/...')` — that's a runtime-only
 * pattern that webpack 4 simply doesn't support, regardless of dynamic vs
 * static usage.
 *
 * Fix: replace those CDN import() calls with a small loadEsmFromCdn()
 * helper that injects a real <script type="module"> tag at runtime. Since
 * the import specifier then lives inside a *string* (the script's
 * textContent), webpack's static analyzer never sees it and has nothing to
 * try to bundle.
 *
 * Idempotent: safe to re-run, detects existing marker and skips.
 *
 * Usage:
 *   node patch-compression-v1-fix-import.mjs
 *   node patch-compression-v1-fix-import.mjs --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

const GALLERY_PATH = path.join(__dirname, 'src', 'WeddingGallery.js');
const MARKER = '// __PATCH_COMPRESSION_V1_FIX_IMPORT__';

function readFile(p) {
  if (!existsSync(p)) {
    console.error(`✗ Missing file: ${p}`);
    process.exit(1);
  }
  return readFileSync(p, 'utf8');
}

function writeFile(p, content, hadCRLF) {
  const out = hadCRLF ? content.replace(/\n/g, '\r\n') : content;
  if (DRY_RUN) {
    console.log(`  [dry-run] would write ${p} (${out.length} bytes)`);
    return;
  }
  writeFileSync(p, out, 'utf8');
}

function applyReplacements(label, filePath, replacements) {
  const raw = readFile(filePath);
  const hadCRLF = raw.includes('\r\n');
  let src = raw.replace(/\r\n/g, '\n');

  if (src.includes(MARKER)) {
    console.log(`⏭  ${label}: already patched, skipping`);
    return false;
  }

  if (!src.includes('__PATCH_COMPRESSION_V1__')) {
    console.error(`✗ ${label}: doesn't look like patch-compression-v1.mjs was applied here.`);
    console.error(`  This fix-up patch expects that patch first. Aborting untouched.`);
    process.exit(1);
  }

  let applied = 0;
  for (const { name, find, replace, required = true } of replacements) {
    if (!src.includes(find)) {
      if (required) {
        console.error(`✗ ${label}: anchor not found for "${name}" — aborting this file untouched.`);
        console.error(`  Looked for:\n${find.slice(0, 300)}${find.length > 300 ? '…' : ''}`);
        process.exit(1);
      } else {
        console.log(`  (skip optional "${name}", anchor not found)`);
        continue;
      }
    }
    src = src.replace(find, replace);
    applied++;
  }

  writeFile(filePath, src, hadCRLF);
  console.log(`✓ ${label}: applied ${applied} edit(s)`);
  return true;
}

console.log(`\n── patch-compression-v1-fix-import.mjs ${DRY_RUN ? '(dry run)' : ''} ──\n`);

const replacements = [
  {
    name: 'replace ffmpeg.wasm CDN loader with script-tag injection (no static import())',
    find: `// ── ffmpeg.wasm lazy loader (CDN, single-threaded core — no special headers) ─
let _ffmpegInstance = null;
let _ffmpegLoadPromise = null;

async function loadFFmpeg() {
  if (_ffmpegInstance) return _ffmpegInstance;
  if (_ffmpegLoadPromise) return _ffmpegLoadPromise;

  _ffmpegLoadPromise = (async () => {
    const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
    const { toBlobURL } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');

    const ffmpeg = new FFmpeg();
    const base = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(\`\${base}/ffmpeg-core.js\`, 'text/javascript'),
      wasmURL: await toBlobURL(\`\${base}/ffmpeg-core.wasm\`, 'application/wasm'),
    });

    _ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return _ffmpegLoadPromise;
}`,
    replace: `${MARKER}
// ── ffmpeg.wasm lazy loader (CDN, single-threaded core — no special headers) ─
//
// IMPORTANT: we deliberately do NOT write \`import('https://unpkg.com/...')\`
// as a literal static import() anywhere in this file. CRA's webpack 4
// parses every \`import()\` call at build time to try to bundle it, and it
// can't handle an external http(s) module specifier — that fails the
// production build with "doesn't support dynamic import() syntax". Instead
// we inject a real <script type="module"> tag at runtime (a plain string,
// invisible to webpack's static analysis) that does the import itself and
// hands the result back to us via a one-off global.
let _ffmpegInstance = null;
let _ffmpegLoadPromise = null;

function loadEsmFromCdn(specifier, globalName) {
  return new Promise((resolve, reject) => {
    const id = \`__esm_\${globalName}_\${Math.random().toString(36).slice(2)}\`;
    window[id] = { resolve, reject };
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = \`
      import * as mod from '\${specifier}';
      window['\${id}'].resolve(mod);
    \`;
    script.onerror = () => { reject(new Error(\`Failed to load \${specifier}\`)); delete window[id]; };
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
      coreURL: await toBlobURL(\`\${base}/ffmpeg-core.js\`, 'text/javascript'),
      wasmURL: await toBlobURL(\`\${base}/ffmpeg-core.wasm\`, 'application/wasm'),
    });

    _ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return _ffmpegLoadPromise;
}`,
  },
  {
    name: 'replace remaining import() inside compressVideo',
    find: `    const { fetchFile } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
    await ffmpeg.writeFile(inputName, await fetchFile(file));`,
    replace: `    const { fetchFile } = await loadEsmFromCdn('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js', 'ffmpegutil2');
    await ffmpeg.writeFile(inputName, await fetchFile(file));`,
  },
];

const changed = applyReplacements('src/WeddingGallery.js', GALLERY_PATH, replacements);

console.log(`
${DRY_RUN ? '✓ Dry run complete — no files written.' : changed ? '✓ Fix applied.' : '✓ Nothing to do.'}

What changed:
  • The three \`await import('https://unpkg.com/...')\` calls (which CRA's
    webpack 4 cannot build) are replaced with loadEsmFromCdn(), a helper
    that injects a <script type="module"> tag at runtime instead. Webpack
    never sees a static import() of an external URL, so the build no
    longer tries (and fails) to bundle it.
  • No behavior change otherwise — videos still compress the same way,
    just loaded slightly differently under the hood.

Next steps:
  1. node patch-compression-v1-fix-import.mjs --dry-run   (sanity check)
  2. node patch-compression-v1-fix-import.mjs
  3. npm run build   ← confirm it now says "Compiled successfully."
  4. git add -A && git commit -m "Fix build: load ffmpeg.wasm via script tag, not import()" && git push
`);
