const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, spawn, exec } = require('child_process');

// Tự động nạp cấu hình từ file .env nếu tồn tại
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envPath);
    } else {
      const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of envLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const k = trimmed.slice(0, idx).trim();
            const v = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
            if (process.env[k] === undefined) process.env[k] = v;
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Env] Không thể nạp file .env:', e.message);
  }
}

const LicenseManager = require('./licenseManager');
const BrowserLauncher = require('./browserLauncher');
const ProfileStore = require('./profileStore');
const ProxyStore = require('./proxyStore');
const ExtensionStore = require('./extensionStore');
const GpmApiServer = require('./gpmApiServer');
const ProxyChecker = require('./proxyChecker');
const { preserveDrivers } = require('./driverStorage');
const { createAppUpdater } = require('./appUpdater');

let mainWindow = null;
const appDataDir = path.join(app.getPath('userData'), 'SVBrowserData');
const legacyGpmData = path.join(app.getPath('userData'), 'GPMData');
if (!fs.existsSync(appDataDir)) {
  if (fs.existsSync(legacyGpmData)) {
    try {
      fs.cpSync(legacyGpmData, appDataDir, { recursive: true });
    } catch (e) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }
  } else {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
}

const resourceBase = app.isPackaged ? process.resourcesPath : __dirname;
const defaultStorageDir = app.isPackaged ? path.join(appDataDir, 'profiles_data') : path.join(__dirname, 'profiles_data');

const DriverIconManager = require('./driverIconManager');
const driverIconManager = new DriverIconManager(resourceBase);
try {
  driverIconManager.syncAllDriverIcons();
} catch (e) {
  console.error('Lỗi khi tự động đồng bộ icon driver:', e);
}

// Khởi tạo các services
const licenseManager = new LicenseManager(appDataDir);
const profileStore = new ProfileStore(appDataDir);
const proxyStore = new ProxyStore(appDataDir);
const extensionStore = new ExtensionStore(resourceBase, appDataDir);
const savedSettings = profileStore.getSettings();
const initialStorageDir = savedSettings.localStoragePath || defaultStorageDir;
const browserLauncher = new BrowserLauncher(initialStorageDir);
browserLauncher.driverDataDir = path.join(appDataDir, 'drivers');
browserLauncher.setExtensionStore(extensionStore);
browserLauncher.setProfileStore(profileStore);
browserLauncher.setLicenseManager(licenseManager);

// Khởi động REST API Gateway (chuẩn SV Browser / GPMLogin cổng 8725 hoặc theo cài đặt riêng)
const defaultPort = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 8725;
const initialPort = savedSettings.apiPort ? parseInt(savedSettings.apiPort, 10) : defaultPort;
const allowRemote = (savedSettings.allowRemoteInternet !== undefined)
  ? savedSettings.allowRemoteInternet
  : (process.env.ALLOW_REMOTE_INTERNET === 'true');
const gpmApiServer = new GpmApiServer(profileStore, browserLauncher, initialPort, allowRemote, licenseManager, extensionStore);
gpmApiServer.start();

function createWindow() {
  const iconCandidate = path.join(resourceBase, 'assets', process.platform === 'darwin' ? 'icon.png' : 'icon.ico');
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1080,
    minHeight: 650,
    frame: false, // Frameless window để có giao diện hiện đại như ảnh
    backgroundColor: '#ffffff',
    icon: fs.existsSync(iconCandidate) ? iconCandidate : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximize-changed', true);
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximize-changed', false);
    }
  });

  // Lắng nghe sự kiện browser launcher để báo về UI
  browserLauncher.on('profile-opened', async (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('profile-status-changed', {
        profileId: data.profileId,
        isRunning: true,
        pid: data.pid
      });
    }

    // Tự động chạy ngầm kiểm tra IP và Quốc gia, rồi cập nhật vào profile và UI
    try {
      const ipResult = await profileStore.checkIpAndCountry(data.profileId);
      if (ipResult && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('profile-ip-updated', {
          profileId: data.profileId,
          ip: ipResult.ip,
          country: ipResult.country
        });
      }
    } catch (e) {}
  });

  browserLauncher.on('profile-closed', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('profile-status-changed', {
        profileId: data.profileId,
        isRunning: false,
        error: data.error
      });
    }
  });

  // Chạy ngầm tự động kiểm tra / đồng bộ bản quyền với server định kỳ mỗi 30 giây
  licenseManager.startAutoSync(30, (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('license:status-changed', status);
    }
  });

  mainWindow.on('closed', () => {
    licenseManager.stopAutoSync();
    mainWindow = null;
  });
}

