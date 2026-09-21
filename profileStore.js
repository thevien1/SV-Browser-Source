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
    const defaultAutomatePath = fs.existsSync('D:\\Phần mềm\\GPMAutomateEditor')
      ? 'D:\\Phần mềm\\GPMAutomateEditor'
      : 'C:\\Users\\Admin\\AppData\\Local\\Programs\\GPMAutomate\\Editor';

    this.settings = {
      theme: 'light',
      language: 'vi',
      defaultBrowser: 'chrome',
      useGpu: false,
      localStoragePath: this.localStorageDefault,
      privateServerUrl: 'https://',
      gpmAutomatePath: defaultAutomatePath,
      ipServer: 'Public server 02 - myip.link',
      // Browser trigger & settings (Chuẩn Hình 1)
      autoClearCache: true,
      limitBrowserSize: true,
      restoreLastSession: false,
      startupUrl: 'https://google.com https://facebook.com',
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
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    return this.settings;
  }

  loadData() {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        this.settings = { ...this.settings, ...JSON.parse(fs.readFileSync(this.settingsFilePath, 'utf8')) };
      }
      if (this.settings.localStoragePath && this.settings.localStoragePath.includes('app.asar')) {
        this.settings.localStoragePath = this.localStorageDefault;
      }
      if ((!this.settings.gpmAutomatePath || !fs.existsSync(this.settings.gpmAutomatePath)) && fs.existsSync('D:\\Phần mềm\\GPMAutomateEditor')) {
        this.settings.gpmAutomatePath = 'D:\\Phần mềm\\GPMAutomateEditor';
      }
    } catch (e) {}

    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    if (!fs.existsSync(storagePath)) {
      try { fs.mkdirSync(storagePath, { recursive: true }); } catch (e) {}
    }

    try {
      if (fs.existsSync(this.profilesFilePath)) {
        this.profiles = JSON.parse(fs.readFileSync(this.profilesFilePath, 'utf8'));
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
      group: data.group || 'Default group',
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
      tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
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
        group,
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
        tags: proxy !== 'No Proxy' ? ['US'] : [],
        note: '',
        notes: '',
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
      this.profiles[index] = { ...this.profiles[index], ...data, updatedAt: Date.now() };
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

  clearCache(id) {
    const profile = this.getProfile(id);
    if (!profile) return { success: false, message: 'Không tìm thấy profile' };

    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    const profileDir = profile.profilePath || path.join(storagePath, id);
    if (fs.existsSync(profileDir)) {
      const cacheDirs = [
        path.join(profileDir, 'Default', 'Cache'),
        path.join(profileDir, 'Default', 'Code Cache'),
        path.join(profileDir, 'Default', 'GPUCache'),
        path.join(profileDir, 'Default', 'Service Worker', 'CacheStorage'),
        path.join(profileDir, 'Default', 'ShaderCache'),
        path.join(profileDir, 'ShaderCache'),
        path.join(profileDir, 'GrShaderCache')
      ];
      cacheDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          try {
            fs.rmSync(dir, { recursive: true, force: true });
          } catch (e) {}
        }
      });
    }
    return { success: true, message: 'Đã xóa cache thành công' };
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

        const req = http.get(`http://ip-api.com/json/${host}`, { timeout: 4000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const j = JSON.parse(data);
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
        });
        req.on('error', () => {
          p.ip = host;
          p.proxyCountry = p.proxyCountry || 'us';
          this.saveProfiles();
          resolve({ ip: p.ip, country: p.proxyCountry });
        });
      } else {
        // Trường hợp 2: Không dùng Proxy (No Proxy) -> Kiểm tra IP qua https://myip.link/cdn-cgi/trace
        const req = https.get('https://myip.link/cdn-cgi/trace', { timeout: 4000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const ipMatch = data.match(/ip=([^\r\n]+)/);
            const locMatch = data.match(/loc=([^\r\n]+)/);
            if (ipMatch && locMatch) {
              p.ip = ipMatch[1].trim();
              p.proxyCountry = locMatch[1].trim().toLowerCase();
              this.saveProfiles();
              if (p.profilePath) this.writeProfileInfoTxt(p, p.profilePath);
              return resolve({ ip: p.ip, country: p.proxyCountry });
            }
            this.fallbackCheckDirect(p).then(resolve);
          });
        });
        req.on('error', () => {
          this.fallbackCheckDirect(p).then(resolve);
        });
      }
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

  /**
   * Import profiles từ Thư mục hoặc file Zip (Chuẩn Hình ảnh người dùng)
   * @param {Object} options - { type: 'folder'|'zip', sourcePath: string|string[], group: string }
   */
  importProfiles({ type, sourcePath, group }) {
    const storagePath = this.settings.localStoragePath || this.localStorageDefault;
    if (!fs.existsSync(storagePath)) {
      try { fs.mkdirSync(storagePath, { recursive: true }); } catch (e) {}
    }

    let importedCount = 0;
    const targetGroup = (group && typeof group === 'string' && group.trim() && !group.includes('Chọn nhóm')) ? group.trim() : null;

    const importSingleDir = (srcDir, defaultName) => {
      try {
        const newId = crypto.randomUUID();
        const destDir = path.join(storagePath, newId);
        fs.cpSync(srcDir, destDir, { recursive: true });

        let info = this.readProfileInfoTxt(destDir, newId);
        info.id = newId;
        info.profilePath = destDir;
        info.storage_path = destDir;
        if (targetGroup) {
          info.group = targetGroup;
        }
        if (!info.name || info.name === `Profile ${newId}`) {
          info.name = defaultName || path.basename(srcDir);
        }
        this.writeProfileInfoTxt(info, destDir);
        this.profiles.unshift(info);
        importedCount++;
        return true;
      } catch (err) {
        console.error(`Lỗi import profile folder ${srcDir}:`, err);
        return false;
      }
    };

    if (type === 'zip') {
      const rawList = Array.isArray(sourcePath) ? sourcePath : String(sourcePath).split(/[;,\n]+/);
      const zipFiles = rawList.map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);

      for (const zipFile of zipFiles) {
        if (!fs.existsSync(zipFile)) continue;
        const tempDir = path.join(os.tmpdir(), 'gpm_import_' + crypto.randomUUID());
        try {
          fs.mkdirSync(tempDir, { recursive: true });
          try {
            execSync(`tar -xf "${zipFile}" -C "${tempDir}"`, { stdio: 'ignore' });
          } catch (tarErr) {
            execSync(`powershell -Command "Expand-Archive -LiteralPath '${zipFile}' -DestinationPath '${tempDir}' -Force"`, { stdio: 'ignore' });
          }

          // Kiểm tra xem tempDir chứa trực tiếp dữ liệu profile hay chứa các thư mục con
          const isDirectProfile = fs.existsSync(path.join(tempDir, 'profile_info.txt')) ||
                                  fs.existsSync(path.join(tempDir, 'Default')) ||
                                  fs.existsSync(path.join(tempDir, 'Preferences'));

          const zipBaseName = path.basename(zipFile, path.extname(zipFile));

          if (isDirectProfile) {
            importSingleDir(tempDir, zipBaseName);
          } else {
            const subItems = fs.readdirSync(tempDir, { withFileTypes: true })
              .filter(i => i.isDirectory() && !i.name.startsWith('.'));

            if (subItems.length === 0) {
              importSingleDir(tempDir, zipBaseName);
            } else if (subItems.length === 1) {
              const singleSub = path.join(tempDir, subItems[0].name);
              importSingleDir(singleSub, zipBaseName);
            } else {
              for (const sub of subItems) {
                const subDir = path.join(tempDir, sub.name);
                importSingleDir(subDir, `${zipBaseName}_${sub.name}`);
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

      const isSingleProfile = fs.existsSync(path.join(cleanPath, 'profile_info.txt')) ||
                              fs.existsSync(path.join(cleanPath, 'Default')) ||
                              fs.existsSync(path.join(cleanPath, 'Preferences'));

      if (isSingleProfile) {
        importSingleDir(cleanPath, path.basename(cleanPath));
      } else {
        const subItems = fs.readdirSync(cleanPath, { withFileTypes: true })
          .filter(i => i.isDirectory() && !i.name.startsWith('.'));

        if (subItems.length === 0) {
          importSingleDir(cleanPath, path.basename(cleanPath));
        } else {
          for (const sub of subItems) {
            const subDir = path.join(cleanPath, sub.name);
            importSingleDir(subDir, sub.name);
          }
        }
      }
    }

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
