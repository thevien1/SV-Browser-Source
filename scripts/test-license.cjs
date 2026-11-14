const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const LicenseManager = require('../licenseManager');
const { OFFLINE_GRACE_MS } = require('../licensePolicy');
const BrowserLauncher = require('../browserLauncher');

function fixture(t, overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-license-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const manager = new LicenseManager(dir);
  manager.getHWID = () => 'TEST-HWID';
  manager.getMachineName = () => 'Test';
  const { key, payload } = manager.generateKey({ type: 'lifetime' });
  const stored = { key, payload, expiresAt: 0, activatedAt: Date.now(), lastCheck: Date.now(), activatedHwids: ['TEST-HWID'], serverSynced: true, ...overrides };
  manager._saveLicense(stored);
  return { manager, stored, dir };
}
for (const status of ['SUSPENDED', 'suspended', 'PAUSED', 'BLOCKED', 'DISABLED', 'REVOKED', 'LICENSE_SUSPENDED']) {
  test(`lifetime license is denied and remains denied offline: ${status}`, async t => {
    const { manager } = fixture(t);
    manager.requestServer = async () => ({ ok: false, status: 403, data: { valid: false, status } });
    assert.equal((await manager.checkStatus()).isActivated, false);
    assert.equal(manager.getStoredLicense().isBlocked, true);
    manager.requestServer = async () => ({ ok: false });
    assert.equal((await manager.checkStatus()).isActivated, false);
  });
}
test('business denial inside data or license wins over valid:true and lifetime', async t => {
  const { manager } = fixture(t);
  manager.requestServer = async () => ({ ok: true, status: 200, data: { success: true, data: { valid: true, license: { status: 'SUSPENDED' } } } });
  assert.equal((await manager.checkStatus()).isActivated, false);
});
test('legacy expiration repair never removes a stored admin block', t => {
  const { manager } = fixture(t, { expiresAt: 1, isBlocked: true, blockReason: 'Tạm khóa' });
  const stored = manager.getStoredLicense();
  assert.equal(stored.isBlocked, true);
  assert.equal(stored.blockReason, 'Tạm khóa');
  assert.equal(manager.getLicenseStatus(stored).isActivated, false);
});
test('re-entering a suspended key cannot activate offline', async t => {
  const { manager, stored } = fixture(t);
  manager.requestServer = async () => ({ ok: false, status: 403, data: { valid: false, status: 'SUSPENDED' } });
  assert.equal((await manager.activate(stored.key)).valid, false);
  manager.requestServer = async () => ({ ok: false });
  assert.equal((await manager.activate(stored.key)).valid, false);
  assert.equal((await manager.checkStatus()).isActivated, false);
});
test('server can resume a blocked key without deleting local license files', async t => {
  const { manager } = fixture(t, { isBlocked: true, blockReason: 'Key bị khóa' });
  manager.requestServer = async () => ({ ok: true, status: 200, data: { valid: true, license: { status: 'ACTIVE', expiresAt: null } } });
  assert.equal((await manager.checkStatus()).isActivated, true);
  assert.equal(manager.getStoredLicense().isBlocked, false);
});
test('offline lifetime access has a bounded server lease, not permanent local approval', async t => {
  const { manager, stored } = fixture(t);
  manager.requestServer = async () => ({ ok: false });
  assert.equal((await manager.checkStatus()).isActivated, true);
  manager._saveLicense({ ...stored, lastCheck: Date.now() - OFFLINE_GRACE_MS - 1000 });
  assert.equal((await manager.checkStatus()).isActivated, false);
  manager._saveLicense({ ...stored, serverSynced: false });
  assert.equal((await manager.checkStatus()).isActivated, false);
});
test('parallel checks share one server result and a denied license cannot launch profiles', async t => {
  const { manager, dir } = fixture(t);
  let requests = 0;
  manager.requestServer = async () => { requests++; return { ok: true, status: 200, data: { valid: false, status: 'SUSPENDED' } }; };
  const statuses = await Promise.all([manager.checkStatus(), manager.checkStatus()]);
  assert.equal(requests, 1);
  assert.ok(statuses.every(s => !s.isActivated));
  const launcher = new BrowserLauncher(path.join(dir, 'profiles'));
  launcher.setLicenseManager(manager);
  assert.equal((await launcher.launchProfile({ id: 'test-profile' })).success, false);
  assert.equal(launcher.runningProfiles.size, 0);
});
test('a disk write failure cannot reopen a key already rejected by the server', async t => {
  const { manager } = fixture(t);
  manager._saveLicense = () => { throw Error('read-only disk'); };
  manager.requestServer = async () => ({ ok: true, status: 200, data: { valid: false, status: 'SUSPENDED' } });
  assert.equal((await manager.checkStatus()).isActivated, false);
  manager.requestServer = async () => ({ ok: false });
  assert.equal((await manager.checkStatus()).isActivated, false);
});
