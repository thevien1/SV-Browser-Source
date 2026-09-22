const http = require('http');
const path = require('path');
const fs = require('fs');
const ProxyChecker = require('./proxyChecker');

/**
 * SV Browser REST API Server & API Gateway
 * Tuân thủ 100% chuẩn GPMLogin Local API specification (https://api-docs.gpmloginapp.com/#overview)
 * Cung cấp cổng API cục bộ cho các tool tự động hoá (Python, Node.js, C#, Selenium, Puppeteer, Playwright)
 */
class GpmApiServer {
  constructor(profileStore, browserLauncher, port = 8725, allowRemote = false, licenseManager = null, extensionStore = null) {
    this.profileStore = profileStore;
    this.browserLauncher = browserLauncher;
    this.port = parseInt(port, 10) || 8725;
    this.allowRemote = !!allowRemote;
    this.licenseManager = licenseManager;
    this.extensionStore = extensionStore;
    this.server = null;
    this.isRunning = false;
  }

  writePortFile() {
    try {
      const portStr = this.port.toString();
      if (this.profileStore && this.profileStore.dataDir) {
        fs.writeFileSync(path.join(this.profileStore.dataDir, 'http.port'), portStr, 'utf8');
      } else if (!__dirname.includes('app.asar')) {
        const appDataDir = path.join(__dirname, 'app_data');
        if (!fs.existsSync(appDataDir)) {
          try { fs.mkdirSync(appDataDir, { recursive: true }); } catch (e) {}
        }
        try { fs.writeFileSync(path.join(appDataDir, 'http.port'), portStr, 'utf8'); } catch (e) {}
      }
    } catch (e) {
      console.warn('[SV Browser API Gateway] Không thể ghi file http.port:', e.message);
    }
  }

  normalizeBrowserType(val) {
    if (typeof val === 'number') {
      const map = { 1: 'chrome', 2: 'firefox', 3: 'edge', 4: 'opera', 5: 'brave' };
      return map[val] || 'chrome';
    }
    if (typeof val === 'string') {
      const s = val.toLowerCase().trim();
      if (['chrome', 'firefox', 'edge', 'opera', 'brave'].includes(s)) return s;
      const num = parseInt(s, 10);
      if (!isNaN(num)) return this.normalizeBrowserType(num);
    }
    return 'chrome';
  }

  normalizeOsType(val) {
    if (typeof val === 'number') {
      const map = { 1: 'windows', 2: 'mac', 3: 'mac_arm', 4: 'linux', 5: 'android' };
      return map[val] || 'windows';
    }
    if (typeof val === 'string') {
      const s = val.toLowerCase().trim();
      if (['windows', 'mac', 'mac_arm', 'linux', 'android'].includes(s)) return s;
      const num = parseInt(s, 10);
      if (!isNaN(num)) return this.normalizeOsType(num);
    }
    return 'windows';
  }

  start() {
    if (this.server) {
      try {
        this.server.close();
      } catch (e) {}
    }

    this.server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const base = `http://${req.headers.host || '127.0.0.1'}`;
      const parsedUrl = new URL(req.url, base);
      const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
      const query = Object.fromEntries(parsedUrl.searchParams.entries());

      // Hàm gửi JSON
      const sendJson = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
      };

