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

const macUrl = (version, arch = 'x64') => `https://github.com/thevien1/SV-Browser-Source/releases/download/mac-v${version}/SV-Browser-${version}-mac-${arch}.dmg`;
const ok = body => ({ok:true,json:async()=>body});
test('GitHub failure falls back to check API with macOS and architecture', async()=>{
 const calls=[];
 const update=await findMacUpdate('1.0.59','x64',async url=>{
  calls.push(url);
  if(url.includes('api.github.com'))throw Error('rate limit');
  assert.match(url,/platform=macos&arch=x64/);
  return ok({platform:'macos',latestVersion:'1.0.60',hasUpdate:true,downloadExeUrl:macUrl('1.0.60')});
 });
 assert.equal(update.version,'1.0.60');assert.equal(update.source,'api');assert.equal(calls.length,3);
});
test('no GitHub update checks downloads API, uses actual release version despite stale admin fields',async()=>{
 const request=async url=>url.includes('api.github.com')?ok([]):url.includes('/check?')?ok({isUpToDate:true,platform:'macos'}):ok({success:true,data:[{id:'sv-browser',macosVersion:'123',macosFileName:'old-1.0.58.dmg',macosDownloadUrl:macUrl('1.0.60')}]});
 assert.equal((await findMacUpdate('1.0.59','x64',request)).version,'1.0.60');
 assert.equal(await findMacUpdate('1.0.60','x64',request),null);
 assert.equal(await findMacUpdate('1.0.61','x64',request),null);
 await assert.rejects(findMacUpdate('1.0.59','arm64',request),/kiến trúc arm64/);
});
test('API rejects Windows files, unsafe schemes and unknown Mac architectures',async()=>{
 for(const downloadExeUrl of ['https://example.com/setup.exe','http://example.com/app-x64.dmg','https://example.com/app.dmg']){
  await assert.rejects(findMacUpdate('1.0.59','x64',async url=>url.includes('api.github.com')?ok([]):url.includes('/check?')?ok({latestVersion:'1.0.60',platform:'macos',downloadExeUrl}):ok({data:[]})));
 }
});
test('GitHub update avoids unnecessary API fallback; API failures cannot fabricate latest when all sources fail',async()=>{
 let api=0;
 const result=await findMacUpdate('1.0.59','x64',async url=>{
  if(!url.includes('api.github.com')){api++;throw Error('offline');}
  return ok(url.includes('SV-Browser-Source')?[release('mac-v1.0.60','x64')]:[]);
 });
 assert.equal(result.version,'1.0.60');assert.equal(api,0);
 await assert.rejects(findMacUpdate('1.0.59','x64',async url=>{if(url.includes('api.github.com'))throw Error('offline');return ok({});}),/Không thể kết nối/);
});
