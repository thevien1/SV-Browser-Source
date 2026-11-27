function installGeckoSoftware(config) {
 if(globalThis.__svGeckoConfigured)return;
 Object.defineProperty(globalThis,'__svGeckoConfigured',{value:true});
 const define=(object,key,get)=>{try{Object.defineProperty(object,key,{get,configurable:true});}catch{}};
 const sw=config.software||{},h=config.hardware||{},nav=Object.getPrototypeOf(navigator);
 if(config.userAgent)define(nav,'userAgent',()=>config.userAgent);
 if(config.oscpu)define(nav,'oscpu',()=>config.oscpu);
 if(config.appVersion)define(nav,'appVersion',()=>config.appVersion);
 if(sw.screen&&sw.screen!=='-1x-1'){
  const [width,height]=sw.screen.split('x').map(Number);
  for(const [key,value] of Object.entries({width,height,availWidth:width,availHeight:height}))define(Object.getPrototypeOf(screen),key,()=>value);
 }
 if(h.webglMeta==='Custom')for(const Type of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext])if(Type){
  const original=Type.prototype.getExtension;Type.prototype.getExtension=function(name){return String(name).toLowerCase()==='webgl_debug_renderer_info'?{UNMASKED_VENDOR_WEBGL:37445,UNMASKED_RENDERER_WEBGL:37446}:Reflect.apply(original,this,[name]);};
 }
 if(config.timezone||config.locale){
  const Native=Intl.DateTimeFormat;
  const options=value=>({...value,...(config.timezone&&!value?.timeZone?{timeZone:config.timezone}:{})});
  Intl.DateTimeFormat=new Proxy(Native,{
   construct(target,args){return Reflect.construct(target,[args[0]??config.locale,options(args[1])]);},
   apply(target,self,args){return Reflect.apply(target,self,[args[0]??config.locale,options(args[1])]);}
  });
  if(config.locale)for(const name of ['NumberFormat','Collator','PluralRules','RelativeTimeFormat','ListFormat','Segmenter','DisplayNames'])if(typeof Intl[name]==='function'){
   const Constructor=Intl[name];Intl[name]=new Proxy(Constructor,{construct(target,args){return Reflect.construct(target,[args[0]??config.locale,...args.slice(1)]);},apply(target,self,args){return Reflect.apply(target,self,[args[0]??config.locale,...args.slice(1)]);}});
  }
  for(const name of ['toLocaleString','toLocaleDateString','toLocaleTimeString']){
   const original=Date.prototype[name];Date.prototype[name]=function(locales,opts){return Reflect.apply(original,this,[locales??config.locale,options(opts)]);};
  }
  if(config.timezone){
   const NativeDate=Date,nativeParse=Date.parse,nativeOffset=Date.prototype.getTimezoneOffset,nativeSetTime=Date.prototype.setTime;
   const format=new Native('en-US-u-ca-gregory-nu-latn',{timeZone:config.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
   const offset=date=>{const time=date.getTime();if(!Number.isFinite(time))return NaN;const parts=Object.fromEntries(format.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return (Math.floor(time/1000)*1000-Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second))/60000;};
   Date.prototype.getTimezoneOffset=function(){return offset(this);};
   for(const name of ['FullYear','Month','Date','Day','Hours','Minutes','Seconds','Milliseconds']){
    const original=Date.prototype['getUTC'+name];Date.prototype['get'+name]=function(){return Reflect.apply(original,new Date(this.getTime()-offset(this)*60000),[]);};
   }
   const fromLocal=wall=>{
    if(!Number.isFinite(wall))return NaN;
    let value=wall,previous;
    for(let i=0;i<8;i++){const next=wall+offset(new NativeDate(value))*60000;if(next===value)return value;if(next===previous)return Math.max(value,next);previous=value;value=next;}
    return value;
   };
   const parse=value=>{
    const text=String(value),time=Reflect.apply(nativeParse,NativeDate,[text]);
    if(!Number.isFinite(time)||/^\d{4}(?:-\d{2}){0,2}$/.test(text)||/(?:z|[+-]\d{2}:?\d{2})\s*$/i.test(text)||/\b(?:GMT|UTC|EST|EDT|CST|CDT|MST|MDT|PST|PDT)\b/i.test(text))return time;
    return fromLocal(time-Reflect.apply(nativeOffset,new NativeDate(time),[])*60000);
   };
   for(const name of ['FullYear','Month','Date','Hours','Minutes','Seconds','Milliseconds']){
    const setter=NativeDate.prototype['setUTC'+name];NativeDate.prototype['set'+name]=function(...args){const local=new NativeDate(this.getTime()-offset(this)*60000);const wall=Reflect.apply(setter,local,args);return Reflect.apply(nativeSetTime,this,[fromLocal(wall)]);};
   }
   NativeDate.prototype.getYear=function(){return this.getFullYear()-1900;};
   NativeDate.prototype.setYear=function(year){year=Number(year);return this.setFullYear(year>=0&&year<=99?year+1900:year);};
   const stringFormat=new Native('en-US',{timeZone:config.timezone,weekday:'short',year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'long',hourCycle:'h23'});
   const strings=date=>{
    if(!Number.isFinite(date.getTime()))return {date:'Invalid Date',time:'Invalid Date'};
    const parts=Object.fromEntries(stringFormat.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));const minutes=-offset(date),pad=value=>String(value).padStart(2,'0');
    return {date:`${parts.weekday} ${parts.month} ${parts.day} ${parts.year}`,time:`${parts.hour}:${parts.minute}:${parts.second} GMT${minutes<0?'-':'+'}${pad(Math.floor(Math.abs(minutes)/60))}${pad(Math.abs(minutes)%60)} (${parts.timeZoneName})`};
   };
   NativeDate.prototype.toDateString=function(){return strings(this).date;};
   NativeDate.prototype.toTimeString=function(){return strings(this).time;};
   NativeDate.prototype.toString=function(){const result=strings(this);return result.date==='Invalid Date'?result.date:result.date+' '+result.time;};
   globalThis.Date=new Proxy(NativeDate,{
    construct(target,args,newTarget){if(args.length>1)return Reflect.construct(target,[fromLocal(NativeDate.UTC(...args))],newTarget);if(args.length===1&&typeof args[0]==='string')return Reflect.construct(target,[parse(args[0])],newTarget);return Reflect.construct(target,args,newTarget);},
    apply(){return new NativeDate().toString();}
   });
   Date.parse=parse;
  }
 }
 if(['Allow','Block'].includes(sw.geo)){
  const denied=sw.geo==='Block',geo=config.geo;
  let next=0;const timers=new Map();
  const current=(success,error)=>queueMicrotask(()=>{if(denied)error?.({code:1,message:'Geolocation blocked by profile',PERMISSION_DENIED:1});else success({coords:{latitude:geo.latitude,longitude:geo.longitude,accuracy:geo.accuracy||100,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()});});
  const location={getCurrentPosition:current,watchPosition(success,error){const id=++next;current(success,error);if(!denied)timers.set(id,setInterval(()=>current(success,error),1000));return id;},clearWatch(id){clearInterval(timers.get(id));timers.delete(id);}};
  define(nav,'geolocation',()=>location);
  if(navigator.permissions){const query=navigator.permissions.query.bind(navigator.permissions);navigator.permissions.query=descriptor=>{
   if(descriptor?.name!=='geolocation')return query(descriptor);
   const status=new EventTarget();define(status,'state',()=>denied?'denied':'granted');status.onchange=null;return Promise.resolve(status);
  };}
 }
 // Firefox can remove mediaDevices when native WebRTC is disabled. Explicit
 // device counts still describe a simulated list, never physical devices.
 if(!navigator.mediaDevices&&(Number(h.videoIn)>=0||Number(h.audioInOut)>=0)){
  const media={enumerateDevices:async()=>['videoinput','audioinput','audiooutput'].flatMap(kind=>Array.from({length:Math.max(0,Number(kind==='videoinput'?h.videoIn:h.audioInOut)||0)},(_,i)=>({kind,deviceId:`sv-${config.seed}-${kind}-${i}`,groupId:`sv-${config.seed}-${i}`,label:'',toJSON(){return {kind:this.kind,deviceId:this.deviceId,groupId:this.groupId,label:''};}}))),getUserMedia:()=>Promise.reject(new DOMException('No physical device is created by the profile','NotSupportedError'))};
  define(nav,'mediaDevices',()=>media);
 }
}