// Window IPC
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// License IPC
ipcMain.handle('license:check', async () => {
  return licenseManager.checkStatus();
});

ipcMain.handle('license:get-hwid', async () => {
  return licenseManager.getHWID();
});

ipcMain.handle('license:activate', async (event, key) => {
  return licenseManager.activate(key);
});

ipcMain.handle('license:generate-admin-key', async (event, options) => {
  const res = licenseManager.generateKey(options);
  // Lưu lịch sử
  const historyFile = path.join(appDataDir, 'keys_history.json');
  let history = [];
  try {
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
  } catch (e) {}
  history.unshift({
    key: res.key,
    ...res.payload,
    generatedAt: new Date().toISOString()
  });
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');
  return res;
});

ipcMain.handle('license:get-history', async () => {
  const historyFile = path.join(appDataDir, 'keys_history.json');
  try {
    if (fs.existsSync(historyFile)) {
      return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
  } catch (e) {}
  return [];
});

// Profiles IPC
ipcMain.handle('profiles:get-all', async () => {
  const list = profileStore.getAllProfiles();
  // Cập nhật trạng thái running thực tế và debugPort
  return list.map(p => {
    const running = (typeof browserLauncher.getRunningProfile === 'function')
      ? browserLauncher.getRunningProfile(p.id)
      : ((typeof browserLauncher.getRunningInfo === 'function') ? browserLauncher.getRunningInfo(p.id) : null);
    return {
      ...p,
      status: running ? 'running' : 'ready',
      debugPort: running ? running.debugPort : (p.debugPort || null),
      remote_debugging_address: running ? running.remote_debugging_address : null
    };
  });
});

ipcMain.handle('profiles:create', async (event, data) => {
  const lic = await licenseManager.checkStatus();
  if (!lic || !lic.isActivated || lic.isExpired) {
    return { success: false, message: 'Bản quyền chưa được kích hoạt hoặc đã hết hạn. Vui lòng nhập License Key hợp lệ!' };
  }
  return profileStore.createProfile(data);
});

ipcMain.handle('profiles:batch-create', async (event, options) => {
  const lic = await licenseManager.checkStatus();
  if (!lic || !lic.isActivated || lic.isExpired) {
    return { success: false, message: 'Bản quyền chưa được kích hoạt hoặc đã hết hạn. Vui lòng nhập License Key hợp lệ!' };
  }
  return profileStore.batchCreate(options);
});

ipcMain.handle('profiles:update', async (event, id, data) => {
  return profileStore.updateProfile(id, data);
});

ipcMain.handle('profiles:reorder', async (event, orderedIds) => {
  const ok = profileStore.reorderProfiles(orderedIds);
  return { success: ok };
});

ipcMain.handle('profiles:delete', async (event, id, options = {}) => {
  browserLauncher.closeProfile(id);
  return profileStore.deleteProfile(id, options);
});

ipcMain.handle('profiles:delete-multiple', async (event, ids, options = {}) => {
  if (Array.isArray(ids)) {
    ids.forEach(id => browserLauncher.closeProfile(id));
    return profileStore.deleteMultiple(ids, options);
  }
  return false;
});

// Trash IPC (Thùng rác)
ipcMain.handle('trash:get-all', async () => {
  return profileStore.getTrashProfiles();
});

ipcMain.handle('trash:restore', async (event, ids) => {
  return profileStore.restoreProfiles(ids);
});

ipcMain.handle('trash:delete', async (event, ids) => {
  return profileStore.deleteTrashProfiles(ids);
});

ipcMain.handle('trash:empty', async () => {
  return profileStore.emptyTrash();
});

// Proxy IPC (Quản lý Proxy)
ipcMain.handle('proxy:get-all', async () => {
  return proxyStore.getAll();
});

ipcMain.handle('proxy:add', async (event, data) => {
  return proxyStore.addProxy(data);
});

ipcMain.handle('proxy:add-multiple', async (event, input, defaultType, tags, note) => {
  return proxyStore.addMultiple(input, defaultType, tags, note);
});

ipcMain.handle('proxy:update', async (event, id, data) => {
  return proxyStore.updateProxy(id, data);
});

ipcMain.handle('proxy:delete', async (event, id) => {
  return proxyStore.deleteProxy(id);
});

ipcMain.handle('proxy:delete-multiple', async (event, ids) => {
  return proxyStore.deleteMultiple(ids);
});

ipcMain.handle('proxy:check', async (event, id) => {
  return proxyStore.checkProxy(id);
});

ipcMain.handle('profiles:clone', async (event, id, options) => {
  return profileStore.cloneProfile(id, options);
});

ipcMain.handle('profiles:open-folder', async (event, id) => {
  const profile = profileStore.getProfile(id);
  const storagePath = profileStore.getSettings().localStoragePath || defaultStorageDir;
  const targetDir = (profile && profile.profilePath) ? profile.profilePath : path.join(storagePath, `profile_${id}`);
  if (fs.existsSync(targetDir)) {
    shell.openPath(targetDir);
    return { success: true };
  } else {
    fs.mkdirSync(targetDir, { recursive: true });
    shell.openPath(targetDir);
    return { success: true };
  }
});

// Groups IPC
ipcMain.handle('groups:get-all', async () => {
  return profileStore.getGroups();
});

ipcMain.handle('groups:add', async (event, data) => {
  return profileStore.addGroup(data);
});

ipcMain.handle('groups:update', async (event, id, data) => {
  return profileStore.updateGroup(id, data);
});

ipcMain.handle('groups:delete', async (event, id) => {
  return profileStore.deleteGroup(id);
});

// Tags IPC
ipcMain.handle('tags:get-all', async () => {
  return profileStore.getTags();
});

ipcMain.handle('tags:add', async (event, data) => {
  return profileStore.addTag(data);
});

ipcMain.handle('tags:delete', async (event, id) => {
  return profileStore.deleteTag(id);
});

// Extensions IPC
ipcMain.handle('extensions:get-all', async () => {
  return extensionStore.getAll();
});

ipcMain.handle('extensions:add-dialog', async () => {
  if (!mainWindow) return { success: false, message: 'Cửa sổ chưa sẵn sàng' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn Extension (file .zip, .crx hoặc thư mục unpacked)',
    properties: ['openFile'],
    filters: [
      { name: 'Chrome Extensions (.zip, .crx)', extensions: ['zip', 'crx'] },
      { name: 'Tất cả file', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }

  try {
    const ext = await extensionStore.addExtensionFromPath(result.filePaths[0]);
    return { success: true, extension: ext };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('extensions:add-folder-dialog', async () => {
  if (!mainWindow) return { success: false, message: 'Cửa sổ chưa sẵn sàng' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn thư mục Extension đã giải nén (chứa manifest.json)',
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }

  try {
    const ext = await extensionStore.addExtensionFromPath(result.filePaths[0]);
    return { success: true, extension: ext };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('extensions:add-url', async (event, urlOrId) => {
  try {
    const ext = await extensionStore.addExtensionFromUrl(urlOrId);
    return { success: true, extension: ext };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('extensions:toggle', async (event, folderName, enabled) => {
  return extensionStore.toggleExtension(folderName, enabled);
});

ipcMain.handle('extensions:delete', async (event, folderName) => {
  return extensionStore.deleteExtension(folderName);
});

ipcMain.handle('extensions:open-folder', async (event, folderName) => {
  return extensionStore.openFolder(folderName);
});

// Browser Launcher IPC
ipcMain.handle('browser:launch', async (event, profileId, profileIndex, options) => {
  // 0. KIỂM TRA BẢN QUYỀN TRƯỚC KHI MỞ BẤT KỲ TRÌNH DUYỆT NÀO
  const lic = await licenseManager.checkStatus();
  if (!lic || !lic.isActivated || lic.isExpired) {
    return {
      success: false,
      message: lic?.message || 'Bản quyền chưa được kích hoạt hoặc đã hết hạn. Vui lòng nhập License Key hợp lệ để mở profile!'
    };
  }

  const profile = profileStore.getProfile(profileId);
  if (!profile) {
    return { success: false, message: 'Không tìm thấy profile' };
  }

  // 1. KIỂM TRA IP TRƯỚC KHI MỞ CHROME
  let detectedIp = profile.ip || '';
  let detectedCountry = profile.proxyCountry || '';

  if (profile.proxy && profile.proxy.trim() && profile.proxy.toLowerCase() !== 'no proxy') {
    // Có proxy: kiểm tra proxy có hoạt động không trước khi mở
    const proxyCheck = await ProxyChecker.testProxy(profile.proxy, profile.proxyType);
    if (!proxyCheck.live) {
      // Proxy chết/không kết nối được -> KHÔNG mở Chrome, đổi trạng thái thành No connection
      profileStore.updateProfile(profileId, { status: 'No connection' });
      return {
        success: false,
        status: 'No connection',
        message: `Proxy ${profile.proxy} không kết nối được (No connection). Đã hủy mở trình duyệt!`
      };
    } else {
      detectedIp = proxyCheck.ip;
      detectedCountry = proxyCheck.country || 'us';
      profileStore.updateProfile(profileId, {
        status: 'Live',
        proxyCountry: detectedCountry,
        ip: detectedIp
      });
    }
  } else {
    // Không dùng proxy (Direct): kiểm tra IP máy hiện tại
    try {
      const directCheck = await ProxyChecker.checkDirect();
      if (directCheck && directCheck.live) {
        detectedIp = directCheck.ip;
        detectedCountry = directCheck.country || 'vn';
        profileStore.updateProfile(profileId, {
          status: 'Live',
          proxyCountry: detectedCountry,
          ip: detectedIp
        });
      }
    } catch (e) {}
  }

  // Cập nhật thông tin IP & Quốc gia lên UI ngay lập tức
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('profile-ip-updated', {
      profileId,
      ip: detectedIp,
      country: detectedCountry
    });
  }

  // 2. TÍNH TOÁN NGÔN NGỮ (LANG) THEO IP / QUỐC GIA
  const langFromIp = ProxyChecker.getLangFromCountry(detectedCountry);
  const profileCustomLang = (profile.language && profile.language !== 'Auto')
    ? profile.language
    : ((profile.software && profile.software.language && profile.software.language !== 'Auto')
      ? profile.software.language
      : null);
  const finalLang = profileCustomLang || langFromIp || 'vi';

  const launchOpts = {
    ...(options || {}),
    detectedLang: finalLang,
    detectedCountry,
    detectedIp
  };

  // Cập nhật thời gian chạy cuối
  profileStore.updateProfile(profileId, { lastRun: 'Vừa xong' });
  return browserLauncher.launchProfile(profile, profileIndex, launchOpts);
});

// Proxy Check IPC (Chuẩn Ảnh 2, 3, 4)
ipcMain.handle('profiles:check-proxy', async (event, profileId) => {
  const profile = profileStore.getProfile(profileId);
  if (!profile) return { success: false, message: 'Không tìm thấy profile' };

  const res = await ProxyChecker.testProxy(profile.proxy, profile.proxyType);
  const updatedData = {
    status: res.status, // 'Live' hoặc 'No connection'
    proxyCountry: res.country || profile.proxyCountry || 'vn',
    ip: res.ip || profile.ip
  };
  profileStore.updateProfile(profileId, updatedData);
  return { success: true, result: res, profileId };
});

ipcMain.handle('proxy:test-string', async (event, proxyStr, proxyType) => {
  return ProxyChecker.testProxy(proxyStr, proxyType);
});

// Clear Cache & Free Disk Space IPC (Bảo toàn Cookie & Đăng nhập)
ipcMain.handle('profiles:clear-cache', async (event, profileId) => {
  const isRunning = (typeof browserLauncher.isProfileRunning === 'function') ? browserLauncher.isProfileRunning(profileId) : false;
  return profileStore.freeProfileDiskSpace(profileId, isRunning);
});

ipcMain.handle('profiles:free-disk-space', async (event, profileId) => {
  const isRunning = (typeof browserLauncher.isProfileRunning === 'function') ? browserLauncher.isProfileRunning(profileId) : false;
  return profileStore.freeProfileDiskSpace(profileId, isRunning);
});

ipcMain.handle('profiles:free-bulk-disk-space', async (event, profileIds) => {
  return profileStore.freeBulkDiskSpace(profileIds, (id) => {
    return (typeof browserLauncher.isProfileRunning === 'function') ? browserLauncher.isProfileRunning(id) : false;
  });
});

// Cookie Dialog & Import IPC (Chuẩn Ảnh 1)
ipcMain.handle('dialog:select-cookie-file', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select cookie file',
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Cookie / Text / JSON Files', extensions: ['txt', 'json', 'cookies'] }
    ]
  });
  if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
    const filePath = res.filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, filePath, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { canceled: true };
});

ipcMain.handle('profiles:import-cookie', async (event, profileId, cookieContent) => {
  return profileStore.importCookie(profileId, cookieContent);
});

// Export Profiles IPC (Chuẩn Hình 1, 2)
ipcMain.handle('profiles:export', async (event, profileIds, targetDir, format) => {
  try {
    return profileStore.exportProfiles(profileIds, targetDir, format, (progress) => {
      try {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('profiles:export-progress', progress);
        }
      } catch (e) {}
    });
  } catch (err) {
    console.error('Lỗi profiles:export:', err);
    return { success: false, message: err.message };
  }
});

// Import Profiles IPC (Chuẩn Hình ảnh người dùng)
ipcMain.handle('profiles:import', async (event, options) => {
  try {
    return profileStore.importProfiles(options || {}, (progress) => {
      try {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('profiles:import-progress', progress);
        }
      } catch (e) {}
    });
  } catch (err) {
    console.error('Lỗi profiles:import:', err);
    return { success: false, error: err.message };
  }
});

// Export Cookies IPC (Chuẩn Hình 1)
ipcMain.handle('profiles:export-cookies', async (event, profileIds) => {
  if (!Array.isArray(profileIds) || profileIds.length === 0) {
    return { success: false, message: 'Chưa chọn profile nào' };
  }

  const saveRes = await dialog.showSaveDialog(mainWindow, {
    title: 'Lưu file Export Cookies',
    defaultPath: 'exported_cookies.json',
    filters: [
      { name: 'JSON File (*.json)', extensions: ['json'] },
      { name: 'Text File (*.txt)', extensions: ['txt'] }
    ]
  });

  if (saveRes.canceled || !saveRes.filePath) {
    return { canceled: true };
  }

  const cookiesResult = [];
  for (const id of profileIds) {
    const profile = profileStore.getProfile(id);
    if (!profile) continue;
    let cookieData = profile.cookies || null;
    if (typeof cookieData === 'string') {
      try {
        cookieData = JSON.parse(cookieData);
      } catch (e) {}
    }
    cookiesResult.push({
      profileId: id,
      profileName: profile.name,
      cookies: cookieData
    });
  }

  try {
    fs.writeFileSync(saveRes.filePath, JSON.stringify(cookiesResult, null, 2), 'utf8');
    return { success: true, filePath: saveRes.filePath, count: cookiesResult.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Bulk Randomize Fingerprint IPC
ipcMain.handle('profiles:randomize-fingerprint', async (event, profileIds) => {
  if (!Array.isArray(profileIds) || profileIds.length === 0) {
    return { success: false, message: 'Chưa chọn profile nào' };
  }
  let count = 0;
  for (const id of profileIds) {
    const p = profileStore.getProfile(id);
    if (!p) continue;
    const newFp = profileStore.generateFingerprint(p.os, p.browserType, p.version);
    profileStore.updateProfile(id, { fingerprint: newFp });
    count++;
  }
  return { success: true, count };
});


ipcMain.handle('browser:close', async (event, profileId) => {
  return browserLauncher.closeProfile(profileId);
});

ipcMain.handle('browser:is-running', async (event, profileId) => {
  return browserLauncher.isProfileRunning(profileId);
});

ipcMain.handle('browser:detect', async () => {
  return browserLauncher.detectBrowsers();
});

ipcMain.handle('browser:get-cores', async () => {
  return browserLauncher.getAvailableChromiumCores();
});

const { normalizeCores, platformName, downloadError } = require('./coreCatalog');
let availableCoreDownloads = [];
const DriverDownloader = require('./driverDownloader');
const driverDownloader = new DriverDownloader(resourceBase, appDataDir);

ipcMain.handle('driver:download-core', async (event, downloadUrl, coreName, forceReinstall = false) => {
  const core = availableCoreDownloads.find(item => item.downloadUrl === downloadUrl && item.name === coreName && item.platform === platformName(process.platform));
  if (!core) throw Error('Core không thuộc hệ điều hành này hoặc danh sách đã đổi. Hãy làm mới danh sách core.');
  if (!core.canInstall) throw Error(core.downloadError || 'Core không tương thích máy này.');
  const error = downloadError(downloadUrl, core.platform);
  if (error) throw Error(error);
  return driverDownloader.downloadAndInstall(downloadUrl, (msg) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('driver:download-progress', { coreName, msg });
    }
  }, coreName, forceReinstall, core);
});

ipcMain.handle('app:get-version', () => app.getVersion());

/**
 * Hàm so sánh hai chuỗi phiên bản semver (vd: '1.0.46' và '1.0.47')
 * Trả về: 1 nếu v1 > v2, -1 nếu v1 < v2, 0 nếu bằng nhau
 */
function compareSemver(v1, v2) {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();
  const base1 = clean1.split('-')[0];
  const base2 = clean2.split('-')[0];
  const parts1 = base1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = base2.split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Kiểm tra cập nhật ứng dụng SV Browser từ GitHub Releases (giống cơ chế GPMAutomateEditor)
 */
const appUpdater = createAppUpdater(async () => {
  await preserveDrivers(appDataDir, [path.join(resourceBase, 'drivers'), path.join(path.dirname(process.execPath), 'drivers')]);
});
async function checkGitHubAppUpdate() { return appUpdater.check(); }
ipcMain.handle('app:check-update', checkGitHubAppUpdate);

ipcMain.handle('driver:get-update-list', async (event, customServerUrl) => {
  const localCores = browserLauncher.getAvailableChromiumCores();
  const currentAppVersion = app.getVersion();

  // Mặc định tự động kết nối đến server updates/cores của SV Browser
  const DEFAULT_UPDATE_SERVER_URL = 'https://api.svbrowser.site/api/v1/updates/cores';
  const targetServerUrl = (customServerUrl && typeof customServerUrl === 'string' && customServerUrl.startsWith('http'))
    ? customServerUrl.trim()
    : DEFAULT_UPDATE_SERVER_URL;

  let serverAppVersion = currentAppVersion;

  // 1. Kiểm tra song song cả GitHub Releases (App update) và API Cores
  const [appUpdateInfo, coresResponse] = await Promise.all([
    checkGitHubAppUpdate(),
    (async () => {
      try {
        const res = await fetch(targetServerUrl, { signal: AbortSignal.timeout(6000) });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('Không thể kết nối đến server cập nhật cores:', e.message);
      }
      return null;
    })()
  ]);

  if (appUpdateInfo && appUpdateInfo.latestVersion) {
    serverAppVersion = appUpdateInfo.latestVersion;
  }

  if (coresResponse?.appVersion) serverAppVersion = coresResponse.appVersion;
  const coreList = normalizeCores(coresResponse);
  availableCoreDownloads = coreList;

  const results = coreList.map(item => {
    const matchedLocal = localCores.find(c => item.version.includes('.')
      ? c.version === item.version
      : c.name.toLowerCase() === item.name.toLowerCase() ||
        (item.majorVersion && String(c.majorVersion) === String(item.majorVersion)));
    const isInstalled = Boolean(matchedLocal);
    return {
      ...item,
      isInstalled,
      installedVersion: matchedLocal ? matchedLocal.version : null,
      installedPath: matchedLocal ? matchedLocal.path : null
    };
  });

  return {
    appVersion: currentAppVersion,
    installedAppVersion: currentAppVersion,
    serverAppVersion: serverAppVersion,
    hasAppUpdate: Boolean(appUpdateInfo && appUpdateInfo.hasUpdate),
    appUpdateInfo: appUpdateInfo,
    serverUrl: targetServerUrl,
    driversCount: localCores.length,
    cores: results
  };
});

// Settings & Dialog IPC
ipcMain.handle('settings:get', async () => {
  return profileStore.getSettings();
});

ipcMain.handle('settings:update', async (event, newSettings) => {
  const updated = profileStore.updateSettings(newSettings);
  if (newSettings.localStoragePath) {
    browserLauncher.setBaseDataDir(newSettings.localStoragePath);
  }
  if (newSettings.apiPort !== undefined || newSettings.allowRemoteInternet !== undefined) {
    gpmApiServer.restart(newSettings.apiPort, newSettings.allowRemoteInternet);
  }
  return updated;
});

// API Gateway IPC
ipcMain.handle('api-gateway:get-status', async () => {
  return gpmApiServer.getStatus();
});

ipcMain.handle('api-gateway:restart', async (event, port, allowRemote) => {
  profileStore.updateSettings({ apiPort: port, allowRemoteInternet: allowRemote });
  return gpmApiServer.restart(port, allowRemote);
});

ipcMain.handle('api-gateway:test', async () => {
  return gpmApiServer.test();
});

ipcMain.handle('api-gateway:open-external', async (event, url) => {
  if (url) shell.openExternal(url);
  return true;
});

ipcMain.handle('dialog:select-directory', async (event, defaultPath) => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: defaultPath || undefined,
    title: 'Chọn thư mục'
  });
  if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
    return res.filePaths[0];
  }
  return null;
});

ipcMain.handle('dialog:select-zip-file', async (event) => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn file Zip profile',
    filters: [
      { name: 'Zip files (*.zip)', extensions: ['zip'] },
      { name: 'All files (*.*)', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  });
  if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
    return res.filePaths;
  }
  return null;
});

// Automation & SV Browser Automate Editor IPC
function findAutomateEditorInstallation() {
  const settings = profileStore.getSettings();
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidates = [
    settings.automateEditorPath,
    'D:\\Phần mềm\\GPMAutomateEditor\\release\\win-unpacked',
    'D:\\Phần mềm\\GPMAutomateEditor',
    'D:\\Phần mềm\\SV Browser Automate Editor',
    localAppData ? path.join(localAppData, 'Programs', 'SV Browser Automate Editor') : null,
    localAppData ? path.join(localAppData, 'Programs', 'sv-browser-automate-editor') : null,
    localAppData ? path.join(localAppData, 'Programs', 'GPMAutomate', 'Editor') : null,
    path.join(programFiles, 'SV Browser Automate Editor'),
    path.join(programFilesX86, 'SV Browser Automate Editor'),
    path.join(programFiles, 'GPMAutomate', 'Editor'),
    'D:\\GPMAutomateEditor',
    settings.gpmAutomatePath && settings.gpmAutomatePath !== settings.appInstallPath ? settings.gpmAutomatePath : null
  ].filter(Boolean);

  const exeCandidates = [
    'SV Browser Automate Editor.exe',
    'SV Browser Automate Editor 3.0.9.exe',
    'SV Browser Automate Editor 3.0.8.exe',
    'sv-browser-automate-editor.exe',
    'GPM Automate Editor.exe',
    'GPMAutomateEditor.exe',
    'GPMAutomate.exe',
    'GPM Automate.exe'
  ];

  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) {
        // 1. Kiểm tra trực tiếp file thực thi trong thư mục
        for (const exeName of exeCandidates) {
          const exePath = path.join(dir, exeName);
          if (fs.existsSync(exePath)) {
            return { installed: true, path: dir, executable: exePath, type: 'exe' };
          }
        }

        // 2. Kiểm tra trong thư mục con release\win-unpacked
        const winUnpacked = path.join(dir, 'release', 'win-unpacked');
        if (fs.existsSync(winUnpacked)) {
          for (const exeName of exeCandidates) {
            const exePath = path.join(winUnpacked, exeName);
            if (fs.existsSync(exePath)) {
              return { installed: true, path: winUnpacked, executable: exePath, type: 'exe' };
            }
          }
        }

        // 3. Kiểm tra trong thư mục con release
        const releaseDir = path.join(dir, 'release');
        if (fs.existsSync(releaseDir)) {
          for (const exeName of exeCandidates) {
            const exePath = path.join(releaseDir, exeName);
            if (fs.existsSync(exePath)) {
              return { installed: true, path: releaseDir, executable: exePath, type: 'exe' };
            }
          }
        }

        // 4. Kiểm tra file launcher Chay_Phan_Mem.bat
        const batPath = path.join(dir, 'Chay_Phan_Mem.bat');
        if (fs.existsSync(batPath)) {
          return { installed: true, path: dir, executable: batPath, type: 'bat' };
        }

        // 5. Kiểm tra electron runtime có sẵn
        const electronCli = path.join(dir, 'node_modules', 'electron', 'cli.js');
        const electronExe = path.join(dir, 'node_modules', 'electron', 'dist', 'electron.exe');
        if (fs.existsSync(electronCli) || fs.existsSync(electronExe)) {
          return { installed: true, path: dir, executable: electronExe || electronCli, type: 'electron' };
        }

        // 6. Thư mục tồn tại kèm package.json
        if (fs.existsSync(path.join(dir, 'package.json'))) {
          return { installed: true, path: dir, executable: null, type: 'folder' };
        }
      }
    } catch (err) {}
  }

  return {
    installed: false,
    targetPath: settings.automateEditorPath || 'D:\\Phần mềm\\GPMAutomateEditor',
    downloadUrl: 'https://svbrowser.site/',
    appStoreUrl: 'https://svbrowser.site/',
    docsUrl: 'http://localhost:8725/'
  };
}

