const REPOSITORIES = ['thevien1/SV-Browser-Source', 'thevien1/SV-Browser'];
function compareVersions(a, b) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}
async function findMacUpdate(currentVersion, arch = process.arch, request = fetch) {
  let successes = 0;
  const updates = [];
  await Promise.all(REPOSITORIES.map(async repo => {
    try {
      const response = await request(`https://api.github.com/repos/${repo}/releases?per_page=30`, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw Error(`GitHub HTTP ${response.status}`);
      const releases = await response.json();
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
        updates.push({ version, downloadUrl: url.href, htmlUrl: release.html_url });
      }
    } catch {}
  }));
  if (!successes) throw Error('Không thể kết nối GitHub để kiểm tra bản Mac mới. Hãy thử lại.');
  return updates.sort((a, b) => compareVersions(b.version, a.version))[0] || null;
}
module.exports = { findMacUpdate, compareVersions };
