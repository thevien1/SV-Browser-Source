const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),net=require('node:net');
const {parseProxy,resolveProxy,openBridge}=require('../proxyConnection');
const {parseCookies,userAgent,validateProfile,autoUserAgent}=require('../profileConfig');

function editFixture(store,profile) {
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(require.resolve('../src/components/Modals.js'),'utf8').replace(/^import .*$/m,'').replace('export class ModalsComponent','class ModalsComponent');
 const fields=new Map(),alerts=[];let closed=false,refreshed=false;
 const field=id=>{if(!fields.has(id))fields.set(id,{value:'',tagName:'SELECT',options:[],style:{},append(option){this.options.push(option);}});return fields.get(id);};
 const context={window:{api:{updateProfile:async(id,data)=>store.updateProfile(id,data)}},document:{createElement:()=>({})},alert:message=>alerts.push(message),getBrowserIconHtml:()=>''};
 vm.createContext(context);vm.runInContext(source+';globalThis.Modals=ModalsComponent',context);
 const modal=new context.Modals({container:{querySelector:field,querySelectorAll:()=>[]},onProfileCreated:async()=>{refreshed=true;}});
 for(const name of ['syncCustomBrowserDropdown','updateBrowserCapabilities','updateEditSummary','openModal'])modal[name]=()=>{};
 modal.closeModal=()=>{closed=true;};
 modal.openEditProfile(profile);
 return {modal,field,alerts,get closed(){return closed;},get refreshed(){return refreshed;}};
}

