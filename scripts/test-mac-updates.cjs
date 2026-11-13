const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findMacUpdate } = require('../macUpdates');
function release(tag, arch, fields = {}) {
  const version = tag.replace(/^(mac-)?v?/, '');
  return { tag_name: tag, html_url: 'https://github.com/thevien1/SV-Browser-Source/releases', assets: [{ name: `SV-Browser-${version}-mac-${arch}.dmg`, browser_download_url: `https://github.com/thevien1/SV-Browser-Source/releases/download/${tag}/app.dmg` }], ...fields };
}
test('Mac source releases are compared numerically and match architecture', async () => {
  const request = async url => ({ ok: true, json: async () => url.includes('SV-Browser-Source')
    ? [release('mac-v1.0.9', 'arm64'), release('mac-v1.0.55', 'x64'), release('mac-v1.0.54', 'arm64'), release('mac-v1.0.99', 'arm64', { draft: true })] : [] });
  assert.equal((await findMacUpdate('1.0.53', 'arm64', request)).version, '1.0.54');
  assert.equal((await findMacUpdate('1.0.53', 'x64', request)).version, '1.0.55');
  assert.equal(await findMacUpdate('1.0.55', 'arm64', request), null);
});
test('network errors are not reported as latest; one working repository is enough', async () => {
  await assert.rejects(findMacUpdate('1.0.53', 'arm64', async () => { throw Error('offline'); }), /Không thể kết nối/);
  const result = await findMacUpdate('1.0.53', 'arm64', async url => {
    if (url.includes('Source')) throw Error('offline');
    return { ok: true, json: async () => [release('1.0.56', 'arm64')] };
  });
  // Asset URLs must belong to the queried repository.
  assert.equal(result, null);
});
