const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { preserveDrivers } = require('../driverStorage');

test('cores survive removal of the old installation and persistent files are not overwritten', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svb-driver-test-'));
  const legacy = path.join(root, 'installation', 'resources', 'drivers');
  const data = path.join(root, 'appdata', 'SVBrowserData');
  const file = path.join('ChromiumCore_v153', 'Chrome-bin', 'chrome.exe');
  try {
    fs.mkdirSync(path.dirname(path.join(legacy, file)), { recursive: true });
    fs.writeFileSync(path.join(legacy, file), 'existing core');
    fs.writeFileSync(path.join(legacy, 'chromedriver.exe'), 'existing driver');
    const destination = await preserveDrivers(data, [legacy, legacy]);
    fs.writeFileSync(path.join(destination, file), 'preserved customized core');
    await preserveDrivers(data, [legacy, destination, path.join(root, 'missing')]);
    fs.rmSync(path.join(root, 'installation'), { recursive: true });
    assert.equal(fs.readFileSync(path.join(destination, file), 'utf8'), 'preserved customized core');
    assert.equal(fs.readFileSync(path.join(destination, 'chromedriver.exe'), 'utf8'), 'existing driver');
    await assert.rejects(preserveDrivers(data, [root]), /Invalid driver migration/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

function fixture(preserve = async () => {}, platform = 'win32', macSigned = false) {
  const updater = new EventEmitter();
  const handlers = {};
  let checks = 0, downloads = 0, installs = 0, opened = 0;
  updater.currentVersion = { compare: () => -1 };
  updater.checkForUpdates = async () => { checks++; return { updateInfo: { version: '1.0.99' } }; };
  updater.downloadUpdate = async () => { downloads++; updater.emit('update-downloaded', { version: '1.0.99' }); };
  updater.quitAndInstall = (silent, restart) => { assert.ok(silent && restart); installs++; };
  const electron = {
    app: { isPackaged: true, getVersion: () => '1.0.48' },
    BrowserWindow: { getAllWindows: () => [] },
    ipcMain: { handle: (name, handler) => { handlers[name] = handler; } },
    shell: { openExternal: async () => { opened++; } },
  };
  const context = { module: { exports: {} }, process: { platform, env: {} }, setImmediate,
    require: name => name === 'electron' ? electron : name === './package.json' ? { macAutoUpdateSigned: macSigned }
      : name === './macUpdates' ? { findMacUpdate: async () => ({ version: '1.0.99', downloadUrl: 'https://github.com/thevien1/SV-Browser-Source/releases/download/mac-v1.0.99/update.dmg' }) }
      : { autoUpdater: updater } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'appUpdater.js'), 'utf8'), context);
  const controller = context.module.exports.createAppUpdater(preserve);
  return { controller, handlers, counts: () => ({ checks, downloads, installs }), opened: () => opened };
}

test('one click preserves drivers then installs and restarts exactly once', async () => {
  let preserved = 0;
  const f = fixture(async () => { preserved++; });
  await Promise.all([f.controller.check(), f.controller.check()]);
  await Promise.all([f.handlers['app:install-update'](), f.handlers['app:install-update']()]);
  await new Promise(setImmediate);
  assert.equal(preserved, 1);
  assert.deepEqual(f.counts(), { checks: 1, downloads: 1, installs: 1 });
});

test('a failed Chromium backup blocks installation and keeps the app running', async () => {
  const f = fixture(async () => { throw Error('disk full'); });
  await f.controller.check();
  await assert.rejects(f.handlers['app:install-update'](), /disk full/);
  await new Promise(setImmediate);
  assert.equal(f.counts().installs, 0);
  assert.equal(f.handlers['app:get-update-state']().status, 'error');
});

test('signed Mac builds install; unsigned Mac builds detect updates and offer DMG without Squirrel installation', async () => {
  const signed = fixture(async () => {}, 'darwin', true);
  assert.equal((await signed.controller.check()).supported, true);
  await signed.handlers['app:install-update']();
  await new Promise(setImmediate);
  assert.equal(signed.counts().installs, 1);
  const unsigned = fixture(async () => {}, 'darwin', false);
  const result = await unsigned.controller.check();
  assert.equal(result.supported, true);
  assert.equal(result.hasUpdate, true);
  assert.equal(result.manualUpdate, true);
  assert.equal((await unsigned.handlers['app:install-update']()).manual, true);
  assert.equal(unsigned.opened(), 1);
  assert.equal(unsigned.counts().installs, 0);
  assert.equal(unsigned.counts().checks, 0);
});
