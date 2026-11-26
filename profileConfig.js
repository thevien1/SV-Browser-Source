function parseCookies(input) {
 if (!input || (typeof input==='string'&&!input.trim())) return [];
 let list=input;
 if (typeof input==='string') {
  const text=input.trim();
  if(text.startsWith('[')||text.startsWith('{')) {try{list=JSON.parse(text);}catch{throw Error('Cookies JSON không hợp lệ');}if(!Array.isArray(list)&&Array.isArray(list.cookies))list=list.cookies;}
  else list=text.split(/\r?\n/).filter(line=>line.trim()&&(!line.startsWith('#')||line.startsWith('#HttpOnly_'))).map((line,index)=>{
   const fields=line.split('\t');if(fields.length<7)throw Error(`Cookie Netscape dòng ${index+1} cần 7 cột, phân cách bằng Tab`);
   return {hostOnly:fields[1].toUpperCase()==='FALSE',domain:fields[0].replace(/^#HttpOnly_/,''),httpOnly:fields[0].startsWith('#HttpOnly_'),path:fields[2],secure:fields[3].toUpperCase()==='TRUE',expirationDate:Number(fields[4]),name:fields[5],value:fields.slice(6).join('\t')};
  });
 }
 if(!Array.isArray(list))throw Error('Cookies phải là danh sách JSON hoặc Netscape');
 return list.map((cookie,index)=>{
  if(!cookie||typeof cookie.name!=='string'||!cookie.name||typeof cookie.value!=='string')throw Error(`Cookie ${index+1} thiếu name/value`);
  if(!cookie.domain&&!cookie.url)throw Error(`Cookie ${index+1} thiếu domain hoặc url`);
  const out={name:cookie.name,value:cookie.value,path:cookie.path||'/',secure:!!cookie.secure,httpOnly:!!cookie.httpOnly};
  if(cookie.domain&&(cookie.hostOnly||cookie.name.startsWith('__Host-')))out.url=`${cookie.secure?'https':'http'}://${String(cookie.domain).replace(/^\./,'')}${out.path}`;
  else if(cookie.domain)out.domain=String(cookie.domain);else{const url=new URL(cookie.url);if(!['http:','https:'].includes(url.protocol))throw Error('Cookie URL cần HTTP/HTTPS');out.url=url.href;}
  const expiry=cookie.expires ?? cookie.expirationDate;
  if(!cookie.session&&expiry!==undefined&&Number(expiry)>0){if(!Number.isFinite(Number(expiry))||Number(expiry)>1e11)throw Error('Cookie expires phải là timestamp giây, không phải mili giây');out.expires=Number(expiry);}
  if(cookie.sameSite){const ss=String(cookie.sameSite).toLowerCase();const map={strict:'Strict',lax:'Lax',none:'None',no_restriction:'None',unspecified:undefined};if(!(ss in map))throw Error('Cookie sameSite không hợp lệ');if(map[ss])out.sameSite=map[ss];}
  if(out.sameSite==='None'&&!out.secure)throw Error('Cookie SameSite=None cần secure=true');
  return out;
 });
}
function userAgent(profile) {
 const value=Object.hasOwn(profile.software||{},'userAgent')?profile.software.userAgent:profile.userAgent;
 return !value||/^auto$/i.test(String(value).trim())?'':String(value).trim();
}
function validateProfile(profile) {
 parseCookies(profile.cookies);
 if(profile.proxyType&&profile.proxyType!=='None'&&(!profile.proxy||/^no proxy$/i.test(profile.proxy)))throw Error('Vui lòng nhập địa chỉ hoặc API key proxy');
 const hw=profile.hardware||{},sw=profile.software||{};
 if(hw.webglMeta==='Custom'&&(!hw.webglVendor||!hw.webglRenderer))throw Error('WebGL Custom cần vendor và renderer; hãy dùng Masked hoặc Off');
 if(sw.webrtc==='Noise')throw Error('WebRTC Noise chưa được hỗ trợ; chọn BaseOnIp, Real hoặc Disable');
 if(sw.timezone&&sw.timezone!=='Auto')new Intl.DateTimeFormat('en',{timeZone:sw.timezone});
 if(/[\r\n]/.test(userAgent(profile)))throw Error('User-Agent không được có xuống dòng');
 for(const key of ['videoIn','audioInOut'])if(hw[key]!==undefined&&(!Number.isInteger(Number(hw[key]))||Number(hw[key])< -1||Number(hw[key])>16))throw Error('Số thiết bị phải từ -1 đến 16');
 if(hw.canvas&&!['Off','Noise','Block'].includes(hw.canvas))throw Error('Canvas không hợp lệ');
 if(sw.screen&&sw.screen!=='-1x-1'){const m=String(sw.screen).match(/^(\d+)x(\d+)$/);if(!m||+m[1]<1||+m[2]<1||+m[1]>16384||+m[2]>16384)throw Error('Độ phân giải không hợp lệ');}
 if(hw.cpu!==undefined&&(!Number.isInteger(Number(hw.cpu))||Number(hw.cpu)<1||Number(hw.cpu)>64))throw Error('CPU phải từ 1 đến 64');
 if(hw.ram!==undefined&&![2,4,8,16,32].includes(parseInt(hw.ram)))throw Error('RAM không hợp lệ');
 if(['firefox','mullvad'].includes(profile.browserType)&&parseCookies(profile.cookies).length)throw Error('Cookie khởi động hiện hỗ trợ Chromium/Chrome/Brave/Edge; chưa hỗ trợ Firefox/Mullvad');
}
function autoUserAgent(native, os) {
 const token={Windows:'Windows NT 10.0; Win64; x64',Mac:'Macintosh; Intel Mac OS X 10_15_7',Linux:'X11; Linux x86_64',Android:'Linux; Android 14; Pixel 8'}[os];
 if(!token)return native;
 let result=native.replace(/\([^)]*\)/,`(${token})`);
 if(os==='Android'&&!/ Mobile\//.test(result))result=result.replace(' Safari/',' Mobile Safari/');
 if(os!=='Android')result=result.replace(/ Mobile(?= Safari\/)/,'');
 return result;
}
function browserDefaults(settings = {}, identity = '') {
 const native = value => value === 'real' ? 'Off' : value === 'block' ? 'Block' : 'Noise';
 const resolutions=['1920x1080','1366x768','1440x900','1536x864'];
 const bytes=require('crypto').createHash('sha256').update(String(identity)).digest();
 return {hardware:{canvas:native(settings.canvasMode),clientrect:native(settings.clientRectMode),webglImg:native(settings.webglImageMode),webglMeta:settings.webglMetaMode==='real'?'Off':'Masked',audio:native(settings.audioMode),font:settings.fontMode==='real'?'System':'Masked'},software:{screen:settings.screenMode==='real'?'-1x-1':resolutions[bytes.readUInt32LE(0)%resolutions.length],language:settings.languageMode==='real'?'Real':'Auto'}};
}
function applyBrowserDefaults(profile,settings) {
 if(['firefox','mullvad'].includes(profile.browserType))return profile;
 const defaults=browserDefaults(settings,profile.id);
 const software={...defaults.software,...profile.software};
 if(profile.language&&!Object.hasOwn(profile.software||{},'language'))software.language=profile.language;
 return {...profile,hardware:{...defaults.hardware,...profile.hardware},software};
}
function validateBrowserSettings(settings) {
 const allowed={canvasMode:['noise','real','block'],clientRectMode:['noise','real'],webglImageMode:['noise','real'],webglMetaMode:['masked','real'],audioMode:['noise','real'],fontMode:['masked','real'],screenMode:['random','real'],languageMode:['ip','real']};
 for(const [key,values] of Object.entries(allowed))if(Object.hasOwn(settings,key)&&!values.includes(settings[key]))throw Error(`Cài đặt ${key} không hợp lệ`);
}
module.exports={parseCookies,userAgent,validateProfile,autoUserAgent,browserDefaults,applyBrowserDefaults,validateBrowserSettings};
