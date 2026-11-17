const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { once } = require('events');
const GpmApiServer = require('../gpmApiServer');
const { getApiDocsHtml } = require('../apiDocsTemplate');

test('notes API reads without mutation, updates through both aliases and clears only explicitly', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-notes-api-'));
  const profile = { id: 'test-id', note: 'Original', notes: 'Original' };
  let changes = 0;
  const store = { dataDir: dir, getProfile: id => id === profile.id ? profile : null,
    updateProfile: (id, data) => { if (id !== profile.id) return null; changes++; Object.assign(profile, data); return profile; } };
  const api = new GpmApiServer(store, {}, 8725);
  api.port = 0;
  api.start();
  await once(api.server, 'listening');
  const base = `http://127.0.0.1:${api.server.address().port}`;
  t.after(async () => { await new Promise(resolve => api.server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); });
  const request = async (route, body, method = 'POST') => {
    const response = await fetch(base + route, body === undefined ? undefined : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  let result = await request('/api/v1/profiles/notes/test-id');
  assert.equal(result.status, 200); assert.equal(result.data.data.notes, 'Original'); assert.equal(changes, 0);
  result = await request('/api/v3/profiles/notes/test-id', { notes: 'Ghi chú Việt' });
  assert.equal(result.data.data.note, 'Ghi chú Việt');
  result = await request('/api/v1/profiles/update-note/test-id', { note: '' });
  assert.equal(result.data.data.notes, '');
  assert.equal((await request('/api/v1/profiles/notes/test-id', {})).status, 400);
  assert.equal((await request('/api/v1/profiles/notes/test-id', { notes: 123 })).status, 400);
  assert.equal((await request('/api/v1/profiles/notes/missing')).status, 404);
  const html = getApiDocsHtml('localhost:8725');
  assert.ok(html.includes('data-cat="notes"'));
  assert.ok(html.includes('/api/v1/profiles/notes/{id}'));
  assert.ok(html.includes('https://svbrowser.site/docs'));
});
