// Fails fast when the project is run under an incompatible Node.
// better-sqlite3 v13 prebuilds are compiled with NAPI_VERSION=10, which only
// exists on Node >=22.14. On older Node the process does not get a clean
// error — it SIGSEGVs when the addon is dlopen'd (first request that touches
// the DB), so we refuse to start instead.
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 14)) {
  console.error(
    `\nThis project requires Node >=22.14 (found v${process.versions.node}).\n` +
      `better-sqlite3 v13 prebuilds use Node-API 10; on older Node the dev\n` +
      `server segfaults on the first DB access.\n\n` +
      `Fix: run \`nvm use\` in the project root (reads .nvmrc) and retry.\n`
  );
  process.exit(1);
}
