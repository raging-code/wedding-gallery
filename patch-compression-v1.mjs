#!/usr/bin/env node
/**
 * patch-compression-v1.mjs
 *
 * Adds client-side compression before upload:
 *   PHOTOS → Canvas resize to 2048px longest edge + re-encode as WebP @ q0.83
 *            (~85-90% smaller, works on iOS 14+ / all modern browsers)
 *   VIDEOS → ffmpeg.wasm (single-threaded core, loaded from CDN — no
 *            COOP/COEP headers needed, so B2 cross-origin media loads
 *            keep working) re-encodes to H.264 / CRF 26 / 720p cap,
 *            target ≤100MB output.
 *
 * Server-side limit bumped: MAX_VIDEO_BYTES 200MB → 100MB (post-compression
 * ceiling — the client already aims under this, this is just the backstop).
 * MAX_PHOTO_BYTES left at 10MB (raw upload safety valve before compression
 * even runs, e.g. if a browser doesn't support canvas.toBlob webp).
 *
 * Idempotent: safe to re-run, detects existing markers and skips.
 *
 * Usage:
 *   node patch-compression-v1.mjs
 *   node patch-compression-v1.mjs --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

const GALLERY_PATH = path.join(__dirname, 'src', 'WeddingGallery.js');
const UPLOAD_API_PATH = path.join(__dirname, 'functions', 'api', 'upload.js');

const MARKER = '// __PATCH_COMPRESSION_V1__';

function readFile(p) {
  if (!existsSync(p)) {
    console.error(`✗ Missing file: ${p}`);
    process.exit(1);
  }
  // normalize CRLF -> LF for matching; we restore CRLF on write if original had it
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
    return;
  }

  let applied = 0;
  for (const { name, find, replace, required = true } of replacements) {
    if (!src.includes(find)) {
      if (required) {
        console.error(`✗ ${label}: anchor not found for "${name}" — aborting this file untouched.`);
        console.error(`  Looked for:\n${find.slice(0, 200)}${find.length > 200 ? '…' : ''}`);
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
}

console.log(`\n── patch-compression-v1.mjs ${DRY_RUN ? '(dry run)' : ''} ──\n`);

/* ────────────────────────────────────────────────────────────────────────
 * 1. src/WeddingGallery.js
 *    - Add compressPhoto() + compressVideo() + ffmpeg loader helpers
 *    - Wire uploadPhotos() to compress before b2Upload
 *    - Wire uploadVideo() to compress before b2Upload
 *    - Update upload hint text
 * ──────────────────────────────────────────────────────────────────────── */

const galleryReplacements = [
  {
    name: 'insert compression helpers after b2Upload',
    find: `  return publicUrl;
}


// ── Reactions & Comments API helpers ────────────────────────────────────────`,
    replace: `  return publicUrl;
}

${MARKER}
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
    const newName = file.name.replace(/\\.[a-zA-Z0-9]+$/, '') + '.webp';
    return new File([blob], newName, { type: 'image/webp' });
  } catch (err) {
    console.warn('Photo compression failed, uploading original:', err);
    onProgress?.(100);
    return file;
  }
}

// ── ffmpeg.wasm lazy loader (CDN, single-threaded core — no special headers) ─
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

  const inputName  = 'input' + (file.name.match(/\\.[a-zA-Z0-9]+$/)?.[0] || '.mp4');
  const outputName = 'output.mp4';

  const progressHandler = ({ progress }) => {
    // ffmpeg reports 0..1; map onto 5..95 (load already took 0..5)
    const pct = 5 + Math.min(95, Math.max(0, progress * 90));
    onProgress?.(Math.round(pct));
  };
  ffmpeg.on('progress', progressHandler);

  try {
    const { fetchFile } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    await ffmpeg.exec([
      '-i', inputName,
      '-vf', \`scale=-2:'min(\${VIDEO_MAX_HEIGHT},ih)'\`,
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
        \`Even after compression this clip is \${(blob.size / 1024 / 1024).toFixed(0)}MB — please trim it shorter and try again.\`
      );
    }

    const newName = file.name.replace(/\\.[a-zA-Z0-9]+$/, '') + '.mp4';
    return new File([blob], newName, { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', progressHandler);
  }
}


// ── Reactions & Comments API helpers ────────────────────────────────────────`,
  },
  {
    name: 'uploadPhotos: compress before b2Upload',
    find: `  async function uploadPhotos() {
    if (!previews.length) return;
    const name = guestName.trim();
    if (!name) { setUploadState(s => ({ ...s, error: 'Please enter your name first' })); return; }
    setUploadState({ active: true, progress: 0, error: null });
    try {
      const uploaded = [];
      for (let i = 0; i < previews.length; i++) {
        const p = previews[i];
        const publicUrl = await b2Upload(p.file, 'photo', name);
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
  }`,
    replace: `  async function uploadPhotos() {
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
  }`,
  },
  {
    name: 'uploadVideo: compress before b2Upload',
    find: `  async function uploadVideo() {
    if (!videoPreview) return;
    const name = guestName.trim();
    if (!name) { setUploadState(s => ({ ...s, error: 'Please enter your name first' })); return; }
    setUploadState({ active: true, progress: 0, error: null });
    try {
      const publicUrl = await b2Upload(videoPreview.file, 'video', name);
      setVideos(prev => [{ id: Date.now(), url: publicUrl, name: videoPreview.name, uploaderName: name }, ...prev]);
      URL.revokeObjectURL(videoPreview.url);
      setVideoPreview(null);
      setUploadState({ active: false, progress: 100, error: null });
      setTimeout(() => setUploadState(s => ({ ...s, progress: 0 })), 1500);
    } catch (err) {
      setUploadState({ active: false, progress: 0, error: err.message });
    }
  }`,
    replace: `  async function uploadVideo() {
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
  }`,
  },
  {
    name: 'video upload button: show compressing/uploading label',
    find: `                {uploadState.active ? \`\${uploadState.progress}%\` : 'Upload'}
              </button>
            </div>
          )}

          {/* Uploaded videos */}`,
    replace: `                {uploadState.active
                  ? (uploadState.stage === 'compressing' ? \`Compressing… \${uploadState.progress}%\` : \`\${uploadState.progress}%\`)
                  : 'Upload'}
              </button>
            </div>
          )}

          {/* Uploaded videos */}`,
  },
  {
    name: 'main video upload button label (compressing/uploading)',
    find: `                  {uploadState.active
                    ? \`Uploading… \${uploadState.progress}%\``,
    replace: `                  {uploadState.active
                    ? (uploadState.stage === 'compressing'
                        ? \`Compressing… \${uploadState.progress}%\`
                        : \`Uploading… \${uploadState.progress}%\`)`,
    required: false,
  },
  {
    name: 'update photo upload hint text',
    find: `<span className="lux-upload-hint">JPEG · PNG · WEBP · Up to 5 MB · Max 20 photos</span>`,
    replace: `<span className="lux-upload-hint">JPEG · PNG · WEBP · Auto-compressed · Max 20 photos</span>`,
  },
];

