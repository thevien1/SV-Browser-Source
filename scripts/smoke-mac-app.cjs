const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

(async () => {
  assert.equal(process.platform, 'darwin');
  const version = require('../package.json').version;
  const binary = path.resolve('dist-mac', process.arch, process.arch === 'arm64' ? 'mac-arm64' : 'mac', 'SV Browser.app', 'Contents', 'MacOS', 'SV Browser');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'sv-app-smoke-'));
  const child = spawn(binary, ['--remote-debugging-port=59222', `--user-data-dir=${temp}`], { stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk.toString(); });
  child.on('error', error => { errors += error.message; });
  try {
    let renderer;
    for (let n = 0; n < 60; n++) {
      if (child.exitCode !== null || child.signalCode !== null) throw Error(`App exited: ${errors}`);
      try {
        const pages = await (await fetch('http://127.0.0.1:59222/json/list')).json();
        renderer = pages.find(p => p.type === 'page' && p.url.includes('index.html'));
        if (renderer) break;
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
    assert.ok(renderer, `App renderer did not start: ${errors}`);
    const ws = new WebSocket(renderer.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    try {
      let found = false;
      for (let n = 0; n < 30; n++) {
        const reply = new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(Error('Renderer did not respond')), 5000);
          ws.addEventListener('message', e => { clearTimeout(timer); resolve(JSON.parse(e.data)); }, { once: true });
        });
        ws.send(JSON.stringify({ id: n + 1, method: 'Runtime.evaluate', params: { expression: `Boolean(window.api && document.getElementById('profiles-tbody') && document.getElementById('titlebar-app-ver-text')?.textContent.includes('${version}'))`, returnByValue: true } }));
        const result = await reply;
        if (result.result?.result?.value === true) { found = true; break; }
        await new Promise(r => setTimeout(r, 500));
      }
      assert.ok(found, `Packaged UI or preload failed: ${errors}`);
      console.log(`PASS: packaged macOS ${process.arch} app opens, preload bridge works, profile table and version render.`);
    } finally { ws.close(); }
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
