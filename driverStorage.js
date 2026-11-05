const fs = require('fs');
const path = require('path');

function getPersistentDriversDir(appDataDir) {
  return path.join(appDataDir, 'drivers');
}

// Copy rather than move: running browsers may still use the legacy location.
// Existing persistent files are never overwritten. Any failure blocks updating.
async function preserveDrivers(appDataDir, legacyRoots) {
  const destination = path.resolve(getPersistentDriversDir(appDataDir));
  await fs.promises.mkdir(destination, { recursive: true });
  const seen = new Set();
  for (const root of legacyRoots.filter(Boolean)) {
    const source = path.resolve(root);
    const key = source.toLowerCase();
    if (seen.has(key) || key === destination.toLowerCase()) continue;
    seen.add(key);
    if (destination.toLowerCase().startsWith(key + path.sep)) throw Error('Invalid driver migration path');
    try { await fs.promises.access(source); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    await fs.promises.cp(source, destination, { recursive: true, force: false, errorOnExist: false, dereference: true });
  }
  return destination;
}

module.exports = { getPersistentDriversDir, preserveDrivers };
