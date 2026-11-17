const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ActivityStore = require('../activityStore');

test('profile sessions persist across restarts, retain names, and duplicate close events do not create rows', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-history-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = new ActivityStore(dir);
  store.opened({ profileId: 'one', profileName: 'Profile Việt', source: 'api', headless: true });
  store.opened({ profileId: 'one', profileName: 'duplicate' });
  store.closed('one'); store.closed('one');
  store.opened({ profileId: 'two', profileName: 'Workspace' });
  const reload = new ActivityStore(dir);
  const data = reload.list();
  assert.equal(data.total, 2);
  assert.equal(data.summary.interrupted, 1);
  const original = reload.list({ search: 'việt', status: 'closed' }).rows[0];
  assert.equal(original.source, 'api'); assert.equal(original.headless, true);
  assert.ok(original.durationMs >= 0);
  assert.equal(reload.list({ from: new Date(Date.now() + 10000).toISOString() }).total, 0);
});
test('history bounds retention and pagination without recreating older activity', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-history-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = new ActivityStore(dir, 3);
  assert.equal(store.list().total, 0);
  for (let i = 0; i < 5; i++) { store.opened({ profileId: String(i), profileName: String(i) }); store.closed(String(i)); }
  assert.equal(store.list().total, 3);
  const page = store.list({ page: 999, pageSize: 2 });
  assert.equal(page.page, 2); assert.equal(page.rows.length, 1);
  assert.equal(store.list().rows.some(r => r.profileId === '0'), false);
});
