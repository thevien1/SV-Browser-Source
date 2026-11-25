const test=require('node:test');
const assert=require('node:assert/strict');
const {watchMacMullvad}=require('../macMullvadLifecycle');
test('last-window close terminates only owned group, waits for exit and reports closure once',async()=>{
 const signals=[];let alive=true, windows=[], closed=0;
 const monitor=watchMacMullvad({pid:123,isHeadless:false},()=>closed++,{interval:false,alive:()=>alive,signal:s=>signals.push(s),windows:async()=>windows});
 await monitor.poll();await monitor.poll();assert.deepEqual(signals,[]);
 windows=[10];await monitor.poll();windows=[];await monitor.poll();assert.deepEqual(signals,[]);
 await monitor.poll();assert.deepEqual(signals,['SIGTERM']);assert.equal(closed,0);
 monitor.close();assert.equal(signals.length,1);
 alive=false;await monitor.poll();await monitor.poll();assert.equal(closed,1);
});
test('headless and unreadable window state never trigger automatic close',async()=>{
 for(const headless of [true,false]){
  let calls=0,fail=false;
  const m=watchMacMullvad({pid:123,isHeadless:headless},()=>{}, {interval:false,alive:()=>true,signal:()=>assert.fail('must not terminate'),windows:async()=>{calls++;if(fail)throw Error('window server unavailable');return [1];}});
  await m.poll();fail=true;await m.poll();await m.poll();await m.poll();
  if(headless)assert.equal(calls,0);m.dispose();
 }
});
test('manual close escalates within owned group and invalid groups are rejected',async()=>{
 let now=1000;const original=Date.now;Date.now=()=>now;
 try{
  const signals=[];const m=watchMacMullvad({pid:456},()=>{}, {interval:false,alive:()=>true,signal:s=>signals.push(s)});
  m.close();now+=3100;await m.poll();await m.poll();assert.deepEqual(signals,['SIGTERM','SIGKILL']);m.dispose();
  assert.throws(()=>watchMacMullvad({pid:0},()=>{}),/Invalid/);
 }finally{Date.now=original;}
});
