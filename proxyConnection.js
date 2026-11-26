const { Server } = require('proxy-chain');
const RESOLVED_PROXY=Symbol('resolvedProxy');
function parseProxy(value, kind = '') {
  const raw = String(value || '').trim();
  if (!raw || /^(no proxy|none)$/i.test(raw)) return { isDirect: true };
  let scheme = /socks5/i.test(kind) ? 'socks5' : /socks4/i.test(kind) ? 'socks4' : /^https$/i.test(kind) ? 'https' : 'http';
  let url;
  if (/^[a-z0-9]+:\/\//i.test(raw)) url = new URL(raw);
  else {
    const parts = raw.split(':');
    if (!raw.includes('@') && parts.length >= 4 && !raw.startsWith('[')) {
      const [host, port, user, ...password] = parts;
      url = new URL(`${scheme}://${encodeURIComponent(user)}:${encodeURIComponent(password.join(':'))}@${host}:${port}`);
    } else url = new URL(`${scheme}://${raw}`);
  }
  scheme = url.protocol.slice(0, -1);
  if (!['http', 'https', 'socks5', 'socks5h', 'socks4', 'socks4a'].includes(scheme)) throw Error('Loại kết nối proxy không được hỗ trợ');
  const port = Number(url.port || (scheme === 'https' ? 443 : scheme.startsWith('socks') ? 1080 : 80));
  if (!url.hostname || !Number.isInteger(port) || port < 1 || port > 65535) throw Error('Host/Port proxy không hợp lệ');
  return { isDirect: false, type: scheme, host: url.hostname, port, user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password), url: url.href };
}
async function resolveProxy(profile, request = fetch) {
  const provider = String(profile.proxyType || '').toLowerCase();
  let value = profile.proxy;
  if (['tmproxy', 'tinsoft'].includes(provider)) {
    const raw = String(value || '').trim();
    // A supplied endpoint is already a proxy, not a provider API key.
    const apiUrl = /^https?:\/\//i.test(raw) && (/\/(api|proxy)\//i.test(raw) || /[?&](api_key|key)=/.test(raw));
    if (apiUrl || (!/^https?:\/\//i.test(raw) && !raw.includes(':'))) {
      const key = apiUrl ? (new URL(raw).searchParams.get('api_key') || new URL(raw).searchParams.get('key') || '') : raw;
      const custom = profile.proxyChangeUrl || (apiUrl ? raw : '');
      if(!key && !custom)throw Error('Vui lòng nhập API key proxy');
      let url = custom || (provider === 'tmproxy' ? 'https://tmproxy.com/api/proxy/get-current-proxy' : `https://proxy.tinsoftsv.com/api/getProxy.php?key=${encodeURIComponent(key)}`);
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') throw Error('API proxy cần HTTPS');
      const init = { signal: AbortSignal.timeout(15000), cache: 'no-store' };
      if (provider === 'tmproxy') Object.assign(init,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:key})});
      const response = await request(url, init);
      if (!response.ok) throw Error('API proxy không kết nối được');
      const body = await response.json();
      if ((provider === 'tmproxy' && body.code !== 0) || body.success === false) throw Error(body.message || body.description || 'API proxy từ chối yêu cầu');
      const data = body.data || body;
      value = data.https || data.http || data.proxy || data.socks5;
      if (!value) throw Error('API chưa trả về địa chỉ proxy');
      const type = data.https || data.http || data.proxy ? 'http' : 'socks5';
      const parsedProxy = parseProxy(value,type);
      if (data.username) {
        const u = new URL(parsedProxy.url);u.username=data.username;u.password=data.password || '';value=u.href;
      } else value=parsedProxy.url;
    }
  }
  if (!['tmproxy','tinsoft'].includes(provider) && profile.proxyChangeUrl && value && !/^no proxy$/i.test(value)) {
    const url=new URL(profile.proxyChangeUrl);
    if(url.protocol!=='https:')throw Error('URL xoay proxy cần HTTPS');
    const response=await request(url.href,{signal:AbortSignal.timeout(15000),cache:'no-store'});
    if(!response.ok)throw Error('Không gọi được URL xoay proxy');
    let body;try{body=await response.json();}catch{body={};}
    if(body.success===false||(body.code!==undefined&&Number(body.code)!==0))throw Error(body.message||'Xoay proxy thất bại');
    const data=body.data||body;const address=data.proxy||data.http||data.https||data.socks5;
    if(address)value=address;
  }
  return parseProxy(value,profile.proxyType);
}
async function openBridge(config, options = {}) {
  if (config.isDirect) return null;
  const upstream=new URL(config.url);
  if(upstream.protocol==='socks5:')upstream.protocol='socks5h:'; // Resolve destination DNS at the SOCKS5 proxy.
  const server = new Server({host:'127.0.0.1',port:0,prepareRequestFunction:()=>({upstreamProxyUrl:upstream.href,...(options.httpsAgent?{httpsAgent:options.httpsAgent}:{})})});
  await server.listen();
  let closed=false;
  return { url:`http://127.0.0.1:${server.port}`,host:'127.0.0.1',port:server.port,close:async()=>{if(!closed){closed=true;await server.close(true);}} };
}
module.exports={parseProxy,resolveProxy,openBridge,RESOLVED_PROXY};
