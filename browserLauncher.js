const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');
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

  /**
   * Kiểm tra xem thư mục profile của Firefox có đang bị khóa bởi process Firefox nào không
   */
  isFirefoxProfileLocked(profileDir) {
    if (!profileDir) return false;
    const lockFile = path.join(profileDir, 'parent.lock');
    if (!fs.existsSync(lockFile)) return false;
    try {
      const fd = fs.openSync(lockFile, 'r+');
      fs.closeSync(fd);
      return false; // Mở được file để ghi -> không có Firefox nào đang chạy
    } catch (e) {
      return true; // EBUSY hoặc EPERM -> Firefox đang chiếm dụng độc quyền
    }
  }

  /**
   * Truy vấn ProcessId thực tế của Firefox đang chạy với profileDir
   */
  getFirefoxPidForProfile(profileDir) {
    try {
      const { execSync } = require('child_process');
      const cleanPath = profileDir.replace(/'/g, "''");
      const psCode = `Get-CimInstance Win32_Process -Filter "Name = 'firefox.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${cleanPath}') -and $_.CommandLine -notlike '*-contentproc*' } | Select-Object -ExpandProperty ProcessId`;
      const b64 = Buffer.from(psCode, 'utf16le').toString('base64');
      const out = execSync(`powershell -NoProfile -EncodedCommand ${b64}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      const pid = parseInt(out.split(/\\r?\\n/)[0], 10);
      return isNaN(pid) ? null : pid;
    } catch (e) {
      return null;
    }
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

    // Quét toàn bộ các thư mục drivers hợp lệ (bao gồm AppData bảo lưu vĩnh viễn, Portable cạnh exe, và thư mục nội bộ)
    const candidateDirs = [
      path.join(process.env.APPDATA || '', 'sv-browser', 'SVBrowserData', 'drivers'),
      path.join(process.env.APPDATA || '', 'SVBrowserData', 'drivers'),
      (this.baseDataDir ? path.join(this.baseDataDir, '..', 'drivers') : null),
      path.join(path.dirname(process.execPath || ''), 'drivers'),
      path.join(process.resourcesPath || '', 'drivers'),
      path.join(__dirname, 'drivers')
    ].filter((d, idx, arr) => Boolean(d) && fs.existsSync(d) && arr.indexOf(d) === idx);

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

    // Tìm các đường dẫn driver nội bộ (portable & vĩnh viễn)
    const candidateDriversDirs = [
      path.join(process.env.APPDATA || '', 'sv-browser', 'SVBrowserData', 'drivers'),
      path.join(process.env.APPDATA || '', 'SVBrowserData', 'drivers'),
      (this.baseDataDir ? path.join(this.baseDataDir, '..', 'drivers') : null),
      path.join(process.resourcesPath || '', 'drivers'),
      path.join(path.dirname(process.execPath || ''), 'drivers'),
      path.join(__dirname, 'drivers')
    ].filter((d, idx, arr) => Boolean(d) && fs.existsSync(d) && arr.indexOf(d) === idx);

    const portableBravePaths = [];
    const portableFirefoxPaths = [];
    for (const d of candidateDriversDirs) {
      portableBravePaths.push(path.join(d, 'BraveCore', 'brave.exe'));
      portableBravePaths.push(path.join(d, 'Brave', 'brave.exe'));
      portableBravePaths.push(path.join(d, 'Brave-Browser', 'Application', 'brave.exe'));

      portableFirefoxPaths.push(path.join(d, 'FirefoxCore', 'firefox.exe'));
      portableFirefoxPaths.push(path.join(d, 'Firefox', 'firefox.exe'));
      portableFirefoxPaths.push(path.join(d, 'Mozilla Firefox', 'firefox.exe'));
    }

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
        ...portableBravePaths,
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
        ...portableFirefoxPaths,
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

    // Nếu người dùng chọn đích danh Firefox hoặc Brave mà máy chưa cài
    if (type === 'firefox') {
      throw new Error('Máy tính chưa có trình duyệt Mozilla Firefox! Bạn vui lòng cài đặt Firefox (hoặc copy thư mục Firefox vào thư mục drivers/) để mở profile này.');
    }
    if (type === 'brave') {
      throw new Error('Máy tính chưa có trình duyệt Brave Browser! Bạn vui lòng cài đặt Brave (hoặc copy thư mục Brave vào thư mục drivers/) để mở profile này.');
    }
    if (type === 'edge') {
      throw new Error('Máy tính chưa có trình duyệt Microsoft Edge!');
    }

    // Fallbacks
    if (browsers.chrome) return { path: browsers.chrome, type: 'chrome', version: 'default' };

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
      if (!profile && (profileOrId.startsWith('incognito') || (options && (options.incognito || options.is_incognito)))) {
        profile = {
          id: profileOrId,
          name: (options && options.name) || `Incognito ${profileOrId.slice(-6)}`,
          isEphemeral: true,
          incognito: true,
          browserType: (options && (options.browserType || options.browser_type)) || 'chrome',
          version: (options && (options.version || options.browser_version)) || '',
          proxy: (options && (options.proxy || options.raw_proxy)) || 'No Proxy',
          proxyType: (options && (options.proxyType || options.proxy_type)) || 'http',
          startUrl: (options && (options.startUrl || options.start_url || options.url)) || ''
        };
      }
    }
    if (!profile) {
      return { success: false, message: 'Profile không tồn tại' };
    }

    const isIncognito = !!(
      (options && (options.incognito || options.is_incognito || options.isIncognito)) ||
      (profile && (profile.incognito || profile.is_incognito || profile.isIncognito))
    );

    const isHeadless = !!(
      (options && (options.headless || options.is_headless || options.isHeadless || options.mode === 'headless' || options.headless === 'true' || options.is_headless === 'true')) ||
      (profile && (profile.headless || profile.is_headless || profile.isHeadless))
    );

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
        is_incognito: cur.isIncognito || false,
        is_headless: cur.isHeadless || false,
        remote_debugging_port: cur.debugPort,
        remote_debugging_address: `127.0.0.1:${cur.debugPort}`,
        websocket_debugging_url: cur.websocket_debugging_url || `ws://127.0.0.1:${cur.debugPort}/devtools/browser`,
        browser_location: cur.exePath || '',
        driver_path: cur.driver_path || this.getChromedriverPath(),
        addition_info: {
          process_id: cur.pid,
          profile_name: profile.name || '',
          is_incognito: cur.isIncognito || false,
          is_headless: cur.isHeadless || false,
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
    if (profile.isEphemeral) {
      profileDir = path.join(os.tmpdir(), 'sv_browser_temp_' + profileId);
    } else if (!profileDir) {
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

    // Dọn dẹp file LOCK cũ nếu phiên làm việc trước bị tắt đột ngột hoặc treo
    try {
      const lock1 = path.join(profileDir, 'LOCK');
      const lock2 = path.join(profileDir, 'Default', 'LOCK');
      if (fs.existsSync(lock1)) fs.unlinkSync(lock1);
      if (fs.existsSync(lock2)) fs.unlinkSync(lock2);
    } catch (_) {}

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
      if (isIncognito) {
        prefObj.profile.is_incognito = true;
      }
      fs.writeFileSync(prefFile, JSON.stringify(prefObj, null, 2), 'utf8');
    } catch (e) {}

    // Port remote debugging: lấy customPort nếu có, ngược lại lấy nextDebugPort
    const customPort = (options && (options.customPort || options.port || options.remote_debugging_port))
      || (typeof profileIndex === 'object' && profileIndex !== null && (profileIndex.customPort || profileIndex.port || profileIndex.remote_debugging_port))
      || (profile && (profile.remote_debugging_port || profile.port || profile.debugPort))
      || null;
    const debugPort = customPort ? parseInt(customPort, 10) : this.nextDebugPort++;
    let args = [];

    if (type === 'firefox') {
      args = [
        '-profile', profileDir,
        '-no-remote'
      ];
      if (isHeadless) {
        args.push('-headless');
      }
      if (isIncognito) {
        args.push('-private');
      }
      if (profile.startUrl) args.push(profile.startUrl);

      // Cấu hình user.js cho Firefox: Tắt màn hình chào mừng (First-run), telemetry, mặc định browser, nạp proxy & extensions
      try {
        const userJsPath = path.join(profileDir, 'user.js');
        const ffPrefs = [
          '// Tự động cấu hình bởi SV Browser',
          'user_pref("browser.aboutwelcome.enabled", false);',
          'user_pref("trailhead.firstrun.didSeeAboutWelcome", true);',
          'user_pref("browser.startup.firstrunSkipsHomepage", true);',
          'user_pref("browser.startup.page", 0);',
          'user_pref("browser.startup.homepage_override.mstone", "ignore");',
          'user_pref("browser.onboarding.enabled", false);',
          'user_pref("browser.uitour.enabled", false);',
          'user_pref("datareporting.policy.dataSubmissionPolicyAcceptedVersion", 2);',
          'user_pref("datareporting.policy.dataSubmissionPolicyBypassAcceptance", true);',
          'user_pref("datareporting.policy.firstRunURL", "");',
          'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);',
          'user_pref("doh-rollout.doneFirstRun", true);',
          'user_pref("browser.shell.checkDefaultBrowser", false);',
          'user_pref("extensions.pocket.enabled", false);',
          'user_pref("browser.newtabpage.enabled", false);',
          'user_pref("xpinstall.signatures.required", false);',
          'user_pref("extensions.autoDisableScopes", 0);',
          'user_pref("extensions.enabledScopes", 15);',
          'user_pref("extensions.experiments.enabled", true);'
        ];

        if (profile.proxy && profile.proxy.trim() && profile.proxy.toLowerCase() !== 'no proxy') {
          const proxyStr = profile.proxy.trim();
          let host = '', port = 80;
          const isSocks = (profile.proxyType && profile.proxyType.toLowerCase().includes('socks')) || proxyStr.toLowerCase().startsWith('socks');

          let cleanStr = proxyStr.replace(/^(?:https?|socks[45]):\/\//i, '');
          if (cleanStr.includes('@')) cleanStr = cleanStr.split('@')[1];
          const parts = cleanStr.split(':');
          if (parts.length >= 2) {
            host = parts[0].trim();
            port = parseInt(parts[1], 10) || 80;
          }

          if (host && port) {
            ffPrefs.push('user_pref("network.proxy.type", 1);');
            if (isSocks) {
              ffPrefs.push(`user_pref("network.proxy.socks", "${host}");`);
              ffPrefs.push(`user_pref("network.proxy.socks_port", ${port});`);
              ffPrefs.push('user_pref("network.proxy.socks_version", 5);');
              ffPrefs.push('user_pref("network.proxy.socks_remote_dns", true);');
            } else {
              ffPrefs.push(`user_pref("network.proxy.http", "${host}");`);
              ffPrefs.push(`user_pref("network.proxy.http_port", ${port});`);
              ffPrefs.push(`user_pref("network.proxy.ssl", "${host}");`);
              ffPrefs.push(`user_pref("network.proxy.ssl_port", ${port});`);
            }
          }
        }
        fs.writeFileSync(userJsPath, ffPrefs.join('\n') + '\n', 'utf8');

        // Nạp extensions cho Firefox vào thư mục <profileDir>/extensions
        if (this.extensionStore) {
          try {
            const enabledExtPaths = this.extensionStore.getEnabledExtensionPaths();
            if (enabledExtPaths && enabledExtPaths.length > 0) {
              const ffExtDir = path.join(profileDir, 'extensions');
              if (!fs.existsSync(ffExtDir)) fs.mkdirSync(ffExtDir, { recursive: true });
              for (const extPath of enabledExtPaths) {
                const manifestPath = path.join(extPath, 'manifest.json');
                if (fs.existsSync(manifestPath)) {
                  let extId = path.basename(extPath);
                  try {
                    const mData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    const geckoId = mData.browser_specific_settings?.gecko?.id || mData.applications?.gecko?.id;
                    if (geckoId) extId = geckoId;
                  } catch (e) {}
                  const targetFolder = path.join(ffExtDir, extId);
                  if (!fs.existsSync(targetFolder)) {
                    try {
                      fs.cpSync(extPath, targetFolder, { recursive: true });
                    } catch (cpErr) {}
                  }
                }
              }
            }
          } catch (extErr) {}
        }
      } catch (e) {
        console.error('Lỗi cấu hình user.js cho Firefox:', e.message);
      }
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
        '--disable-breakpad',
        '--no-crash-upload',
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

      if (isHeadless) {
        // Chế độ chạy ngầm / ẩn Chrome (Headless new engine hỗ trợ 100% extensions và fingerprint, tiết kiệm RAM/GPU)
        args.push(
          '--headless=new',
          '--disable-gpu',
          '--mute-audio',
          '--disable-software-rasterizer'
        );
      }

      if (isIncognito) {
        args.push('--incognito');
      }

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
        } else if (proxyStr.includes('@')) {
          const atIdx = proxyStr.lastIndexOf('@');
          const authPart = proxyStr.substring(0, atIdx);
          const hostPart = proxyStr.substring(atIdx + 1);
          if (authPart.includes(':')) {
            const cIdx = authPart.indexOf(':');
            user = authPart.substring(0, cIdx);
            pass = authPart.substring(cIdx + 1);
          } else {
            user = authPart;
          }
          if (hostPart.includes(':')) {
            const [h, p] = hostPart.split(':');
            host = h;
            port = p;
          } else {
            host = hostPart;
            port = '80';
          }
        } else {
          const parts = proxyStr.split(':');
          if (parts.length === 4) {
            const p1Num = parseInt(parts[1], 10);
            const p3Num = parseInt(parts[3], 10);
            const p1IsPort = !isNaN(p1Num) && p1Num > 0 && p1Num <= 65535;
            const p3IsPort = !isNaN(p3Num) && p3Num > 0 && p3Num <= 65535;

            if (p1IsPort && !p3IsPort) {
              // host:port:user:pass
              [host, port, user, pass] = parts;
            } else if (!p1IsPort && p3IsPort) {
              // user:pass:host:port
              [user, pass, host, port] = parts;
            } else if (/^\d+\.\d+\.\d+\.\d+$/.test(parts[0]) || parts[0].includes('.')) {
              [host, port, user, pass] = parts;
            } else {
              [user, pass, host, port] = parts;
            }
          } else if (parts.length === 2) {
            [host, port] = parts;
          } else if (parts.length === 3) {
            [host, port, user] = parts;
          }
        }

        if (host && port) {
          const isSocks = (protocol && protocol.startsWith('socks')) ||
            (profile.proxyType && profile.proxyType.toLowerCase().includes('socks'));
          if (isSocks) {
            proxyArg = `--proxy-server=socks5://${host}:${port}`;
          } else {
            // Định dạng chuẩn GPMLoginGlobal: --proxy-server=host:port (không có tiền tố http:// để Chromium áp dụng cho cả HTTP và HTTPS CONNECT)
            proxyArg = `--proxy-server=${host}:${port}`;
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
                incognito: "spanning",
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
              const bgJs = `// SV Proxy Auth - Manifest V3
try {
  chrome.webRequest.onAuthRequired.addListener(
    function(details, callback) {
      callback({
        authCredentials: {
          username: ${JSON.stringify(user)},
          password: ${JSON.stringify(pass)}
        }
      });
    },
    { urls: ["<all_urls>"] },
    ["asyncBlocking"]
  );
} catch (e1) {
  try {
    chrome.webRequest.onAuthRequired.addListener(
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
    );
  } catch (e2) {}
}`;
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
            proxyArg = `--proxy-server=${cleanProxy}`;
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
      } else if (isHeadless) {
        // Mặc định kích thước viewport chuẩn Desktop cho chế độ Headless
        args.push('--window-size=1280,800');
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

      // Lấy WebSocket URL chuẩn cho Puppeteer / Playwright (chỉ với Chromium)
      let wsUrl = `ws://127.0.0.1:${debugPort}/devtools/browser`;
      if (type !== 'firefox') {
        try {
          wsUrl = await this.getWebSocketDebuggerUrl(debugPort);
        } catch (e) {}
      }

      // Kiểm tra nếu tiến trình đã tự đóng / crash ngay sau khi gọi (đối với Chromium)
      if (type !== 'firefox' && child.exitCode !== null) {
        this.runningProfiles.delete(profileId);
        return {
          success: false,
          message: `Trình duyệt tự thoát ngay sau khi mở (Exit code: ${child.exitCode}). Vui lòng kiểm tra dung lượng ổ đĩa, RAM hoặc tiện ích mở rộng.`
        };
      }

      const driverPath = this.getChromedriverPath();
      const execTime = Date.now() - startTime;

      const profileInfo = {
        process: child,
        pid: child.pid,
        profileId,
        profileDir,
        isEphemeral: !!profile.isEphemeral,
        isIncognito: !!isIncognito,
        isHeadless: !!isHeadless,
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

      if (type === 'firefox') {
        // Với Firefox trên Windows: bootstrap process thoát ngay sau khi GUI process mở
        // Tìm PID thực tế của Firefox GUI
        setTimeout(() => {
          const realPid = this.getFirefoxPidForProfile(profileDir);
          if (realPid && profileInfo) {
            profileInfo.realPid = realPid;
            profileInfo.pid = realPid;
          }
        }, 600);

        // Theo dõi trạng thái đóng bằng parent.lock của Firefox
        profileInfo.ffMonitorTimer = setInterval(() => {
          if (!this.isFirefoxProfileLocked(profileDir)) {
            clearInterval(profileInfo.ffMonitorTimer);
            this.runningProfiles.delete(profileId);
            this.emit('profile-closed', { profileId });
          }
        }, 1500);

        child.on('exit', () => {
          setTimeout(() => {
            if (!this.isFirefoxProfileLocked(profileDir)) {
              if (profileInfo.ffMonitorTimer) clearInterval(profileInfo.ffMonitorTimer);
              this.runningProfiles.delete(profileId);
              this.emit('profile-closed', { profileId });
            }
          }, 800);
        });
      } else {
        child.on('exit', () => {
          this.runningProfiles.delete(profileId);
          if (profile.isEphemeral && profileDir && fs.existsSync(profileDir)) {
            try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
          }
          this.emit('profile-closed', { profileId });
        });
      }

      child.on('error', (err) => {
        console.error(`Lỗi chạy profile ${profileId}:`, err);
        this.runningProfiles.delete(profileId);
        if (profile.isEphemeral && profileDir && fs.existsSync(profileDir)) {
          try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
        }
        this.emit('profile-closed', { profileId, error: err.message });
      });

      this.emit('profile-opened', { profileId, pid: child.pid, debugPort, badgeNumber: badgeNum, isHeadless: !!isHeadless });
      return {
        success: true,
        pid: child.pid,
        profile_id: profileId,
        is_incognito: isIncognito,
        is_headless: isHeadless,
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
          is_incognito: isIncognito,
          is_headless: isHeadless,
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

    if (running.ffMonitorTimer) {
      clearInterval(running.ffMonitorTimer);
    }

    const pid = running.realPid || running.pid;
    try {
      if (process.platform === 'win32') {
        if (pid) {
          exec(`taskkill /PID ${pid} /T /F`, () => {});
        }
        if (running.browserType === 'firefox' && running.profileDir) {
          const ffPid = this.getFirefoxPidForProfile(running.profileDir);
          if (ffPid && ffPid !== pid) {
            exec(`taskkill /PID ${ffPid} /T /F`, () => {});
          }
        }
      } else {
        process.kill(pid, 'SIGTERM');
      }
    } catch (e) {
      console.warn('Lỗi kill pid:', e.message);
    }

    if (running.isEphemeral && running.profileDir && fs.existsSync(running.profileDir)) {
      try { fs.rmSync(running.profileDir, { recursive: true, force: true }); } catch (e) {}
    }

    this.runningProfiles.delete(profileId);
    this.emit('profile-closed', { profileId });
    return { success: true };
  }

  isProfileRunning(profileId) {
    const running = this.runningProfiles.get(profileId);
    if (!running) return false;
    if (running.browserType === 'firefox' && running.profileDir) {
      return this.isFirefoxProfileLocked(running.profileDir);
    }
    return true;
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
