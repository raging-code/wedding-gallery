/**
 * patch-listbuckets-crash.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Wedding Gallery · setup-b2-cors.mjs — fix Windows fetch + process.exit crash
 *
 * WHY
 *   On Windows, calling process.exit() right after an awaited fetch() call
 *   can crash Node with:
 *     Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
 *   This is a known Node.js/libuv issue on Windows, not a bug in your B2 logic.
 *   It also hides the real error: the script crashes before printing what
 *   Backblaze actually said about the failed b2_list_buckets call.
 *
 * WHAT THIS PATCH DOES
 *   Replaces the process.exit(1) error path after b2_list_buckets with
 *   process.exitCode = 1 (no forced teardown → no crash), and prints the
 *   full raw response body so the real B2 error message is visible.
 *
 * USAGE
 *   node patch-listbuckets-crash.mjs
 *
 * Run from the wedding-gallery project root (Windows / Git Bash, Node 18+).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TARGET = resolve('setup-b2-cors.mjs');

if (!existsSync(TARGET)) {
  console.error(`❌ Could not find ${TARGET}`);
  console.error('   Run this script from the wedding-gallery project root.');
  process.exit(1);
}

// Read + normalise to LF so matching works regardless of CRLF checkout
let src = readFileSync(TARGET, 'utf8').replace(/\r\n/g, '\n');

const oldStr =
`const listData = await listRes.json();
if (!listRes.ok) {
  console.error('❌ Failed to list buckets:', listData.message);
  process.exit(1);
}

const buckets = listData.buckets;
console.log(\`   Found \${buckets.length} bucket(s):\`, buckets.map(b => b.bucketName).join(', '));

// Step 3: CORS rules to apply
const corsRules = [
  {
    corsRuleName: 'allowCloudflare',
    allowedOrigins: [
      origin,
      // Also allow preview deployment URLs
      'https://*.pages.dev'
    ],
    allowedOperations: [
      'b2_download_file_by_name',
      'b2_download_file_by_id',
      's3_get',
      's3_head',
      's3_put'
    ],
    allowedHeaders: ['*'],
    exposeHeaders: ['ETag', 'x-amz-version-id'],
    maxAgeSeconds: 3600
  }
];

// Step 4: Apply CORS to each bucket
console.log(\`\\n🔧 Applying CORS rules (origin: \${origin})...\\n\`);
for (const bucket of buckets) {
  const updateRes = await fetch(\`\${apiUrl}/b2api/v3/b2_update_bucket\`, {
    method: 'POST',
    headers: {
      Authorization: authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accountId,
      bucketId: bucket.bucketId,
      corsRules
    })
  });
  const updateData = await updateRes.json();
  if (updateRes.ok) {
    console.log(\`  ✅ \${bucket.bucketName} — CORS updated\`);
  } else {
    console.log(\`  ❌ \${bucket.bucketName} — Failed: \${updateData.message}\`);
  }
}

console.log('\\n🎉 Done! Trigger a new Cloudflare deploy and images should load.');`;

const newStr =
`const listText = await listRes.text();
if (!listRes.ok) {
  console.error('❌ Failed to list buckets. Status:', listRes.status);
  console.error('   Response body:', listText);
  process.exitCode = 1;
} else {
  const listData = JSON.parse(listText);
  const buckets = listData.buckets;
  console.log(\`   Found \${buckets.length} bucket(s):\`, buckets.map(b => b.bucketName).join(', '));

  // Step 3: CORS rules to apply
  const corsRules = [
    {
      corsRuleName: 'allowCloudflare',
      allowedOrigins: [
        origin,
        // Also allow preview deployment URLs
        'https://*.pages.dev'
      ],
      allowedOperations: [
        'b2_download_file_by_name',
        'b2_download_file_by_id',
        's3_get',
        's3_head',
        's3_put'
      ],
      allowedHeaders: ['*'],
      exposeHeaders: ['ETag', 'x-amz-version-id'],
      maxAgeSeconds: 3600
    }
  ];

  // Step 4: Apply CORS to each bucket
  console.log(\`\\n🔧 Applying CORS rules (origin: \${origin})...\\n\`);
  for (const bucket of buckets) {
    const updateRes = await fetch(\`\${apiUrl}/b2api/v3/b2_update_bucket\`, {
      method: 'POST',
      headers: {
        Authorization: authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountId,
        bucketId: bucket.bucketId,
        corsRules
      })
    });
    const updateData = await updateRes.json();
    if (updateRes.ok) {
      console.log(\`  ✅ \${bucket.bucketName} — CORS updated\`);
    } else {
      console.log(\`  ❌ \${bucket.bucketName} — Failed: \${updateData.message}\`);
    }
  }

  console.log('\\n🎉 Done! Trigger a new Cloudflare deploy and images should load.');
}`;

if (!src.includes(oldStr)) {
  console.error('❌ Patch FAILED — target code not found in setup-b2-cors.mjs');
  console.error('   This usually means the file was already patched, or its');
  console.error('   content has changed since this patch was written.');
  process.exit(1);
}

src = src.replace(oldStr, newStr);
writeFileSync(TARGET, src, 'utf8');

console.log('✅ setup-b2-cors.mjs — fixed Windows fetch + process.exit crash\n');
console.log('Next steps:');
console.log('  git add setup-b2-cors.mjs');
console.log('  git commit -m "Fix Windows libuv crash masking b2_list_buckets errors"');
console.log('  git push\n');
console.log('Then re-run your setup-b2-cors.mjs commands — you\'ll now see the real');
console.log('B2 error message instead of the assertion crash.\n');
