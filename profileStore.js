const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

class ProfileStore {
  constructor(dataDir) {
    const isAsar = __dirname.includes('app.asar');
    const defaultUserData = path.join(process.env.APPDATA || 'C:\\Windows\\Temp', 'SVBrowserData');
    this.dataDir = dataDir || (isAsar ? defaultUserData : path.join(__dirname, 'app_data'));
    if (!fs.existsSync(this.dataDir)) {
      try { fs.mkdirSync(this.dataDir, { recursive: true }); } catch (e) {}
    }

    this.profilesFilePath = path.join(this.dataDir, 'profiles.json');
    this.trashFilePath = path.join(this.dataDir, 'trash.json');
    this.groupsFilePath = path.join(this.dataDir, 'groups.json');
    this.tagsFilePath = path.join(this.dataDir, 'tags.json');
    this.settingsFilePath = path.join(this.dataDir, 'settings.json');

    // Mặc định lưu profiles_data tại thư mục có thể ghi (UserData hoặc cạnh app nếu dev)
    this.localStorageDefault = (isAsar || !fs.existsSync(path.join(__dirname, 'profiles_data')))
      ? path.join(this.dataDir, 'profiles_data')
      : path.join(__dirname, 'profiles_data');

    if (!fs.existsSync(this.localStorageDefault)) {
      try {
        fs.mkdirSync(this.localStorageDefault, { recursive: true });
      } catch (e) {}
    }

    this.profiles = [];
    this.trash = [];
    this.groups = ['Default group'];
    this.tags = [];
    const appInstallDir = isAsar ? path.dirname(process.execPath) : path.resolve(__dirname);

    this.settings = {
      theme: 'light',
      language: 'vi',
      defaultBrowser: 'chrome',
      useGpu: false,
      localStoragePath: this.localStorageDefault,
      hasConfiguredStoragePath: false,
      privateServerUrl: 'https://',
      gpmAutomatePath: appInstallDir,
      appInstallPath: appInstallDir,
      automateEditorPath: 'D:\\Phần mềm\\GPMAutomateEditor',
      ipServer: 'Public server 02 - myip.link',
      // Browser trigger & settings (Chuẩn Hình 1)
      autoClearCache: true,
      limitBrowserSize: true,
      restoreLastSession: false,
      startupUrl: '',
      chromeParams: '',
      bookmarks: '',
      canvasMode: 'noise',
      clientRectMode: 'noise',
      webglImageMode: 'noise',
      webglMetaMode: 'masked',
      audioMode: 'noise',
      fontMode: 'masked',
      screenMode: 'random',
      languageMode: 'ip',
      // API Gateway (Chuẩn Hình 2)
      apiPort: 8725,
      allowRemoteInternet: false
    };

    this.loadData();
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(newSettings) {
    if (newSettings.localStoragePath) {
      newSettings.hasConfiguredStoragePath = true;
      try {
        if (!fs.existsSync(newSettings.localStoragePath)) {
          fs.mkdirSync(newSettings.localStoragePath, { recursive: true });
        }
      } catch (e) {}
    }
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    return this.settings;
  }

  loadData() {
    let settingsFileExists = false;
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        settingsFileExists = true;
        this.settings = { ...this.settings, ...JSON.parse(fs.readFileSync(this.settingsFilePath, 'utf8')) };
      }
      if (this.settings.localStoragePath && this.settings.localStoragePath.includes('app.asar')) {
        this.settings.localStoragePath = this.localStorageDefault;
      }
      // Nếu chưa có file settings.json hoặc chưa được lưu, đánh dấu chưa cấu hình
      if (!settingsFileExists) {
        this.settings.hasConfiguredStoragePath = false;
      } else if (this.settings.hasConfiguredStoragePath === undefined) {
        this.settings.hasConfiguredStoragePath = !!(this.settings.localStoragePath && fs.existsSync(this.settings.localStoragePath));
      }

      // Tự động nhận diện đường dẫn cài đặt thực tế của ứng dụng SV Browser
      const isAsar = __dirname.includes('app.asar');
      const appInstallDir = isAsar ? path.dirname(process.execPath) : path.resolve(__dirname);
      this.settings.appInstallPath = appInstallDir;
      if (!this.settings.automateEditorPath) {
        this.settings.automateEditorPath = 'D:\\Phần mềm\\GPMAutomateEditor';
      }
      if (!this.settings.gpmAutomatePath || this.settings.gpmAutomatePath.includes('Admin\\AppData')) {
        this.settings.gpmAutomatePath = appInstallDir;
      }
    } catch (e) {}

    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    if (!fs.existsSync(storagePath)) {
      try { fs.mkdirSync(storagePath, { recursive: true }); } catch (e) {}
    }

    try {
      if (fs.existsSync(this.profilesFilePath)) {
        this.profiles = JSON.parse(fs.readFileSync(this.profilesFilePath, 'utf8'));
        // Đảm bảo raw_proxy luôn đồng bộ chính xác với proxy hiện tại
        let hasFix = false;
        for (const p of this.profiles) {
          const currentProxy = (p.proxy && p.proxy !== 'No Proxy') ? p.proxy.trim() : '';
          if (currentProxy && p.raw_proxy !== currentProxy) {
            p.raw_proxy = currentProxy;
            hasFix = true;
          } else if (!currentProxy && p.raw_proxy) {
            p.raw_proxy = '';
            hasFix = true;
          }
        }
        if (hasFix) {
          this.saveProfiles();
        }
      } else {
        this.profiles = [];
        this.saveProfiles();
      }
    } catch (e) {
      console.error('Lỗi load profiles:', e);
      this.profiles = [];
    }

    try {
      if (fs.existsSync(this.trashFilePath)) {
        this.trash = JSON.parse(fs.readFileSync(this.trashFilePath, 'utf8'));
      } else {
        this.trash = [];
        this.saveTrash();
      }
    } catch (e) {
      console.error('Lỗi load trash:', e);
      this.trash = [];
    }

    // Đồng bộ profiles trong JSON với các folder thực tế trong profiles_data
    this.syncProfilesWithFileSystem();

    try {
      if (fs.existsSync(this.groupsFilePath)) {
        const rawGroups = JSON.parse(fs.readFileSync(this.groupsFilePath, 'utf8'));
        this.groups = this.normalizeGroups(rawGroups);
      } else {
        this.groups = [
          { id: 'default', name: 'Default group', order: 0, creator: this.getDefaultCreator(), createdAt: Date.now() }
        ];
        this.saveGroups();
      }
    } catch (e) {
      this.groups = [
        { id: 'default', name: 'Default group', order: 0, creator: this.getDefaultCreator(), createdAt: Date.now() }
      ];
    }

