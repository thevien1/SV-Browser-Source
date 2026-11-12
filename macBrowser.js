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
  const { CORE_API, normalizeCores } = require('./coreCatalog');
  const response = await fetch(CORE_API, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error(`Core API HTTP ${response.status}`);
  return normalizeCores(await response.json(), 'darwin', process.arch);
}

function findApp(folder, depth = 0) {
  if (depth > 4) return null;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(folder, entry.name);
    if (entry.name.endsWith('.app')) {
      const executable = findChrome(folder);
      if (executable) return { bundle: path.dirname(path.dirname(path.dirname(executable))), executable };
    } else {
      const found = findApp(candidate, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function install(driversDir, url, onProgress, targetName, core = {}) {
  const { downloadError } = require('./coreCatalog');
  const error = downloadError(url, 'macos');
  if (error) throw Error(error);
  const parsed = new URL(url);
  if (!/\.(zip|dmg)$/i.test(parsed.pathname)) throw Error('Core macOS cần file .zip hoặc .dmg chứa Chromium.app đã build.');
  const version = String(core.version || core.coreVersion || (parsed.pathname.match(/\d+\.\d+\.\d+\.\d+/) || [])[0] || (targetName || '').match(/\d+/)?.[0] || '');
  if (!version) throw Error('Không xác định được phiên bản core macOS.');
  const folderName = targetName || `ChromiumCore_v${version.split('.')[0]}`;
  if (!/^[a-zA-Z0-9_.-]+$/.test(folderName) || folderName === '.' || folderName === '..') throw Error('Invalid core folder');
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sv-chrome-'));
  let mounted = false;
  const mount = path.join(temp, 'mount');
  try {
    onProgress('[1/3] Đang tải core macOS từ server...');
    const isDmg = /\.dmg$/i.test(parsed.pathname);
    const archive = path.join(temp, isDmg ? 'core.dmg' : 'core.zip');
    await run('/usr/bin/curl', ['--fail', '--location', '--proto', '=https', '--proto-redir', '=https', '--output', archive, url], { timeout: 600000 });
    onProgress('[2/3] Đang mở gói core macOS...');
    const unpack = path.join(temp, 'unpacked');
    await fs.promises.mkdir(unpack);
    if (isDmg) {
      await fs.promises.mkdir(mount);
      await run('/usr/bin/hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, archive]);
      mounted = true;
    } else await run('/usr/bin/ditto', ['-x', '-k', archive, unpack]);
    const found = findApp(isDmg ? mount : unpack);
    if (!found) throw Error('Gói tải không chứa Chromium.app/Google Chrome.app đã build. Nếu đây là mã nguồn, hãy sửa downloadUrl trên server.');
    const { stdout } = await run('/usr/bin/lipo', ['-archs', found.executable]);
    const requiredArch = process.arch === 'arm64' ? 'arm64' : 'x86_64';
    if (!stdout.trim().split(/\s+/).includes(requiredArch)) throw Error(`Core không hỗ trợ kiến trúc máy Mac này (${process.arch}). Hãy chọn bản đúng kiến trúc trên server.`);
    const destination = path.join(driversDir, folderName);
    await fs.promises.mkdir(destination, { recursive: true });
    const bundle = path.join(destination, path.basename(found.bundle));
    await fs.promises.cp(found.bundle, bundle, { recursive: true, verbatimSymlinks: true });
    const executable = findChrome(destination);
    await fs.promises.chmod(executable, 0o755);
    await fs.promises.writeFile(path.join(destination, 'version.json'), JSON.stringify({ version, platform: 'macos', arch: process.arch, downloadUrl: url }));
    onProgress('[3/3] Đã cài core macOS.');
    return { success: true, folderName, version, majorVersion: version.split('.')[0], path: executable };
  } finally {
    if (mounted) await run('/usr/bin/hdiutil', ['detach', mount]);
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}
module.exports = { platformKey, findChrome, detectBrowsers, catalogue, install };