test('edit form round trip saves hardware/software/cookies and reopens saved values without replacing an unlisted core',async()=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Store=require('../profileStore');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sv-edit-roundtrip-'));
 const store=Object.create(Store.prototype);Object.assign(store,{dataDir:root,localStorageDefault:root,settings:{localStoragePath:root},profiles:[],groups:['Default group'],tags:[],profilesFilePath:path.join(root,'profiles.json'),tagsFilePath:path.join(root,'tags.json')});
 try{
  const profile=store.createProfile({name:'Before',browserType:'chrome',version:'157.9.8.7',proxyType:'None',software:{os:'Android',timezone:'Asia/Bangkok'}});
  const edit=editFixture(store,profile);assert.equal(edit.field('#edit-quick-browser-core').value,'chrome|157.9.8.7');
  for(const [id,value] of Object.entries({'edit-profile-name':'After','edit-hw-canvas':'Block','edit-hw-webgl-img':'Off','edit-hw-cpu':'4','edit-hw-ram':'16GB','edit-sw-user-agent':'Exact custom UA','edit-sw-screen':'1920x1080','edit-cookies-input':'[{"name":"sid","value":"saved","domain":".example.test"}]'}))edit.field('#'+id).value=value;
  await edit.modal.handleUpdateProfile();assert.deepEqual(edit.alerts,[]);assert.ok(edit.closed&&edit.refreshed);
  const saved=JSON.parse(fs.readFileSync(store.profilesFilePath,'utf8'))[0];assert.equal(saved.name,'After');assert.equal(saved.version,'157.9.8.7');assert.equal(saved.hardware.canvas,'Block');assert.equal(saved.hardware.webglImg,'Off');assert.equal(saved.hardware.cpu,'4');assert.equal(saved.hardware.ram,'16GB');assert.equal(saved.software.os,'Android');assert.equal(saved.software.userAgent,'Exact custom UA');assert.equal(saved.software.screen,'1920x1080');assert.equal(JSON.parse(saved.cookies)[0].value,'saved');
  const reopened=editFixture(store,saved);assert.equal(reopened.field('#edit-hw-canvas').value,'Block');assert.equal(reopened.field('#edit-hw-webgl-img').value,'Off');assert.equal(reopened.field('#edit-sw-user-agent').value,'Exact custom UA');
  saved.software.os='Mac (ARM)';assert.equal(editFixture(store,saved).modal.editSelectedOs,'Mac (ARM)');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('edit form keeps changes open and reports a missing profile instead of silently succeeding',async()=>{
 const edit=editFixture({updateProfile:()=>null},{id:'missing',name:'Missing',browserType:'chrome',version:'157',proxyType:'None'});
 await edit.modal.handleUpdateProfile();assert.equal(edit.closed,false);assert.equal(edit.refreshed,false);assert.equal(edit.alerts.length,1);assert.match(edit.alerts[0],/Không tìm thấy profile/);assert.equal(edit.field('#btn-submit-update-profile').disabled,false);
});
test('proxy schemes/auth/IPv6 are preserved; invalid ports are rejected',()=>{
 for(const scheme of ['http','https','socks4','socks5'])assert.equal(parseProxy(`${scheme}://u:p@127.0.0.1:1080`).type,scheme);
 assert.equal(parseProxy('host.test:9000:user:pa:ss','Socks5').pass,'pa:ss');assert.equal(parseProxy('http://user:p%40ss@host.test:8080').pass,'p@ss');assert.equal(parseProxy('[::1]:1080','Socks5').port,1080);
 assert.throws(()=>parseProxy('host:99999'));assert.throws(()=>parseProxy('ftp://host:80'));
});
test('providers resolve API keys using documented shapes, retain protocol and reject API errors',async()=>{
 const tm=await resolveProxy({proxyType:'TMProxy',proxy:'fixture-key'},async(url,options)=>{
  assert.match(url,/get-current-proxy$/);assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).api_key,'fixture-key');
  return {ok:true,json:async()=>({code:0,data:{socks5:'127.0.0.1:1234',username:'u',password:'p'}})};
 });assert.equal(tm.type,'socks5');assert.equal(tm.user,'u');
 const tin=await resolveProxy({proxyType:'Tinsoft',proxy:'fixture-key'},async url=>{assert.match(url,/getProxy.php\?key=fixture-key/);return {ok:true,json:async()=>({success:true,proxy:'127.0.0.1:9000'})};});assert.equal(tin.type,'http');
 await assert.rejects(resolveProxy({proxyType:'TMProxy',proxy:'bad'},async()=>({ok:true,json:async()=>({code:1,message:'key denied'})})),/key denied/);
});
test('cookies support JSON and Netscape with HttpOnly, session, expiration and sameSite; malformed input is rejected',()=>{
 const cookies=parseCookies('# Netscape\n#HttpOnly_.example.com\tTRUE\t/\tTRUE\t0\tsid\tabc');assert.equal(cookies[0].httpOnly,true);assert.equal(cookies[0].expires,undefined);
 const array=parseCookies(JSON.stringify([{name:'sid',value:'x',domain:'.example.com',expirationDate:2000000000,sameSite:'no_restriction',secure:true}]));assert.equal(array[0].expires,2000000000);assert.equal(array[0].sameSite,'None');
 for(const value of ['[bad','hello','{}','[{"name":"sid","value":"x"}]'])assert.throws(()=>parseCookies(value));
 assert.equal(userAgent({userAgent:'old',software:{userAgent:'Auto'}}),'');assert.equal(userAgent({userAgent:'old',software:{userAgent:'Custom Edg/3'}}),'Custom Edg/3');
 assert.match(autoUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/157.0 Safari/537.36','Android'),/Android.*Chrome\/157.*Mobile/);
 assert.throws(()=>validateProfile({software:{webrtc:'Noise'}}),/chưa/);
});
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
function get(proxy,target){return new Promise((resolve,reject)=>{const req=http.get({host:proxy.host,port:proxy.port,path:target,headers:{Host:new URL(target).host},timeout:4000},res=>{let data='';res.on('data',d=>data+=d);res.on('end',()=>resolve({status:res.statusCode,data}));});req.on('error',reject);req.on('timeout',()=>req.destroy(Error('timeout')));});}
test('HTTP bridge forwards authenticated HTTP and fails closed for invalid credentials',async()=>{
 const upstream=http.createServer((req,res)=>{if(req.headers['proxy-authorization']!=='Basic '+Buffer.from('u:p').toString('base64')){res.writeHead(407);return res.end();}res.end('upstream reached');});
 const port=await listen(upstream);let bridge;
 try{bridge=await openBridge(parseProxy(`http://u:p@127.0.0.1:${port}`));assert.equal((await get(bridge,'http://fixture.test/')).data,'upstream reached');const localPort=bridge.port;await bridge.close();bridge=await openBridge(parseProxy(`http://u:wrong@127.0.0.1:${port}`));assert.notEqual((await get(bridge,'http://fixture.test/')).status,200);assert.equal(upstream.address().port,port);}
 finally{await bridge?.close();await new Promise(r=>upstream.close(r));}
});
test('SOCKS5 authenticated bridge makes an actual CONNECT and forwards data; invalid credentials do not bypass proxy',async()=>{
 const target=http.createServer((req,res)=>res.end('socks target reached'));const targetPort=await listen(target);
 let connections=0;const sockets=new Set();
 const socks=net.createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));let buffer=Buffer.alloc(0),stage=0;
  socket.on('data',function consume(data){buffer=Buffer.concat([buffer,data]);
   if(stage===0){if(buffer.length<2||buffer.length<2+buffer[1])return;buffer=buffer.subarray(2+buffer[1]);socket.write(Buffer.from([5,2]));stage=1;}
   if(stage===1){if(buffer.length<2)return;const ulen=buffer[1];if(buffer.length<3+ulen)return;const plen=buffer[2+ulen];if(buffer.length<3+ulen+plen)return;const user=buffer.subarray(2,2+ulen).toString(),pass=buffer.subarray(3+ulen,3+ulen+plen).toString();buffer=buffer.subarray(3+ulen+plen);if(user!=='u'||pass!=='p'){socket.end(Buffer.from([1,1]));return;}socket.write(Buffer.from([1,0]));stage=2;}
   if(stage===2){if(buffer.length<5)return;let size,host,offset;if(buffer[3]===1){size=10;offset=8;host=[...buffer.subarray(4,8)].join('.');}else if(buffer[3]===3){size=7+buffer[4];offset=5+buffer[4];if(buffer.length<size)return;host=buffer.subarray(5,offset).toString();}else{socket.destroy();return;}if(buffer.length<size)return;const port=buffer.readUInt16BE(offset);assert.equal(port,targetPort);connections++;const dest=net.connect(port,host==='fixture.invalid'?'127.0.0.1':host,()=>{socket.write(Buffer.from([5,0,0,1,127,0,0,1,0,0]));socket.off('data',consume);if(buffer.length>size)dest.write(buffer.subarray(size));socket.pipe(dest);dest.pipe(socket);});dest.on('error',()=>socket.destroy());socket.on('close',()=>dest.destroy());stage=3;}
  });
 });const port=await listen(socks);let bridge;
 try{bridge=await openBridge(parseProxy(`socks5://u:p@127.0.0.1:${port}`));assert.equal((await get(bridge,`http://fixture.invalid:${targetPort}/`)).data,'socks target reached');assert.equal(connections,1);await bridge.close();bridge=await openBridge(parseProxy(`socks5://u:bad@127.0.0.1:${port}`));assert.notEqual((await get(bridge,`http://127.0.0.1:${targetPort}/`)).status,200);assert.equal(connections,1);}
 finally{await bridge?.close();for(const socket of sockets)socket.destroy();await new Promise(r=>socks.close(r));await new Promise(r=>target.close(r));}
});

