const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

function createAppUpdater(beforeInstall) {
  const macSigned = process.platform === 'darwin' && require('./package.json').macAutoUpdateSigned === true;
  const manualMac = process.platform === 'darwin' && !macSigned;
  const supported = app.isPackaged && ['win32', 'darwin'].includes(process.platform) && !process.env.PORTABLE_EXECUTABLE_FILE;
  const unsupportedMessage = process.platform === 'darwin'
    ? 'Tự cập nhật macOS cần bản ứng dụng đã ký Developer ID. Hãy cài bản Mac đã ký từ trang phát hành.'
    : 'Tự cập nhật chỉ hỗ trợ bản Setup Windows hoặc bản macOS đã ký.';
  let state = { status: 'idle', supported, manualUpdate: manualMac, percent: 0, version: app.getVersion() };
  let checking, downloading, installing;
  let manualFallback = false;
  const publish = next => {
    state = { ...state, ...next };
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('app:update-progress', state);
    }
  };
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on('error', error => publish({ status: 'error', error: error.message }));
  autoUpdater.on('download-progress', p => publish({ status: 'downloading', percent: p.percent }));
  autoUpdater.on('update-downloaded', info => publish({ status: 'downloaded', version: info.version, percent: 100 }));
  const info = () => ({ ...state, hasUpdate: ['available', 'downloading', 'downloaded', 'preserving', 'installing'].includes(state.status),
    currentVersion: app.getVersion(), latestVersion: state.version, releaseNotes: '', releaseName: '',
    htmlUrl: state.htmlUrl || 'https://github.com/thevien1/SV-Browser/releases' });

  const checkMacSources = async () => {
    const update = await require('./macUpdates').findMacUpdate(app.getVersion());
    manualFallback = !!update;
    publish(update ? { status: 'available', version: update.version, downloadUrl: update.downloadUrl, htmlUrl: update.htmlUrl, manualUpdate: true, error: undefined }
      : { status: 'idle', version: app.getVersion(), downloadUrl: undefined, manualUpdate: manualMac, error: undefined });
    return info();
  };
  const check = async () => {
    if (!supported) return { ...info(), error: unsupportedMessage };
    if (checking) return checking;
    if (['downloading', 'downloaded', 'preserving', 'installing'].includes(state.status)) return info();
    checking = (async () => {
      try {
        manualFallback = false;
        publish({ status: 'checking', error: undefined, manualUpdate: manualMac, downloadUrl: undefined });
        if (manualMac) return await checkMacSources();
        const result = await autoUpdater.checkForUpdates();
        if (result && autoUpdater.currentVersion.compare(result.updateInfo.version) < 0) {
          publish({ status: 'downloading', version: result.updateInfo.version, percent: 0 });
          downloading = autoUpdater.downloadUpdate();
          void downloading.catch(error => publish({ status: 'error', error: error.message }));
        } else if (process.platform === 'darwin') return await checkMacSources();
        else publish({ status: 'idle' });
      } catch (error) {
        if (process.platform === 'darwin' && !manualMac) {
          try { return await checkMacSources(); }
          catch (fallbackError) { error = fallbackError; }
        }
        publish({ status: 'error', error: error.message });
      }
      return info();
    })().finally(() => { checking = null; });
    return checking;
  };
  const install = async () => {
    if (!supported) throw Error(unsupportedMessage);
    if (manualMac || manualFallback) {
      if (state.status !== 'available') await check();
      if (state.status !== 'available' || !state.downloadUrl) throw Error(state.error || 'Chưa có bản Mac mới.');
      await shell.openExternal(state.downloadUrl);
      return { success: true, manual: true };
    }
    if (installing) return installing;
    installing = (async () => {
      if (!['downloaded', 'downloading'].includes(state.status)) await check();
      if (manualFallback && state.status === 'available' && state.downloadUrl) {
        await shell.openExternal(state.downloadUrl);
        return { success: true, manual: true };
      }
      if (state.status === 'downloading' && downloading) await downloading;
      if (state.status !== 'downloaded') throw Error(state.error || 'Chưa có bản cập nhật sẵn sàng.');
      publish({ status: 'preserving', error: undefined });
      await beforeInstall();
      publish({ status: 'installing' });
      setImmediate(() => autoUpdater.quitAndInstall(true, true));
      return { success: true };
    })().catch(error => { publish({ status: 'error', error: error.message }); throw error; })
      .finally(() => { if (state.status !== 'installing') installing = null; });
    return installing;
  };
  ipcMain.handle('app:get-update-state', () => state);
  ipcMain.handle('app:install-update', install);
  return { check };
}

module.exports = { createAppUpdater };
