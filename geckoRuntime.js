const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {userAgent,autoUserAgent,softwareOS}=require('./profileConfig');
const source=name=>{const resource=path.join(process.resourcesPath||__dirname,'assets',name);return fs.readFileSync(fs.existsSync(resource)?resource:path.join(__dirname,'assets',name),'utf8');};
class BiDi {
 constructor(ws){this.ws=ws;this.next=0;this.pending=new Map();this.listeners=new Set();ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.timer);m.type==='error'?p.reject(Error(`${p.method}: ${m.error}: ${m.message}`)):p.resolve(m.result);}else for(const fn of this.listeners)fn(m);});ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Gecko connection closed'));}this.pending.clear();});}
 static async connect(port){let error;for(let n=0;n<120;n++){try{return new BiDi(await new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/session`);ws.addEventListener('open',()=>resolve(ws),{once:true});ws.addEventListener('error',reject,{once:true});}));}catch(e){error=e;await new Promise(r=>setTimeout(r,100));}}throw Error('Firefox/Mullvad không cung cấp WebDriver BiDi: '+error.message);}
 send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.next,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Gecko timeout: '+method));},10000);this.pending.set(id,{resolve,reject,timer,method});this.ws.send(JSON.stringify({id,method,params}));});}
 close(){this.ws.close();}
}
function geckoUserAgent(native,os){
 if(!os||!/Firefox\//.test(native))return autoUserAgent(native,os);
 const rv=native.match(/rv:([\d.]+)/)?.[1]||native.match(/Firefox\/([\d.]+)/)?.[1]||'1.0';
 if(os==='Android')return `Mozilla/5.0 (Android 14; Mobile; rv:${rv}) Gecko/${rv} Firefox/${rv}`;
 const token=os.startsWith('Mac')?'Macintosh; Intel Mac OS X 10.15':({Windows:'Windows NT 10.0; Win64; x64',Linux:'X11; Linux x86_64'}[os]);
 return token?native.replace(/\([^)]*\)/,`(${token}; rv:${rv})`):native;
}
async function configureGecko(port,profile,options={}){
 const bidi=await BiDi.connect(port);
 try{
  const {capabilities}=await bidi.send('session.new',{capabilities:{alwaysMatch:{acceptInsecureCerts:false}}});
  const sw=profile.software||{},hardware=profile.hardware||{};
  const detectedLanguage=options.detectedLang||(options.detectedCountry?require('./proxyChecker').getLangFromCountry(options.detectedCountry):undefined);
  const language=sw.language==='Real'?undefined:sw.language&&sw.language!=='Auto'?sw.language:detectedLanguage;
  let timezone=sw.timezone&&sw.timezone!=='Auto'?sw.timezone:options.detectedTimezone,geo=options.detectedGeo;
  if((sw.timezone==='Auto'&&!timezone)||(sw.geo==='Allow'&&!geo)){
   const ip=options.detectedIp||profile.ip;
   if(ip&&ip!=='127.0.0.1'){const found=await require('./proxyChecker').queryHostGeo(ip);timezone=timezone||found.timezone;geo=geo||found.geo;}
   if(sw.timezone==='Auto'&&!timezone)throw Error('Không xác định được múi giờ theo IP; chọn múi giờ cụ thể');
   if(sw.geo==='Allow'&&!geo)throw Error('Không xác định được vị trí theo IP; chọn Prompt hoặc Block');
  }
  const os=sw.os?softwareOS(sw.os):'',platform=os.startsWith('Mac')?'MacIntel':({Windows:'Win32',Linux:'Linux x86_64',Android:'Linux armv8l'}[os]);
  const ua=userAgent(profile)||geckoUserAgent(capabilities.userAgent,os);
  const oscpu=os.startsWith('Mac')?'Intel Mac OS X 10.15':({Windows:'Windows NT 10.0; Win64; x64',Linux:'Linux x86_64',Android:'Linux armv8l'}[os]);
  const appVersion=os.startsWith('Mac')?'5.0 (Macintosh)':({Windows:'5.0 (Windows)',Linux:'5.0 (X11)',Android:'5.0 (Android)'}[os]);
  const config={hardware,software:sw,seed:crypto.createHash('sha256').update(String(profile.id)).digest().readUInt32LE(0),platform,oscpu,appVersion,language,locale:language?.split(',')[0].split(';')[0].trim(),timezone,geo,userAgent:ua,webrtc:sw.webrtc};
  const declaration=`()=>{(${source('profile-hardware.js')})(${JSON.stringify(config)});(${source('profile-gecko.js')})(${JSON.stringify(config)});}`;
  await bidi.send('script.addPreloadScript',{functionDeclaration:declaration});
  if(userAgent(profile)||os||language){
   await bidi.send('session.subscribe',{events:['network.beforeRequestSent']});
   bidi.listeners.add(message=>{if(message.method!=='network.beforeRequestSent'||!message.params.isBlocked)return;const request=message.params.request;const names=new Set(['user-agent',...(language?['accept-language']:[])]);const headers=request.headers.filter(header=>!names.has(header.name.toLowerCase()));headers.push({name:'User-Agent',value:{type:'string',value:ua}});if(language)headers.push({name:'Accept-Language',value:{type:'string',value:language}});void bidi.send('network.continueRequest',{request:request.request,headers}).catch(()=>{});});
   await bidi.send('network.addIntercept',{phases:['beforeRequestSent']});
  }
  const tree=await bidi.send('browsingContext.getTree');
  if(tree.contexts[0]){
   const initialized=await bidi.send('script.callFunction',{functionDeclaration:declaration,target:{context:tree.contexts[0].context},awaitPromise:false});
   if(initialized.type==='exception')throw Error(initialized.exceptionDetails?.text||'Không khởi tạo được cấu hình trang Firefox/Mullvad');
  }
  const urls=profile.startUrl?.trim()?[profile.startUrl.trim()]:(options.startupUrls||[]);
  // A blank setting uses the engine's New Tab, never a configured external URL.
  for(let i=0;i<Math.max(1,urls.length);i++){
   const context=i===0&&tree.contexts[0]?tree.contexts[0].context:(await bidi.send('browsingContext.create',{type:'tab'})).context;
   await bidi.send('browsingContext.navigate',{context,url:urls[i]||'about:newtab',wait:'none'});
  }
  return {cdp:bidi,bidi,ua,timezone,settingsApplied:true};
 }catch(error){bidi.close();throw error;}
}
module.exports={BiDi,configureGecko,geckoUserAgent};
