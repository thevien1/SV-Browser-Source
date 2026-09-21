const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const ProxyChecker = require('./proxyChecker');

class BrowserLauncher extends EventEmitter {
  constructor(baseDataDir) {
    super();
    const isAsar = __dirname.includes('app.asar');
    const fallbackDir = isAsar
      ? path.join(process.env.APPDATA || 'C:\\Windows\\Temp', 'SVBrowserData', 'profiles_data')
      : path.join(__dirname, 'profiles_data');
    this.baseDataDir = baseDataDir || fallbackDir;
    if (!fs.existsSync(this.baseDataDir)) {
      try { fs.mkdirSync(this.baseDataDir, { recursive: true }); } catch (e) {}
    }
    // Map of profileId => { process, pid, browserType, version, debugPort, startTime }
    this.runningProfiles = new Map();
    this.nextDebugPort = 53000;
  }


  setBaseDataDir(dir) {
    if (dir) {
      this.baseDataDir = dir;
      if (!fs.existsSync(this.baseDataDir)) {
        try {
          fs.mkdirSync(this.baseDataDir, { recursive: true });
        } catch (e) {}
      }
    }
  }

  setExtensionStore(store) {
    this.extensionStore = store;
  }

  setProfileStore(store) {
    this.profileStore = store;
  }

  setLicenseManager(manager) {
    this.licenseManager = manager;
  }

