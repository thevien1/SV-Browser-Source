const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),net=require('node:net'),cp=require('node:child_process');
const {configureGecko}=require('../geckoRuntime');
const {geckoSoftwarePreferences}=require('../profileConfig');
const exe=process.env.SV_MULLVAD_TEST_EXE||new(require('../browserLauncher'))(os.tmpdir()).getExecutable('mullvad','default').path;
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sv-gecko-settings-'));let report,headers,runtime,child;
 const probe=`(async()=>{
 const result={cpu:navigator.hardwareConcurrency,ram:navigator.deviceMemory,ua:navigator.userAgent,platform:navigator.platform,lang:navigator.language,tz:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date('2026-06-01T12:00:00Z').getTimezoneOffset(),hours:new Date('2026-06-01T12:00:00Z').getHours(),screen:[screen.width,screen.height],font:document.fonts.check('12px SV_UNIQUE_MISSING_FONT')};
 const devices=await navigator.mediaDevices.enumerateDevices();result.devices=devices.map(d=>d.kind);
 result.geo=await new Promise(resolve=>navigator.geolocation.getCurrentPosition(p=>resolve([p.coords.latitude,p.coords.longitude]),e=>resolve(e.code)));
 const frame=document.createElement('iframe');frame.srcdoc='<!doctype html><body>Frame';await new Promise(resolve=>{frame.onload=resolve;document.body.append(frame);});result.frame={cpu:frame.contentWindow.navigator.hardwareConcurrency,tz:new frame.contentWindow.Intl.DateTimeFormat().resolvedOptions().timeZone,screen:[frame.contentWindow.screen.width,frame.contentWindow.screen.height]};
 const audio=new AudioBuffer({length:32,sampleRate:44100});result.audio=[...audio.getChannelData(0)];
 const canvas=document.createElement('canvas');canvas.width=4;canvas.height=4;const ctx=canvas.getContext('2d');ctx.fillStyle='rgb(10,20,30)';ctx.fillRect(0,0,4,4);try{result.canvas=canvas.toDataURL();}catch(e){result.canvasError=e.name;}
 const gl=document.createElement('canvas').getContext('webgl');if(gl){const info=gl.getExtension('WEBGL_debug_renderer_info');result.vendor=info&&gl.getParameter(info.UNMASKED_VENDOR_WEBGL);}
 await fetch('/collect',{method:'POST',body:JSON.stringify(result)});
 })().catch(e=>fetch('/collect',{method:'POST',body:JSON.stringify({error:e.stack})}));`;
 const server=http.createServer((req,res)=>{if(req.url==='/collect'){let body='';req.on('data',d=>body+=d);req.on('end',()=>{report=JSON.parse(body);res.end('ok');});}else{headers=req.headers;res.setHeader('content-type','text/html');res.end('<!doctype html><body><script>'+probe+'</script>');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  for(const mode of ['Block','Allow']){
   report=undefined;const dir=path.join(root,mode);fs.mkdirSync(dir);
   const profile={id:'gecko-'+mode,browserType:'mullvad',startUrl:`http://127.0.0.1:${server.address().port}/`,software:{userAgent:'Mac Gecko Fixture/1.0',os:'Mac (ARM)',timezone:'Asia/Tokyo',language:'ja-JP,ja',screen:'1440x900',geo:mode,webrtc:'Disable'},hardware:{cpu:'4',ram:'16GB',canvas:mode==='Block'?'Block':'Noise',clientrect:'Noise',webglImg:'Noise',webglMeta:'Custom',webglVendor:'Fixture Vendor',webglRenderer:'Fixture Renderer',audio:'Noise',font:'Masked',videoIn:'0',audioInOut:'2'}};
   fs.writeFileSync(path.join(dir,'user.js'),geckoSoftwarePreferences(profile,'darwin').prefs.concat('user_pref("remote.prefs.recommended", false);').join('\n'));
   const portServer=net.createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const port=portServer.address().port;await new Promise(r=>portServer.close(r));
   child=cp.spawn(exe,['-headless','-no-remote','-profile',dir,'--remote-debugging-port',String(port),'about:blank'],{stdio:'ignore',windowsHide:true,detached:true});
   runtime=await configureGecko(port,profile,{detectedGeo:{latitude:35,longitude:139}});
   for(let n=0;n<100&&!report;n++)await new Promise(r=>setTimeout(r,100));
   assert.ok(report,'Gecko report missing');assert.ok(!report.error,report.error);
   assert.equal(report.cpu,4);assert.equal(report.ram,16);assert.equal(report.ua,profile.software.userAgent);assert.equal(headers['user-agent'],profile.software.userAgent);assert.equal(headers['accept-language'],'ja-JP,ja');assert.equal(report.platform,'MacIntel');assert.equal(report.lang,'ja-JP');assert.equal(report.tz,'Asia/Tokyo');assert.equal(report.offset,-540);assert.equal(report.hours,21);assert.deepEqual(report.screen,[1440,900]);assert.deepEqual(report.frame,{cpu:4,tz:'Asia/Tokyo',screen:[1440,900]});assert.equal(report.devices.filter(d=>d==='videoinput').length,0);assert.equal(report.devices.filter(d=>d==='audioinput').length,2);assert.equal(report.devices.filter(d=>d==='audiooutput').length,2);assert.ok(report.audio.some(n=>n!==0));assert.equal(report.font,false);
   if(mode==='Block'){assert.equal(report.geo,1);assert.equal(report.canvasError,'SecurityError');}else{assert.deepEqual(report.geo,[35,139]);assert.ok(report.canvas?.startsWith('data:image/png'));}
   if(report.vendor!==undefined)assert.equal(report.vendor,'Fixture Vendor');
   console.log('PASS Gecko '+mode+': hardware, iframe, UA/HTTP headers, language, timezone/DST offset, screen, geolocation, canvas/audio/font and devices');
   runtime.bidi.close();runtime=null;
   if(process.platform==='win32')cp.execFileSync('taskkill',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore',windowsHide:true});else process.kill(-child.pid,'SIGTERM');child=null;
   await new Promise(r=>setTimeout(r,1000));
  }
 }finally{
  runtime?.bidi.close();if(child?.pid){try{if(process.platform==='win32')cp.execFileSync('taskkill',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore',windowsHide:true});else process.kill(-child.pid,'SIGTERM');}catch{}}
  server.closeAllConnections();await new Promise(r=>server.close(r));for(let n=0;n<30;n++){try{fs.rmSync(root,{recursive:true,force:true});break;}catch(e){if(n===29)throw e;await new Promise(r=>setTimeout(r,200));}}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
