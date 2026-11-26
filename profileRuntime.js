const {parseCookies,userAgent,autoUserAgent}=require('./profileConfig');
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
async function configureChromium(url, profile, options={}){
 const cdp=await CDP.connect(url);
 try {
 const sw=profile.software||{},hw=profile.hardware||{};
 const browser=await cdp.send('Browser.getVersion');
 let ua=userAgent(profile)||browser.userAgent;
 const language=sw.language==='Real'?undefined:sw.language&&sw.language!=='Auto'?sw.language:options.detectedLang;
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
 const sessions=new Map();let failure;
 const setup=async(sessionId,targetInfo)=>{
  const page=['page','iframe'].includes(targetInfo.type);
  try{
   if (!page) return;
   const native=await cdp.send('Runtime.evaluate',{expression:'navigator.userAgent',returnByValue:true},sessionId);
   ua=userAgent(profile)||autoUserAgent(native.result.value,sw.os);
   if(userAgent(profile)||ua!==native.result.value){
    let userAgentMetadata;
    if(!userAgent(profile)) {
      const data=await cdp.send('Runtime.evaluate',{expression:"navigator.userAgentData?.getHighEntropyValues(['architecture','bitness','fullVersionList','platformVersion','model','wow64'])",awaitPromise:true,returnByValue:true},sessionId);
      const version=ua.match(/(?:HeadlessChrome|Chrome)\/([\d.]+)/)?.[1] || '1.0.0.0';
      userAgentMetadata={...(data.result.value||{brands:[{brand:'Chromium',version:version.split('.')[0]}],fullVersionList:[{brand:'Chromium',version}],bitness:'64'}),platform:({Mac:'macOS',Windows:'Windows',Linux:'Linux',Android:'Android'}[sw.os]),platformVersion:({Mac:'10.15.7',Windows:'10.0.0',Linux:'6.0.0',Android:'14.0.0'}[sw.os]),mobile:sw.os==='Android',model:sw.os==='Android'?'Pixel 8':'',architecture:sw.os==='Android'?'arm':'x86'};
    }
    await cdp.send('Emulation.setUserAgentOverride',{userAgent:ua,...(language?{acceptLanguage:language}:{}),...(platform?{platform}: {}),...(userAgentMetadata?{userAgentMetadata}:{})},sessionId);
   }
   if(language){await cdp.send('Emulation.setLocaleOverride',{locale:language.split(',')[0]},sessionId);await cdp.send('Network.enable',{},sessionId);await cdp.send('Network.setExtraHTTPHeaders',{headers:{'Accept-Language':language}},sessionId);}
   if(page){
    if(geo&&sw.geo==='Allow')await cdp.send('Emulation.setGeolocationOverride',{latitude:geo.latitude,longitude:geo.longitude,accuracy:100},sessionId);
    if(timezone)await cdp.send('Emulation.setTimezoneOverride',{timezoneId:timezone},sessionId);
    if(Number(hw.cpu)>0)await cdp.send('Emulation.setHardwareConcurrencyOverride',{hardwareConcurrency:Number(hw.cpu)},sessionId);
    const screen=String(sw.screen||'').match(/^(\d+)x(\d+)$/);if(screen)await cdp.send('Emulation.setDeviceMetricsOverride',{width:+screen[1],height:+screen[2],screenWidth:+screen[1],screenHeight:+screen[2],deviceScaleFactor:1,mobile:sw.os==='Android'},sessionId);
    await cdp.send('Page.enable',{},sessionId);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:script},sessionId);
    const applied=await cdp.send('Runtime.evaluate',{expression:script},sessionId);
    if(applied.exceptionDetails)throw Error(applied.exceptionDetails.exception?.description || applied.exceptionDetails.text);
    await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true},sessionId);
   }
  }catch(error){failure=error;}
  finally{try{await cdp.send('Runtime.runIfWaitingForDebugger',{},sessionId);}catch{}}
 };
 cdp.listeners.add(message=>{
  if(message.method==='Target.attachedToTarget'){
   const {sessionId,targetInfo}=message.params;
   const task=setup(sessionId,targetInfo);sessions.set(targetInfo.targetId,{sessionId,targetInfo,task});
  }
 });
 await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
 await cdp.send('Target.getTargets');
 for(let i=0;i<40&&!Array.from(sessions.values()).some(s=>s.targetInfo.type==='page');i++)await new Promise(r=>setTimeout(r,50));
 await Promise.all(Array.from(sessions.values()).map(s=>s.task));if(failure){cdp.close();throw failure;}
 const pages=Array.from(sessions.values()).filter(s=>s.targetInfo.type==='page');
 if(!pages.length){cdp.close();throw Error('Không tìm thấy trang để áp dụng cấu hình profile');}
 const urls=profile.startUrl?.trim()? [profile.startUrl.trim()] : (options.startupUrls||[]);
 for(let i=0;i<urls.length;i++){
  if(i===0)await cdp.send('Page.navigate',{url:urls[i]},pages[0].sessionId);
  else await cdp.send('Target.createTarget',{url:urls[i]});
 }
 const actualUA=await cdp.send('Runtime.evaluate',{expression:'navigator.userAgent',returnByValue:true},pages[0].sessionId);
 return {cdp,ua:actualUA.result.value,timezone,settingsApplied:true};
 } catch(error){cdp.close();throw error;}
}
module.exports={CDP,configureChromium};