const findGpmAutomateInstallation = findAutomateEditorInstallation;

ipcMain.handle('app:get-install-info', async () => {
  const exePath = process.execPath;
  const installDir = app.isPackaged ? path.dirname(exePath) : path.resolve(__dirname);
  return {
    installDir,
    exePath,
    appName: 'SV Browser',
    isPackaged: app.isPackaged
  };
});

ipcMain.handle('system:open-folder', async (event, folderPath) => {
  const target = folderPath || (app.isPackaged ? path.dirname(process.execPath) : path.resolve(__dirname));
  if (fs.existsSync(target)) {
    shell.openPath(target);
    return true;
  }
  return false;
});

ipcMain.handle('automation:check-installed', async () => {
  return findAutomateEditorInstallation();
});

ipcMain.handle('automation:set-path', async (event, customPath) => {
  if (customPath && fs.existsSync(customPath)) {
    profileStore.updateSettings({ automateEditorPath: customPath });
    return findAutomateEditorInstallation();
  }
  return { success: false, error: 'Đường dẫn không tồn tại!' };
});

ipcMain.handle('automation:launch', async () => {
  const info = findAutomateEditorInstallation();
  if (!info.installed) {
    return { success: false, error: 'Chưa cài đặt SV Browser Automate Editor' };
  }

  try {
    const dir = info.path;
    const batPath = path.join(dir, 'Chay_Phan_Mem.bat');
    const electronExe = path.join(dir, 'node_modules', 'electron', 'dist', 'electron.exe');

    if (info.type === 'exe' && info.executable && fs.existsSync(info.executable)) {
      const child = spawn(info.executable, [], {
        cwd: path.dirname(info.executable),
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      return { success: true, path: dir, executable: info.executable };
    } else if (fs.existsSync(batPath)) {
      const child = spawn('cmd.exe', ['/c', 'start', '""', batPath], {
        cwd: dir,
        detached: true,
        stdio: 'ignore',
        shell: false
      });
      child.unref();
      return { success: true, path: dir, executable: batPath };
    } else if (fs.existsSync(electronExe)) {
      const child = spawn(electronExe, ['.'], {
        cwd: dir,
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      return { success: true, path: dir, executable: electronExe };
    } else {
      return { success: false, error: 'Không tìm thấy file thực thi phù hợp trong thư mục.' };
    }
  } catch (err) {
    console.error('Lỗi khi mở SV Browser Automate Editor:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('automation:open-folder', async () => {
  const info = findAutomateEditorInstallation();
  const folderToOpen = info.installed ? info.path : (profileStore.getSettings().automateEditorPath || 'D:\\Phần mềm\\GPMAutomateEditor');
  if (fs.existsSync(folderToOpen)) {
    shell.openPath(folderToOpen);
    return true;
  }
  return false;
});

// App Lifecycle
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(resourceBase, 'assets', 'icon.png'));
  }
  createWindow();
  preserveDrivers(appDataDir, [path.join(resourceBase, 'drivers'), path.join(path.dirname(process.execPath), 'drivers')])
    .catch(error => console.error('[Driver migration]', error.message));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  licenseManager.stopAutoSync();
  browserLauncher.closeAllProfiles();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