test('HTTPS upstream performs TLS with certificate validation and authenticated CONNECT',async()=>{
 const https=require('node:https'),fs=require('node:fs'),path=require('node:path');
 const key=fs.readFileSync(path.join(__dirname,'fixtures/proxy-test-key.pem')),cert=fs.readFileSync(path.join(__dirname,'fixtures/proxy-test-cert.pem'));
 const sockets=new Set();
 const echo=net.createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.pipe(socket)});const target=await listen(echo);
 const upstream=https.createServer({key,cert},(req,res)=>res.end('TLS proxy reached'));
 upstream.on('connect',(req,socket)=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));if(req.headers['proxy-authorization']!=='Basic '+Buffer.from('u:p').toString('base64')){socket.end('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');return;}assert.equal(req.url,`127.0.0.1:${target}`);const dest=net.connect(target,'127.0.0.1',()=>{socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');socket.pipe(dest);dest.pipe(socket)});socket.on('close',()=>dest.destroy());dest.on('error',()=>socket.destroy());});const port=await listen(upstream);
 const trusted=new https.Agent({ca:cert});let bridge;
 try{
  bridge=await openBridge(parseProxy(`https://u:p@127.0.0.1:${port}`),{httpsAgent:trusted});assert.equal((await get(bridge,'http://fixture.test/')).data,'TLS proxy reached');
  await new Promise((resolve,reject)=>{const client=net.connect(bridge.port,'127.0.0.1',()=>client.write(`CONNECT 127.0.0.1:${target} HTTP/1.1\r\nHost: 127.0.0.1:${target}\r\n\r\n`));let connected=false,buffer='';client.setTimeout(3000,()=>client.destroy(Error('timeout')));client.on('data',data=>{buffer+=data.toString();if(!connected&&buffer.includes('\r\n\r\n')){assert.match(buffer,/200/);connected=true;buffer='';client.write('fixture-tunnel');}else if(connected&&buffer.includes('fixture-tunnel')){client.destroy();resolve();}});client.on('error',reject);});
  await bridge.close();bridge=await openBridge(parseProxy(`https://u:p@127.0.0.1:${port}`));assert.notEqual((await get(bridge,'http://fixture.test/')).status,200,'Untrusted certificate must not be accepted');
 }finally{await bridge?.close();trusted.destroy();for(const socket of sockets)socket.destroy();await new Promise(r=>upstream.close(r));await new Promise(r=>echo.close(r));}
});
test('SOCKS4 uses its own handshake and user ID rather than SOCKS5 negotiation',async()=>{
 const target=http.createServer((req,res)=>res.end('socks4 target reached'));const targetPort=await listen(target);const sockets=new Set();let ids=[];
 const socks=net.createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));let buffer=Buffer.alloc(0);socket.on('data',function consume(data){buffer=Buffer.concat([buffer,data]);if(buffer.length<9)return;const end=buffer.indexOf(0,8);if(end<0)return;assert.equal(buffer[0],4);assert.equal(buffer[1],1);ids.push(buffer.subarray(8,end).toString());assert.equal(buffer.readUInt16BE(2),targetPort);const host=[...buffer.subarray(4,8)].join('.');assert.equal(host,'127.0.0.1');const dest=net.connect(targetPort,host,()=>{socket.write(Buffer.from([0,90,0,0,0,0,0,0]));socket.off('data',consume);if(buffer.length>end+1)dest.write(buffer.subarray(end+1));socket.pipe(dest);dest.pipe(socket)});dest.on('error',()=>socket.destroy());socket.on('close',()=>dest.destroy());});});const port=await listen(socks);let bridge;
 try{bridge=await openBridge(parseProxy(`socks4://fixture-user@127.0.0.1:${port}`));assert.equal((await get(bridge,`http://127.0.0.1:${targetPort}/`)).data,'socks4 target reached');assert.deepEqual(ids,['fixture-user']);}
 finally{await bridge?.close();for(const socket of sockets)socket.destroy();await new Promise(r=>socks.close(r));await new Promise(r=>target.close(r));}
});

