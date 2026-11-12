const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCores, downloadError } = require('../coreCatalog');
const entries = [
  { id: 'mac', platform: 'macos', coreVersion: '156.0.8078.79', downloadUrl: 'https://github.com/ungoogled-software/ungoogled-chromium/archive/refs/tags/156.0.8078.79-1.zip' },
  { id: 'win155', platform: 'windows', coreVersion: '155', downloadUrl: 'https://github.com/Hibbiki/chromium-win64/releases/download/v155.0.8059.80-r1697595/chrome.7z' },
  { id: 'win154', platform: 'windows', coreVersion: '154', downloadUrl: 'https://example.com/chrome.7z' },
];
for (const field of ['cores', 'data']) {
  test(`${field}: Windows hides Mac; Mac hides Windows and preserves API URL/version`, () => {
    const response = { success: true, [field]: entries };
    assert.deepEqual(normalizeCores(response, 'win32').map(c => c.id), ['win155', 'win154']);
    const [mac] = normalizeCores(response, 'darwin');
    assert.equal(mac.id, 'mac'); assert.equal(mac.version, '156.0.8078.79');
    assert.equal(mac.downloadUrl, entries[0].downloadUrl);
    assert.equal(mac.platform, 'macos'); assert.equal(mac.canInstall, false);
    assert.match(mac.downloadError, /mã nguồn/);
  });
}
test('empty, failed or foreign-platform API never falls back to another source', () => {
  for (const value of [null, { cores: [] }, { success: false, cores: entries }, { cores: [entries[0]] }]) {
    assert.deepEqual(normalizeCores(value, 'win32'), []);
  }
  assert.equal(normalizeCores({ cores: [{ coreVersion: '155', downloadUrl: 'https://example.com/chrome.7z' }] }, 'darwin').length, 0);
});
test('same version on two OSes stays separate; architecture and download guards apply', () => {
  const list = ['windows', 'macos'].map(platform => ({ platform, version: '156', downloadUrl: 'https://example.com/core.zip' }));
  assert.equal(normalizeCores(list, 'win32')[0].platform, 'windows');
  assert.equal(normalizeCores(list, 'darwin')[0].platform, 'macos');
  assert.equal(normalizeCores([{ ...list[1], arch: 'arm64' }], 'darwin', 'x64').length, 0);
  assert.match(downloadError('https://example.com/chrome.dmg', 'windows'), /macOS/);
  assert.match(downloadError(entries[1].downloadUrl, 'macos'), /Windows/);
});
