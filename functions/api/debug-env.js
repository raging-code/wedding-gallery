/**
 * TEMPORARY DIAGNOSTIC — GET /api/debug-env
 * Reports length + masked snippet of each B2 secret so corruption (e.g. a
 * stray CLI help string) is visible without ever exposing the real value.
 * DELETE THIS FILE once you've confirmed all secrets look correct.
 */

const VARS = [
  "B2_PHOTO1_KEY_ID",
  "B2_PHOTO1_APP_KEY",
  "B2_PHOTO1_BUCKET_NAME",
  "B2_PHOTO1_ENDPOINT",
  "B2_PHOTO2_KEY_ID",
  "B2_PHOTO2_APP_KEY",
  "B2_PHOTO2_BUCKET_NAME",
  "B2_PHOTO2_ENDPOINT",
  "B2_VIDEO1_KEY_ID",
  "B2_VIDEO1_APP_KEY",
  "B2_VIDEO1_BUCKET_NAME",
  "B2_VIDEO1_ENDPOINT",
  "B2_VIDEO2_KEY_ID",
  "B2_VIDEO2_APP_KEY",
  "B2_VIDEO2_BUCKET_NAME",
  "B2_VIDEO2_ENDPOINT"
];

export async function onRequestGet(context) {
  const { env } = context;
  const report = {};

  for (const name of VARS) {
    const val = env[name];
    if (val === undefined || val === null) {
      report[name] = { status: 'MISSING' };
      continue;
    }
    const str = String(val);
    // Flag obviously-wrong control characters (e.g. \r\n from a CLI help dump)
    const hasControlChars = /[\r\n\t]/.test(str);
    const snippet = str.length <= 8
      ? str.slice(0, 2) + '***'
      : str.slice(0, 3) + '...' + str.slice(-3);

    report[name] = {
      length: str.length,
      snippet,
      looksSuspicious: hasControlChars || str.length > 60,
    };
  }

  return Response.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
