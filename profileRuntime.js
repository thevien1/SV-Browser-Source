const {parseCookies,userAgent,autoUserAgent,softwareOS}=require('./profileConfig');
const fs=require('fs'),path=require('path');
const resourceSource=path.join(process.resourcesPath||__dirname,'assets','profile-hardware.js');
const hardwareSource=fs.readFileSync(fs.existsSync(resourceSource)?resourceSource:path.join(__dirname,'assets','profile-hardware.js'),'utf8');
const crypto=require('crypto');
class CDP {
 constructor(ws){this.ws=ws;this.next=0;this.pending=new Map();this.listeners=new Set();ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const p=this.pending.get(message.id);if(!p)return;this.pending.delete(message.id);clearTimeout(p.timer);message.error?p.reject(Error(message.error.message)):p.resolve(message.result);}else for(const listener of this.listeners)listener(message);});ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Browser CDP closed'));}this.pending.clear();});}
 static async connect(url){const ws=new WebSocket(url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.close();reject(Error('CDP connect timeout'));},10000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('CDP connect failed'));},{once:true});});return new CDP(ws);}
 send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++this.next;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error(`CDP timeout: ${method}`));},10000);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
 close(){this.ws.close();}
}
async function evaluateWhenReady(cdp,params,sessionId,{timeout=5000,delay=50}={}){
 const until=Date.now()+timeout;
 for(;;){
  try{return await cdp.send('Runtime.evaluate',{timeout:3000,...params},sessionId);}catch(error){
   if(!/Cannot find default execution context|Execution context was destroyed|Cannot find context with specified id/i.test(error.message)||Date.now()>=until)throw error;
   await new Promise(resolve=>setTimeout(resolve,delay));
  }
 }
}
function fitWindowBounds(bounds,width,height){
 if(bounds.windowState==='minimized')return null;
 const w=Math.min(bounds.width||width,width),h=Math.min(bounds.height||height,height);
 if(bounds.windowState==='normal'&&w===bounds.width&&h===bounds.height)return null;
 return {width:w,height:h};
}
async function limitWindowsToScreen(cdp,targetIds,width,height){
 const windows=new Set();let stopped=false,busy=false,timer;
 const fit=async windowId=>{
  const {bounds}=await cdp.send('Browser.getWindowBounds',{windowId});
  const next=fitWindowBounds(bounds,width,height);if(!next)return;
  if(bounds.windowState!=='normal')await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});
  await cdp.send('Browser.setWindowBounds',{windowId,bounds:next});
  const actual=await cdp.send('Browser.getWindowBounds',{windowId});
  if(actual.bounds.width>width||actual.bounds.height>height)throw Error('Engine/OS không hỗ trợ cửa sổ nhỏ theo Screen đã chọn; chọn Screen lớn hơn hoặc tắt giới hạn kích thước');
 };
 const add=async targetId=>{if(stopped)return;const {windowId}=await cdp.send('Browser.getWindowForTarget',{targetId});windows.add(windowId);await fit(windowId);};
 const stop=()=>{stopped=true;clearInterval(timer);windows.clear();};
 try{for(const targetId of targetIds)await add(targetId);}catch(error){stop();throw error;}
 cdp.ws.addEventListener('close',stop,{once:true});
 timer=setInterval(async()=>{if(stopped||busy)return;busy=true;try{for(const windowId of windows){try{await fit(windowId);}catch{windows.delete(windowId);}}}finally{busy=false;}},1000);
 timer.unref?.();
 return {add,stop};
}
async function configureChromium(url, profile, options={}){
 const cdp=await CDP.connect(url);
 try {
 const sw={...profile.software},hw=profile.hardware||{};
 if(sw.os)sw.os=softwareOS(sw.os);
 const macArm=/^mac \(arm\)$/i.test(sw.os||'');
 if (/^mac(?:os| \((?:intel|arm)\))?$/i.test(sw.os||'')) sw.os='Mac';
 const browser=await cdp.send('Browser.getVersion');
 let ua=userAgent(profile)||browser.userAgent;
 const detectedLanguage=options.detectedLang||(options.detectedCountry?require('./proxyChecker').getLangFromCountry(options.detectedCountry):undefined);
 const language=sw.language==='Real'?undefined:sw.language&&sw.language!=='Auto'?sw.language:detectedLanguage;
 let timezone=sw.timezone&&sw.timezone!=='Auto'?sw.timezone:options.detectedTimezone;
 let geo=options.detectedGeo;
 if ((sw.timezone==='Auto'&&!timezone)||(sw.geo==='Allow'&&!geo)) {
  const ip=options.detectedIp||profile.ip;
  if(ip&&ip!=='127.0.0.1') {const found=await require('./proxyChecker').queryHostGeo(ip);timezone=timezone||found.timezone;geo=geo||found.geo;}
  if(sw.timezone==='Auto'&&!timezone)throw Error('Chưa xác định được timezone theo IP. Hãy chọn múi giờ cụ thể hoặc kiểm tra lại kết nối.');
  if(sw.geo==='Allow'&&!geo)throw Error('Chưa xác định được vị trí theo IP. Hãy dùng Prompt hoặc Block.');
 }
 const platform=({Windows:'Win32',Mac:'MacIntel',Linux:'Linux x86_64',Android:'Linux armv8l'}[sw.os]) || (userAgent(profile)?(/Android/i.test(ua)?'Linux armv8l':/Macintosh/i.test(ua)?'MacIntel':/Windows/i.test(ua)?'Win32':/Linux/i.test(ua)?'Linux x86_64':undefined):undefined);
 const seed=crypto.createHash('sha256').update(String(profile.id)).digest().readUInt32LE(0);
 const script=`(${hardwareSource})(${JSON.stringify({hardware:hw,seed,platform,language,webrtc:sw.webrtc})});`;
 const cookies=parseCookies(profile.cookies);if(cookies.length)await cdp.send('Storage.setCookies',{cookies});
 if(['Allow','Block','Prompt'].includes(sw.geo))await cdp.send('Browser.setPermission',{permission:{name:'geolocation'},setting:{Allow:'granted',Block:'denied',Prompt:'prompt'}[sw.geo]});
 if(hw.font==='Masked')await cdp.send('Browser.setPermission',{permission:{name:'local-fonts'},setting:'denied'});
 const sessions=new Map(),localeOwners=new Set();let failure,nativeUA,nativeMetadata,windowLimiter;
 const setup=async(sessionId,targetInfo)=>{
  const page=['page','iframe'].includes(targetInfo.type);
  let localeConflict;
  try{
   if (!page) {
    // New Chromium versions expose an intermediate tab target. Its page must
    // also be auto-attached before the tab is allowed to start running.
    if(targetInfo.type==='tab')await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true},sessionId);
    return;
   }
   if(targetInfo.type==='page'&&windowLimiter)await windowLimiter.add(targetInfo.targetId);
   await cdp.send('Page.enable',{},sessionId);
   await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:script,runImmediately:true},sessionId);
   await cdp.send('Runtime.enable',{},sessionId);
   // A newly attached page may be paused before it has a default JS context.
   // Register document-start protection before allowing that context to start.
   let native;
   if(!nativeUA){
    await cdp.send('Runtime.runIfWaitingForDebugger',{},sessionId);
    native=await evaluateWhenReady(cdp,{expression:'navigator.userAgent',returnByValue:true},sessionId);
    nativeUA=native.result.value;
   }else native={result:{value:nativeUA}};
   ua=userAgent(profile)||autoUserAgent(native.result.value,sw.os);
   if(userAgent(profile)||ua!==native.result.value||sw.os){
    let userAgentMetadata;
    if(!userAgent(profile)) {
      // Use synchronous UA data. Waiting for a high-entropy Promise can hang on
      // a target that is paused or changing documents during browser startup.
      if(nativeMetadata===undefined){const data=await evaluateWhenReady(cdp,{expression:'navigator.userAgentData?.toJSON()',returnByValue:true},sessionId);nativeMetadata=data.result.value||null;}
      const version=ua.match(/(?:HeadlessChrome|Chrome)\/([\d.]+)/)?.[1] || '1.0.0.0';
      userAgentMetadata={...nativeMetadata,brands:nativeMetadata?.brands||[{brand:'Chromium',version:version.split('.')[0]}],fullVersionList:[{brand:'Chromium',version}],bitness:'64',platform:({Mac:'macOS',Windows:'Windows',Linux:'Linux',Android:'Android'}[sw.os]),platformVersion:({Mac:'10.15.7',Windows:'10.0.0',Linux:'6.0.0',Android:'14.0.0'}[sw.os]),mobile:sw.os==='Android',model:sw.os==='Android'?'Pixel 8':'',architecture:sw.os==='Android'||macArm?'arm':'x86'};
    }
    await cdp.send('Emulation.setUserAgentOverride',{userAgent:ua,...(language?{acceptLanguage:language}:{}),...(platform?{platform}: {}),...(userAgentMetadata?{userAgentMetadata}:{})},sessionId);
   }
   if(language){
    const locale=language.split(',')[0].split(';')[0].trim();
    try{await cdp.send('Emulation.setLocaleOverride',{locale},sessionId);localeOwners.add(sessionId);}catch(error){
     // New Tab can attach multiple targets in the same renderer, which shares its locale override.
     if(!/Another locale override is already in effect/.test(error.message))throw error;
     // New Tab and a new page can share a renderer. Release the previous
     // session's locale ownership before applying the same profile locale.
     for(const owner of localeOwners){try{await cdp.send('Emulation.setLocaleOverride',{locale:''},owner);}catch{}}
     localeOwners.clear();
     await cdp.send('Emulation.setLocaleOverride',{locale},sessionId);localeOwners.add(sessionId);
    }
    await cdp.send('Network.enable',{},sessionId);await cdp.send('Network.setExtraHTTPHeaders',{headers:{'Accept-Language':language}},sessionId);
   }
   if(page){
    if(geo&&sw.geo==='Allow')await cdp.send('Emulation.setGeolocationOverride',{latitude:geo.latitude,longitude:geo.longitude,accuracy:100},sessionId);
    if(timezone)await cdp.send('Emulation.setTimezoneOverride',{timezoneId:timezone},sessionId);
    if(Number(hw.cpu)>0)await cdp.send('Emulation.setHardwareConcurrencyOverride',{hardwareConcurrency:Number(hw.cpu)},sessionId);
    const screen=String(sw.screen||'').match(/^(\d+)x(\d+)$/);if(screen)await cdp.send('Emulation.setDeviceMetricsOverride',{width:0,height:0,screenWidth:+screen[1],screenHeight:+screen[2],deviceScaleFactor:1,mobile:sw.os==='Android'},sessionId);
    await cdp.send('Runtime.runIfWaitingForDebugger',{},sessionId);
    if(localeConflict){
     const current=await evaluateWhenReady(cdp,{expression:'Intl.DateTimeFormat().resolvedOptions().locale',returnByValue:true},sessionId);
     if(Intl.getCanonicalLocales(current.result.value)[0]!==Intl.getCanonicalLocales(language.split(',')[0].split(';')[0].trim())[0])throw localeConflict;
    }
    const applied=await evaluateWhenReady(cdp,{expression:script},sessionId);
    if(applied.exceptionDetails)throw Error(applied.exceptionDetails.exception?.description || applied.exceptionDetails.text);
    await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true},sessionId);
   }
  }catch(error){failure=error;console.warn("Profile target configuration failed:",targetInfo.type,targetInfo.url,error.message);}
  finally{try{await cdp.send('Runtime.runIfWaitingForDebugger',{},sessionId);}catch{}}
 };
 cdp.listeners.add(message=>{
  if(message.method==='Target.attachedToTarget'){
   const {sessionId,targetInfo}=message.params;
   const task=setup(sessionId,targetInfo);sessions.set(targetInfo.targetId,{sessionId,targetInfo,task});
  }
 });
 await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true,filter:[{type:'tab'},{type:'page'},{type:'iframe'},{exclude:true}]});
 await cdp.send('Target.getTargets');
 for(let i=0;i<40&&!Array.from(sessions.values()).some(s=>s.targetInfo.type==='page');i++)await new Promise(r=>setTimeout(r,50));
 await Promise.all(Array.from(sessions.values()).map(s=>s.task));if(failure){cdp.close();throw failure;}
 const pages=Array.from(sessions.values()).filter(s=>s.targetInfo.type==='page');
 if(!pages.length){cdp.close();throw Error('Không tìm thấy trang để áp dụng cấu hình profile');}
 const actualUA=await evaluateWhenReady(cdp,{expression:'navigator.userAgent',returnByValue:true},pages[0].sessionId);
 const screen=String(sw.screen||'').match(/^(\d+)x(\d+)$/);
 if(screen&&options.limitBrowserSize!==false)windowLimiter=await limitWindowsToScreen(cdp,pages.map(page=>page.targetInfo.targetId),+screen[1],+screen[2]);
 const configuredUrls=profile.startUrl?.trim()? [profile.startUrl.trim()] : (options.startupUrls||[]);
 // Keep the blank bootstrap private to setup; an empty startup URL opens the browser's New Tab.
 const urls=configuredUrls.length?configuredUrls:['chrome://newtab/'];
 for(let i=0;i<urls.length;i++){
  if(i===0)await cdp.send('Page.navigate',{url:urls[i]},pages[0].sessionId);
  else await cdp.send('Target.createTarget',{url:urls[i]});
 }
 return {cdp,ua:actualUA.result.value,timezone,settingsApplied:true};
 } catch(error){cdp.close();throw error;}
}
module.exports={CDP,configureChromium,evaluateWhenReady,fitWindowBounds,limitWindowsToScreen};
