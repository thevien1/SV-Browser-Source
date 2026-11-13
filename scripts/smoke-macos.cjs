const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const mac = require('../macBrowser');
const BrowserLauncher = require('../browserLauncher');

(async () => {
  assert.equal(process.platform, 'darwin', 'Native macOS required');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'sv-mac-smoke-'));
  const launcher = new BrowserLauncher(path.join(temp, 'profiles'));
  launcher.driverDataDir = path.join(temp, 'drivers');
  try {
    const cores = await mac.catalogue();
    const core = cores.find(c => c.canInstall);
    if (!core) {
      for (const item of cores) await assert.rejects(mac.install(launcher.driverDataDir, item.downloadUrl, console.log, item.name, item), /mã nguồn|Link|core|kiến trúc/);
      console.log('Core API has no compatible Mac binaries for this architecture. Invalid or incompatible packages are rejected; native browser launch test not run.');
      return;
    }
    await mac.install(launcher.driverDataDir, core.downloadUrl, console.log, core.name, core);
    assert.equal(launcher.getAvailableChromiumCores()[0].version, core.version);
    for (const id of ['mac-profile-a', 'mac-profile-b']) {
      const result = await launcher.launchProfile({ id, name: id, browserType: 'chrome', version: core.version, proxy: 'No Proxy' }, null, { headless: true });
      assert.equal(result.success, true, JSON.stringify(result));
      const port = result.port;
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      assert.equal(response.ok, true);
      assert.ok((await response.json()).webSocketDebuggerUrl);
    }
    assert.equal(launcher.runningProfiles.size, 2);
    console.log('PASS: two native Mac Chrome profiles run concurrently with separate data directories and working CDP.');
  } finally {
    launcher.closeAllProfiles();
    await new Promise(resolve => setTimeout(resolve, 1500));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
