const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const run = promisify(execFile);
function watchMacMullvad(running, onClosed, options = {}) {
  const group = running.pid; // spawn(detached:true) creates a dedicated POSIX process group.
  if (!Number.isInteger(group) || group <= 1) throw Error('Invalid Mullvad process group');
  const signal = options.signal || ((name) => process.kill(-group, name));
  const alive = options.alive || (() => { try { signal(0); return true; } catch (e) { if (e.code === 'ESRCH') return false; throw e; } });
  const windows = options.windows || (async () => {
    const helper = path.join(process.resourcesPath || __dirname, 'assets', 'mac-window-state');
    const { stdout } = await run(helper, [String(group)], { timeout: 4000, maxBuffer: 65536 });
    const ids = JSON.parse(stdout);
    if (!Array.isArray(ids) || !ids.every(Number.isInteger)) throw Error('Invalid window state');
    return ids;
  });
  let disposed = false, busy = false, seenWindow = false, empty = 0, closingAt = null, forced = false;
  let timer;
  const dispose = () => { disposed = true; clearInterval(timer); };
  const close = () => {
    if (disposed || closingAt !== null) return;
    if (!alive()) { dispose(); onClosed(); return; }
    signal('SIGTERM');
    closingAt = Date.now();
  };
  const poll = async () => {
    if (disposed || busy) return;
    busy = true;
    try {
      if (!alive()) { dispose(); onClosed(); return; }
      if (closingAt !== null) {
        if (!forced && Date.now() - closingAt >= 3000) { signal('SIGKILL'); forced = true; }
        return;
      }
      if (running.isHeadless) return;
      const ids = await windows();
      if (disposed || closingAt !== null) return;
      if (ids.length) { seenWindow = true; empty = 0; }
      else if (seenWindow && ++empty >= 2) close();
    } catch (error) {
      // Unknown window state must never close a still-running browser.
      empty = 0;
      options.onError?.(error);
    } finally { busy = false; }
  };
  if (options.interval !== false) { timer = setInterval(poll, 1000); timer.unref?.(); }
  return { close, poll, dispose };
}
module.exports = { watchMacMullvad };
