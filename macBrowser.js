const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const run = promisify(execFile);

function platformKey(arch = process.arch) {
  if (!['arm64', 'x64'].includes(arch)) throw Error(`Unsupported Mac architecture: ${arch}`);
  return `mac-${arch}`;
}

function findChrome(folder) {
  const apps = ['Google Chrome for Testing', 'Google Chrome', 'Chromium'];
  for (const base of [folder, path.join(folder, platformKey().replace('mac-', 'chrome-mac-'))]) {
    for (const name of apps) {
      const executable = path.join(base, `${name}.app`, 'Contents', 'MacOS', name);
      if (fs.existsSync(executable)) return executable;
    }
  }
  return null;
}

function detectBrowsers() {
  const names = { chrome: 'Google Chrome', chromium: 'Chromium', brave: 'Brave Browser', edge: 'Microsoft Edge', firefox: 'Firefox', opera: 'Opera' };
  const found = {};
  for (const [type, name] of Object.entries(names)) {
    for (const root of ['/Applications', path.join(os.homedir(), 'Applications')]) {
      const executable = path.join(root, `${name}.app`, 'Contents', 'MacOS', type === 'firefox' ? 'firefox' : name);
      if (fs.existsSync(executable)) { found[type] = executable; break; }
    }
  }
  return found;
}

async function catalogue() {
  const response = await fetch('https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json', { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error(`Chrome catalogue HTTP ${response.status}`);
  const stable = (await response.json()).channels.Stable;
  const asset = stable.downloads.chrome.find(item => item.platform === platformKey());
  if (!asset) throw Error('No Chrome download for this Mac');
  const major = stable.version.split('.')[0];
  return [{ id: `ChromiumCore_v${major}`, name: `ChromiumCore_v${major}`, type: 'chromium', majorVersion: major, version: stable.version, description: 'Google Chrome for Testing (macOS)', downloadUrl: asset.url }];
}

async function install(driversDir, url, onProgress, targetName) {
  const parsed = new URL(url);
  const key = platformKey();
  const match = parsed.pathname.match(new RegExp(`^/chrome-for-testing-public/(\\d+\\.\\d+\\.\\d+\\.\\d+)/${key}/chrome-${key}\\.zip$`));
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'storage.googleapis.com' || !match) {
    throw Error('Hãy chọn Chrome macOS trong danh sách cập nhật; core Windows không chạy trên Mac.');
  }
  const version = match[1];
  const folderName = targetName || `ChromiumCore_v${version.split('.')[0]}`;
  if (!/^[a-zA-Z0-9_.-]+$/.test(folderName) || folderName === '.' || folderName === '..') throw Error('Invalid core folder');
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sv-chrome-'));
  try {
    onProgress('[1/3] Đang tải Chrome macOS...');
    const archive = path.join(temp, 'chrome.zip');
    await run('/usr/bin/curl', ['--fail', '--location', '--proto', '=https', '--output', archive, url], { timeout: 600000 });
    onProgress('[2/3] Đang giải nén Chrome macOS...');
    await run('/usr/bin/ditto', ['-x', '-k', archive, temp]);
    if (!findChrome(temp)) throw Error('Chrome application missing from archive');
    const destination = path.join(driversDir, folderName);
    await fs.promises.mkdir(destination, { recursive: true });
    await fs.promises.cp(path.join(temp, `chrome-${key}`), path.join(destination, `chrome-${key}`), { recursive: true });
    const executable = findChrome(destination);
    await fs.promises.chmod(executable, 0o755);
    await fs.promises.writeFile(path.join(destination, 'version.json'), JSON.stringify({ version }));
    onProgress('[3/3] Đã cài Chrome macOS.');
    return { success: true, folderName, version, majorVersion: version.split('.')[0], path: executable };
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

module.exports = { platformKey, findChrome, detectBrowsers, catalogue, install };
