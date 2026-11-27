const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function software(timezone,locale='ja-JP'){
 const context=vm.createContext({});
 vm.runInContext('class Navigator{};globalThis.navigator=new Navigator()',context);
 vm.runInContext('('+fs.readFileSync(require.resolve('../assets/profile-gecko.js'),'utf8')+')('+JSON.stringify({timezone,locale})+')',context);
 return expression=>vm.runInContext(expression,context);
}
test('Mac Gecko timezone keeps Date constructors, setters, Intl and ISO dates coherent',()=>{
 const run=software('Asia/Tokyo');
 assert.equal(run("new Intl.DateTimeFormat().resolvedOptions().timeZone"),'Asia/Tokyo');
 assert.equal(run("new Intl.NumberFormat().resolvedOptions().locale"),'ja-JP');
 assert.equal(run("new Date('2026-06-01T12:00:00Z').getTimezoneOffset()"),-540);
 assert.equal(run("new Date('2026-06-01T12:00:00Z').getHours()"),21);
 assert.equal(run("new Date(2026,0,1,0).toISOString()"),'2025-12-31T15:00:00.000Z');
 assert.equal(run("new Date('2026-01-01T00:00:00').toISOString()"),'2025-12-31T15:00:00.000Z');
 assert.equal(run("new Date('2026-01-01').toISOString()"),'2026-01-01T00:00:00.000Z');
 assert.equal(run("(()=>{const d=new Date('2026-01-01T00:00:00');d.setHours(12);return d.toISOString()})()"),'2026-01-01T03:00:00.000Z');
 assert.match(run("new Date('2026-06-01T12:00:00Z').toString()"),/21:00:00 GMT\+0900/);
 assert.equal(run("Number.isNaN(new Date('invalid').getTime())"),true);
});
test('Mac Gecko timezone handles DST gaps and repeated local hours',()=>{
 const run=software('America/New_York','en-US');
 assert.equal(run("new Date('2026-06-01T12:00:00Z').getTimezoneOffset()"),240);
 assert.equal(run("new Date('2026-01-01T12:00:00Z').getTimezoneOffset()"),300);
 assert.equal(run("new Date(2026,2,8,2,30).toISOString()"),'2026-03-08T07:30:00.000Z');
 assert.equal(run("new Date(2026,10,1,1,30).toISOString()"),'2026-11-01T05:30:00.000Z');
});
test('Mac unlocks Gecko controls while Windows retains its existing capabilities',()=>{
 const source=fs.readFileSync(require.resolve('../src/components/Modals.js'),'utf8').replace(/^import .*$/gm,'').replace('export class ModalsComponent','class ModalsComponent');
 for(const [host,locked] of [['MacIntel',false],['Win32',true]]){
  const context=vm.createContext({navigator:{platform:host}});vm.runInContext(source+';globalThis.Modals=ModalsComponent',context);
  const fields=new Map(),hardwareInputs=[{disabled:false},{disabled:false}],osButtons=[{disabled:false}],note={textContent:''};
  const hardware={querySelectorAll:()=>hardwareInputs,querySelector:()=>note};
  const pane={querySelector:()=>note,querySelectorAll:()=>osButtons};
  for(const prefix of ['', 'edit-']){
   fields.set('#'+prefix+'quick-browser-core',{value:'mullvad|default'});fields.set('#pane-'+prefix+'hardware',hardware);fields.set('#pane-'+prefix+'software',pane);
   for(const key of ['timezone','geo','screen'])fields.set('#'+prefix+'sw-'+key,{disabled:false});
   fields.set('#'+prefix+'sw-language',{value:'Auto',options:[{value:'Auto'}]});
   fields.set('#'+prefix+'sw-webrtc',{value:'BaseOnIp',options:[{value:'BaseOnIp'},{value:'Real'},{value:'Disable'},{value:'Noise'}]});
  }
  const modal=new context.Modals({container:{querySelector:key=>fields.get(key)||null,querySelectorAll:()=>[hardware]}});modal.updateSummary=()=>{};modal.updateEditSummary=()=>{};
  modal.updateBrowserCapabilities();
  assert.equal(hardwareInputs[0].disabled,locked);assert.equal(osButtons[0].disabled,locked);
  for(const prefix of ['', 'edit-'])for(const key of ['timezone','geo','screen'])assert.equal(fields.get('#'+prefix+'sw-'+key).disabled,locked);
  assert.equal(fields.get('#sw-language').options[0].disabled,locked);assert.equal(fields.get('#sw-webrtc').options[0].disabled,locked);assert.equal(fields.get('#sw-webrtc').options[3].disabled,true);
 }
});

test('Mac Gecko UA preserves Firefox version and proxy-only RTC prefs are scoped to Mac',()=>{
 const {geckoUserAgent}=require('../geckoRuntime'),{geckoSoftwarePreferences}=require('../profileConfig');
 const native='Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0';
 assert.match(geckoUserAgent(native,'Mac (ARM)'),/Macintosh; Intel Mac OS X 10.15; rv:153.0/);assert.match(geckoUserAgent(native,'Mac (ARM)'),/Firefox\/153.0/);assert.equal(geckoUserAgent(native,''),native);
 const profile={software:{webrtc:'BaseOnIp'}};assert.throws(()=>geckoSoftwarePreferences(profile,'win32'),/Real hoặc Disable/);
 const prefs=geckoSoftwarePreferences(profile,'darwin');assert.ok(prefs.prefs.some(line=>line.includes('media.peerconnection.ice.proxy_only')&&line.includes('true')));assert.ok(prefs.prefs.some(line=>line.includes('media.peerconnection.ice.no_host')&&line.includes('true')));
});