    try {
      if (fs.existsSync(this.tagsFilePath)) {
        const rawTags = JSON.parse(fs.readFileSync(this.tagsFilePath, 'utf8'));
        this.tags = Array.isArray(rawTags) ? rawTags : [];
      } else {
        const tagSet = new Set(['US', 'Facebook', 'VIP', 'TikTok', 'Google', 'Zalo']);
        for (const p of this.profiles) {
          if (Array.isArray(p.tags)) {
            p.tags.forEach(t => { if (typeof t === 'string' && t.trim()) tagSet.add(t.trim()); });
          } else if (typeof p.tags === 'string' && p.tags.trim()) {
            p.tags.split(/[,;\s]+/).forEach(t => { if (t.trim()) tagSet.add(t.trim()); });
          }
        }
        this.tags = Array.from(tagSet).map(name => ({
          id: this.generateUuid(),
          name,
          color: '#0284c7',
          createdAt: Date.now()
        }));
        this.saveTags();
      }
    } catch (e) {
      this.tags = [];
    }
  }

  getDefaultCreator() {
    return process.env.COMPUTERNAME || os.hostname() || 'DESKTOP-AVFTTS1';
  }

  normalizeGroups(raw) {
    if (!Array.isArray(raw)) {
      return [{ id: 'default', name: 'Default group', order: 0, creator: this.getDefaultCreator(), createdAt: Date.now() }];
    }
    const defaultCreator = this.getDefaultCreator();
    const list = raw.map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: item.toLowerCase().replace(/[^a-z0-9]/g, '-') || `group-${index}`,
          name: item,
          order: index,
          creator: defaultCreator,
          createdAt: Date.now()
        };
      }
      return {
        id: item.id || `group-${index}`,
        name: item.name || 'Group ' + index,
        order: typeof item.order === 'number' ? item.order : index,
        creator: item.creator || defaultCreator,
        createdAt: item.createdAt || Date.now()
      };
    });

    if (!list.some(g => g.name.toLowerCase() === 'default group')) {
      list.unshift({ id: 'default', name: 'Default group', order: 0, creator: defaultCreator, createdAt: Date.now() });
    }
    return list.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Đồng bộ profiles trong JSON với các folder thực tế trong profiles_data:
   * - Nếu người dùng xóa folder profile trong profiles_data -> Tự động xóa khỏi danh sách
   * - Bỏ qua các thư mục ẩn/hệ thống (như .icons)
   * - Nếu có folder mới trong profiles_data -> Tự nạp vào danh sách
   */
  syncProfilesWithFileSystem() {
    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    if (!fs.existsSync(storagePath)) return;

    // 1. Quét các folder thực tế trong profiles_data (bỏ qua các thư mục ẩn / hệ thống như .icons)
    let diskFolders = [];
    try {
      diskFolders = fs.readdirSync(storagePath, { withFileTypes: true })
        .filter(f => f.isDirectory() && !f.name.startsWith('.'));
    } catch (e) {
      console.warn('Lỗi quét folder profiles_data:', e);
      return;
    }

    // 2. Nếu thư mục của profile không còn tồn tại trên ổ đĩa (người dùng đã xóa ngoài Windows Explorer)
    // hoặc là thư mục ẩn/hệ thống (như .icons) -> Tự động loại bỏ khỏi danh sách!
    this.profiles = this.profiles.filter(p => {
      if (p.id.startsWith('.') || p.name.includes('.icons')) return false;
      const folderName = p.id.includes('-') ? p.id : `profile_${p.id}`;
      const pDir = p.profilePath || path.join(storagePath, folderName);
      return fs.existsSync(pDir);
    });

    // 3. Quét các folder thực tế trên ổ đĩa: folder nào chưa có trong this.profiles và không nằm trong thùng rác thì nạp vào
    for (const f of diskFolders) {
      const id = f.name.replace(/^profile_/, '');
      const pDir = path.join(storagePath, f.name);
      if (!this.profiles.some(p => p.id === id || p.id === f.name || p.profilePath === pDir) &&
          !this.trash.some(t => t.id === id || t.id === f.name || t.profilePath === pDir)) {
        const info = this.readProfileInfoTxt(pDir, id);
        this.profiles.push(info);
      }
    }

    // 4. Đồng bộ lại đường dẫn chuẩn và file info nếu chưa có
    this.profiles.forEach(p => {
      const folderName = p.id.includes('-') ? p.id : `profile_${p.id}`;
      const pDir = p.profilePath || path.join(storagePath, folderName);
      p.profilePath = pDir;
      p.storage_path = pDir;
      if (fs.existsSync(pDir) && !fs.existsSync(path.join(pDir, 'profile_info.txt'))) {
        this.writeProfileInfoTxt(p, pDir);
      }
    });

    this.saveProfiles();
  }

  writeProfileInfoTxt(p, pDir) {
    try {
      const infoTxt = `ID: ${p.id}
Tên profile: ${p.name}
Nhóm: ${p.group || 'Default group'}
Trình duyệt: ${p.browserType || 'chrome'} (${p.version || '151.0.7922.76'})
Hệ điều hành: ${p.os || 'Windows'}
Proxy: ${p.proxy || 'No Proxy'}
Quốc gia: ${p.proxyCountry || 'us'}
Trạng thái: ${p.status || 'ready'}
Lần chạy cuối: ${p.lastRun || 'Chưa chạy'}
Tags: ${p.tags || ''}
Ghi chú: ${p.notes || ''}
Màu sắc: ${p.color || ''}
URL kiểm tra IP: https://myip.link/
Thời gian tạo: ${new Date(p.createdAt || Date.now()).toLocaleString('vi-VN')}
`;
      fs.writeFileSync(path.join(pDir, 'profile_info.txt'), infoTxt, 'utf8');
    } catch (e) {}
  }

  readProfileInfoTxt(pDir, id) {
    const infoFile = path.join(pDir, 'profile_info.txt');
    const defaultObj = {
      id,
      name: `Profile ${id}`,
      group: 'Default group',
      browserType: 'chrome',
      version: '151.0.7922.76',
      os: 'Windows',
      proxy: 'No Proxy',
      proxyCountry: 'vn',
      status: 'ready',
      lastRun: 'Chưa chạy',
      tags: '',
      notes: '',
      color: '',
      profilePath: pDir,
      createdAt: Date.now()
    };

    if (!fs.existsSync(infoFile)) {
      this.writeProfileInfoTxt(defaultObj, pDir);
      return defaultObj;
    }

    try {
      const content = fs.readFileSync(infoFile, 'utf8');
      const lines = content.split('\n');
      const getVal = (key) => {
        const line = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase() + ':'));
        return line ? line.substring(line.indexOf(':') + 1).trim() : null;
      };

      return {
        id: getVal('ID') || id,
        name: getVal('Tên profile') || `Profile ${id}`,
        group: getVal('Nhóm') || 'Default group',
        browserType: (getVal('Trình duyệt') || 'chrome').split(' ')[0].toLowerCase(),
        version: (getVal('Trình duyệt') || '').match(/\(([^)]+)\)/)?.[1] || '151.0.7922.76',
        os: getVal('Hệ điều hành') || 'Windows',
        proxy: getVal('Proxy') || 'No Proxy',
        proxyCountry: getVal('Quốc gia') || 'us',
        status: getVal('Trạng thái') || 'ready',
        lastRun: getVal('Lần chạy cuối') || 'Chưa chạy',
        tags: getVal('Tags') || '',
        notes: getVal('Ghi chú') || '',
        color: getVal('Màu sắc') || '',
        profilePath: pDir,
        createdAt: Date.now()
      };
    } catch (e) {
      return defaultObj;
    }
  }

  /**
   * Dữ liệu mẫu chuẩn 100% khớp với ảnh người dùng cung cấp
   */
  getSeedProfiles() {
    return [
      {
        id: '977',
        name: 'New profile 977',
        group: 'Default group',
        browserType: 'chrome',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: 'No Proxy',
        proxyCountry: 'vn',
        status: 'ready',
        lastRun: 'Chưa chạy',
        tags: '',
        notes: '',
        createdAt: Date.now() - 500
      },
      {
        id: '6726',
        name: 'Profile 6726',
        group: 'Default group',
        browserType: 'chrome',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: 'No Proxy',
        proxyCountry: 'vn',
        status: 'ready',
        lastRun: '1s',
        tags: 'Main, VIP',
        notes: 'Tài khoản chính',
        createdAt: Date.now() - 1000
      },
      {
        id: '049',
        name: 'New profile 049',
        group: 'Default group',
        browserType: 'brave',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: '147.53.118.112:3128',
        proxyCountry: 'us',
        status: 'ready',
        lastRun: '1s',
        tags: 'US',
        notes: '',
        createdAt: Date.now() - 10000
      },
      {
        id: '048',
        name: 'New profile 048',
        group: 'Default group',
        browserType: 'edge',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: '147.53.115.163:3128',
        proxyCountry: 'us',
        status: 'ready',
        lastRun: '19h',
        tags: 'US',
        notes: '',
        createdAt: Date.now() - 20000
      },
      {
        id: '047',
        name: 'New profile 047',
        group: 'Default group',
        browserType: 'chromium',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: '138.229.96.9:3128',
        proxyCountry: 'us',
        status: 'ready',
        lastRun: '5h',
        tags: 'US',
        notes: '',
        createdAt: Date.now() - 30000
      },
      {
        id: '046',
        name: 'New profile 046',
        group: 'Default group',
        browserType: 'chrome',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: '138.229.96.8:3128',
        proxyCountry: 'us',
        status: 'ready',
        lastRun: '19h',
        tags: 'US',
        notes: '',
        createdAt: Date.now() - 40000
      },
      {
        id: '045',
        name: 'New profile 045',
        group: 'Default group',
        browserType: 'firefox',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: '172.96.89.212:3128',
        proxyCountry: 'us',
        status: 'ready',
        lastRun: '5h',
        tags: 'Firefox, US',
        notes: '',
        createdAt: Date.now() - 50000
      },
      {
        id: '044',
        name: 'New profile 044',
        group: 'Default group',
        browserType: 'chrome',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: '158.62.211.208:3128',
        proxyCountry: 'us',
        status: 'ready',
        lastRun: '19h',
        tags: 'US',
        notes: '',
        createdAt: Date.now() - 60000
      },
      {
        id: '043',
        name: 'New profile 043',
        group: 'Default group',
        browserType: 'chrome',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: '147.53.116.154:3128',
        proxyCountry: 'us',
        status: 'ready',
        lastRun: '5h',
        tags: 'US',
        notes: '',
        createdAt: Date.now() - 70000
      },
      {
        id: '042',
        name: 'New profile 042',
        group: 'Default group',
        browserType: 'brave',
        version: '151.0.7922.76',
        os: 'Windows',
        proxy: '172.96.89.210:3128',
        proxyCountry: 'us',
        status: 'ready',
        lastRun: '1d',
        tags: 'US',
        notes: '',
        createdAt: Date.now() - 80000
      }
    ];
  }

  saveProfiles() {
    fs.writeFileSync(this.profilesFilePath, JSON.stringify(this.profiles, null, 2), 'utf8');
  }

  saveTrash() {
    fs.writeFileSync(this.trashFilePath, JSON.stringify(this.trash, null, 2), 'utf8');
  }

  saveGroups() {
    fs.writeFileSync(this.groupsFilePath, JSON.stringify(this.groups, null, 2), 'utf8');
  }

  saveSettings() {
    fs.writeFileSync(this.settingsFilePath, JSON.stringify(this.settings, null, 2), 'utf8');
  }

  getAllProfiles() {
    this.syncProfilesWithFileSystem();
    return this.profiles;
  }

  reorderProfiles(orderedIds) {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return false;
    const idMap = new Map();
    this.profiles.forEach(p => idMap.set(p.id, p));

    const reordered = [];
    orderedIds.forEach((id, idx) => {
      const p = idMap.get(id);
      if (p) {
        p.order = idx + 1;
        p.customOrder = idx + 1;
        reordered.push(p);
        idMap.delete(id);
      }
    });

    for (const [, p] of idMap) {
      p.order = reordered.length + 1;
      p.customOrder = reordered.length + 1;
      reordered.push(p);
    }

    this.profiles = reordered;
    this.saveProfiles();
    return true;
  }

  getProfile(id) {
    return this.profiles.find(p => p.id === id);
  }

  generateUuid() {
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generateFingerprint(os = 'Windows', browserType = 'chrome', version = '151.0.7922.76') {
    const isWin = os === 'Windows';
    const isMac = os === 'Mac';
    const isAndroid = os === 'Android';
    const majorVer = version.split('.')[0] || '151';

    let platform = 'Win32';
    let ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36 Edg/${majorVer}.0.0.0`;
    if (isMac) {
      platform = 'MacIntel';
      ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36`;
    } else if (isAndroid) {
      platform = 'Linux armv8l';
      ua = `Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Mobile Safari/537.36`;
    }

    const screenResolutions = [
      { w: 1920, h: 1080 },
      { w: 1366, h: 768 },
      { w: 1536, h: 864 },
      { w: 1440, h: 900 },
      { w: 2560, h: 1440 }
    ];
    const res = screenResolutions[Math.floor(Math.random() * screenResolutions.length)];

    return {
      webrtc: { mode: 'public', public_ip: '' },
      canvas: { mode: 'noise' },
      webgl: {
        mode: 'noise',
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)'
      },
      audio: { mode: 'noise' },
      screen: {
        width: res.w,
        height: res.h,
        availWidth: res.w,
        availHeight: res.h - 40,
        colorDepth: 24,
        pixelDepth: 24
      },
      navigator: {
        platform: platform,
        userAgent: ua,
        language: 'en-US,en;q=0.9,vi;q=0.8',
        languages: ['en-US', 'en', 'vi'],
        hardwareConcurrency: [4, 8, 12, 16][Math.floor(Math.random() * 4)],
        deviceMemory: [4, 8, 16][Math.floor(Math.random() * 3)],
        doNotTrack: '1'
      },
      fonts: ['Arial', 'Calibri', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Verdana'],
      timezone: { mode: 'ip_based' },
      geolocation: { mode: 'prompt' }
    };
  }

  createProfile(data) {
    const id = data.id || this.generateUuid();
    const version = data.version || '151.0.7922.76';
    const os = data.os || 'Windows';
    const majorVer = version.split('.')[0] || '151';

    let defaultUa = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36 Edg/${majorVer}.0.0.0`;
    if (os === 'Mac') {
      defaultUa = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36`;
    } else if (os === 'Android') {
      defaultUa = `Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Mobile Safari/537.36`;
    }

    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    const profileDir = path.join(storagePath, id);
    if (!fs.existsSync(profileDir)) {
      try { fs.mkdirSync(profileDir, { recursive: true }); } catch (e) {}
    }

    const proxyStr = data.proxy && data.proxy.trim() ? data.proxy.trim() : 'No Proxy';
    const proxyCountry = data.proxyCountry ? data.proxyCountry.toLowerCase() : (proxyStr !== 'No Proxy' ? 'us' : 'vn');
    const fingerprint = data.fingerprint || this.generateFingerprint(os, data.browserType || 'chrome', version);


    const newProfile = {
      id,
      name: data.name || `Profile ${id.substring(0, 5)}`,
      group: (() => {
        const gName = (data.group && typeof data.group === 'string' && data.group.trim()) ? data.group.trim() : (data.group_name || 'Default group');
        if (gName && gName.toLowerCase() !== 'default group') this.addGroup(gName);
        return gName;
      })(),
      group_id: data.group_id || 'all',
      browserType: data.browserType || 'chrome',
      browser: {
        name: data.browserType || 'chrome',
        version: version
      },
      version,
      taskbarTitle: data.taskbarTitle || '',
      startUrl: data.startUrl || '',
      bypassStaticFiles: data.bypassStaticFiles || '',
      os: os.toLowerCase(),
      proxy: proxyStr,
      raw_proxy: proxyStr === 'No Proxy' ? '' : proxyStr,
      proxyType: data.proxyType || 'None',
      proxyCountry: proxyCountry.toLowerCase(),
      status: 'ready',
      lastRun: 'Chưa chạy',
      tags: this.ensureTags(data.tags || data.tag || []),
      note: data.note || data.notes || '',
      notes: data.note || data.notes || '',
      userAgent: data.userAgent && data.userAgent.trim() ? data.userAgent.trim() : defaultUa,
      cookies: data.cookies || '',
      hardware: data.hardware || {},
      software: data.software || {},
      storage_path: profileDir,
      profilePath: profileDir,
      fingerprint: fingerprint,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.writeProfileInfoTxt(newProfile, profileDir);
    this.profiles.unshift(newProfile);
    this.saveProfiles();
    return newProfile;
  }

  batchCreate(options) {
    const {
      count = 5,
      namePrefix = 'New profile',
      group = options.group || 'Default group',
      browserType = 'chrome',
      version = '151.0.7922.76',
      os = 'Windows',
      proxyList = []
    } = options;

    const groupName = (group && typeof group === 'string' && group.trim()) ? group.trim() : 'Default group';
    if (groupName && groupName.toLowerCase() !== 'default group') {
      this.addGroup(groupName);
    }

    const cleanTags = this.ensureTags(options.tags || options.tag || []);

    const majorVer = version.split('.')[0] || '151';
    let defaultUa = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36 Edg/${majorVer}.0.0.0`;
    if (os.includes('Mac')) {
      defaultUa = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36`;
    } else if (os.includes('Android')) {
      defaultUa = `Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Mobile Safari/537.36`;
    }

    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    const created = [];
    for (let i = 0; i < count; i++) {
      const id = this.generateUuid();
      const numStr = (i + 1).toString().padStart(3, '0');
      const proxy = proxyList[i] || (proxyList.length > 0 ? proxyList[i % proxyList.length] : 'No Proxy');
      const proxyCountry = options.proxyCountry ? options.proxyCountry.toLowerCase() : (proxy !== 'No Proxy' ? 'us' : 'vn');
      const profileDir = path.join(storagePath, id);

      if (!fs.existsSync(profileDir)) {
        try { fs.mkdirSync(profileDir, { recursive: true }); } catch (e) {}
      }

      const p = {
        id,
        name: `${namePrefix} ${numStr}`,
        group: groupName,
        group_id: 'all',
        browserType,
        browser: {
          name: browserType,
          version: version
        },
        version,
        os: os.toLowerCase(),
        proxy,
        raw_proxy: proxy === 'No Proxy' ? '' : proxy,
        proxyCountry: proxyCountry.toLowerCase(),
        status: 'ready',
        lastRun: 'Chưa chạy',
        tags: cleanTags.length > 0 ? [...cleanTags] : (proxy !== 'No Proxy' ? ['US'] : []),
        note: options.note || options.notes || '',
        notes: options.note || options.notes || '',
        userAgent: defaultUa,
        startUrl: options.startUrl || '',
        storage_path: profileDir,
        profilePath: profileDir,
        fingerprint: this.generateFingerprint(os, browserType, version),
        createdAt: Date.now() + i,
        updatedAt: Date.now() + i
      };
      this.writeProfileInfoTxt(p, profileDir);
      created.push(p);
      this.profiles.unshift(p);
    }
    this.saveProfiles();
    return created;
  }

  cloneProfile(id, options = {}) {
    const original = this.getProfile(id);
    if (!original) return null;

    const count = Math.max(1, parseInt(options.count, 10) || 1);
    const proxies = Array.isArray(options.proxies) ? options.proxies : [];
    const storagePath = this.settings.localStoragePath || this.localStorageDefault;

    // Sinh chuỗi hash ngẫu nhiên ngắn như GPMLogin (vd: ux3z2)
    const randomHash = Math.random().toString(36).substring(2, 7);
    const created = [];

    for (let i = 0; i < count; i++) {
      const newId = this.generateUuid();
      const profileDir = path.join(storagePath, newId);
      if (!fs.existsSync(profileDir)) {
        try { fs.mkdirSync(profileDir, { recursive: true }); } catch (e) {}
      }

      // Xử lý proxy riêng theo từng dòng nếu có
      let assignedProxy = original.proxy || 'No Proxy';
      let assignedCountry = original.proxyCountry || 'us';
      if (proxies.length > 0 && proxies[i] !== undefined) {
        const pLine = (proxies[i] || '').trim();
        if (pLine.toLowerCase() === 'null' || !pLine) {
          assignedProxy = 'No Proxy';
          assignedCountry = 'vn';
        } else {
          assignedProxy = pLine;
          assignedCountry = 'us';
        }
      }

      // Tên clone chuẩn: <Tên_gốc> [clone <hash>] 000
      const suffix = String(i).padStart(3, '0');
      const clonedName = `${original.name} [clone ${randomHash}] ${suffix}`;

      const cloned = {
        ...original,
        id: newId,
        name: clonedName,
        proxy: assignedProxy,
        raw_proxy: assignedProxy === 'No Proxy' ? '' : assignedProxy,
        proxyCountry: assignedCountry,
        color: original.color || '',
        storage_path: profileDir,
        profilePath: profileDir,
        fingerprint: this.generateFingerprint(original.os, original.browserType, original.version),
        createdAt: Date.now() + i,
        updatedAt: Date.now() + i
      };

      this.writeProfileInfoTxt(cloned, profileDir);
      this.profiles.unshift(cloned);
      created.push(cloned);
    }

    this.saveProfiles();
    return count === 1 ? created[0] : created;
  }

  updateProfile(id, data) {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      const updateData = { ...data };
      if (updateData.note !== undefined && updateData.notes === undefined) {
        updateData.notes = updateData.note;
      } else if (updateData.notes !== undefined && updateData.note === undefined) {
        updateData.note = updateData.notes;
      }
      if (updateData.tags !== undefined) {
        updateData.tags = this.ensureTags(updateData.tags);
      } else if (updateData.tag !== undefined) {
        updateData.tags = this.ensureTags(updateData.tag);
      }
      if (updateData.group && typeof updateData.group === 'string' && updateData.group.trim()) {
        updateData.group = updateData.group.trim();
        if (updateData.group.toLowerCase() !== 'default group') {
          this.addGroup(updateData.group);
        }
      }
      // Đồng bộ hai chiều giữa proxy và raw_proxy để API luôn trả về proxy mới nhất
      if (updateData.proxy !== undefined && updateData.raw_proxy === undefined) {
        const pStr = (updateData.proxy || '').trim();
        updateData.proxy = (!pStr || pStr.toLowerCase() === 'no proxy') ? 'No Proxy' : pStr;
        updateData.raw_proxy = (!pStr || pStr.toLowerCase() === 'no proxy') ? '' : pStr;
      } else if (updateData.raw_proxy !== undefined && updateData.proxy === undefined) {
        const rpStr = (updateData.raw_proxy || '').trim();
        updateData.raw_proxy = (!rpStr || rpStr.toLowerCase() === 'no proxy') ? '' : rpStr;
        updateData.proxy = (!rpStr || rpStr.toLowerCase() === 'no proxy') ? 'No Proxy' : rpStr;
      } else if (updateData.proxy !== undefined && updateData.raw_proxy !== undefined) {
        const pStr = (updateData.proxy || '').trim();
        updateData.proxy = (!pStr || pStr.toLowerCase() === 'no proxy') ? 'No Proxy' : pStr;
        updateData.raw_proxy = (!pStr || pStr.toLowerCase() === 'no proxy') ? '' : pStr;
      }
      this.profiles[index] = { ...this.profiles[index], ...updateData, updatedAt: Date.now() };
      const storagePath = this.settings.localStoragePath || this.localStorageDefault;
      const profileDir = this.profiles[index].profilePath || path.join(storagePath, id);
      this.writeProfileInfoTxt(this.profiles[index], profileDir);
      this.saveProfiles();
      return this.profiles[index];
    }
    return null;
  }

  importCookie(id, cookieContent) {
    const profile = this.getProfile(id);
    if (!profile) return { success: false, message: 'Không tìm thấy profile' };

    const cookieStr = typeof cookieContent === 'string' ? cookieContent : JSON.stringify(cookieContent);
    profile.cookies = cookieStr;
    profile.updatedAt = Date.now();
    
    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    const profileDir = profile.profilePath || path.join(storagePath, id);
    if (!fs.existsSync(profileDir)) {
      try { fs.mkdirSync(profileDir, { recursive: true }); } catch (e) {}
    }
    
    try {
      fs.writeFileSync(path.join(profileDir, 'cookies.json'), cookieStr, 'utf8');
      fs.writeFileSync(path.join(profileDir, 'cookie.txt'), cookieStr, 'utf8');
    } catch (e) {}

    this.writeProfileInfoTxt(profile, profileDir);
    this.saveProfiles();
    return { success: true, message: 'Đã import cookie thành công' };
  }

  safeRemove(targetPath) {
    if (!targetPath || !fs.existsSync(targetPath)) return;
    try {
      const stat = fs.lstatSync(targetPath);
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(targetPath);
        for (const entry of entries) {
          this.safeRemove(path.join(targetPath, entry));
        }
        try { fs.rmdirSync(targetPath); } catch (e) {}
      } else {
        try { fs.unlinkSync(targetPath); } catch (e) {}
      }
    } catch (e) {}
  }

  getDirectorySize(dirPath) {
    let total = 0;
    if (!dirPath || !fs.existsSync(dirPath)) return 0;
    try {
      const stat = fs.lstatSync(dirPath);
      if (!stat.isDirectory()) return stat.size;
      const entries = fs.readdirSync(dirPath);
      for (const entry of entries) {
        total += this.getDirectorySize(path.join(dirPath, entry));
      }
    } catch (e) {}
    return total;
  }

  freeProfileDiskSpace(id, isRunning = false) {
    const profile = this.getProfile(id);
    if (!profile) return { success: false, message: 'Không tìm thấy profile', freedBytes: 0, freedMB: '0.00' };

    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    const profileDir = profile.profilePath || path.join(storagePath, id);
    if (!fs.existsSync(profileDir)) {
      return { success: false, message: 'Thư mục profile không tồn tại', freedBytes: 0, freedMB: '0.00' };
    }

    const beforeBytes = this.getDirectorySize(profileDir);

    // 1. Danh sách các thư mục đệm/rác an toàn tuyệt đối bên trong Default
    const defaultJunkDirs = [
      path.join(profileDir, 'Default', 'Cache'),
      path.join(profileDir, 'Default', 'Code Cache'),
      path.join(profileDir, 'Default', 'GPUCache'),
      path.join(profileDir, 'Default', 'DawnCache'),
      path.join(profileDir, 'Default', 'DawnGraphiteCache'),
      path.join(profileDir, 'Default', 'DawnWebGPUCache'),
      path.join(profileDir, 'Default', 'ShaderCache'),
      path.join(profileDir, 'Default', 'Media Cache'),
      path.join(profileDir, 'Default', 'Service Worker', 'CacheStorage'),
      path.join(profileDir, 'Default', 'Service Worker', 'ScriptCache'),
      path.join(profileDir, 'Default', 'File System'),
      path.join(profileDir, 'Default', 'blob_storage'),
      path.join(profileDir, 'Default', 'optimization_guide_hint_cache_store'),
      path.join(profileDir, 'Default', 'Reporting and NEL'),
      path.join(profileDir, 'Default', 'JumpListIconsMostVisited'),
      path.join(profileDir, 'Default', 'JumpListIconsRecentClosed'),
      path.join(profileDir, 'Default', 'Search Logos')
    ];

    // 2. Danh sách thư mục rác an toàn ở root của profile
    const rootJunkDirs = [
      path.join(profileDir, 'ShaderCache'),
      path.join(profileDir, 'GrShaderCache'),
      path.join(profileDir, 'GPUPersistentCache'),
      path.join(profileDir, 'component_crx_cache'),
      path.join(profileDir, 'optimization_guide_model_store'),
      path.join(profileDir, 'OnDeviceHeadSuggestModel'),
      path.join(profileDir, 'Crashpad')
    ];

    // Dọn dẹp an toàn các thư mục rác
    const allJunkDirs = [...defaultJunkDirs, ...rootJunkDirs];
    for (const dir of allJunkDirs) {
      this.safeRemove(dir);
    }

    // 3. Xóa cache của tiện ích mở rộng (Extension Cache/GPUCache)
    const extStorageDir = path.join(profileDir, 'Default', 'Storage', 'ext');
    if (fs.existsSync(extStorageDir)) {
      try {
        const extDirs = fs.readdirSync(extStorageDir);
        for (const extId of extDirs) {
          this.safeRemove(path.join(extStorageDir, extId, 'def', 'Cache'));
          this.safeRemove(path.join(extStorageDir, extId, 'def', 'GPUCache'));
        }
      } catch (e) {}
    }

    // 4. Xóa các file rác trong Default (LOG, LOG.old, *.log, *.tmp, *.dmp)
    const defaultDir = path.join(profileDir, 'Default');
    if (fs.existsSync(defaultDir)) {
      try {
        const files = fs.readdirSync(defaultDir);
        for (const f of files) {
          const lower = f.toLowerCase();
          if (
            lower === 'log' ||
            lower === 'log.old' ||
            lower.endsWith('.log') ||
            lower.endsWith('.tmp') ||
            lower.endsWith('.dmp') ||
            (!isRunning && lower === 'lock')
          ) {
            this.safeRemove(path.join(defaultDir, f));
          }
        }
      } catch (e) {}
    }

    // 5. Xóa các file rác ở thư mục gốc profile (BrowserMetrics, debug logs, crash dumps, stale locks)
    try {
      const rootFiles = fs.readdirSync(profileDir);
      for (const f of rootFiles) {
        const lower = f.toLowerCase();
        if (
          lower.startsWith('browsermetrics') ||
          lower.endsWith('.log') ||
          lower.endsWith('.tmp') ||
          lower.endsWith('.dmp') ||
          lower.startsWith('sv_browser_temp_') ||
          (!isRunning && ['lockfile', 'singletonlock', 'singletoncookie', 'singletonsocket'].includes(lower))
        ) {
          this.safeRemove(path.join(profileDir, f));
        }
      }
    } catch (e) {}

    const afterBytes = this.getDirectorySize(profileDir);
    const freedBytes = Math.max(0, beforeBytes - afterBytes);
    const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);

    return {
      success: true,
      profileId: id,
      name: profile.name,
      beforeBytes,
      afterBytes,
      freedBytes,
      freedMB,
      message: `Đã giải phóng ${freedMB} MB (Đã bảo toàn Cookie & Đăng nhập)`
    };
  }

  freeBulkDiskSpace(ids, isRunningCheckFn = null) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, message: 'Danh sách profile rỗng', totalFreedBytes: 0, totalFreedMB: '0.00', count: 0 };
    }

    let totalFreedBytes = 0;
    let count = 0;
    const results = [];

    for (const id of ids) {
      const isRunning = typeof isRunningCheckFn === 'function' ? isRunningCheckFn(id) : false;
      const res = this.freeProfileDiskSpace(id, isRunning);
      if (res && res.success) {
        totalFreedBytes += res.freedBytes;
        count++;
        results.push(res);
      }
    }

    const totalFreedMB = (totalFreedBytes / (1024 * 1024)).toFixed(2);
    return {
      success: true,
      count,
      totalFreedBytes,
      totalFreedMB,
      results,
      message: `Đã giải phóng thành công ${totalFreedMB} MB trên ${count} profile (Đã bảo toàn Cookie & Đăng nhập)`
    };
  }

  clearCache(id) {
    return this.freeProfileDiskSpace(id);
  }

  deleteProfile(id, options = {}) {
    const isPermanent = options.permanent === true || options.hard === true;
    
    // Tìm trong profiles
    const index = this.profiles.findIndex(p => p.id === id);
    let target = null;
    if (index !== -1) {
      target = this.profiles.splice(index, 1)[0];
      this.saveProfiles();
    } else {
      // Có thể đang ở trong trash và gọi xóa vĩnh viễn
      const trashIdx = this.trash.findIndex(t => t.id === id);
      if (trashIdx !== -1) {
        target = this.trash.splice(trashIdx, 1)[0];
        this.saveTrash();
      }
    }

    if (!target) return null;

    if (isPermanent) {
      // Xóa vĩnh viễn dữ liệu trên ổ đĩa
      const storagePath = this.settings.localStoragePath || this.localStorageDefault;
      const profileDir = target.profilePath || path.join(storagePath, id);
      if (fs.existsSync(profileDir)) {
        try {
          fs.rmSync(profileDir, { recursive: true, force: true });
        } catch (e) {}
      }
      const legacyDir = path.join(storagePath, `profile_${id}`);
      if (fs.existsSync(legacyDir)) {
        try { fs.rmSync(legacyDir, { recursive: true, force: true }); } catch (e) {}
      }
      this.trash = this.trash.filter(t => t.id !== id);
      this.saveTrash();
      return target;
    } else {
      // Mặc định: Chuyển vào thùng rác (lưu trữ để có thể khôi phục)
      target.deletedAt = Date.now();
      this.trash = this.trash.filter(t => t.id !== id);
      this.trash.unshift(target);
      this.saveTrash();
      return target;
    }
  }

  deleteMultiple(ids, options = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const isPermanent = options.permanent === true || options.hard === true;
    const storagePath = this.settings.localStoragePath || this.localStorageDefault;

    let count = 0;
    ids.forEach(id => {
      const pIdx = this.profiles.findIndex(x => x.id === id);
      let target = null;
      if (pIdx !== -1) {
        target = this.profiles.splice(pIdx, 1)[0];
      } else {
        const tIdx = this.trash.findIndex(x => x.id === id);
        if (tIdx !== -1) {
          target = this.trash.splice(tIdx, 1)[0];
        }
      }

      if (target) {
        count++;
        if (isPermanent) {
          const profileDir = target.profilePath || path.join(storagePath, id);
          if (fs.existsSync(profileDir)) {
            try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
          }
          const legacyDir = path.join(storagePath, `profile_${id}`);
          if (fs.existsSync(legacyDir)) {
            try { fs.rmSync(legacyDir, { recursive: true, force: true }); } catch (e) {}
          }
          this.trash = this.trash.filter(t => t.id !== id);
        } else {
          target.deletedAt = Date.now();
          this.trash = this.trash.filter(t => t.id !== id);
          this.trash.unshift(target);
        }
      }
    });

    this.saveProfiles();
    this.saveTrash();
    return count;
  }

  getTrashProfiles() {
    return this.trash.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  }

  restoreProfiles(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return { success: false, count: 0 };
    let restoredCount = 0;

    ids.forEach(id => {
      const idx = this.trash.findIndex(t => t.id === id);
      if (idx !== -1) {
        const p = this.trash.splice(idx, 1)[0];
        delete p.deletedAt;
        p.status = 'ready';
        this.profiles.unshift(p);
        restoredCount++;
      }
    });

    if (restoredCount > 0) {
      this.saveProfiles();
      this.saveTrash();
    }
    return { success: true, count: restoredCount };
  }

  deleteTrashProfiles(ids) {
    return this.deleteMultiple(ids, { permanent: true });
  }

  emptyTrash() {
    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    this.trash.forEach(target => {
      const profileDir = target.profilePath || path.join(storagePath, target.id);
      if (fs.existsSync(profileDir)) {
        try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
      }
      const legacyDir = path.join(storagePath, `profile_${target.id}`);
      if (fs.existsSync(legacyDir)) {
        try { fs.rmSync(legacyDir, { recursive: true, force: true }); } catch (e) {}
      }
    });
    const count = this.trash.length;
    this.trash = [];
    this.saveTrash();
    return { success: true, count };
  }

  getGroups() {
    return this.groups.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  addGroup(data) {
    const name = typeof data === 'string' ? data.trim() : (data?.name || '').trim();
    if (!name) return this.groups;
    if (this.groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      return this.groups;
    }
    const maxOrder = this.groups.reduce((max, g) => Math.max(max, g.order || 0), 0);
    const newGroup = {
      id: this.generateUuid(),
      name,
      order: (typeof data === 'object' && typeof data.order === 'number') ? data.order : maxOrder + 1,
      creator: (typeof data === 'object' && data.creator) ? data.creator : this.getDefaultCreator(),
      createdAt: Date.now()
    };
    this.groups.push(newGroup);
    this.groups.sort((a, b) => (a.order || 0) - (b.order || 0));
    this.saveGroups();
    return this.groups;
  }

  updateGroup(id, data) {
    const group = this.groups.find(g => g.id === id || g.name === id);
    if (!group) return null;
    const oldName = group.name;
    if (data.name !== undefined && data.name.trim()) {
      group.name = data.name.trim();
    }
    if (data.order !== undefined && !isNaN(parseInt(data.order))) {
      group.order = parseInt(data.order);
    }
    this.groups.sort((a, b) => (a.order || 0) - (b.order || 0));
    this.saveGroups();

    // Đồng bộ tên nhóm cho các profile thuộc nhóm này
    if (data.name && data.name.trim() !== oldName) {
      let updatedProfiles = false;
      this.profiles.forEach(p => {
        if (p.group === oldName) {
          p.group = data.name.trim();
          updatedProfiles = true;
          if (p.profilePath) this.writeProfileInfoTxt(p, p.profilePath);
        }
      });
      if (updatedProfiles) this.saveProfiles();
    }

    return group;
  }

  deleteGroup(id) {
    const groupIndex = this.groups.findIndex(g => g.id === id || g.name === id);
    if (groupIndex === -1) return { success: false, message: 'Nhóm không tồn tại' };
    const group = this.groups[groupIndex];
    if (group.name.toLowerCase() === 'default group' || group.id === 'default') {
      return { success: false, message: 'Không thể xóa Default group' };
    }
    this.groups.splice(groupIndex, 1);
    this.saveGroups();

    // Chuyển các profile thuộc nhóm này về Default group
    let updatedProfiles = false;
    this.profiles.forEach(p => {
      if (p.group === group.name) {
        p.group = 'Default group';
        updatedProfiles = true;
        if (p.profilePath) this.writeProfileInfoTxt(p, p.profilePath);
      }
    });
    if (updatedProfiles) this.saveProfiles();
    return { success: true };
  }

  // =========================================================================
  // TAGS MANAGEMENT
  // =========================================================================
  saveTags() {
    try {
      fs.writeFileSync(this.tagsFilePath, JSON.stringify(this.tags, null, 2), 'utf8');
    } catch (e) {
      console.error('Lỗi lưu tags.json:', e);
    }
  }

  getTags() {
    return this.tags || [];
  }

  addTag(data) {
    const name = typeof data === 'string' ? data.trim() : (data?.name || '').trim();
    if (!name) return null;
    const existing = this.tags.find(t => (t.name || '').toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const newTag = {
      id: (typeof data === 'object' && data?.id) ? data.id : this.generateUuid(),
      name,
      color: (typeof data === 'object' && data?.color) ? data.color : '#0284c7',
      createdAt: Date.now()
    };
    this.tags.push(newTag);
    this.saveTags();
    return newTag;
  }

  deleteTag(idOrName) {
    const idx = this.tags.findIndex(t => t.id === idOrName || (t.name && t.name.toLowerCase() === idOrName.toLowerCase()));
    if (idx !== -1) {
      const removed = this.tags.splice(idx, 1)[0];
      this.saveTags();
      return removed;
    }
    return null;
  }

  ensureTags(tagInput) {
    if (!tagInput) return [];
    let list = [];
    if (Array.isArray(tagInput)) {
      list = tagInput;
    } else if (typeof tagInput === 'string') {
      list = tagInput.split(/[,;\n\r]+/);
    } else if (typeof tagInput === 'object' && tagInput.name) {
      list = [tagInput.name];
    }

    const cleanNames = [];
    for (const item of list) {
      const rawName = typeof item === 'string' ? item : (item?.name || '');
      const tagName = rawName.trim();
      if (!tagName) continue;

      let existing = this.tags.find(t => (t.name || '').toLowerCase() === tagName.toLowerCase());
      if (!existing) {
        existing = this.addTag(tagName);
      }
      const finalName = existing?.name || tagName;
      if (!cleanNames.includes(finalName)) {
        cleanNames.push(finalName);
      }
    }
    return cleanNames;
  }

  /**
   * Chạy ngầm tự kiểm tra IP và Quốc gia khi mở profile rồi tự động lưu lại
   */
  async checkIpAndCountry(profileId) {
    const p = this.getProfile(profileId);
    if (!p) return null;

    return new Promise((resolve) => {
      // Trường hợp 1: Có Proxy (ví dụ: 147.53.116.113:3128 hoặc host:port:user:pass)
      if (p.proxy && p.proxy.trim() && p.proxy.toLowerCase() !== 'no proxy') {
        const rawProxy = p.proxy.trim().replace(/^socks5:\/\//i, '').replace(/^http:\/\//i, '').replace(/^https:\/\//i, '');
        const host = rawProxy.split(':')[0];

        // Ưu tiên kiểm tra qua https://ipinfo.io/${host}/json
        const req = https.get(`https://ipinfo.io/${host}/json`, { headers: { 'User-Agent': 'curl/8.0.0' }, timeout: 4000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const j = JSON.parse(data);
              if (j && j.ip) {
                p.ip = j.ip || host;
                p.proxyCountry = (j.country || 'us').toLowerCase();
                this.saveProfiles();
                if (p.profilePath) this.writeProfileInfoTxt(p, p.profilePath);
                return resolve({ ip: p.ip, country: p.proxyCountry });
              }
            } catch (e) {}
            // Fallback sang ip-api nếu ipinfo lỗi
            this.fallbackCheckProxyHost(host, p).then(resolve);
          });
        });
        req.on('error', () => {
          this.fallbackCheckProxyHost(host, p).then(resolve);
        });
      } else {
        // Trường hợp 2: Không dùng Proxy (No Proxy) -> Kiểm tra IP trực tiếp qua https://ipinfo.io/json
        const req = https.get('https://ipinfo.io/json', { headers: { 'User-Agent': 'curl/8.0.0' }, timeout: 4000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const j = JSON.parse(data);
              if (j && j.ip) {
                p.ip = j.ip;
                p.proxyCountry = (j.country || 'vn').toLowerCase();
                this.saveProfiles();
                if (p.profilePath) this.writeProfileInfoTxt(p, p.profilePath);
                return resolve({ ip: p.ip, country: p.proxyCountry });
              }
            } catch (e) {}
            this.fallbackCheckDirect(p).then(resolve);
          });
        });
        req.on('error', () => {
          this.fallbackCheckDirect(p).then(resolve);
        });
      }
    });
  }

  fallbackCheckProxyHost(host, p) {
    return new Promise((resolve) => {
      http.get(`http://ip-api.com/json/${host}`, { timeout: 3000 }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(d);
            if (j.status === 'success') {
              p.ip = j.query || host;
              p.proxyCountry = (j.countryCode || 'us').toLowerCase();
              this.saveProfiles();
              if (p.profilePath) this.writeProfileInfoTxt(p, p.profilePath);
              return resolve({ ip: p.ip, country: p.proxyCountry });
            }
          } catch (e) {}
          p.ip = host;
          p.proxyCountry = p.proxyCountry || 'us';
          this.saveProfiles();
          resolve({ ip: p.ip, country: p.proxyCountry });
        });
      }).on('error', () => {
        p.ip = host;
        p.proxyCountry = p.proxyCountry || 'us';
        this.saveProfiles();
        resolve({ ip: p.ip, country: p.proxyCountry });
      });
    });
  }

  fallbackCheckDirect(p) {
    return new Promise((resolve) => {
      http.get('http://ip-api.com/json', { timeout: 3000 }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(d);
            if (j.status === 'success') {
              p.ip = j.query;
              p.proxyCountry = (j.countryCode || 'vn').toLowerCase();
              this.saveProfiles();
              if (p.profilePath) this.writeProfileInfoTxt(p, p.profilePath);
              return resolve({ ip: p.ip, country: p.proxyCountry });
            }
          } catch (e) {}
          resolve({ ip: p.ip || '127.0.0.1', country: p.proxyCountry || 'vn' });
        });
      }).on('error', () => {
        resolve({ ip: p.ip || '127.0.0.1', country: p.proxyCountry || 'vn' });
      });
    });
  }

  getDpapiHelperPath() {
    const candidates = [
      path.join(process.resourcesPath || '', 'tools', 'dpapi_helper.ps1'),
      path.join(path.dirname(process.execPath || ''), 'tools', 'dpapi_helper.ps1'),
      path.join(__dirname, 'tools', 'dpapi_helper.ps1'),
      path.join(__dirname, 'scripts', 'dpapi_helper.ps1')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return path.join(__dirname, 'tools', 'dpapi_helper.ps1');
  }

  exportProfileDpapiKeys(targetDir) {
    try {
      const helper = this.getDpapiHelperPath();
      if (fs.existsSync(helper)) {
        execSync(`powershell -ExecutionPolicy Bypass -File "${helper}" -Action "batch-export" -TargetDir "${targetDir}"`, { stdio: 'ignore' });
      }
    } catch (e) {
      console.warn('Lỗi export DPAPI keys:', e.message);
    }
  }

  importProfileDpapiKeys(targetDir) {
    try {
      const helper = this.getDpapiHelperPath();
      if (fs.existsSync(helper)) {
        execSync(`powershell -ExecutionPolicy Bypass -File "${helper}" -Action "batch-import" -TargetDir "${targetDir}"`, { stdio: 'ignore' });
      }
    } catch (e) {
      console.warn('Lỗi import DPAPI keys:', e.message);
    }
  }

  /**
   * Tạo 1 profile hoàn chỉnh trong hệ thống từ một thư mục profile nguồn
   */
  createImportedProfile(srcDir, profileName, targetGroup, meta = {}) {
    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    const newId = this.generateUuid();
    const destDir = path.join(storagePath, newId);

    // 1. Copy toàn bộ thư mục profile vào localStoragePath
    try {
      fs.cpSync(srcDir, destDir, { recursive: true, force: true });
    } catch (err) {
      console.error(`Lỗi copy thư mục profile từ ${srcDir} sang ${destDir}:`, err);
      return null;
    }

    // 1b. Tái mã hóa DPAPI MasterKey cho máy hiện tại để bảo toàn nguyên vẹn phiên đăng nhập (Cookies/Sessions)
    this.importProfileDpapiKeys(destDir);

    // 2. Đọc thông tin có sẵn nếu có
    let info = this.readProfileInfoTxt(destDir, newId);
    let jsonMeta = {};
    const metaFile = path.join(destDir, 'profile_info.json');
    if (fs.existsSync(metaFile)) {
      try { jsonMeta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch (e) {}
    }

    const version = meta.version || jsonMeta.version || info.version || '151.0.7922.76';
    const os = (meta.os || jsonMeta.os || info.os || 'Windows').toLowerCase();
    const browserType = meta.browserType || jsonMeta.browserType || info.browserType || 'chrome';
    const proxyStr = meta.proxy || jsonMeta.proxy || info.proxy || 'No Proxy';
    const proxyType = meta.proxyType || jsonMeta.proxyType || 'None';
    const proxyCountry = meta.proxyCountry || jsonMeta.proxyCountry || info.proxyCountry || (proxyStr !== 'No Proxy' ? 'us' : 'vn');

    const majorVer = version.split('.')[0] || '151';
    let defaultUa = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36 Edg/${majorVer}.0.0.0`;
    if (os.includes('mac')) {
      defaultUa = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36`;
    }

    const finalGroup = targetGroup || meta.group || jsonMeta.group || info.group || 'Default group';
    const finalName = profileName || meta.name || jsonMeta.name || info.name || `Profile ${newId.substring(0, 5)}`;

    const newProfile = {
      id: newId,
      name: finalName,
      group: finalGroup,
      group_id: 'all',
      browserType: browserType,
      browser: {
        name: browserType,
        version: version
      },
      version: version,
      taskbarTitle: meta.taskbarTitle || jsonMeta.taskbarTitle || '',
      startUrl: meta.startUrl || jsonMeta.startUrl || '',
      bypassStaticFiles: meta.bypassStaticFiles || jsonMeta.bypassStaticFiles || '',
      os: os,
      proxy: proxyStr,
      raw_proxy: proxyStr === 'No Proxy' ? '' : proxyStr,
      proxyType: proxyType,
      proxyCountry: proxyCountry.toLowerCase(),
      status: 'ready',
      lastRun: 'Chưa chạy',
      tags: meta.tags || jsonMeta.tags || info.tags || [],
      note: meta.notes || meta.note || jsonMeta.notes || jsonMeta.note || info.notes || '',
      notes: meta.notes || meta.note || jsonMeta.notes || jsonMeta.note || info.notes || '',
      userAgent: meta.userAgent || jsonMeta.userAgent || info.userAgent || defaultUa,
      cookies: meta.cookies || jsonMeta.cookies || info.cookies || '',
      hardware: meta.hardware || jsonMeta.hardware || {},
      software: meta.software || jsonMeta.software || {},
      storage_path: destDir,
      profilePath: destDir,
      fingerprint: meta.fingerprint || jsonMeta.fingerprint || this.generateFingerprint(os === 'mac' ? 'Mac' : 'Windows', browserType, version),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.writeProfileInfoTxt(newProfile, destDir);
    try {
      fs.writeFileSync(path.join(destDir, 'profile_info.json'), JSON.stringify(newProfile, null, 2), 'utf8');
    } catch (e) {}

    this.profiles.unshift(newProfile);
    return newProfile;
  }

  /**
   * Export profiles ra 1 file ZIP duy nhất hoặc thư mục (Chuẩn Hình 1 người dùng)
   * @param {string[]} profileIds - Danh sách profile ID cần export
   * @param {string} targetDir - Thư mục đầu ra
   * @param {'zip'|'folder'} format - Định dạng export
   */
  exportProfiles(profileIds, targetDir, format = 'zip', onProgress = null) {
    if (!Array.isArray(profileIds) || profileIds.length === 0 || !targetDir) {
      return { success: false, message: 'Tham số không hợp lệ hoặc chưa chọn profile' };
    }

    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    if (!fs.existsSync(targetDir)) {
      try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
    }

    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    let exportedCount = 0;
    const total = profileIds.length;

    const report = (percent, name, status) => {
      if (typeof onProgress === 'function') {
        try {
          onProgress({
            current: exportedCount,
            total,
            percent: Math.min(100, Math.max(0, Math.round(percent))),
            name: name || '',
            status: status || ''
          });
        } catch (e) {}
      }
    };

    report(0, '', 'Đang chuẩn bị export...');

    if (format === 'zip') {
      // 1. Tạo 1 file ZIP DUY NHẤT chứa toàn bộ profiles đã chọn
      const zipFileName = `SVBrowser_Profiles_${timeStamp}_${randomSuffix}.zip`;
      const destZipPath = path.join(targetDir, zipFileName);
      const tempStagingDir = path.join(os.tmpdir(), 'sv_export_staging_' + crypto.randomUUID());

      try {
        fs.mkdirSync(tempStagingDir, { recursive: true });

        const exportMetadata = [];
        const usedNames = new Set();

        for (let i = 0; i < profileIds.length; i++) {
          const id = profileIds[i];
          const profile = this.getProfile(id);
          if (!profile) continue;

          const pName = profile.name || id;
          const currentPct = Math.round(((i + 1) / total) * 75);
          report(currentPct, pName, `Đang xử lý ${i + 1}/${total}: ${pName}`);

          const profileDir = profile.profilePath || path.join(storagePath, id);
          let safeName = (profile.name || id).replace(/[\\/:*?"<>|]/g, '_').trim();
          if (usedNames.has(safeName.toLowerCase())) {
            safeName = `${safeName}_${id.substring(0, 5)}`;
          }
          usedNames.add(safeName.toLowerCase());

          const destProfileDir = path.join(tempStagingDir, safeName);
          if (fs.existsSync(profileDir)) {
            fs.cpSync(profileDir, destProfileDir, { recursive: true, force: true });
          } else {
            fs.mkdirSync(destProfileDir, { recursive: true });
          }

          this.writeProfileInfoTxt(profile, destProfileDir);
          try {
            fs.writeFileSync(path.join(destProfileDir, 'profile_info.json'), JSON.stringify(profile, null, 2), 'utf8');
          } catch (e) {}

          exportMetadata.push(profile);
          exportedCount++;
        }

        // Ghi file metadata ở thư mục gốc của file zip
        fs.writeFileSync(path.join(tempStagingDir, 'profiles_export.json'), JSON.stringify(exportMetadata, null, 2), 'utf8');

        // Đồng bộ và giải mã khóa phiên đăng nhập (Cookies/Sessions) cho máy khác
        report(80, '', 'Đang đồng bộ khóa phiên đăng nhập (Cookies/Sessions)...');
        this.exportProfileDpapiKeys(tempStagingDir);

        report(85, '', 'Đang nén file ZIP (Zipping)...');

        // Nén toàn bộ staging vào đúng 1 file ZIP duy nhất
        try {
          execSync(`powershell -Command "Compress-Archive -Path '${tempStagingDir}\\*' -DestinationPath '${destZipPath}' -Force"`, { stdio: 'ignore' });
        } catch (zipErr) {
          execSync(`tar -acf "${destZipPath}" -C "${tempStagingDir}" .`, { stdio: 'ignore' });
        }

        report(100, '', 'Hoàn thành export!');

        return {
          success: true,
          count: exportedCount,
          filePath: destZipPath,
          message: `Đã export thành công ${exportedCount} profile vào file zip:\n${destZipPath}`
        };
      } catch (err) {
        console.error('Lỗi export zip:', err);
        return { success: false, message: err.message };
      } finally {
        try {
          if (fs.existsSync(tempStagingDir)) fs.rmSync(tempStagingDir, { recursive: true, force: true });
        } catch (e) {}
      }
    } else {
      // 2. Export dạng Thư mục
      const folderName = `SVBrowser_Profiles_Export_${timeStamp}`;
      const destExportDir = path.join(targetDir, folderName);

      try {
        fs.mkdirSync(destExportDir, { recursive: true });

        const exportMetadata = [];
        const usedNames = new Set();

        for (let i = 0; i < profileIds.length; i++) {
          const id = profileIds[i];
          const profile = this.getProfile(id);
          if (!profile) continue;

          const pName = profile.name || id;
          const currentPct = Math.round(((i + 1) / total) * 95);
          report(currentPct, pName, `Đang export ${i + 1}/${total}: ${pName}`);

          const profileDir = profile.profilePath || path.join(storagePath, id);
          let safeName = (profile.name || id).replace(/[\\/:*?"<>|]/g, '_').trim();
          if (usedNames.has(safeName.toLowerCase())) {
            safeName = `${safeName}_${id.substring(0, 5)}`;
          }
          usedNames.add(safeName.toLowerCase());

          const destProfileDir = path.join(destExportDir, safeName);
          if (fs.existsSync(profileDir)) {
            fs.cpSync(profileDir, destProfileDir, { recursive: true, force: true });
          } else {
            fs.mkdirSync(destProfileDir, { recursive: true });
          }

          this.writeProfileInfoTxt(profile, destProfileDir);
          try {
            fs.writeFileSync(path.join(destProfileDir, 'profile_info.json'), JSON.stringify(profile, null, 2), 'utf8');
          } catch (e) {}

          exportMetadata.push(profile);
          exportedCount++;
        }

        fs.writeFileSync(path.join(destExportDir, 'profiles_export.json'), JSON.stringify(exportMetadata, null, 2), 'utf8');

        // Đồng bộ và giải mã khóa phiên đăng nhập (Cookies/Sessions) cho máy khác
        report(98, '', 'Đang đồng bộ khóa phiên đăng nhập (Cookies/Sessions)...');
        this.exportProfileDpapiKeys(destExportDir);

        report(100, '', 'Hoàn thành export!');

        return {
          success: true,
          count: exportedCount,
          filePath: destExportDir,
          message: `Đã export thành công ${exportedCount} profile vào thư mục:\n${destExportDir}`
        };
      } catch (err) {
        console.error('Lỗi export folder:', err);
        return { success: false, message: err.message };
      }
    }
  }

  /**
   * Import profiles từ Thư mục hoặc file Zip (Chuẩn Hình 2 người dùng)
   * @param {Object} options - { type: 'folder'|'zip', sourcePath: string|string[], group: string }
   * @param {Function} [onProgress] - Callback tiến trình ({ current, percent, name, status })
   */
  importProfiles({ type, sourcePath, group }, onProgress = null) {
    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    if (!fs.existsSync(storagePath)) {
      try { fs.mkdirSync(storagePath, { recursive: true }); } catch (e) {}
    }

    let importedCount = 0;
    const targetGroup = (group && typeof group === 'string' && group.trim() && !group.includes('Chọn nhóm')) ? group.trim() : null;

    const report = (percent, name, status) => {
      if (typeof onProgress === 'function') {
        try {
          onProgress({
            current: importedCount,
            percent: Math.min(100, Math.max(0, Math.round(percent))),
            name: name || '',
            status: status || ''
          });
        } catch (e) {}
      }
    };

    report(0, '', 'Đang chuẩn bị import...');

    if (type === 'zip') {
      const rawList = Array.isArray(sourcePath) ? sourcePath : String(sourcePath).split(/[;,\n]+/);
      const zipFiles = rawList.map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);

      for (const zipFile of zipFiles) {
        if (!fs.existsSync(zipFile)) continue;
        const tempDir = path.join(os.tmpdir(), 'sv_import_zip_' + crypto.randomUUID());
        try {
          fs.mkdirSync(tempDir, { recursive: true });
          report(10, path.basename(zipFile), `Đang giải nén ${path.basename(zipFile)}...`);

          try {
            execSync(`powershell -Command "Expand-Archive -LiteralPath '${zipFile}' -DestinationPath '${tempDir}' -Force"`, { stdio: 'ignore' });
          } catch (zipErr) {
            execSync(`tar -xf "${zipFile}" -C "${tempDir}"`, { stdio: 'ignore' });
          }

          // Kiểm tra xem có profiles_export.json ở thư mục gốc không
          const exportMetaPath = path.join(tempDir, 'profiles_export.json');
          let exportMetaList = null;
          if (fs.existsSync(exportMetaPath)) {
            try { exportMetaList = JSON.parse(fs.readFileSync(exportMetaPath, 'utf8')); } catch (e) {}
          }

          if (Array.isArray(exportMetaList) && exportMetaList.length > 0) {
            const total = exportMetaList.length;
            for (let idx = 0; idx < total; idx++) {
              const item = exportMetaList[idx];
              const safeName = (item.name || item.id).replace(/[\\/:*?"<>|]/g, '_').trim();
              let profileSrc = path.join(tempDir, safeName);
              if (!fs.existsSync(profileSrc)) {
                profileSrc = path.join(tempDir, item.id);
              }
              if (fs.existsSync(profileSrc)) {
                const currentPct = 20 + Math.round(((idx + 1) / total) * 78);
                report(currentPct, item.name || safeName, `Đang import ${idx + 1}/${total}: ${item.name || safeName}`);
                const res = this.createImportedProfile(profileSrc, item.name || safeName, targetGroup, item);
                if (res) importedCount++;
              }
            }
          } else {
            // Không có profiles_export.json -> Kiểm tra tempDir là 1 profile hay nhiều thư mục profile con
            const isSingleProfile = fs.existsSync(path.join(tempDir, 'profile_info.txt')) ||
                                    fs.existsSync(path.join(tempDir, 'Default')) ||
                                    fs.existsSync(path.join(tempDir, 'Preferences'));

            const zipBaseName = path.basename(zipFile, path.extname(zipFile));

            if (isSingleProfile) {
              report(50, zipBaseName, `Đang import profile: ${zipBaseName}`);
              const res = this.createImportedProfile(tempDir, zipBaseName, targetGroup);
              if (res) importedCount++;
            } else {
              const subItems = fs.readdirSync(tempDir, { withFileTypes: true })
                .filter(i => i.isDirectory() && !i.name.startsWith('.'));

              if (subItems.length === 0) {
                report(50, zipBaseName, `Đang import profile: ${zipBaseName}`);
                const res = this.createImportedProfile(tempDir, zipBaseName, targetGroup);
                if (res) importedCount++;
              } else {
                const total = subItems.length;
                for (let idx = 0; idx < total; idx++) {
                  const sub = subItems[idx];
                  const subDir = path.join(tempDir, sub.name);
                  const currentPct = 20 + Math.round(((idx + 1) / total) * 78);
                  report(currentPct, sub.name, `Đang import ${idx + 1}/${total}: ${sub.name}`);
                  const res = this.createImportedProfile(subDir, sub.name, targetGroup);
                  if (res) importedCount++;
                }
              }
            }
          }
        } catch (err) {
          console.error(`Lỗi giải nén/import zip ${zipFile}:`, err);
        } finally {
          try {
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (e) {}
        }
      }
    } else {
      // type === 'folder'
      const cleanPath = String(sourcePath || '').trim().replace(/^["']|["']$/g, '');
      if (!cleanPath || !fs.existsSync(cleanPath)) {
        return { success: false, message: 'Đường dẫn thư mục không tồn tại: ' + cleanPath };
      }

      report(5, '', 'Đang quét danh mục profile...');

      // Kiểm tra có profiles_export.json không
      const exportMetaPath = path.join(cleanPath, 'profiles_export.json');
      let exportMetaList = null;
      if (fs.existsSync(exportMetaPath)) {
        try { exportMetaList = JSON.parse(fs.readFileSync(exportMetaPath, 'utf8')); } catch (e) {}
      }

      if (Array.isArray(exportMetaList) && exportMetaList.length > 0) {
        const total = exportMetaList.length;
        for (let idx = 0; idx < total; idx++) {
          const item = exportMetaList[idx];
          const safeName = (item.name || item.id).replace(/[\\/:*?"<>|]/g, '_').trim();
          let profileSrc = path.join(cleanPath, safeName);
          if (!fs.existsSync(profileSrc)) {
            profileSrc = path.join(cleanPath, item.id);
          }
          if (fs.existsSync(profileSrc)) {
            const currentPct = Math.round(((idx + 1) / total) * 98);
            report(currentPct, item.name || safeName, `Đang import ${idx + 1}/${total}: ${item.name || safeName}`);
            const res = this.createImportedProfile(profileSrc, item.name || safeName, targetGroup, item);
            if (res) importedCount++;
          }
        }
      } else {
        const isSingleProfile = fs.existsSync(path.join(cleanPath, 'profile_info.txt')) ||
                                fs.existsSync(path.join(cleanPath, 'Default')) ||
                                fs.existsSync(path.join(cleanPath, 'Preferences'));

        if (isSingleProfile) {
          report(50, path.basename(cleanPath), `Đang import profile: ${path.basename(cleanPath)}`);
          const res = this.createImportedProfile(cleanPath, path.basename(cleanPath), targetGroup);
          if (res) importedCount++;
        } else {
          // Quét tất cả các thư mục con trong thư mục đã chọn
          // "khi chọn Thư mục thì hãy copy tất cả tên thư mục đó vào"
          const subItems = fs.readdirSync(cleanPath, { withFileTypes: true })
            .filter(i => i.isDirectory() && !i.name.startsWith('.'));

          if (subItems.length === 0) {
            report(50, path.basename(cleanPath), `Đang import profile: ${path.basename(cleanPath)}`);
            const res = this.createImportedProfile(cleanPath, path.basename(cleanPath), targetGroup);
            if (res) importedCount++;
          } else {
            const total = subItems.length;
            for (let idx = 0; idx < total; idx++) {
              const sub = subItems[idx];
              const subDir = path.join(cleanPath, sub.name);
              const currentPct = Math.round(((idx + 1) / total) * 98);
              report(currentPct, sub.name, `Đang import ${idx + 1}/${total}: ${sub.name}`);
              const res = this.createImportedProfile(subDir, sub.name, targetGroup);
              if (res) importedCount++;
            }
          }
        }
      }
    }

    report(100, '', 'Hoàn thành import!');
    this.saveProfiles();
    return {
      success: true,
      count: importedCount,
      message: `Đã import thành công ${importedCount} profile!`
    };
  }

  // ==========================================
  // PROXIES STORE (Chuẩn GPMLogin Local API)
  // ==========================================
  getProxies() {
    const pFile = path.join(this.dataDir, 'proxies.json');
    try {
      if (fs.existsSync(pFile)) {
        return JSON.parse(fs.readFileSync(pFile, 'utf8'));
      }
    } catch (e) {}
    return [];
  }

  saveProxies(list) {
    const pFile = path.join(this.dataDir, 'proxies.json');
    try {
      fs.writeFileSync(pFile, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {}
  }

  getProxy(id) {
    const list = this.getProxies();
    return list.find(p => p.id === id) || null;
  }

  createProxy(data = {}) {
    const list = this.getProxies();
    const newProxy = {
      id: crypto.randomUUID(),
      raw_proxy: data.raw_proxy || '',
      meta_data: data.meta_data || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: Array.isArray(data.tags) ? data.tags : []
    };
    list.unshift(newProxy);
    this.saveProxies(list);
    return newProxy;
  }

  updateProxy(id, data = {}) {
    const list = this.getProxies();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;
    list[idx] = {
      ...list[idx],
      ...data,
      updated_at: new Date().toISOString()
    };
    this.saveProxies(list);
    return list[idx];
  }

  deleteProxy(id) {
    let list = this.getProxies();
    const before = list.length;
    list = list.filter(p => p.id !== id);
    if (list.length !== before) {
      this.saveProxies(list);
      return true;
    }
    return false;
  }
}

module.exports = ProfileStore;
