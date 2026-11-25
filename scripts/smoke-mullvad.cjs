const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const childProcess=require('node:child_process');
const nativeSpawn=childProcess.spawn;
childProcess.spawn=(file,args,options)=>{
 const child=nativeSpawn(file,args,{...options,stdio:['ignore','ignore','pipe']});
 child.stderr.on('data',data=>process.stderr.write(data));
 child.on('exit',(code,signal)=>console.log('Mullvad process exited:',code,signal));
 return child;
};
const BrowserLauncher=require('../browserLauncher');
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sv-mullvad-smoke-'));
 const launcher=new BrowserLauncher(root);
 if(process.env.SV_MULLVAD_TEST_EXE)launcher.detectBrowsers=()=>({mullvad:process.env.SV_MULLVAD_TEST_EXE});
 const id='isolated-test';
 try{
  const found=launcher.detectBrowsers().mullvad;assert.ok(found,'Mullvad not installed for smoke test');
  const result=await launcher.launchProfile({id,name:'Mullvad isolated smoke',browserType:'mullvad',version:'default',headless:true},1);
  assert.equal(result.success,true);assert.equal(result.websocket_debugging_url,'');assert.equal(result.driver_path,'');
  const info=launcher.getRunningInfo(id);assert.ok(info);
  const initialized=()=>fs.readdirSync(info.profileDir).some(name=>['prefs.js','parent.lock','.parentlock'].includes(name));
  for(let i=0;i<60&&!initialized();i++)await new Promise(r=>setTimeout(r,500));
  console.log('Profile files:',fs.readdirSync(info.profileDir).join(', '));
  assert.ok(initialized(),'Native Mullvad must initialize its isolated profile');
  assert.ok(launcher.isProfileRunning(id),'Native browser should remain running');
  const prefs=fs.readFileSync(path.join(info.profileDir,'user.js'),'utf8');
  assert.ok(!prefs.includes('xpinstall.signatures.required'));
  assert.ok(!prefs.includes('extensions.experiments.enabled'));
  console.log('PASS: native Mullvad launches isolated profile; no Chrome CDP or security preference overrides');
 }finally{
  await launcher.closeProfile(id);
  if(process.platform==='darwin') {
   for(let i=0;i<48&&launcher.getRunningInfo(id);i++)await new Promise(r=>setTimeout(r,250));
   assert.equal(launcher.getRunningInfo(id),null,'Closing Mullvad must terminate the owned Mac process group');
  }
  for(let i=0;i<20;i++) {try{fs.rmSync(root,{recursive:true,force:true});break;}catch{await new Promise(r=>setTimeout(r,500));}}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
