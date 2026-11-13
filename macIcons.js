const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const run = require('util').promisify(execFile);

async function applyChromeIcon(executable) {
  const root = process.resourcesPath || __dirname;
  const icon = path.join(root, 'assets', 'chrome.icns');
  if (!fs.existsSync(icon)) throw Error('Thiếu icon Chrome dành cho Mac trong bộ cài.');
  const bundle = path.dirname(path.dirname(path.dirname(executable)));
  if (path.extname(bundle) !== '.app') throw Error('Invalid browser application bundle');
  const resources = path.join(bundle, 'Contents', 'Resources');
  const digest = crypto.createHash('sha256').update(await fs.promises.readFile(icon)).digest('hex');
  const marker = path.join(path.dirname(bundle), '.sv-chrome-icon');
  try { if ((await fs.promises.readFile(marker, 'utf8')).trim() === digest) return; } catch {}
  await fs.promises.mkdir(resources, { recursive: true });
  await fs.promises.copyFile(icon, path.join(resources, 'sv-chrome.icns'));
  const plist = path.join(bundle, 'Contents', 'Info.plist');
  try { await run('/usr/libexec/PlistBuddy', ['-c', 'Set :CFBundleIconFile sv-chrome.icns', plist]); }
  catch { await run('/usr/libexec/PlistBuddy', ['-c', 'Add :CFBundleIconFile string sv-chrome.icns', plist]); }
  // Re-sign only this user-managed downloaded core after changing its resources.
  // Keep its entitlements; do not change Gatekeeper or system security settings.
  await run('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', '--preserve-metadata=entitlements', bundle], { timeout: 120000 });
  await run('/usr/bin/codesign', ['--verify', '--deep', '--strict', bundle], { timeout: 120000 });
  await fs.promises.writeFile(marker, digest);
}
module.exports = { applyChromeIcon };
