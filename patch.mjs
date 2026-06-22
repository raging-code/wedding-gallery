import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve('src/WeddingGallery.js');

const OLD = `  const [sheetOpen, setSheetOpen]       = useState(false);`;
const NEW = `  const [sheetOpen, setSheetOpen]       = useState(false);
  const [pickerOpen, setPickerOpen]     = useState(false);`;

const src = readFileSync(filePath, 'utf8');

if (!src.includes(OLD)) {
  console.error('❌ Could not find the target line. Has the file already been patched?');
  process.exit(1);
}

if (src.includes('const [pickerOpen, setPickerOpen]')) {
  console.log('✅ Already patched — pickerOpen state already exists. Nothing to do.');
  process.exit(0);
}

const patched = src.replace(OLD, NEW);
writeFileSync(filePath, patched, 'utf8');
console.log('✅ Patch applied: added `const [pickerOpen, setPickerOpen] = useState(false);` in WeddingGallery.js');