      try {
        // 1. Root / Ping Endpoint (Chuẩn chính xác GPMLogin & SV Browser API)
        if (pathname === '/' || pathname === '/api' || pathname === '/api/v1' || pathname === '/api/v2' || pathname === '/api/v3') {
          return sendJson(200, {
            success: true,
            data: 'SV Browser API',
            message: null,
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // KIỂM TRA BẢN QUYỀN CHO TOÀN BỘ CÁC ROUTE PROFILE / AUTOMATION (CỔNG 8725)
        if (pathname.includes('/profile') || pathname.includes('/browser') || pathname.includes('/group') || pathname.includes('/prox') || pathname.includes('/extens')) {
          if (this.licenseManager) {
            const lic = await this.licenseManager.checkStatus();
            if (!lic || !lic.isActivated || lic.isExpired) {
              return sendJson(403, {
                success: false,
                data: null,
                message: lic?.message || 'Phần mềm chưa kích hoạt bản quyền hợp lệ. Vui lòng nhập License Key trên ứng dụng SV Browser.',
                sender: 'SV Browser v5.0.8-stable'
              });
            }
          }
        }

        // Helper lấy id từ URL regex match hoặc query params (?id=... / ?profile_id=...)
        const extractId = (m) => {
          if (m && m[1]) return m[1].trim();
          return (query.id || query.profile_id || '').toString().trim();
        };

        // 2. MỞ TRÌNH DUYỆT (START BROWSER)
        // Chuẩn GPMLogin: GET /api/v1/profiles/start/{id}
        // Tham số query: remote_debugging_port, window_scale, window_pos, window_size, skip_proxy_check, addition_args
        const startMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?\/start(?:\/([^\/]+))?$/i);
        if (startMatch && req.method === 'GET') {
          const profileId = extractId(startMatch);
          if (!profileId) {
            return sendJson(400, { success: false, message: 'Thiếu ID của profile cần mở', sender: 'SV Browser v5.0.8-stable' });
          }

          const profile = this.profileStore.getProfile(profileId);
          if (!profile) {
            return sendJson(404, { success: false, message: 'Profile không tồn tại', sender: 'SV Browser v5.0.8-stable' });
          }

          // Xử lý các query params theo chuẩn GPMLogin API
          const launchOptions = {
            remote_debugging_port: query.remote_debugging_port ? parseInt(query.remote_debugging_port, 10) : undefined,
            window_scale: query.window_scale ? parseFloat(query.window_scale) : undefined,
            window_pos: query.window_pos || undefined,
            window_size: query.window_size || undefined,
            skip_proxy_check: query.skip_proxy_check === 'true' || query.skip_proxy_check === true || query.skip_proxy_check === '1',
            addition_args: query.addition_args || undefined
          };

          // Kiểm tra kết nối proxy (trừ khi có cờ skip_proxy_check=true)
          if (!launchOptions.skip_proxy_check && profile.proxy && profile.proxy.trim() && profile.proxy.toLowerCase() !== 'no proxy') {
            const proxyCheck = await ProxyChecker.testProxy(profile.proxy, profile.proxyType);
            if (!proxyCheck.live) {
              return sendJson(500, {
                success: false,
                message: `Proxy ${profile.proxy} không kết nối được (No connection). Đã hủy mở trình duyệt!`,
                sender: 'SV Browser v5.0.8-stable'
              });
            }
          }

          const result = await this.browserLauncher.launchProfile(profile, null, launchOptions);
          if (result && result.success) {
            const port = result.remote_debugging_port || result.port || result.debugPort;
            return sendJson(200, {
              success: true,
              data: {
                profile_id: result.profile_id || profile.id,
                driver_path: result.driver_path || (this.browserLauncher && this.browserLauncher.getChromedriverPath ? this.browserLauncher.getChromedriverPath() : path.join(__dirname, 'chromedriver.exe')),
                remote_debugging_port: port,
                remote_debugging_address: result.remote_debugging_address || `127.0.0.1:${port}`,
                websocket_debugging_url: result.websocket_debugging_url || `ws://127.0.0.1:${port}/devtools/browser`,
                browser_location: result.browser_location || result.exePath || '',
                addition_info: result.addition_info || {
                  process_id: result.pid,
                  profile_name: profile.name || '',
                  window_handle: null,
                  exec_time: 0
                }
              },
              message: 'OK',
              sender: 'SV Browser v5.0.8-stable'
            });
          } else {
            return sendJson(500, {
              success: false,
              message: result ? result.message : 'Không thể mở profile',
              sender: 'SV Browser v5.0.8-stable'
            });
          }
        }

        // 3. ĐÓNG TRÌNH DUYỆT (STOP / CLOSE BROWSER)
        // Chuẩn GPMLogin: GET /api/v1/profiles/stop/{id}
        // Hỗ trợ cả /stop/{id}, /close/{id}, /api/v1/..., /api/v2/..., /api/v3/...
        const stopMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?\/(?:stop|close)(?:\/([^\/]+))?$/i);
        if (stopMatch && req.method === 'GET') {
          const profileId = extractId(stopMatch);
          if (!profileId) {
            return sendJson(400, { success: false, message: 'Thiếu ID của profile cần đóng', sender: 'SV Browser v5.0.8-stable' });
          }

          this.browserLauncher.closeProfile(profileId);
          return sendJson(200, {
            success: true,
            data: null,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 4. DANH SÁCH PROFILES (PAGINATED LIST)
        // Chuẩn GPMLogin: GET /api/v1/profiles
        const listMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?$/i);
        if (listMatch && req.method === 'GET') {
          const profiles = this.profileStore.getAllProfiles();
          const storagePath = (this.profileStore.settings && this.profileStore.settings.localStoragePath) || '';

          const page = parseInt(query.page, 10) || 1;
          const pageSize = parseInt(query.page_size || query.per_page, 10) || 30;
          const search = (query.search || '').toLowerCase().trim();
          const sort = parseInt(query.sort, 10) || 0;

          let filtered = profiles;
          if (search) {
            filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(search));
          }
          if (sort === 0) filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          else if (sort === 1) filtered.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          else if (sort === 2) filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          else if (sort === 3) filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

          const total = filtered.length;
          const startIndex = (page - 1) * pageSize;
          const paginated = filtered.slice(startIndex, startIndex + pageSize);

          const items = paginated.map(p => {
            const runInfo = this.browserLauncher.runningProfiles.get(p.id);
            return {
              id: p.id,
              name: p.name,
              group_id: p.group_id || p.group || 'all',
              group_name: p.group || p.group_name || p.group_id || 'Default group',
              storage_path: p.storage_path || p.profilePath || `${storagePath}\\${p.id}`,
              raw_proxy: p.raw_proxy !== undefined ? p.raw_proxy : (p.proxy && p.proxy !== 'No Proxy' ? p.proxy : ''),
              browser: p.browser || { name: p.browserType || 'chrome', version: p.version || '151.0.7922.76' },
              os: p.os || 'windows',
              note: p.note || p.notes || '',
              status: runInfo ? 'running' : 'ready',
              port: runInfo ? runInfo.debugPort : null,
              remote_debugging_port: runInfo ? runInfo.debugPort : null,
              remote_debugging_address: runInfo ? runInfo.remote_debugging_address : null,
              websocket_debugging_url: runInfo ? runInfo.websocket_debugging_url : null,
              created_at: typeof p.createdAt === 'number' ? new Date(p.createdAt).toISOString() : (p.createdAt || new Date().toISOString()),
              updated_at: typeof p.updatedAt === 'number' ? new Date(p.updatedAt).toISOString() : (p.updatedAt || new Date().toISOString()),
              tags: Array.isArray(p.tags) ? p.tags : []
            };
          });

          return sendJson(200, {
            success: true,
            data: {
              current_page: page,
              per_page: pageSize,
              total: total,
              last_page: Math.ceil(total / pageSize) || 1,
              data: items,
              profiles: items
            },
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 5. CHI TIẾT 1 PROFILE (GET ONE PROFILE)
        // Chuẩn GPMLogin: GET /api/v1/profiles/{id}
        const getOneMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?\/([a-zA-Z0-9\-]+)$/i);
        if (getOneMatch && req.method === 'GET' && !['start', 'stop', 'close', 'create', 'update', 'delete'].includes(getOneMatch[1])) {
          const profileId = getOneMatch[1];
          const p = this.profileStore.getProfile(profileId);
          if (!p) {
            return sendJson(404, { success: false, message: 'Profile không tồn tại', sender: 'SV Browser v5.0.8-stable' });
          }
          const storagePath = (this.profileStore.settings && this.profileStore.settings.localStoragePath) || '';
          return sendJson(200, {
            success: true,
            data: {
              id: p.id,
              name: p.name,
              group_id: p.group_id || p.group || 'all',
              storage_path: p.storage_path || p.profilePath || `${storagePath}\\${p.id}`,
              raw_proxy: p.raw_proxy !== undefined ? p.raw_proxy : (p.proxy && p.proxy !== 'No Proxy' ? p.proxy : ''),
              browser: p.browser || { name: p.browserType || 'chrome', version: p.version || '151.0.7922.76' },
              os: p.os || 'windows',
              note: p.note || p.notes || '',
              status: this.browserLauncher.isProfileRunning(p.id) ? 'running' : 'ready',
              port: this.browserLauncher.runningProfiles.get(p.id)?.debugPort || null,
              remote_debugging_port: this.browserLauncher.runningProfiles.get(p.id)?.debugPort || null,
              remote_debugging_address: this.browserLauncher.runningProfiles.get(p.id)?.remote_debugging_address || null,
              websocket_debugging_url: this.browserLauncher.runningProfiles.get(p.id)?.websocket_debugging_url || null,
              created_at: typeof p.createdAt === 'number' ? new Date(p.createdAt).toISOString() : (p.createdAt || new Date().toISOString()),
              updated_at: typeof p.updatedAt === 'number' ? new Date(p.updatedAt).toISOString() : (p.updatedAt || new Date().toISOString()),
              tags: Array.isArray(p.tags) ? p.tags : [],
              fingerprint: p.fingerprint || this.profileStore.generateFingerprint(p.os, p.browserType, p.version)
            },
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 6. TẠO PROFILE (CREATE PROFILE)
        // Chuẩn GPMLogin: POST /api/v1/profiles/create hoặc POST /api/v1/profiles
        const createMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?\/create$/i) || (pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?$/i) && req.method === 'POST');
        if (createMatch) {
          let body = query;
          if (req.method === 'POST') {
            const rawBody = await this.readBody(req);
            try { body = { ...query, ...JSON.parse(rawBody) }; } catch (e) { body = query; }
          }

          const browserType = this.normalizeBrowserType((body.browser && body.browser.name) || body.browser_type || 'chrome');
          const os = this.normalizeOsType(body.os || body.os_type || 'windows');
          const version = (body.browser && body.browser.version) || body.browser_version || body.version || '151.0.7922.76';
          const proxy = body.raw_proxy || body.proxy || 'No Proxy';

          const newProfile = this.profileStore.createProfile({
            id: body.id,
            name: body.name || `Profile 01`,
            group_id: body.group_id || body.group || 'all',
            group: body.group_name || body.group || body.group_id || 'Default group',
            browserType: browserType,
            version: version,
            os: os,
            proxy: proxy,
            note: body.note || body.notes || '',
            tags: body.tags || [],
            fingerprint: body.fingerprint
          });

          return sendJson(200, {
            success: true,
            data: {
              id: newProfile.id,
              name: newProfile.name,
              group_id: newProfile.group_id || 'all',
              storage_path: newProfile.storage_path,
              raw_proxy: newProfile.raw_proxy,
              browser: newProfile.browser,
              os: newProfile.os,
              note: newProfile.note,
              created_at: new Date(newProfile.createdAt).toISOString(),
              updated_at: new Date(newProfile.updatedAt).toISOString(),
              tags: newProfile.tags,
              fingerprint: newProfile.fingerprint
            },
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 7. CẬP NHẬT PROFILE (UPDATE PROFILE)
        // Chuẩn GPMLogin: POST /api/v1/profiles/update/{id} hoặc PUT /api/v1/profiles/{id}
        const updateMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?\/update(?:\/([^\/]+))?$/i) ||
                            (pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?\/([a-zA-Z0-9\-_]+)$/i) && (req.method === 'PUT' || req.method === 'POST'));
        if (updateMatch && (req.method === 'POST' || req.method === 'PUT')) {
          const profileId = extractId(updateMatch);
          let body = query;
          const rawBody = await this.readBody(req);
          try { body = { ...query, ...JSON.parse(rawBody) }; } catch (e) { body = query; }

          if (body.browser_type) body.browserType = this.normalizeBrowserType(body.browser_type);
          if (body.os_type) body.os = this.normalizeOsType(body.os_type);
          if (body.raw_proxy !== undefined) body.proxy = body.raw_proxy;

          const updated = this.profileStore.updateProfile(profileId, body);
          if (!updated) {
            return sendJson(404, { success: false, data: null, message: 'Profile không tồn tại', sender: 'SV Browser v5.0.8-stable' });
          }

          return sendJson(200, {
            success: true,
            data: updated,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 8. XOÁ PROFILE (DELETE PROFILE)
        // Chuẩn GPMLogin: GET hoặc DELETE /api/v1/profiles/delete/{id} hoặc DELETE /api/v1/profiles/{id}
        const deleteMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?\/delete(?:\/([^\/]+))?$/i) ||
                            (pathname.match(/^\/api\/(?:v[1-3]\/)?profiles?\/([a-zA-Z0-9\-_]+)$/i) && req.method === 'DELETE');
        if (deleteMatch && (req.method === 'GET' || req.method === 'DELETE')) {
          const profileId = extractId(deleteMatch);
          if (!profileId) {
            return sendJson(400, { success: false, data: null, message: 'Thiếu ID của profile cần xóa', sender: 'SV Browser v5.0.8-stable' });
          }
          const mode = (query.mode || 'hard').toLowerCase();
          this.browserLauncher.closeProfile(profileId);
          this.profileStore.deleteProfile(profileId, { hard: mode !== 'soft' });
          return sendJson(200, {
            success: true,
            data: null,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // =========================================================================
        // B. GROUPS ENDPOINTS (Chuẩn GPMLogin API)
        // =========================================================================

        // 9. DANH SÁCH GROUPS (PAGINATED)
        // Chuẩn GPMLogin: GET /api/v1/groups
        const groupsListMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?groups?$/i);
        if (groupsListMatch && req.method === 'GET') {
          const groups = this.profileStore.getGroups();
          const profiles = this.profileStore.getAllProfiles();

          const page = Math.max(1, parseInt(query.page, 10) || 1);
          const pageSize = Math.max(1, parseInt(query.page_size || query.per_page, 10) || 30);
          const search = (query.search || '').toLowerCase().trim();

          let filtered = groups;
          if (search) {
            filtered = filtered.filter(g => (g.name || '').toLowerCase().includes(search));
          }

          const total = filtered.length;
          const startIndex = (page - 1) * pageSize;
          const paginated = filtered.slice(startIndex, startIndex + pageSize);

          const items = paginated.map(g => {
            const count = profiles.filter(p => (p.group === g.name || p.group_id === g.id)).length;
            return {
              id: g.id,
              name: g.name,
              order: g.order || 0,
              total_profile: count,
              created_at: typeof g.createdAt === 'number' ? new Date(g.createdAt).toISOString() : (g.createdAt || new Date().toISOString()),
              updated_at: typeof g.updatedAt === 'number' ? new Date(g.updatedAt).toISOString() : (g.updatedAt || new Date().toISOString())
            };
          });

          return sendJson(200, {
            success: true,
            data: {
              current_page: page,
              per_page: pageSize,
              total: total,
              last_page: Math.ceil(total / pageSize) || 1,
              data: items
            },
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 10. CHI TIẾT 1 GROUP
        // Chuẩn GPMLogin: GET /api/v1/groups/{id}
        const getGroupMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?groups?\/([a-zA-Z0-9\-_]+)$/i);
        if (getGroupMatch && req.method === 'GET' && !['create', 'update', 'delete'].includes(getGroupMatch[1].toLowerCase())) {
          const groupId = getGroupMatch[1];
          const groups = this.profileStore.getGroups();
          const g = groups.find(x => x.id === groupId || x.name === groupId);
          if (!g) {
            return sendJson(404, { success: false, data: null, message: 'Nhóm không tồn tại', sender: 'SV Browser v5.0.8-stable' });
          }
          const profiles = this.profileStore.getAllProfiles();
          const count = profiles.filter(p => (p.group === g.name || p.group_id === g.id)).length;
          return sendJson(200, {
            success: true,
            data: {
              id: g.id,
              name: g.name,
              order: g.order || 0,
              total_profile: count,
              created_at: typeof g.createdAt === 'number' ? new Date(g.createdAt).toISOString() : (g.createdAt || new Date().toISOString()),
              updated_at: typeof g.updatedAt === 'number' ? new Date(g.updatedAt).toISOString() : (g.updatedAt || new Date().toISOString())
            },
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 11. TẠO GROUP
        // Chuẩn GPMLogin: POST /api/v1/groups/create hoặc POST /api/v1/groups
        const createGroupMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?groups?\/create$/i) || (groupsListMatch && req.method === 'POST');
        if (createGroupMatch) {
          let body = query;
          if (req.method === 'POST') {
            const rawBody = await this.readBody(req);
            try { body = { ...query, ...JSON.parse(rawBody) }; } catch (e) { body = query; }
          }
          const name = (body.name || '').trim();
          if (!name) {
            return sendJson(400, { success: false, data: null, message: 'Tên nhóm không được để trống', sender: 'SV Browser v5.0.8-stable' });
          }

          this.profileStore.addGroup({ name, order: body.order });
          const allGroups = this.profileStore.getGroups();
          const created = allGroups.find(g => g.name.toLowerCase() === name.toLowerCase()) || allGroups[allGroups.length - 1];

          return sendJson(200, {
            success: true,
            data: created,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 12. CẬP NHẬT GROUP
        // Chuẩn GPMLogin: POST /api/v1/groups/update/{id} hoặc PUT /api/v1/groups/{id}
        const updateGroupMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?groups?\/update(?:\/([^\/]+))?$/i) ||
                                 (pathname.match(/^\/api\/(?:v[1-3]\/)?groups?\/([a-zA-Z0-9\-_]+)$/i) && (req.method === 'PUT' || req.method === 'POST'));
        if (updateGroupMatch && (req.method === 'POST' || req.method === 'PUT')) {
          const groupId = extractId(updateGroupMatch);
          let body = query;
          const rawBody = await this.readBody(req);
          try { body = { ...query, ...JSON.parse(rawBody) }; } catch (e) { body = query; }

          const updated = this.profileStore.updateGroup(groupId, body);
          if (!updated) {
            return sendJson(404, { success: false, data: null, message: 'Nhóm không tồn tại', sender: 'SV Browser v5.0.8-stable' });
          }

          return sendJson(200, {
            success: true,
            data: updated,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 13. XOÁ GROUP
        // Chuẩn GPMLogin: GET hoặc DELETE /api/v1/groups/delete/{id} hoặc DELETE /api/v1/groups/{id}
        const deleteGroupMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?groups?\/delete(?:\/([^\/]+))?$/i) ||
                                 (pathname.match(/^\/api\/(?:v[1-3]\/)?groups?\/([a-zA-Z0-9\-_]+)$/i) && req.method === 'DELETE');
        if (deleteGroupMatch && (req.method === 'GET' || req.method === 'DELETE')) {
          const groupId = extractId(deleteGroupMatch);
          if (!groupId) {
            return sendJson(400, { success: false, data: null, message: 'Thiếu ID nhóm cần xóa', sender: 'SV Browser v5.0.8-stable' });
          }
          const resDel = this.profileStore.deleteGroup(groupId);
          if (!resDel || !resDel.success) {
            return sendJson(400, { success: false, data: null, message: resDel?.message || 'Không thể xóa nhóm', sender: 'SV Browser v5.0.8-stable' });
          }
          return sendJson(200, {
            success: true,
            data: null,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // =========================================================================
        // C. PROXIES ENDPOINTS (Chuẩn GPMLogin API)
        // =========================================================================

        // 14. DANH SÁCH PROXIES (PAGINATED)
        // Chuẩn GPMLogin: GET /api/v1/proxies
        const proxiesListMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?proxies$/i);
        if (proxiesListMatch && req.method === 'GET') {
          const proxies = this.profileStore.getProxies();
          const page = Math.max(1, parseInt(query.page, 10) || 1);
          const pageSize = Math.max(1, parseInt(query.page_size || query.per_page, 10) || 30);
          const search = (query.search || '').toLowerCase().trim();

          let filtered = proxies;
          if (search) {
            filtered = filtered.filter(p => (p.raw_proxy || '').toLowerCase().includes(search));
          }

          const total = filtered.length;
          const startIndex = (page - 1) * pageSize;
          const paginated = filtered.slice(startIndex, startIndex + pageSize);

          return sendJson(200, {
            success: true,
            data: {
              current_page: page,
              per_page: pageSize,
              total: total,
              last_page: Math.ceil(total / pageSize) || 1,
              data: paginated
            },
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 15. CHI TIẾT 1 PROXY
        // Chuẩn GPMLogin: GET /api/v1/proxies/{id}
        const getProxyMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?proxies\/([a-zA-Z0-9\-_]+)$/i);
        if (getProxyMatch && req.method === 'GET' && !['create', 'update', 'delete'].includes(getProxyMatch[1].toLowerCase())) {
          const proxyId = getProxyMatch[1];
          const proxy = this.profileStore.getProxy(proxyId);
          if (!proxy) {
            return sendJson(404, { success: false, data: null, message: 'Proxy không tồn tại', sender: 'SV Browser v5.0.8-stable' });
          }
          return sendJson(200, {
            success: true,
            data: proxy,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 16. TẠO PROXY
        // Chuẩn GPMLogin: POST /api/v1/proxies/create hoặc POST /api/v1/proxies
        const createProxyMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?proxies\/create$/i) || (proxiesListMatch && req.method === 'POST');
        if (createProxyMatch) {
          let body = query;
          if (req.method === 'POST') {
            const rawBody = await this.readBody(req);
            try { body = { ...query, ...JSON.parse(rawBody) }; } catch (e) { body = query; }
          }

          const newProxy = this.profileStore.createProxy(body);
          return sendJson(200, {
            success: true,
            data: newProxy,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 17. CẬP NHẬT PROXY
        // Chuẩn GPMLogin: POST /api/v1/proxies/update/{id} hoặc PUT /api/v1/proxies/{id}
        const updateProxyMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?proxies\/update(?:\/([^\/]+))?$/i) ||
                                 (pathname.match(/^\/api\/(?:v[1-3]\/)?proxies\/([a-zA-Z0-9\-_]+)$/i) && (req.method === 'PUT' || req.method === 'POST'));
        if (updateProxyMatch && (req.method === 'POST' || req.method === 'PUT')) {
          const proxyId = extractId(updateProxyMatch);
          let body = query;
          const rawBody = await this.readBody(req);
          try { body = { ...query, ...JSON.parse(rawBody) }; } catch (e) { body = query; }

          const updated = this.profileStore.updateProxy(proxyId, body);
          if (!updated) {
            return sendJson(404, { success: false, data: null, message: 'Proxy không tồn tại', sender: 'SV Browser v5.0.8-stable' });
          }

          return sendJson(200, {
            success: true,
            data: updated,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 18. XOÁ PROXY
        // Chuẩn GPMLogin: GET hoặc DELETE /api/v1/proxies/delete/{id} hoặc DELETE /api/v1/proxies/{id}
        const deleteProxyMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?proxies\/delete(?:\/([^\/]+))?$/i) ||
                                 (pathname.match(/^\/api\/(?:v[1-3]\/)?proxies\/([a-zA-Z0-9\-_]+)$/i) && req.method === 'DELETE');
        if (deleteProxyMatch && (req.method === 'GET' || req.method === 'DELETE')) {
          const proxyId = extractId(deleteProxyMatch);
          if (!proxyId) {
            return sendJson(400, { success: false, data: null, message: 'Thiếu ID proxy cần xóa', sender: 'SV Browser v5.0.8-stable' });
          }
          this.profileStore.deleteProxy(proxyId);
          return sendJson(200, {
            success: true,
            data: null,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // =========================================================================
        // D. EXTENSIONS ENDPOINTS (Chuẩn GPMLogin API)
        // =========================================================================

        // 19. DANH SÁCH EXTENSIONS
        // Chuẩn GPMLogin: GET /api/v1/extensions
        const extensionsMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?extensions$/i);
        if (extensionsMatch && req.method === 'GET') {
          const rawList = this.extensionStore ? this.extensionStore.getAll() : [];
          const list = rawList.map(e => ({
            id: e.id || e.folderName,
            folder_name: e.folderName,
            name: e.name,
            version: e.version || '1.0.0',
            description: e.description || '',
            is_active: !!e.enabled,
            applied_group_ids: []
          }));

          return sendJson(200, {
            success: true,
            data: list,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 20. BẬT / TẮT EXTENSION
        // Chuẩn GPMLogin: GET /api/v1/extensions/update-state/{id}?active=true/false
        const extStateMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?extensions\/update-state(?:\/([^\/]+))?$/i);
        if (extStateMatch && req.method === 'GET') {
          const extId = extractId(extStateMatch);
          if (!extId) {
            return sendJson(400, { success: false, data: null, message: 'Thiếu ID hoặc folderName của Extension', sender: 'SV Browser v5.0.8-stable' });
          }

          const isActive = (query.active === 'true' || query.active === true || query.active === '1');
          if (this.extensionStore) {
            const all = this.extensionStore.getAll();
            const target = all.find(e => e.id === extId || e.folderName === extId);
            const folderName = target ? target.folderName : extId;
            this.extensionStore.toggleExtension(folderName, isActive);
          }

          return sendJson(200, {
            success: true,
            data: null,
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // =========================================================================
        // E. BROWSER VERSIONS ENDPOINT
        // =========================================================================

        // 21. DANH SÁCH PHIÊN BẢN TRÌNH DUYỆT HỖ TRỢ
        // Chuẩn GPMLogin: GET /api/v1/browsers/versions
        const versionsMatch = pathname.match(/^\/api\/(?:v[1-3]\/)?browsers?\/versions$/i);
        if (versionsMatch && req.method === 'GET') {
          return sendJson(200, {
            success: true,
            data: {
              chromium: ["151.0.7922.76", "152.0.7922.80", "153.0.7922.90"],
              firefox: ["135.0", "134.0"]
            },
            message: 'OK',
            sender: 'SV Browser v5.0.8-stable'
          });
        }

        // 22. 404 KHÔNG TÌM THẤY ROUTE
        sendJson(404, {
          success: false,
          data: null,
          message: 'API Endpoint không tồn tại. Xem tài liệu https://api-docs.gpmloginapp.com/',
          sender: 'SV Browser v5.0.8-stable'
        });
      } catch (err) {
        sendJson(500, { success: false, data: null, message: err.message, sender: 'SV Browser v5.0.8-stable' });
      }
    });

    const host = this.allowRemote ? '0.0.0.0' : '127.0.0.1';
    this.server.listen(this.port, host, () => {
      this.isRunning = true;
      this.writePortFile();
      console.log(`[SV Browser API Gateway] Server đang lắng nghe tại: http://${this.allowRemote ? '0.0.0.0' : 'localhost'}:${this.port}`);
    });

    this.server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.warn(`[SV Browser API Gateway] Cổng ${this.port} đang bận, thử cổng ${this.port + 1}`);
        this.port++;
        this.writePortFile();
        this.server.listen(this.port, host);
      } else {
        console.error('[SV Browser API Gateway] Lỗi server:', e.message);
        this.isRunning = false;
      }
    });
  }

  restart(newPort, allowRemote) {
    if (newPort) this.port = parseInt(newPort, 10) || this.port;
    if (allowRemote !== undefined) this.allowRemote = !!allowRemote;
    this.stop();
    this.start();
    return this.getStatus();
  }

  stop() {
    if (this.server) {
      try {
        this.server.close();
      } catch (e) {}
      this.server = null;
      this.isRunning = false;
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      port: this.port,
      url: `http://localhost:${this.port}`,
      allowRemote: this.allowRemote
    };
  }

  async test() {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${this.port}/`, (res) => {
        let rawData = '';
        res.on('data', chunk => rawData += chunk);
        res.on('end', () => {
          try {
            resolve({ success: true, statusCode: res.statusCode, data: JSON.parse(rawData) });
          } catch (e) {
            resolve({ success: true, statusCode: res.statusCode, raw: rawData });
          }
        });
      });
      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
      req.setTimeout(2500, () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });
    });
  }

  readBody(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => resolve(body));
    });
  }
}

module.exports = GpmApiServer;
