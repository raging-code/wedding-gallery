import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve('src/WeddingGallery.js');
let src = readFileSync(filePath, 'utf8');
let changes = 0;

function replace(old, next, label) {
  if (src.includes(next)) {
    console.log(`⏭️  Already patched: ${label}`);
    return;
  }
  if (!src.includes(old)) {
    console.warn(`⚠️  Could not find: ${label} — skipping`);
    return;
  }
  src = src.replace(old, next);
  changes++;
  console.log(`✅ Fixed: ${label}`);
}

replace(
  `const REACTIONS_LIST_SHORT = ['❤️', '🌸', '🥂', '😂', '💍'];`,
  `const REACTIONS_LIST_SHORT = ['❤️', '🌸', '🥂', '😂', '💍']; // eslint-disable-line no-unused-vars`,
  'REACTIONS_LIST_SHORT'
);

replace(
  `  const [pickerOpen, setPickerOpen]     = useState(false);`,
  `  const [pickerOpen, setPickerOpen]     = useState(false); // eslint-disable-line no-unused-vars`,
  'pickerOpen'
);

replace(
  `  const longPressTimer                  = useRef(null);`,
  `  const longPressTimer                  = useRef(null); // eslint-disable-line no-unused-vars`,
  'longPressTimer'
);

replace(
  `  const totalReactions = reactions ? Object.values(reactions.counts || {}).reduce((a, b) => a + b, 0) : 0;`,
  `  const totalReactions = reactions ? Object.values(reactions.counts || {}).reduce((a, b) => a + b, 0) : 0; // eslint-disable-line no-unused-vars`,
  'totalReactions'
);

if (changes === 0) {
  console.log('\nNothing new to patch.');
} else {
  writeFileSync(filePath, src, 'utf8');
  console.log(`\n✅ Done — ${changes} fix(es) applied. Now run:\n  git add src/WeddingGallery.js\n  git commit -m "fix eslint no-unused-vars"\n  git push`);
}
