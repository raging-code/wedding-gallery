import { readFileSync } from 'fs';

const s = readFileSync('src/WeddingGallery.js', 'utf8');

const target = `          </div>
          <button className="lux-btn-ghost">+ Add Video</button>
        </div>`;

console.log('Exact 3-line block found?', s.includes(target));

const idx = s.indexOf('+ Add Video</button>');
if (idx === -1) {
  console.log('"+ Add Video</button>" not found anywhere in the file.');
  process.exit(0);
}

const start = Math.max(0, idx - 160);
const end = Math.min(s.length, idx + 60);
console.log('--- RAW SNIPPET (escaped, so hidden chars are visible) ---');
console.log(JSON.stringify(s.slice(start, end)));
