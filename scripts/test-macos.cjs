const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadMac(arch, existing = new Set()) {
  const context = { module: { exports: {} }, process: { arch }, URL, AbortSignal,
    require(name) { return name === 'fs' ? { existsSync: p => existing.has(p) } : require(name); },
    fetch: async () => ({ ok: true, json: async () => ({ channels: { Stable: { version: '130.0.1.2', downloads: { chrome: ['arm64', 'x64'].map(a => ({ platform: `mac-${a}`, url: `https://example.com/${a}` })) } } } }) }) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'macBrowser.js'), 'utf8'), context);
  return context.module.exports;
}

for (const arch of ['arm64', 'x64']) {
  test(`Mac ${arch}: select native Chrome and find application bundle`, async () => {
    const executable = path.join('/cores/v130', `chrome-mac-${arch}`, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
    const mac = loadMac(arch, new Set([executable]));
    assert.equal(mac.findChrome('/cores/v130'), executable);
    assert.equal((await mac.catalogue())[0].downloadUrl, `https://example.com/${arch}`);
    assert.equal(mac.findChrome('/windows/core'), null);
    await assert.rejects(mac.install('/cores', 'https://example.com/chrome.exe', () => {}, ''), /core Windows/);
    const other = arch === 'arm64' ? 'x64' : 'arm64';
    await assert.rejects(mac.install('/cores', `https://storage.googleapis.com/chrome-for-testing-public/130.0.1.2/mac-${other}/chrome-mac-${other}.zip`, () => {}, ''), /core Windows/);
  });
}
