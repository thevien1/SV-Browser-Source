const REPOSITORIES = ['thevien1/SV-Browser-Source', 'thevien1/SV-Browser'];
const API = 'https://api.svbrowser.site/api/v1/updates';
function compareVersions(a, b) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}
const cleanVersion = value => String(value || '').trim().match(/^v?(\d+\.\d+\.\d+)$/i)?.[1];
function apiCandidate(record, currentVersion, arch) {
  if (record.platform && !['macos', 'mac', 'darwin', 'osx'].includes(record.platform.toLowerCase())) throw Error('API trả bản cập nhật khác macOS.');
  const rawUrl = record.macosDownloadUrl || record.downloadDmgUrl || record.downloadExeUrl || record.downloadUrl;
  if (!rawUrl) return null;
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password || !url.pathname.toLowerCase().endsWith('.dmg')) throw Error('API chưa có link DMG macOS hợp lệ.');
  // Release tag describes the actual binary even if the admin display fields are stale.
  const linkVersion = url.pathname.match(/\/releases\/download\/(?:mac-)?v?(\d+\.\d+\.\d+)\//)?.[1];
  const version = linkVersion || cleanVersion(record.macosVersion || record.latestVersion || record.version);
  if (!version) throw Error('API chưa có phiên bản macOS hợp lệ.');
  if (compareVersions(version, currentVersion) <= 0) return null;
  const filename = decodeURIComponent(url.pathname.split('/').pop()).toLowerCase();
  const declared = String(record.arch || record.architecture || '').toLowerCase();
  const target = /(?:^|[-_.])(arm64|aarch64)(?:[-_.]|$)/.test(filename) ? 'arm64'
    : /(?:^|[-_.])(x64|x86_64|intel)(?:[-_.]|$)/.test(filename) ? 'x64'
    : /universal/.test(filename) ? 'universal' : declared;
  if (!['universal', arch].includes(target)) throw Error(`API chưa có bản macOS đúng kiến trúc ${arch}. Hãy cập nhật link tải trên máy chủ.`);
  return { version, downloadUrl: url.href, source: 'api', htmlUrl: 'https://svbrowser.site' };
}
async function findMacUpdate(currentVersion, arch = process.arch, request = fetch) {
  let successes = 0;
  const updates = [];
  const errors = [];
  const get = async url => {
    const response = await request(url, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    return response.json();
  };
  await Promise.all(REPOSITORIES.map(async repo => {
    try {
      const releases = await get(`https://api.github.com/repos/${repo}/releases?per_page=30`);
      if (!Array.isArray(releases)) throw Error('Invalid release list');
      successes++;
      for (const release of releases) {
        if (release.draft || release.prerelease) continue;
        const version = release.tag_name?.match(/^(?:mac-)?v?(\d+\.\d+\.\d+)$/)?.[1];
        if (!version || compareVersions(version, currentVersion) <= 0) continue;
        const asset = release.assets?.find(a => a.name === `SV-Browser-${version}-mac-${arch}.dmg`);
        if (!asset) continue;
        const url = new URL(asset.browser_download_url);
        if (url.origin !== 'https://github.com' || !url.pathname.startsWith(`/${repo}/releases/download/`)) continue;
        updates.push({ version, downloadUrl: url.href, htmlUrl: release.html_url, source: 'github' });
      }
    } catch (error) { errors.push(error); }
  }));
  if (updates.length) return updates.sort((a, b) => compareVersions(b.version, a.version))[0];
  // No GitHub update (including rate limits): consult the user's own backend.
  let apiSuccesses = 0;
  for (const endpoint of [
    `${API}/check?version=${encodeURIComponent(currentVersion)}&platform=macos&arch=${encodeURIComponent(arch)}`,
    `${API}/downloads?platform=macos&arch=${encodeURIComponent(arch)}`,
  ]) {
    try {
      const body = await get(endpoint);
      if (!body || typeof body !== 'object' || body.success === false || Array.isArray(body)) throw Error('API cập nhật trả dữ liệu không hợp lệ.');
      const isDownloads = endpoint.includes('/downloads?');
      const record = isDownloads ? body.data?.find?.(item => item.id === 'sv-browser') : (body.data || body);
      if (!record) throw Error('API chưa có thông tin SV Browser.');
      if (!isDownloads && !['isUpToDate', 'upToDate', 'hasUpdate'].some(key => typeof record[key] === 'boolean') && !record.latestVersion && !record.version) throw Error('Invalid update response');
      let candidate;
      try { candidate = apiCandidate(record, currentVersion, arch); }
      catch (error) { error.invalidPackage = true; throw error; }
      apiSuccesses++;
      if (candidate) return candidate;
    } catch (error) { errors.push(error); }
  }
  // A bad newer API package must not be presented as "latest".
  const invalidPackage = errors.find(error => error.invalidPackage);
  if (invalidPackage) throw invalidPackage;
  if (!successes && !apiSuccesses) throw Error('Không thể kết nối GitHub hoặc API để kiểm tra bản Mac mới. Hãy thử lại.');
  return null;
}
module.exports = { findMacUpdate, compareVersions };