applyReplacements('src/WeddingGallery.js', GALLERY_PATH, galleryReplacements);

/* ────────────────────────────────────────────────────────────────────────
 * 2. functions/api/upload.js
 *    - Bump MAX_VIDEO_BYTES 200MB -> 100MB (post-compression backstop)
 * ──────────────────────────────────────────────────────────────────────── */

const uploadApiReplacements = [
  {
    name: 'lower MAX_VIDEO_BYTES to 100MB',
    find: `// Limits
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;   // 10 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;  // 200 MB`,
    replace: `${MARKER}
// Limits
// NOTE: client now compresses photos to WebP and videos via ffmpeg.wasm
// before upload (see compressPhoto/compressVideo in WeddingGallery.js).
// These remain as a server-side backstop, not the primary control.
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;   // 10 MB (raw, pre-compression safety valve)
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;  // 100 MB (post-compression backstop)`,
  },
];

applyReplacements('functions/api/upload.js', UPLOAD_API_PATH, uploadApiReplacements);

/* ────────────────────────────────────────────────────────────────────────
 * 3. package.json — no entries needed.
 *    ffmpeg.wasm is loaded at runtime from the unpkg CDN via dynamic
 *    import() inside loadFFmpeg(), so there's no npm install / lockfile
 *    change and no CRA build config to touch. This also means it costs
 *    nothing in your initial bundle — it's only fetched when a guest
 *    actually adds a video over the skip-compression threshold.
 * ──────────────────────────────────────────────────────────────────────── */

console.log(`
${DRY_RUN ? '✓ Dry run complete — no files written.' : '✓ Patch applied.'}

What changed:
  • Photos are resized to ${PHOTO_MAX_DIMENSION_DOC()} and re-encoded to WebP (q0.83) client-side
    before upload — typically 85-90% smaller, works on iOS 14+ / all modern browsers.
  • Videos over 15MB are re-encoded client-side via ffmpeg.wasm (H.264, CRF 26,
    capped at 720p, single-threaded CDN build — no COOP/COEP headers needed,
    so your B2 cross-origin media loading keeps working unchanged).
  • Upload button now shows "Compressing… NN%" then "Uploading… NN%" for videos.
  • Server-side video cap lowered 200MB → 100MB as a backstop; if a clip is
    still over 100MB after compression, the guest gets a clear "trim it" error
    instead of a silent huge upload.
  • Nothing added to package.json — ffmpeg.wasm loads lazily from unpkg CDN
    only when a guest uploads a video, so it costs nothing in your normal
    page-load bundle size.

Next steps:
  1. Test locally: npm start (or your wrangler pages dev command)
  2. Try uploading a photo from your phone — check Network tab, the PUT
     body should now be a .webp file, much smaller than the original.
  3. Try uploading a >15MB video — you should see "Compressing… NN%" tick up
     before the upload starts. First load will be a bit slow (downloading
     ffmpeg's wasm core, ~8-9MB from CDN, cached by the browser after that).
  4. Deploy: git add -A && git commit -m "Add client-side photo/video compression" && git push
`);

function PHOTO_MAX_DIMENSION_DOC() { return '2048px (longest edge)'; }
