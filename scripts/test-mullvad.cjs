const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const BrowserLauncher = require('../browserLauncher');
test('Mullvad resolves independently and never silently falls back to Chrome',()=>{
 const launcher=Object.create(BrowserLauncher.prototype);
 launcher.detectBrowsers=()=>({mullvad:'/Mullvad/mullvadbrowser',chrome:'/Chrome/chrome'});
 assert.equal(launcher.getExecutable('mullvad','default').type,'mullvad');
 launcher.detectBrowsers=()=>({chrome:'/Chrome/chrome'});
 assert.throws(()=>launcher.getExecutable('mullvad','default'),/Mullvad Browser/);
});
test('Mullvad Mac detection finds the native app executable',()=>{
 const mac=require('../macBrowser');const exists=fs.existsSync;
 fs.existsSync=p=>p===path.join('/Applications','Mullvad Browser.app','Contents','MacOS','mullvadbrowser');
 try {assert.equal(mac.detectBrowsers().mullvad,path.join('/Applications','Mullvad Browser.app','Contents','MacOS','mullvadbrowser'));}
 finally {fs.existsSync=exists;}
});
