// Page/iframe compatibility layer. Native browser fingerprint surfaces in workers
// and browser internals are not replaced by this page-level JavaScript layer.
function installHardware(config) {
 if(globalThis.__svProfileConfigured)return;
 Object.defineProperty(globalThis,'__svProfileConfigured',{value:true});
 const h=config.hardware||{}, seed=config.seed||1, delta=((seed%97)+1)*1e-7;
 const define=(object,key,get)=>{try{Object.defineProperty(object,key,{get,configurable:true});}catch{}};
 const wrap=(proto,key,transform)=>{if(!proto||typeof proto[key]!=='function')return;const original=proto[key];Object.defineProperty(proto,key,{value:function(...args){return transform.call(this,original,args);},configurable:true,writable:true});};
 if(Number(h.cpu)>0)define(Object.getPrototypeOf(navigator),'hardwareConcurrency',()=>Number(h.cpu));
 if(parseInt(h.ram)>0)define(Object.getPrototypeOf(navigator),'deviceMemory',()=>parseInt(h.ram));
 if(config.language){const languages=config.language.split(',').map(v=>v.split(';')[0].trim()).filter(Boolean);define(Object.getPrototypeOf(navigator),'language',()=>languages[0]);define(Object.getPrototypeOf(navigator),'languages',()=>Object.freeze(languages.slice()));}
 if(config.platform)define(Object.getPrototypeOf(navigator),'platform',()=>config.platform);
 const noise=data=>{for(let i=0;i<data.length;i+=4){data[i]=Math.min(255,Math.max(0,data[i]+(seed%2?1:-1)));}return data;};
 if(typeof CanvasRenderingContext2D!=='undefined'&&h.canvas==='Noise')wrap(CanvasRenderingContext2D.prototype,'getImageData',function(original,args){const image=Reflect.apply(original,this,args);noise(image.data);return image;});
 if(typeof HTMLCanvasElement!=='undefined'&&['Noise','Block'].includes(h.canvas)){
  const nativeImage=CanvasRenderingContext2D.prototype.getImageData;
  const clone=canvas=>{const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0);if(copy.width&&copy.height){const image=Reflect.apply(nativeImage,ctx,[0,0,copy.width,copy.height]);ctx.putImageData(image,0,0);}return copy;};
  for(const key of ['toDataURL','toBlob'])wrap(HTMLCanvasElement.prototype,key,function(original,args){if(h.canvas==='Block')throw new DOMException('Canvas readback blocked by profile','SecurityError');return Reflect.apply(original,clone(this),args);});
  if(h.canvas==='Block')wrap(CanvasRenderingContext2D.prototype,'getImageData',()=>{throw new DOMException('Canvas readback blocked by profile','SecurityError');});
 }
 if(h.clientrect==='Noise'&&typeof Element!=='undefined'){
  const rect=r=>new DOMRect(r.x+delta,r.y+delta,r.width,r.height);
  for(const proto of [Element.prototype,typeof Range!=='undefined'?Range.prototype:null]){
   wrap(proto,'getBoundingClientRect',function(fn,args){return rect(Reflect.apply(fn,this,args));});
   wrap(proto,'getClientRects',function(fn,args){const list=Array.from(Reflect.apply(fn,this,args),rect);list.item=index=>list[index]||null;return list;});
  }
 }
 for(const type of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext])if(type){
  if(h.webglImg==='Noise')wrap(type.prototype,'readPixels',function(fn,args){const result=Reflect.apply(fn,this,args);if(ArrayBuffer.isView(args[6]))noise(args[6]);return result;});
  if(['Masked','Custom'].includes(h.webglMeta))wrap(type.prototype,'getParameter',function(fn,args){if(args[0]===37445)return h.webglMeta==='Custom'?h.webglVendor:'Google Inc.';if(args[0]===37446)return h.webglMeta==='Custom'?h.webglRenderer:'ANGLE (Generic Renderer)';return Reflect.apply(fn,this,args);});
 }
 if(h.audio==='Noise'){
  const changed=new WeakSet();
  if(globalThis.AudioBuffer)wrap(AudioBuffer.prototype,'getChannelData',function(fn,args){const data=Reflect.apply(fn,this,args);if(!changed.has(data)){if(data.length)data[seed%data.length]+=delta;changed.add(data);}return data;});
  if(globalThis.AnalyserNode)for(const key of ['getFloatFrequencyData','getFloatTimeDomainData'])wrap(AnalyserNode.prototype,key,function(fn,args){const result=Reflect.apply(fn,this,args);if(args[0]?.length)args[0][seed%args[0].length]+=delta;return result;});
 }
 if(h.font==='Masked'&&document.fonts){
  const nativeCheck=document.fonts.check.bind(document.fonts);
  const allowed=/\b(Arial|Verdana|Times New Roman|Courier New|sans-serif|serif|monospace|system-ui)\b/i;
  document.fonts.check=(font,text)=>allowed.test(font)&&nativeCheck(font,text);
  if(globalThis.queryLocalFonts)globalThis.queryLocalFonts=()=>Promise.reject(new DOMException('Local font enumeration blocked','NotAllowedError'));
 }
 if(navigator.mediaDevices&&(Number(h.videoIn)>=0||Number(h.audioInOut)>=0)){
  const original=navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices=async()=>{
   const real=await original();const out=[];
   for(const kind of ['videoinput','audioinput','audiooutput']){
    const count=Number(kind==='videoinput'?h.videoIn:h.audioInOut);
    if(!Number.isInteger(count)||count<0){out.push(...real.filter(d=>d.kind===kind));continue;}
    const available=real.filter(d=>d.kind===kind);
    for(let i=0;i<count;i++){const item={deviceId:`sv-${seed}-${kind}-${i}`,groupId:`sv-${seed}-${i}`,kind,label:available[i]?.label||''};out.push(Object.assign(item,{toJSON:()=>({...item,toJSON:undefined})}));}
   }return out;
  };
 }
 if(config.webrtc==='Disable'){
  for(const key of ['RTCPeerConnection','webkitRTCPeerConnection'])if(key in globalThis)globalThis[key]=class{constructor(){throw new DOMException('WebRTC disabled by profile','NotSupportedError');}};
 }
}

