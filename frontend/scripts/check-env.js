/**
 * Runs as `prebuild`. Create React App inlines REACT_APP_* at build time, so an
 * unset variable becomes the string "undefined" and produces a bundle that
 * calls "undefined/api/..." on every request — it builds clean and fails only
 * once deployed. Fail the build here instead.
 */
const url = process.env.REACT_APP_BACKEND_URL;

const fail = (reason) => {
  console.error(`\n  Build stopped: ${reason}\n`);
  console.error("  REACT_APP_BACKEND_URL is read at BUILD time and baked into the bundle.");
  console.error("  Set it in frontend/.env.production, or export it before building:\n");
  console.error("      REACT_APP_BACKEND_URL=https://api.example.com npm run build\n");
  console.error("  It should be the backend origin with no trailing slash and no");
  console.error("  /api suffix — the client appends /api itself.\n");
  process.exit(1);
};

if (!url || url === "undefined" || url === "null") fail("REACT_APP_BACKEND_URL is not set.");
if (!/^https?:\/\//.test(url)) fail(`REACT_APP_BACKEND_URL must start with http:// or https:// (got "${url}").`);
if (/\/api\/?$/.test(url)) fail(`REACT_APP_BACKEND_URL must not include /api (got "${url}").`);

console.log(`  ✓ REACT_APP_BACKEND_URL = ${url}`);