test('profile store create/edit persists UA Auto, cookies, proxy type, rotation URL and hardware without stale root UA',()=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Store=require('../profileStore');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sv-profile-config-store-'));
 const store=Object.create(Store.prototype);Object.assign(store,{dataDir:root,localStorageDefault:root,settings:{localStoragePath:root},profiles:[],groups:['Default group'],tags:[],profilesFilePath:path.join(root,'profiles.json'),tagsFilePath:path.join(root,'tags.json')});
 try{
  const data={id:'fixture',browserType:'chrome',proxy:'127.0.0.1:1080',proxyType:'Socks5',proxyChangeUrl:'https://example.test/current',cookies:'[{"name":"sid","value":"fixture","domain":".example.test"}]',hardware:{cpu:'4',ram:'16GB'},software:{userAgent:'Exact Edg/999',language:'vi-VN,vi',timezone:'Asia/Tokyo'}};
  const created=store.createProfile(data);assert.equal(created.userAgent,'Exact Edg/999');assert.equal(created.proxyType,'Socks5');assert.equal(created.proxyChangeUrl,data.proxyChangeUrl);
  store.updateProfile(created.id,{software:{...data.software,userAgent:'Auto'},cookies:''});assert.equal(store.getProfile(created.id).userAgent,'Auto');assert.equal(store.getProfile(created.id).cookies,'');
  const persisted=JSON.parse(fs.readFileSync(store.profilesFilePath,'utf8'));assert.equal(persisted[0].software.userAgent,'Auto');assert.equal(persisted[0].hardware.ram,'16GB');
  const before=fs.readFileSync(store.profilesFilePath,'utf8');assert.throws(()=>store.updateProfile(created.id,{cookies:'invalid'}));assert.equal(fs.readFileSync(store.profilesFilePath,'utf8'),before);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('rotation and provider URL inputs resolve once and malformed responses fail clearly',async()=>{
 let calls=0;
 const config=await resolveProxy({proxy:'127.0.0.1:8000',proxyType:'HTTP',proxyChangeUrl:'https://fixture.test/rotate'},async url=>{calls++;assert.equal(url,'https://fixture.test/rotate');return {ok:true,json:async()=>({success:true,proxy:'127.0.0.1:9000'})};});assert.equal(calls,1);assert.equal(config.port,9000);
 const tin=await resolveProxy({proxyType:'Tinsoft',proxy:'https://fixture.test/api/getProxy.php?key=fixture'},async url=>{assert.equal(url,'https://fixture.test/api/getProxy.php?key=fixture');return {ok:true,json:async()=>({success:true,proxy:'127.0.0.1:9000'})};});assert.equal(tin.port,9000);
 await assert.rejects(resolveProxy({proxyType:'HTTP',proxy:'127.0.0.1:8000',proxyChangeUrl:'https://fixture.test/rotate'},async()=>({ok:true,json:async()=>({success:false,message:'rotation denied'})})),/rotation denied/);
 assert.throws(()=>parseCookies('[{"name":"x","value":"y","domain":".example.test","sameSite":"None"}]'),/secure/);
});

test('browser settings defaults map Real/Noise/Block, persist stable Random screens and allow profile overrides',()=>{
 const {browserDefaults,applyBrowserDefaults,validateBrowserSettings}=require('../profileConfig');
 const real={canvasMode:'real',clientRectMode:'real',webglImageMode:'real',webglMetaMode:'real',audioMode:'real',fontMode:'real',screenMode:'real',languageMode:'real'};
 const defaults=browserDefaults(real,'id');assert.equal(defaults.hardware.canvas,'Off');assert.equal(defaults.hardware.font,'System');assert.equal(defaults.software.screen,'-1x-1');assert.equal(defaults.software.language,'Real');
 const random={...real,canvasMode:'block',screenMode:'random',languageMode:'ip'};
 assert.deepEqual(browserDefaults(random,'stable-id'),browserDefaults(random,'stable-id'));
 assert.equal(browserDefaults(random,'id').hardware.canvas,'Block');assert.equal(browserDefaults(random,'id').software.language,'Auto');
 const own=applyBrowserDefaults({id:'id',hardware:{canvas:'Noise'},software:{screen:'1366x768',language:'ja-JP,ja'}},random);assert.equal(own.hardware.canvas,'Noise');assert.equal(own.software.screen,'1366x768');assert.equal(own.software.language,'ja-JP,ja');
 assert.throws(()=>validateBrowserSettings({canvasMode:'pretend'}),/không hợp lệ/);validateBrowserSettings(real);
});
