const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const BrowserLauncher=require('../browserLauncher');
const exe=process.env.SV_CHROME_TEST_EXE || path.join(process.env.APPDATA,'sv-browser','SVBrowserData','drivers','ChromiumCore_v157','Chrome-bin','chrome.exe');
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sv-profile-settings-'));const reports=[];const requests=[];
 const script=`(async()=>{const canvas=document.createElement('canvas');canvas.width=4;canvas.height=4;const ctx=canvas.getContext('2d');ctx.fillStyle='rgb(10,20,30)';ctx.fillRect(0,0,4,4);const audio=new AudioBuffer({length:32,sampleRate:44100});const rect=document.body.getBoundingClientRect();const report={marker:globalThis.__svProfileConfigured,ownMemory:Object.getOwnPropertyDescriptor(navigator,'deviceMemory')?.get?.toString(),protoMemory:Object.getOwnPropertyDescriptor(Navigator.prototype,'deviceMemory')?.get?.toString(),ua:navigator.userAgent,cpu:navigator.hardwareConcurrency,ram:navigator.deviceMemory,lang:navigator.language,languages:navigator.languages,tz:Intl.DateTimeFormat().resolvedOptions().timeZone,screen:[screen.width,screen.height],cookie:document.cookie,pixel:[...ctx.getImageData(0,0,1,1).data],canvasStable:canvas.toDataURL()===canvas.toDataURL(),audio:[...audio.getChannelData(0)],rectX:rect.x,geo:(await navigator.permissions.query({name:'geolocation'})).state,devices:(await navigator.mediaDevices.enumerateDevices()).map(d=>d.kind)};try{new RTCPeerConnection();report.rtc='enabled'}catch{report.rtc='disabled'};const gl=document.createElement('canvas').getContext('webgl');if(gl){gl.getExtension('WEBGL_debug_renderer_info');gl.clearColor(.1,.2,.3,1);gl.clear(gl.COLOR_BUFFER_BIT);const p=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);report.gl={vendor:gl.getParameter(37445),renderer:gl.getParameter(37446),pixel:[...p]};}else report.gl=null;if(report.geo==='granted')report.position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve([p.coords.latitude,p.coords.longitude]),reject));report.fontCheck=document.fonts.check('12px SV_UNIQUE_MISSING_FONT');report.localFontPermission=(await navigator.permissions.query({name:'local-fonts'})).state;report.platform=navigator.platform;report.hints=navigator.userAgentData?.platform;await fetch('/collect',{method:'POST',body:JSON.stringify(report)});})().catch(e=>fetch('/collect',{method:'POST',body:JSON.stringify({error:e.message})}));`;
 const server=http.createServer((req,res)=>{if(req.url==='/collect'){let text='';req.on('data',d=>text+=d);req.on('end',()=>{reports.push(JSON.parse(text));res.end('ok')});}else{requests.push({...req.headers,_path:req.url});res.setHeader('Content-Type','text/html');res.end('<html><body style="margin:0"><script>'+script+'</script></body></html>');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let globalSettings={canvasMode:'real',clientRectMode:'real',webglImageMode:'real',webglMetaMode:'real',audioMode:'real',fontMode:'real',screenMode:'real',languageMode:'real'};
 const launcher=new BrowserLauncher(root);launcher.setProfileStore({getSettings:()=>globalSettings});launcher.getExecutable=()=>({path:exe,type:'chrome',version:'157.0.0.0'});
 try{
  const busy=await launcher.launchProfile({id:'busy-port',browserType:'chrome',headless:true},0,{remote_debugging_port:server.address().port});assert.equal(busy.success,false);assert.match(busy.message,/cổng điều khiển/);
  const profile={id:'custom-settings',browserType:'chrome',headless:true,startUrl:`http://127.0.0.1:${server.address().port}/`,software:{userAgent:'SV Test/1.0 Edg/999.1',language:'ja-JP,ja',timezone:'Asia/Tokyo',screen:'1366x768',webrtc:'Disable',geo:'Block'},hardware:{cpu:'4',ram:'16GB',canvas:'Noise',clientrect:'Noise',webglImg:'Noise',webglMeta:'Masked',audio:'Noise',font:'Masked',videoIn:'0',audioInOut:'2'},cookies:JSON.stringify([{name:'session',value:'fixture',domain:'127.0.0.1',path:'/',httpOnly:true},{name:'visible',value:'yes',domain:'127.0.0.1',path:'/'}])};
  const result=await launcher.launchProfile(profile,1);assert.equal(result.success,true,result.message);
  for(let i=0;i<100&&!reports.length;i++)await new Promise(r=>setTimeout(r,100));
  const report=reports[0];assert.ok(report,'Browser report missing');assert.ok(!report.error,report.error);
  console.log(JSON.stringify(report));
  assert.equal(report.ua,profile.software.userAgent);assert.equal(requests[0]['user-agent'],profile.software.userAgent);assert.match(requests[0].cookie,/session=fixture/);
  assert.equal(report.cookie,'visible=yes');assert.equal(report.cpu,4);assert.equal(report.ram,16);assert.equal(report.lang,'ja-JP');assert.equal(report.tz,'Asia/Tokyo');assert.deepEqual(report.screen,[1366,768]);assert.equal(report.geo,'denied');assert.equal(report.rtc,'disabled');assert.notEqual(report.pixel[0],10);assert.equal(report.canvasStable,true);assert.ok(report.audio.some(n=>n!==0));assert.notEqual(report.rectX,0);assert.equal(report.devices.filter(k=>k==='videoinput').length,0);assert.equal(report.devices.filter(k=>k==='audioinput').length,2);
  const initialUA=await launcher.getRunningInfo(profile.id).runtime.cdp.send('Browser.getVersion');
  const runtime=launcher.getRunningInfo(profile.id).runtime;
  const target=(await runtime.cdp.send('Target.getTargets')).targetInfos.find(t=>t.type==='page');
  const session=await runtime.cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
  const viewport=await runtime.cdp.send('Runtime.evaluate',{expression:'innerWidth',returnByValue:true},session.sessionId);
  assert.notEqual(viewport.result.value,1366,'Screen spoofing must not force the page viewport to the fake screen width');
  await runtime.cdp.send('Target.detachFromTarget',{sessionId:session.sessionId});
  const auto={...profile,id:'auto-settings',cookies:'',hardware:{canvas:'Off',clientrect:'Off',audio:'Off'},software:{userAgent:'Auto',language:'en-US,en',geo:'Prompt',webrtc:'Real'}};
  const second=await launcher.launchProfile(auto,2);assert.equal(second.success,true,second.message);
  for(let i=0;i<100&&reports.length<2;i++)await new Promise(r=>setTimeout(r,100));
  const baseline=reports[1];assert.equal(baseline.ua,launcher.getRunningInfo(auto.id).runtime.ua);assert.match(baseline.ua,/HeadlessChrome\/157/);assert.equal(baseline.pixel[0],10);assert.equal(baseline.rectX,0);assert.ok(baseline.audio.every(n=>n===0));assert.equal(baseline.rtc,'enabled');assert.equal(baseline.cookie,'');
  if(report.gl&&baseline.gl){assert.equal(report.gl.vendor,'Google Inc.');assert.notDeepEqual(report.gl.pixel,baseline.gl.pixel);}
  const android={...auto,id:'android-auto',startUrl:profile.startUrl+'?profile=android',software:{userAgent:'Auto',os:'Android',language:'en-US,en',timezone:'Auto',geo:'Allow',webrtc:'Real'},cookies:'#HttpOnly_127.0.0.1\tFALSE\t/\tFALSE\t0\tnetscape\tfixture'};
  const third=await launcher.launchProfile(android,3,{detectedIp:'203.0.113.1',detectedTimezone:'Europe/London',detectedGeo:{latitude:35,longitude:139}});assert.equal(third.success,true,third.message);
  for(let i=0;i<100&&reports.length<3;i++)await new Promise(r=>setTimeout(r,100));
  const mobile=reports[2];assert.ok(!mobile.error,mobile.error);assert.match(mobile.ua,/Android 14/);assert.equal(mobile.platform,'Linux armv8l');assert.equal(mobile.hints,'Android');assert.equal(mobile.tz,'Europe/London');assert.equal(mobile.geo,'granted');assert.deepEqual(mobile.position,[35,139]);assert.match(requests.find(r=>r._path.includes('profile=android')).cookie,/netscape=fixture/);assert.equal(mobile.cookie,'');
  const blocked={...auto,id:'canvas-block',hardware:{canvas:'Block'}};const fourth=await launcher.launchProfile(blocked,4);assert.equal(fourth.success,true,fourth.message);
  for(let i=0;i<100&&reports.length<4;i++)await new Promise(r=>setTimeout(r,100));assert.match(reports[3].error,/blocked/);
  assert.equal(report.fontCheck,false);assert.equal(report.localFontPermission,'denied');
  const customGPU={...auto,id:'custom-gpu',hardware:{webglMeta:'Custom',webglVendor:'Fixture Vendor',webglRenderer:'Fixture Renderer'}};
  const fifth=await launcher.launchProfile(customGPU,5);assert.equal(fifth.success,true,fifth.message);
  for(let i=0;i<100&&reports.length<5;i++)await new Promise(r=>setTimeout(r,100));assert.equal(reports[4].gl.vendor,'Fixture Vendor');assert.equal(reports[4].gl.renderer,'Fixture Renderer');
  launcher.closeAllProfiles();await new Promise(r=>setTimeout(r,1000));
  const real={id:'global-real',browserType:'chrome',headless:true,startUrl:profile.startUrl};
  const sixth=await launcher.launchProfile(real,6,{detectedLang:'ja-JP,ja'});assert.equal(sixth.success,true,sixth.message);
  for(let i=0;i<100&&reports.length<6;i++)await new Promise(r=>setTimeout(r,100));
  assert.equal(reports[5].pixel[0],10);assert.equal(reports[5].rectX,0);assert.ok(reports[5].audio.every(n=>n===0));assert.notEqual(reports[5].lang,'ja-JP');
  globalSettings={canvasMode:'noise',clientRectMode:'noise',webglImageMode:'noise',webglMetaMode:'masked',audioMode:'noise',fontMode:'masked',screenMode:'random',languageMode:'ip'};
  const random={...real,id:'global-random'};const seventh=await launcher.launchProfile(random,7,{detectedLang:'ko-KR,ko'});assert.equal(seventh.success,true,seventh.message);
  for(let i=0;i<100&&reports.length<7;i++)await new Promise(r=>setTimeout(r,100));const expected=require('../profileConfig').browserDefaults(globalSettings,random.id).software.screen.split('x').map(Number);
  assert.deepEqual(reports[6].screen,expected);assert.equal(reports[6].lang,'ko-KR');assert.notEqual(reports[6].pixel[0],10);
  globalSettings.canvasMode='block';const globalBlock={...real,id:'global-block'};const eighth=await launcher.launchProfile(globalBlock,8);assert.equal(eighth.success,true,eighth.message);
  for(let i=0;i<100&&reports.length<8;i++)await new Promise(r=>setTimeout(r,100));assert.match(reports[7].error,/blocked/);
  const empty={id:'empty-start-url',browserType:'chrome',headless:true,startUrl:'',software:{timezone:'Asia/Bangkok'}};
  const ninth=await launcher.launchProfile(empty,9);assert.equal(ninth.success,true,ninth.message);
  let tabs=[];for(let i=0;i<50;i++){const targets=await launcher.getRunningInfo(empty.id).runtime.cdp.send('Target.getTargets');tabs=targets.targetInfos.filter(t=>t.type==='page');if(tabs.some(t=>/^chrome:\/\/(newtab|new-tab-page)\//.test(t.url)))break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(tabs.length,1);assert.match(tabs[0].url,/^chrome:\/\/(newtab|new-tab-page)\//);assert.ok(!tabs.some(t=>t.url==='about:blank'));
  console.log('PASS: first request cookies/UA, custom UA exact, Auto native UA, hardware/software observed, Off native, profiles isolated, Android UA/hints, Auto IP timezone, Allow geolocation, Netscape HttpOnly, Canvas Block, empty startup opens New Tab');
 }finally{launcher.closeAllProfiles();await new Promise(r=>setTimeout(r,1200));server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
