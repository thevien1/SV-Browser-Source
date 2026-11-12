const CORE_API = 'https://api.svbrowser.site/api/v1/updates/cores';
function platformName(value) {
  return ({ win32: 'windows', win64: 'windows', windows: 'windows', darwin: 'macos', mac: 'macos', macos: 'macos' })[String(value || '').toLowerCase()] || '';
}
function downloadError(url, platform) {
  if (!url) return 'Chưa có link tải core trên server.';
  let parsed;
  try { parsed = new URL(url); } catch { return 'Link tải core không hợp lệ.'; }
  if (parsed.protocol !== 'https:') return 'Link tải core phải dùng HTTPS.';
  if (/\/archive\/(refs\/tags\/|refs\/heads\/|v?\d)/i.test(parsed.pathname) || parsed.hostname === 'codeload.github.com') {
    return 'Link này là mã nguồn, không phải trình duyệt đã build. Hãy cập nhật downloadUrl trên server thành file .zip/.dmg chứa Chromium.app cho macOS hoặc core Windows đã build.';
  }
  if (platform === 'macos' && (/\.(exe|7z)$/i.test(parsed.pathname) || /chromium-win|\/win64\//i.test(parsed.pathname))) return 'Đây là core Windows, không chạy trên macOS.';
  if (platform === 'windows' && (/\.dmg$/i.test(parsed.pathname) || /(?:macos|mac-arm64|mac-x64)/i.test(parsed.pathname))) return 'Đây là core macOS, không chạy trên Windows.';
  return '';
}
function normalizeCores(response, host = process.platform, arch = process.arch) {
  const platform = platformName(host);
  if (!platform || response?.success === false) return [];
  const list = Array.isArray(response?.cores) ? response.cores : Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
  const unique = new Map();
  for (const item of list) {
    // Legacy API entries without a platform were Windows-only.
    const itemPlatform = item.platform ? platformName(item.platform) : 'windows';
    if (itemPlatform !== platform) continue;
    const itemArch = String(item.arch || item.architecture || '').toLowerCase().replace('aarch64', 'arm64').replace('amd64', 'x64');
    if (itemArch && itemArch !== 'universal' && itemArch !== arch) continue;
    const version = String(item.coreVersion || item.version || item.majorVersion || '');
    const major = String(item.majorVersion || version.split('.')[0]);
    if (!/^\d+$/.test(major)) continue;
    const name = item.name || `ChromiumCore_v${major}`;
    const core = { ...item, id: item.id || `${name}_${platform}`, name, platform, version, majorVersion: major,
      type: item.type || (name.toLowerCase().includes('firefox') ? 'firefox' : 'chromium'), downloadUrl: item.downloadUrl || '' };
    core.downloadError = downloadError(core.downloadUrl, platform);
    core.canInstall = !core.downloadError;
    const key = `${platform}:${name.toLowerCase()}:${version}:${itemArch}`;
    if (!unique.has(key)) unique.set(key, core);
  }
  return [...unique.values()];
}
module.exports = { CORE_API, platformName, normalizeCores, downloadError };