  async getWebSocketDebuggerUrl(port, maxAttempts = 12, delayMs = 150) {
    const http = require('http');
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await new Promise((resolve, reject) => {
          const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 800 }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(e);
              }
            });
          });
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('timeout'));
          });
        });

        if (result && result.webSocketDebuggerUrl) {
          return result.webSocketDebuggerUrl;
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, delayMs));
    }
    return `ws://127.0.0.1:${port}/devtools/browser`;
  }

  clearCache(profileId) {
    if (this.profileStore && this.profileStore.clearCache) {
      try {
        return this.profileStore.clearCache(profileId);
      } catch (e) {
        return { success: false, message: e.message };
      }
    }
    return { success: false, message: 'ProfileStore not found' };
  }

  getChromedriverPath() {
    const candidates = [
      path.join(process.resourcesPath || '', 'chromedriver.exe'),
      path.join(path.dirname(process.execPath || ''), 'chromedriver.exe'),
      path.join(__dirname, 'chromedriver.exe')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return path.join(__dirname, 'chromedriver.exe');
  }

  /**
   * Quét và phát hiện tất cả các phiên bản Chromium Core trong thư mục drivers
   * Hỗ trợ D:\Phần mềm\GPMLoginGlobal-v1\drivers\ChromiumCore_v151, v152, v153...
   */
  getAvailableChromiumCores() {
    try {
      const DriverIconManager = require('./driverIconManager');
      const baseDir = process.resourcesPath || __dirname;
      new DriverIconManager(baseDir).syncAllDriverIcons();
    } catch (e) {}

    // CHỈ QUÉT DUY NHẤT THƯ MỤC drivers NỘI BỘ CỦA ỨNG DỤNG (D:\Phần mềm\GPMLoginGlobal-v1\drivers)
    // Tuyệt đối không quét từ AppData của GPMLoginGlobal hay bất kỳ phần mềm nào khác
    const driversDir = path.join(__dirname, 'drivers');
    const candidateDirs = [
      path.join(process.resourcesPath || '', 'drivers'),
      path.join(path.dirname(process.execPath || ''), 'drivers'),
      driversDir
    ].filter(d => Boolean(d) && fs.existsSync(d));

    const coresMap = new Map();

    for (const base of candidateDirs) {
      try {
        const items = fs.readdirSync(base, { withFileTypes: true });
        for (const item of items) {
          if (!item.isDirectory()) continue;

          const folderPath = path.join(base, item.name);
          let exePath = null;
          let version = null;

          // Kiểm tra exe: Chrome-bin/chrome.exe hoặc trực tiếp chrome.exe
          const p1 = path.join(folderPath, 'Chrome-bin', 'chrome.exe');
          const p2 = path.join(folderPath, 'chrome.exe');
          if (fs.existsSync(p1)) exePath = p1;
          else if (fs.existsSync(p2)) exePath = p2;

          if (exePath) {
            // Tìm version từ thư mục con trong Chrome-bin hoặc trực tiếp trong folder
            const chromeBinDir = path.join(folderPath, 'Chrome-bin');
            const searchDirs = [chromeBinDir, folderPath].filter(d => fs.existsSync(d));
            for (const sDir of searchDirs) {
              const subFolders = fs.readdirSync(sDir).filter(n => /^\d+\.\d+\.\d+/.test(n));
              if (subFolders.length > 0) {
                // Sắp xếp version giảm dần
                subFolders.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
                const matchFolderMajor = item.name.match(/v?(\d+)/i);
                const targetMajor = matchFolderMajor ? matchFolderMajor[1] : null;
                const matchingVer = targetMajor ? subFolders.find(v => v.startsWith(targetMajor + '.')) : null;
                version = matchingVer || subFolders[0];
                break;
              }
            }

            if (!version) {
              const match = item.name.match(/v?(\d+)/i);
              version = match ? `${match[1]}.0.0.0` : '153.0.0.0';
            }

            const majorVersion = version.split('.')[0];
            const coreKey = `${item.name.toLowerCase()}`;

            // Chống trùng lặp theo tên thư mục và majorVersion
            if (!coresMap.has(coreKey) && !coresMap.has(majorVersion)) {
              coresMap.set(coreKey, {
                name: item.name,
                version: version,
                majorVersion: majorVersion,
                path: exePath
              });
            }
          }
        }
      } catch (e) {}
    }

    const cores = Array.from(coresMap.values());
    // Sắp xếp version mới nhất lên đầu
    cores.sort((a, b) => parseInt(b.majorVersion || 0) - parseInt(a.majorVersion || 0));
    return cores;
  }

  /**
   * Dò tìm các trình duyệt có sẵn trên hệ điều hành Windows
   */
  detectBrowsers() {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    // Tìm Chromium Core nội bộ trước
    const gpmCores = this.getAvailableChromiumCores();
    const defaultGpmExe = gpmCores.length > 0 ? gpmCores[0].path : null;

    const candidates = {
      chrome: [
        defaultGpmExe,
        path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe')
      ].filter(Boolean),
      chromium: [
        defaultGpmExe,
        path.join(programFiles, 'Chromium', 'Application', 'chrome.exe')
      ].filter(Boolean),
      brave: [
        path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
      ],
      edge: [
        path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      ],
      opera: [
        path.join(localAppData, 'Programs', 'Opera', 'opera.exe'),
        path.join(programFiles, 'Opera', 'launcher.exe')
      ],
      firefox: [
        path.join(programFiles, 'Mozilla Firefox', 'firefox.exe'),
        path.join(programFilesX86, 'Mozilla Firefox', 'firefox.exe'),
        path.join(localAppData, 'Mozilla Firefox', 'firefox.exe')
      ]
    };

    const found = {};
    for (const [key, paths] of Object.entries(candidates)) {
      for (const p of paths) {
        if (fs.existsSync(p)) {
          found[key] = p;
          break;
        }
      }
    }

    if (!found.chrome && defaultGpmExe) {
      found.chrome = defaultGpmExe;
    }

    return found;
  }

  /**
   * Lấy đường dẫn file thực thi theo loại trình duyệt và phiên bản cụ thể
   */
  getExecutable(browserType = 'chrome', version = '') {
    const type = (browserType || 'chrome').toLowerCase();
    const cores = this.getAvailableChromiumCores();

    // Nếu chọn Chrome hoặc Chromium và có yêu cầu version
    if (type === 'chrome' || type === 'chromium') {
      if (version && version.trim()) {
        const targetVer = version.trim();
        const matched = cores.find(c => c.version === targetVer || c.name.includes(targetVer) || c.majorVersion === targetVer.split('.')[0]);
        if (matched) {
          return { path: matched.path, type: 'chrome', version: matched.version };
        }
      }
      // Nếu có core v151 hoặc core đầu tiên
      if (cores.length > 0) {
        // Ưu tiên bản v151 nếu có
        const v151 = cores.find(c => c.majorVersion === '151') || cores[0];
        return { path: v151.path, type: 'chrome', version: v151.version };
      }
    }

    const browsers = this.detectBrowsers();
    if (browsers[type]) {
      return { path: browsers[type], type, version: 'system' };
    }

    // Fallbacks
    if (browsers.chrome) return { path: browsers.chrome, type: 'chrome', version: 'default' };
    if (browsers.brave) return { path: browsers.brave, type: 'brave', version: 'default' };
    if (browsers.edge) return { path: browsers.edge, type: 'edge', version: 'default' };
    if (browsers.firefox) return { path: browsers.firefox, type: 'firefox', version: 'default' };

    throw new Error(`Không tìm thấy trình duyệt nào phù hợp cho (${browserType} ${version})`);
  }

  /**
   * Khởi chạy profile với các tham số Antidetect chính xác theo GPMLogin Global
   */
  async launchProfile(profileOrId, profileIndex = null, options = {}) {
    let profile = profileOrId;
    if (typeof profileOrId === 'string') {
      if (this.profileStore) {
        profile = this.profileStore.getProfile(profileOrId);
      }
    }
    if (!profile) {
      return { success: false, message: 'Profile không tồn tại' };
    }

    // Kiểm tra bản quyền trước khi mở profile
    if (this.licenseManager) {
      const lic = await this.licenseManager.checkStatus();
      if (!lic || !lic.isActivated || lic.isExpired) {
        return {
          success: false,
          message: lic?.message || 'Bản quyền chưa được kích hoạt hoặc đã hết hạn. Vui lòng nhập License Key hợp lệ để mở profile!'
        };
      }
    }

    const profileId = profile.id;
    if (this.runningProfiles.has(profileId)) {
      const cur = this.runningProfiles.get(profileId);
      return {
        success: true,
        message: 'Profile đã đang chạy',
        pid: cur.pid,
        profile_id: profileId,
        remote_debugging_port: cur.debugPort,
        remote_debugging_address: `127.0.0.1:${cur.debugPort}`,
        websocket_debugging_url: cur.websocket_debugging_url || `ws://127.0.0.1:${cur.debugPort}/devtools/browser`,
        browser_location: cur.exePath || '',
        driver_path: cur.driver_path || this.getChromedriverPath(),
        addition_info: {
          process_id: cur.pid,
          profile_name: profile.name || '',
          window_handle: null,
          exec_time: Date.now() - (cur.startTime || Date.now())
        },
        port: cur.debugPort
      };
    }

    const { path: exePath, type, version } = this.getExecutable(profile.browserType || 'chrome', profile.version || '');
    
    // Tính số thứ tự Profile (Badge number) cho Taskbar và Icon (Chuẩn GPMLogin theo ảnh)
    let badgeNum = profileIndex || profile.index || profile.order || profile.stt;
    if (typeof profileIndex === 'object' && profileIndex !== null) {
      badgeNum = profileIndex.index || profileIndex.order || profileIndex.stt;
    }
    if (!badgeNum) {
      const match = (profile.name || '').match(/(\d+)/);
      badgeNum = match ? parseInt(match[1], 10) : 1;
    }

    // Thư mục dữ liệu profile lưu tại Local Storage (Hỗ trợ cả UUID folder và profile_id)
    let profileDir = profile.profilePath || profile.storage_path;
    if (!profileDir) {
      const candidateUuidDir = path.join(this.baseDataDir, profileId);
      const candidateLegacyDir = path.join(this.baseDataDir, `profile_${profileId}`);
      if (fs.existsSync(candidateUuidDir)) {
        profileDir = candidateUuidDir;
      } else if (fs.existsSync(candidateLegacyDir)) {
        profileDir = candidateLegacyDir;
      } else {
        profileDir = profileId.includes('-') ? candidateUuidDir : candidateLegacyDir;
      }
    }

    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Thiết lập tên Profile trong cửa sổ Chromium (Chuẩn SV Browser: "SV | [Tên profile]")
    const rawProfileName = profile.name || `Profile ${profileId.substring(0, 5)}`;
    const svProfileName = rawProfileName.startsWith('SV | ')
      ? rawProfileName
      : (rawProfileName.startsWith('GPM | ') ? rawProfileName.replace(/^GPM \| /, 'SV | ') : `SV | ${rawProfileName}`);
    try {
      const defaultDir = path.join(profileDir, 'Default');
      if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
      const prefFile = path.join(defaultDir, 'Preferences');
      let prefObj = {};
      if (fs.existsSync(prefFile)) {
        try { prefObj = JSON.parse(fs.readFileSync(prefFile, 'utf8')); } catch (e) {}
      }
      prefObj.profile = prefObj.profile || {};
      prefObj.profile.name = svProfileName;
      prefObj.profile.using_default_name = false;
      fs.writeFileSync(prefFile, JSON.stringify(prefObj, null, 2), 'utf8');
    } catch (e) {}

    // Port remote debugging: lấy customPort nếu có, ngược lại lấy nextDebugPort
    const customPort = (options && (options.customPort || options.port))
      || (typeof profileIndex === 'object' && profileIndex !== null && (profileIndex.customPort || profileIndex.port))
      || (profile && (profile.remote_debugging_port || profile.port || profile.debugPort))
      || null;
    const debugPort = customPort ? parseInt(customPort, 10) : this.nextDebugPort++;
    let args = [];

    if (type === 'firefox') {
      args = [
        '-profile', profileDir,
        '-no-remote'
      ];
      if (profile.startUrl) args.push(profile.startUrl);
    } else {
      // Các flags chuẩn 100% trích xuất từ GPMLogin Global theo đúng mẫu Command Line
      args = [
        `--user-data-dir=${profileDir}`,
        '--password-store=basic',
        '--gpm-disable-machine-id',
        '--no-default-browser-check',
        '--no-first-run',
        '--no-crashpad',
        '--disable-crashpad',
        '--metrics-recording-only',
        '--disable-crash-reporter',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--hide-crash-restore-bubble',
        '--disable-background-mode',
        '--disable-timer-throttling',
        '--disable-render-backgrounding',
        '--disable-background-media-suspend',
        '--disable-external-intent-requests',
        '--disable-ipc-flooding-protection',
        '--disable-extension-turned-off',
        '--disable-autofill-keyboard-accessory-view',
        '--silent-debugger-extension-api',
        '--log-level=3',
        `--remote-debugging-port=${debugPort}`,
        '--remote-allow-origins=*'
      ];

      // Danh sách Extensions nạp vào trình duyệt
      const allExts = [];
      if (this.extensionStore) {
        try {
          const enabledExtPaths = this.extensionStore.getEnabledExtensionPaths();
          if (enabledExtPaths && enabledExtPaths.length > 0) {
            allExts.push(...enabledExtPaths);
          }
        } catch (extErr) {
          console.error('Lỗi khi nạp Extensions vào Chrome:', extErr);
        }
      }

      // Cấu hình Proxy
      let proxyArg = null;
      if (profile.proxy && profile.proxy.trim() && profile.proxy.toLowerCase() !== 'no proxy') {
        const proxyStr = profile.proxy.trim();
        let host = '';
        let port = '';
        let user = '';
        let pass = '';
        let protocol = '';

        if (proxyStr.startsWith('socks5://') || proxyStr.startsWith('socks4://') || proxyStr.startsWith('http://') || proxyStr.startsWith('https://')) {
          try {
            const urlObj = new URL(proxyStr);
            protocol = urlObj.protocol;
            host = urlObj.hostname;
            port = urlObj.port;
            user = decodeURIComponent(urlObj.username || '');
            pass = decodeURIComponent(urlObj.password || '');
          } catch (e) {}
        } else {
          const parts = proxyStr.split(':');
          if (parts.length === 4) {
            [host, port, user, pass] = parts;
          } else if (parts.length === 2) {
            [host, port] = parts;
          }
        }

        if (host && port) {
          const isSocks = (protocol && protocol.startsWith('socks')) ||
            (profile.proxyType && profile.proxyType.toLowerCase().includes('socks'));
          if (isSocks) {
            proxyArg = `--proxy-server=socks5://${host}:${port}`;
          } else {
            // Định dạng có tiền tố http:// theo yêu cầu của bạn
            proxyArg = `--proxy-server=http://${host}:${port}`;
          }

          // Nếu có user/pass, tự động tạo extension xác thực proxy Manifest V3
          if (user && pass) {
            const authExtDir = path.join(profileDir, 'sv_proxy_auth');
            try {
              if (!fs.existsSync(authExtDir)) fs.mkdirSync(authExtDir, { recursive: true });
              const manifestJson = {
                manifest_version: 3,
                name: "SV Proxy Auth",
                version: "1.0.0",
                permissions: [
                  "webRequest",
                  "webRequestAuthProvider"
                ],
                host_permissions: [
                  "<all_urls>"
                ],
                background: {
                  service_worker: "background.js"
                }
              };
              const bgJs = `chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    return {
      authCredentials: {
        username: ${JSON.stringify(user)},
        password: ${JSON.stringify(pass)}
      }
    };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);`;
              fs.writeFileSync(path.join(authExtDir, 'manifest.json'), JSON.stringify(manifestJson, null, 2), 'utf8');
              fs.writeFileSync(path.join(authExtDir, 'background.js'), bgJs, 'utf8');
              allExts.push(authExtDir);
            } catch (authErr) {
              console.error('Lỗi tạo extension xác thực proxy:', authErr);
            }
          }
        } else {
          const isSocks = profile.proxyType && profile.proxyType.toLowerCase().includes('socks');
          if (isSocks || proxyStr.startsWith('socks5://')) {
            const cleanProxy = proxyStr.replace(/^socks5:\/\//i, '');
            proxyArg = `--proxy-server=socks5://${cleanProxy}`;
          } else {
            const cleanProxy = proxyStr.replace(/^http:\/\//i, '');
            proxyArg = `--proxy-server=http://${cleanProxy}`;
          }
        }
      }

      // 1. Nạp Extensions (--load-extension đặt trước --proxy-server y hệt như GPMLoginGlobal)
      if (allExts.length > 0) {
        args.push(`--load-extension=${allExts.join(',')}`);
      }

      // 2. Proxy Server (đặt ngay sau --load-extension)
      if (proxyArg) {
        args.push(proxyArg);
      }

      // 3. User-Agent
      // Nếu là Chrome chuẩn (mặc định): TUYỆT ĐỐI KHÔNG truyền --user-agent (ChromiumCore đã có sẵn UA chuẩn)
      // Chỉ truyền --user-agent khi người dùng chọn Edge hoặc tự nhập custom UA
      const isEdge = (type === 'edge') || (profile.browserType === 'edge') || (profile.software && profile.software.browserType === 'edge');
      const majorVer = version ? version.split('.')[0] : '151';
      let customUa = (profile.userAgent || (profile.software && profile.software.userAgent) || '').trim();

      if (isEdge) {
        // Trình duyệt Edge cần cờ --user-agent có đuôi Edg/...
        const edgeUa = (customUa && customUa !== 'Auto')
          ? customUa
          : `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36 Edg/${majorVer}.0.0.0`;
        args.push(`--user-agent=${edgeUa}`);
      } else if (customUa && customUa !== 'Auto') {
        // Người dùng tự cấu hình custom User-Agent cho Chrome
        // Nếu lỡ có đuôi Edg/ do chọn nhầm trước đó, lọc bỏ đuôi Edg/
        const cleanUa = customUa.replace(/\s*Edg\/[\d\.]+/i, '');
        const defaultChromeUa = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVer}.0.0.0 Safari/537.36`;
        if (cleanUa !== defaultChromeUa) {
          args.push(`--user-agent=${cleanUa}`);
        }
      }

      // 4. Ngôn ngữ: Tự động theo IP vừa kiểm tra (trừ khi có thiết lập thủ công khác Auto)
      const detectedCountry = (options && options.detectedCountry) || profile.proxyCountry || '';
      const langFromCountry = detectedCountry ? ProxyChecker.getLangFromCountry(detectedCountry) : 'vi';
      const customLang = (profile.language && profile.language !== 'Auto')
        ? profile.language
        : ((profile.software && profile.software.language && profile.software.language !== 'Auto')
          ? profile.software.language
          : null);
      const lang = (options && options.detectedLang) || customLang || langFromCountry || 'vi';
      args.push(`--lang=${lang}`);

      // 5. Global Settings & Start URL
      const globalSettings = this.profileStore ? this.profileStore.getSettings() : {};

      if (globalSettings.autoClearCache) {
        try {
          this.clearCache(profileId);
        } catch (e) {}
      }

      if (globalSettings.chromeParams) {
        const extraParams = globalSettings.chromeParams.trim().split(/\s+/).filter(p => p.startsWith('--'));
        extraParams.forEach(p => {
          if (!args.includes(p)) args.push(p);
        });
      }

      if (profile.startUrl && profile.startUrl.trim() && profile.startUrl !== 'about:blank') {
        args.push(profile.startUrl.trim());
      } else if (globalSettings.startupUrl && globalSettings.startupUrl.trim()) {
        const urls = globalSettings.startupUrl.trim().split(/\s+/).filter(u => u.startsWith('http://') || u.startsWith('https://'));
        urls.forEach(u => args.push(u));
      }

      // 6. Options từ API (window_size, window_pos, window_scale, addition_args)
      if (options && options.window_size) {
        args.push(`--window-size=${options.window_size}`);
      }
      if (options && options.window_pos) {
        args.push(`--window-position=${options.window_pos}`);
      }
      if (options && options.window_scale) {
        args.push(`--force-device-scale-factor=${options.window_scale}`);
      }
      if (options && options.addition_args) {
        const extraArgs = options.addition_args.trim().split(/\s+/).filter(a => a.startsWith('--'));
        extraArgs.forEach(a => {
          if (!args.includes(a)) args.push(a);
        });
      }

      // 7. Flag switches
      args.push('--flag-switches-begin');
      args.push('--flag-switches-end');
    }

    try {
      const startTime = Date.now();
      const child = spawn(exePath, args, {
        detached: true,
        stdio: 'ignore'
      });

      child.unref();

      // Lấy WebSocket URL chuẩn cho Puppeteer / Playwright
      let wsUrl = `ws://127.0.0.1:${debugPort}/devtools/browser`;
      try {
        wsUrl = await this.getWebSocketDebuggerUrl(debugPort);
      } catch (e) {}

      const driverPath = this.getChromedriverPath();
      const execTime = Date.now() - startTime;

      const profileInfo = {
        process: child,
        pid: child.pid,
        profileId,
        profileIndex: badgeNum,
        badgeNumber: badgeNum,
        browserType: type,
        version: version || '151.0.7922.76',
        debugPort,
        remote_debugging_address: `127.0.0.1:${debugPort}`,
        websocket_debugging_url: wsUrl,
        browser_location: exePath,
        driver_path: driverPath,
        startTime: startTime
      };

      this.runningProfiles.set(profileId, profileInfo);

      child.on('exit', () => {
        this.runningProfiles.delete(profileId);
        this.emit('profile-closed', { profileId });
      });

      child.on('error', (err) => {
        console.error(`Lỗi chạy profile ${profileId}:`, err);
        this.runningProfiles.delete(profileId);
        this.emit('profile-closed', { profileId, error: err.message });
      });

      this.emit('profile-opened', { profileId, pid: child.pid, debugPort, badgeNumber: badgeNum });
      return {
        success: true,
        pid: child.pid,
        profile_id: profileId,
        profileIndex: badgeNum,
        badgeNumber: badgeNum,
        remote_debugging_port: debugPort,
        remote_debugging_address: `127.0.0.1:${debugPort}`,
        websocket_debugging_url: wsUrl,
        browser_location: exePath,
        driver_path: driverPath,
        addition_info: {
          process_id: child.pid,
          profile_name: profile.name || '',
          window_handle: null,
          exec_time: execTime
        },
        port: debugPort
      };

    } catch (err) {
      console.error(`Không thể spawn profile ${profileId}:`, err);
      return { success: false, message: err.message };
    }
  }

  closeProfile(profileId) {
    const running = this.runningProfiles.get(profileId);
    if (!running) {
      return { success: true, message: 'Profile không đang chạy' };
    }

    const pid = running.pid;
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /PID ${pid} /T /F`, () => {});
      } else {
        process.kill(pid, 'SIGTERM');
      }
    } catch (e) {
      console.warn('Lỗi kill pid:', e.message);
    }

    this.runningProfiles.delete(profileId);
    this.emit('profile-closed', { profileId });
    return { success: true };
  }

  isProfileRunning(profileId) {
    return this.runningProfiles.has(profileId);
  }

  getRunningInfo(profileId) {
    return this.runningProfiles.get(profileId) || null;
  }

  getRunningProfile(profileId) {
    return this.getRunningInfo(profileId);
  }

  closeAllProfiles() {
    for (const [profileId] of this.runningProfiles) {
      this.closeProfile(profileId);
    }
  }
}

module.exports = BrowserLauncher;
