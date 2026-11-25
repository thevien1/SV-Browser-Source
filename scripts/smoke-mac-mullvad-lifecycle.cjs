const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {watchMacMullvad}=require('../macMullvadLifecycle');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 assert.equal(process.platform,'darwin');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sv-window-test-'));
 const binary=path.join(root,'fixture');execFileSync('/usr/bin/xcrun',['swiftc','scripts/mac-window-fixture.swift','-o',binary]);
 const children=[],monitors=[];
 try{
  const launch=name=>{const child=spawn(binary,[path.join(root,name)],{detached:true,stdio:'ignore'});children.push(child);return child;};
  const a=launch('a'),b=launch('b');let closedA=0,closedB=0;
  const ma=watchMacMullvad({pid:a.pid},()=>closedA++),mb=watchMacMullvad({pid:b.pid},()=>closedB++);monitors.push(ma,mb);
  const windows=pid=>JSON.parse(execFileSync('assets/mac-window-state',[String(pid)],{encoding:'utf8'}));
  for(let i=0;i<40&&(!windows(a.pid).length||!windows(b.pid).length);i++)await wait(250);
  assert.ok(windows(a.pid).length&&windows(b.pid).length,'Both test profile windows must appear');await wait(1300);
  fs.writeFileSync(path.join(root,'a.mini'),'');await wait(3000);assert.equal(closedA,0,'Minimizing must not quit the app');
  fs.unlinkSync(path.join(root,'a.mini'));await wait(1200);
  fs.writeFileSync(path.join(root,'a.close'),'');
  for(let i=0;i<48&&!closedA;i++)await wait(250);
  assert.equal(closedA,1,'Last window must terminate its process group');assert.equal(closedB,0);process.kill(b.pid,0);
  mb.close();for(let i=0;i<40&&!closedB;i++)await wait(250);assert.equal(closedB,1);
  console.log('PASS: Mac last-window close removes owned process; minimized and other profile remain; explicit close exits');
 }finally{monitors.forEach(m=>m.dispose());for(const c of children){try{process.kill(-c.pid,'SIGKILL')}catch{}}fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
