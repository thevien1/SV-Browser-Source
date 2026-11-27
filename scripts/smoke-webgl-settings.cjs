const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const BrowserLauncher=require('../browserLauncher');
const exe=process.env.SV_CHROME_TEST_EXE||path.join(process.env.APPDATA||'','sv-browser','SVBrowserData','drivers','ChromiumCore_v157','Chrome-bin','chrome.exe');
const probe=async()=>{
 const encode=canvas=>new Promise((resolve,reject)=>{try{canvas.toBlob(async blob=>blob?resolve([...new Uint8Array(await blob.arrayBuffer())].join(',')):reject(Error('Missing blob')));}catch(error){reject(error);}});
 const inspect=async win=>{
  const result={};
  for(const name of ['webgl','webgl2']){
   const canvas=win.document.createElement('canvas');canvas.width=32;canvas.height=32;
   const gl=canvas.getContext(name,{preserveDrawingBuffer:true});if(!gl)throw Error(name+' unavailable');
   gl.clearColor(.2,.4,.6,1);gl.clear(gl.COLOR_BUFFER_BIT);
   const pixels=new win.Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   const image=canvas.toDataURL();result[name]={pixels:[...pixels],image,stable:image===canvas.toDataURL(),blob:await encode(canvas)};
   const offscreen=new win.OffscreenCanvas(32,32),offgl=offscreen.getContext(name);if(!offgl)throw Error('Offscreen '+name+' unavailable');
   offgl.clearColor(.2,.4,.6,1);offgl.clear(offgl.COLOR_BUFFER_BIT);const offpixels=new win.Uint8Array(4);offgl.readPixels(0,0,1,1,offgl.RGBA,offgl.UNSIGNED_BYTE,offpixels);result[name].offscreenPixels=[...offpixels];
   gl.getExtension('WEBGL_debug_renderer_info');result[name].vendor=gl.getParameter(37445);
  }
  const canvas=win.document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='rgb(51,102,153)';ctx.fillRect(0,0,32,32);
  try{result.canvas={image:canvas.toDataURL(),blob:await encode(canvas),pixels:[...ctx.getImageData(0,0,1,1).data]};}catch(error){result.canvas={error:error.name};}
  return result;
 };
 const main=await inspect(window);
 const iframe=document.createElement('iframe');iframe.srcdoc='<!doctype html><body>Fixture iframe';await new Promise(resolve=>{iframe.onload=resolve;document.body.append(iframe);});
 const frame=await inspect(iframe.contentWindow);
 await fetch('/result',{method:'POST',body:JSON.stringify({main,frame})});
};
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sv-webgl-settings-'));let report;
 const server=http.createServer((req,res)=>{if(req.url==='/result'){let body='';req.on('data',data=>body+=data);req.on('end',()=>{report=JSON.parse(body);res.end('OK');});return;}res.setHeader('Content-Type','text/html');res.end('<!doctype html><body><script>('+probe.toString()+')().catch(error=>fetch("/result",{method:"POST",body:JSON.stringify({error:error.message})}));</script>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const launcher=new BrowserLauncher(root);launcher.getExecutable=()=>({path:exe,type:'chrome',version:'157'});const reports={};
 try{
  for(const canvas of ['Off','Noise','Block'])for(const webgl of ['Off','Noise']){
   const id=canvas+'-'+webgl;report=undefined;
   const result=await launcher.launchProfile({id,browserType:'chrome',headless:true,startUrl:`http://127.0.0.1:${server.address().port}/`,hardware:{canvas,webglImg:webgl,webglMeta:'Off'},software:{userAgent:'Auto',language:'Real',timezone:'Asia/Bangkok'}},1,process.platform==='darwin'?{addition_args:'--use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader'}:{});
   assert.equal(result.success,true,result.message);
   for(let n=0;n<100&&!report;n++)await new Promise(resolve=>setTimeout(resolve,100));
   assert.ok(report,'Missing report '+id);assert.ok(!report.error,report.error);reports[id]=report;
   for(const realm of ['main','frame'])for(const type of ['webgl','webgl2']){
    const actual=report[realm][type],baseline=reports['Off-Off'][realm][type];assert.equal(actual.stable,true,id+' unstable PNG');
    if(webgl==='Off')for(const key of ['pixels','image','blob','offscreenPixels'])assert.deepEqual(actual[key],baseline[key],`${id} ${realm} ${type} ${key} changed despite WebGL Off`);
    else for(const key of ['pixels','image','blob','offscreenPixels'])assert.notDeepEqual(actual[key],baseline[key],`${id} ${realm} ${type} ${key} did not change with Noise`);
    assert.equal(actual.vendor,baseline.vendor,'Image noise must not change GPU metadata');
   }
   for(const realm of ['main','frame']){
    const actual=report[realm].canvas,baseline=reports['Off-Off'][realm].canvas;
    if(canvas==='Off')assert.deepEqual(actual,baseline,'WebGL mode affected 2D Canvas Off');
    else if(canvas==='Noise'){assert.notEqual(actual.image,baseline.image);assert.notDeepEqual(actual.pixels,baseline.pixels);}
    else assert.equal(actual.error,'SecurityError');
   }
   launcher.closeProfile(id);console.log('PASS '+id+': main/iframe, WebGL1/2, PNG/blob/readPixels/Offscreen, 2D isolation');
  }
 }finally{launcher.closeAllProfiles();await new Promise(resolve=>setTimeout(resolve,1200));server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
