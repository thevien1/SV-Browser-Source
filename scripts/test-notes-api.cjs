const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { once } = require('events');
const GpmApiServer = require('../gpmApiServer');
const { getApiDocsHtml, ENDPOINTS_DATA, PURPOSES, sampleUrl } = require('../apiDocsTemplate');

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

test('Purpose documents every function with copyable GET URLs and correct extension method without executing actions',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sv-purpose-api-'));let toggles=0;const launches=[];
  const api=new GpmApiServer({dataDir:dir,getProfile:id=>({id,name:'Fixture',proxy:'No Proxy'})},{launchProfile:async(profile,index,options)=>{launches.push(options);return {success:true,remote_debugging_port:1234};}},8725,false,null,{getAll:()=>[{id:'fixture-extension',folderName:'fixture-extension',enabled:false}],toggleExtension:(id,active)=>{assert.equal(id,'fixture-extension');assert.equal(active,true);toggles++;}});
  api.port=0;api.start();await once(api.server,'listening');const base=`http://127.0.0.1:${api.server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>api.server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
  const response=await fetch(base+'/purpose');assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/html/);const html=await response.text();
  assert.match(html,/Purpose — Mục đích/);assert.equal(toggles,0);assert.equal(launches.length,0);
  for(const ep of ENDPOINTS_DATA){assert.equal(PURPOSES[ep.id]?.length,3,ep.id);assert.ok(html.includes(`id="card-${ep.id}"`));assert.ok(html.includes(`/docs#card-${ep.id}`));}
  assert.equal((html.match(/Sao chép URL GET/g)||[]).length,ENDPOINTS_DATA.filter(ep=>ep.method==='GET').length);
  const docs=await (await fetch(base+'/docs')).text();assert.ok(docs.includes('href="/purpose"'));assert.ok(docs.includes('/purpose#card-profiles-start'));
  const extension=ENDPOINTS_DATA.find(ep=>ep.id==='extensions-toggle');assert.equal(extension.method,'GET');assert.equal(extension.requestBody,null);
  const url=sampleUrl(extension,base).replace('Bookmarks_Quick_Search','fixture-extension');assert.equal((await fetch(url)).status,200);assert.equal(toggles,1);
  assert.equal(new URL(sampleUrl(ENDPOINTS_DATA.find(ep=>ep.id==='system-ping'),base)).searchParams.get('format'),'json');
  const startUrl=new URL(sampleUrl(ENDPOINTS_DATA.find(ep=>ep.id==='profiles-start'),base));startUrl.searchParams.set('skip_proxy_check','true');
  assert.equal((await fetch(startUrl)).status,200);assert.equal(launches.length,1);assert.equal(launches[0].window_size,'1280,720');assert.equal(launches[0].window_pos,'0,0');assert.equal(launches[0].window_scale,0.8);
  assert.equal((await fetch(base+'/purpose',{method:'POST'})).status,405);
});
