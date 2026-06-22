/**
 * patch-v5-fix.mjs
 * Removes the unused `navPhoto` alias that causes ESLint to fail the
 * Cloudflare Pages build (no-unused-vars).
 *
 * Run from project root:  node patch-v5-fix.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const GALLERY = join(process.cwd(), 'src', 'WeddingGallery.js');
if (!existsSync(GALLERY)) {
  console.error('ERROR: src/WeddingGallery.js not found. Run from project root.');
  process.exit(1);
}

const OLD = '  function navPhotoWithReset(dir) { lbSlide(dir); }\n  function navPhoto(dir)          { lbSlide(dir); }';
const NEW = '  function navPhotoWithReset(dir) { lbSlide(dir); }';

const src = readFileSync(GALLERY, 'utf8');
if (!src.includes(OLD)) {
  if (src.includes(NEW) && !src.includes('function navPhoto(dir)')) {
    console.log('\u2713 Already applied — navPhoto alias already removed.');
  } else {
    console.error('\u2717 Anchor not found — was patch-v5-swipe.mjs applied first?');
    process.exit(1);
  }
} else {
  writeFileSync(GALLERY, src.replace(OLD, NEW), 'utf8');
  console.log('\u2713 Removed unused navPhoto alias.');
}

console.log('\nDone. Commit and push to trigger a clean build.\n');
