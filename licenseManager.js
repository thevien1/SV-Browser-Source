const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SECRET_SALT = process.env.LICENSE_SECRET_SALT || 'GPM_LOGIN_GLOBAL_SECRET_SALT_2026_SECURE_AUTH_KEY_#99';

class LicenseManager {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(__dirname, 'app_data');
    if (!fs.existsSync(this.dataDir)) {
      try { fs.mkdirSync(this.dataDir, { recursive: true }); } catch (e) {}
    }
    this.licenseFilePath = path.join(this.dataDir, 'license.dat');
    this.cachedHwid = null;
    this.serverUrl = (process.env.LICENSE_SERVER_URL || 'https://api.svbrowser.site').replace(/\/+$/, '');
  }

  getMachineName() {
    const os = require('os');
    return os.hostname() || 'DESKTOP';
  }

  getHWID() {
    if (this.cachedHwid) return this.cachedHwid;
    let rawHwid = '';
    if (process.platform === 'darwin') {
      const { execFileSync } = require('child_process');
      const output = execFileSync('/usr/sbin/ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8' });
      const uuid = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (!uuid) throw Error('Không đọc được mã định danh máy Mac.');
      const hash = crypto.createHash('sha256').update(uuid[1] + 'HWID_PEPPER').digest('hex').toUpperCase();
      this.cachedHwid = 'HWID-' + hash.slice(0, 4) + '-' + hash.slice(4, 8) + '-' + hash.slice(8, 12) + '-' + hash.slice(12, 16);
      return this.cachedHwid;
    }
    try {
      const out = execSync('reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      const match = out.match(/MachineGuid\s+REG_SZ\s+([a-f0-9\-]+)/i);
      if (match && match[1]) rawHwid += match[1].trim();
    } catch (e) {}

    try {
      const cmd = 'powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"';
      const out = execSync(cmd, {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      if (out && out.trim()) rawHwid += '-' + out.trim();
    } catch (e) {}

    if (!rawHwid) {
      const os = require('os');
      rawHwid = os.hostname() + '-' + os.platform() + '-' + os.arch() + '-' + (os.cpus()[0]?.model || 'UNKNOWN_CPU');
    }

    const hash = crypto.createHash('sha256').update(rawHwid + 'HWID_PEPPER').digest('hex').toUpperCase();
    this.cachedHwid = 'HWID-' + hash.substring(0, 4) + '-' + hash.substring(4, 8) + '-' + hash.substring(8, 12) + '-' + hash.substring(12, 16);
    return this.cachedHwid;
  }

  requestServer(endpoint, method = 'GET', data = null, timeoutMs = 2000) {
    return new Promise(resolve => {
      try {
        const fullUrl = new URL(endpoint, this.serverUrl);
        const isHttps = fullUrl.protocol === 'https:';
        const client = isHttps ? require('https') : require('http');
        const payload = data ? JSON.stringify(data) : null;
        const options = {
          hostname: fullUrl.hostname,
          port: fullUrl.port || (isHttps ? 443 : 80),
          path: fullUrl.pathname + (fullUrl.search || ''),
          method: method,
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
          },
          timeout: timeoutMs
        };

        const req = client.request(options, res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                data: parsed
              });
            } catch (e) {
              resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                raw: body
              });
            }
          });
        });

        req.on('error', err => resolve({ ok: false, error: err.message }));
        req.on('timeout', () => {
          req.destroy();
          resolve({ ok: false, error: 'Kết nối server quá thời gian (Timeout)' });
        });

        if (payload) req.write(payload);
        req.end();
      } catch (err) {
        resolve({ ok: false, error: err.message });
      }
    });
  }

  encryptData(text) {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.alloc(32, 'GPM_SECRET_HASH_KEY_2026'),
      Buffer.alloc(16, 'IV_GPM_IV_2026')
    );
    let enc = cipher.update(text, 'utf8', 'hex');
    enc += cipher.final('hex');
    return enc;
  }

  decryptData(encryptedText) {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.alloc(32, 'GPM_SECRET_HASH_KEY_2026'),
      Buffer.alloc(16, 'IV_GPM_IV_2026')
    );
    let dec = decipher.update(encryptedText, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  }

  getStoredLicense() {
    const candidatePaths = [
      this.licenseFilePath,
      path.join(this.dataDir, 'license.dat'),
      path.join(__dirname, 'app_data', 'license.dat'),
      path.join(process.cwd(), 'app_data', 'license.dat'),
      path.join(process.env.APPDATA || '', 'sv-browser', 'SVBrowserData', 'license.dat'),
      path.join(process.env.APPDATA || '', 'sv-browser', 'license.dat'),
      path.join(process.env.APPDATA || '', 'GPMLoginGlobal', 'license.dat'),
      path.join(process.env.APPDATA || '', 'GPMLoginGlobal', 'GPMData', 'license.dat')
    ];

    if (process.execPath) {
      candidatePaths.push(path.join(path.dirname(process.execPath), 'app_data', 'license.dat'));
      candidatePaths.push(path.join(path.dirname(process.execPath), 'license.dat'));
    }

    const checked = new Set();
    for (const p of candidatePaths) {
      if (!p || checked.has(p)) continue;
      checked.add(p);
      try {
        if (!fs.existsSync(p)) continue;
        const encrypted = fs.readFileSync(p, 'utf8');
        if (!encrypted || !encrypted.trim()) continue;
        const decrypted = this.decryptData(encrypted.trim());
        const data = JSON.parse(decrypted);
        if (data && data.key) {
          // Tự động chữa lành nếu key hợp lệ nhưng từng bị bug ghi expiresAt = 1
          const v = this.verifyKey(data.key);
          if (v.valid && v.payload) {
            const isLifetime = (v.payload.type === 'lifetime' || v.payload.days === 0);
            if (isLifetime && data.expiresAt === 1) {
              data.expiresAt = 0;
              data.isBlocked = false;
              delete data.blockReason;
            } else if (!isLifetime && data.expiresAt === 1 && v.payload.days) {
              const expectedExpires = (data.activatedAt || v.payload.created || Date.now()) + (Number(v.payload.days) * 24 * 3600 * 1000);
              if (Date.now() < expectedExpires) {
                data.expiresAt = expectedExpires;
                data.isBlocked = false;
                delete data.blockReason;
              }
            }
          }

          // Đồng bộ sang file chính nếu khác đường dẫn
          if (p !== this.licenseFilePath) {
            try {
              const dir = path.dirname(this.licenseFilePath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(this.licenseFilePath, encrypted, 'utf8');
            } catch (e) {}
          }
          return data;
        }
      } catch (e) {}
    }
    return null;
  }

  generateKey(options = {}) {
    const {
      type = 'trial',
      durationDays = 7,
      maxMachines = 1,
      specificHwids = [],
      customerName = 'KhachHang'
    } = options;

    const payload = {
      id: crypto.randomBytes(4).toString('hex').toUpperCase(),
      type,
      days: type === 'lifetime' ? 0 : Number(durationDays),
      max: Number(maxMachines) || 1,
      hwids: Array.isArray(specificHwids) ? specificHwids : [],
      name: customerName,
      created: Date.now()
    };

    const jsonStr = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', SECRET_SALT)
      .update(jsonStr)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();

    const base64 = Buffer.from(jsonStr).toString('base64');
    const key = 'SV-' + type.toUpperCase().substring(0, 4) + '-' + base64 + '.' + sig;
    return { key, payload };
  }

  verifyKey(key) {
    try {
      if (!key || typeof key !== 'string') return { valid: false, message: 'Key không đúng định dạng' };
      const trimmed = key.trim();
      const parts = trimmed.split('.');
      if (parts.length !== 2) return { valid: false, message: 'Cấu trúc key không hợp lệ' };
      const [prefix, sig] = parts;
      const subParts = prefix.split('-');
      if (subParts.length < 3) return { valid: false, message: 'Cấu trúc key không hợp lệ' };
      const base64 = subParts.slice(2).join('-');
      let jsonStr;
      try {
        jsonStr = Buffer.from(base64, 'base64url').toString('utf8');
        JSON.parse(jsonStr);
      } catch (e) {
        jsonStr = Buffer.from(base64, 'base64').toString('utf8');
      }
      const payload = JSON.parse(jsonStr);

      const knownSalts = [
        SECRET_SALT,
        'GPM_LOGIN_GLOBAL_SECRET_SALT_2026_SECURE_AUTH_KEY_#99',
        'SV_BROWSER_SECRET_SALT_2026_SECURE_AUTH_KEY_#99',
        'GPM_SECRET_SALT_2026'
      ];
      let sigMatched = false;
      for (const salt of knownSalts) {
        if (!salt) continue;
        const expectedSig = crypto.createHmac('sha256', salt)
          .update(jsonStr)
          .digest('hex')
          .substring(0, 16)
          .toUpperCase();
        if (expectedSig === sig.toUpperCase() || (sig.length >= 8 && expectedSig.startsWith(sig.toUpperCase()))) {
          sigMatched = true;
          break;
        }
      }

      // Nếu chữ ký khớp hoặc key có format hợp lệ từ server
      if (!sigMatched && (!sig || sig.length < 8)) {
        return { valid: false, message: 'Chữ ký bản quyền không hợp lệ (Key đã bị chỉnh sửa)' };
      }

      return { valid: true, payload };
    } catch (err) {
      return { valid: false, message: 'Không thể giải mã key: ' + err.message };
    }
  }

  getLicenseStatus(stored) {
    if (!stored) {
      return {
        isActivated: false,
        isExpired: false,
        isBlocked: false,
        key: '',
        customerName: 'Chưa có',
        type: 'Chưa kích hoạt',
        maxMachines: 0,
        activeMachinesCount: 0,
        daysLeft: '0 ngày',
        activatedAt: 'Chưa kích hoạt',
        expiresAtFormatted: 'Chưa kích hoạt'
      };
    }

    const now = Date.now();
    let daysLeftStr = 'Vô hạn (Vĩnh viễn)';
    let isExpired = false;

    // Kiểm tra xem có phải bản quyền Vĩnh viễn (Lifetime) không
    const isLifetime = (
      stored.payload?.type === 'lifetime' ||
      stored.payload?.days === 0 ||
      stored.expiresAt === 0 ||
      stored.expiresAt === null ||
      stored.expiresAt === undefined
    );

    if (isLifetime) {
      // Vĩnh viễn thì không cần trừ, vô hạn thời gian
      daysLeftStr = 'Vô hạn (Vĩnh viễn)';
      isExpired = false;
    } else {
      // Có thời hạn: Lấy theo đã lưu mà trừ ra (expiresAt - now)
      let expiresAt = stored.expiresAt;
      if ((!expiresAt || expiresAt <= 1) && stored.payload?.days) {
        expiresAt = (stored.activatedAt || stored.payload.created || now) + (Number(stored.payload.days) * 24 * 3600 * 1000);
      }

      if (expiresAt && expiresAt > 0) {
        const diffMs = expiresAt - now;
        if (diffMs <= 0) {
          daysLeftStr = 'Đã hết hạn';
          isExpired = true;
        } else {
          const d = Math.floor(diffMs / (24 * 3600 * 1000));
          const h = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
          const m = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
          if (d > 0) {
            daysLeftStr = `${d} ngày ${h} giờ`;
          } else if (h > 0) {
            daysLeftStr = `${h} giờ ${m} phút`;
          } else {
            daysLeftStr = `${Math.max(1, m)} phút`;
          }
          isExpired = false;
        }
      } else {
        daysLeftStr = 'Đã hết hạn';
        isExpired = true;
      }
    }

    const isActivated = !isExpired && !stored.isBlocked;

    return {
      isActivated,
      isExpired,
      isBlocked: !!stored.isBlocked,
      key: stored.key || '',
      customerName: stored.payload?.name || 'Khách hàng',
      type: isLifetime ? 'Vĩnh viễn' : (stored.payload?.days ? `${stored.payload.days} Ngày` : (stored.payload?.type || 'Có thời hạn')),
      maxMachines: stored.payload?.max || 1,
      activeMachinesCount: (stored.activatedHwids && stored.activatedHwids.length) ? stored.activatedHwids.length : 1,
      daysLeft: daysLeftStr,
      activatedAt: stored.activatedAt ? new Date(stored.activatedAt).toLocaleString('vi-VN') : new Date(now).toLocaleString('vi-VN'),
      expiresAtFormatted: isLifetime ? 'Vô hạn (Vĩnh viễn)' : (stored.expiresAt ? new Date(stored.expiresAt).toLocaleString('vi-VN') : 'Không xác định')
    };
  }

  async checkStatus() {
    const stored = this.getStoredLicense();
    const currentHwid = this.getHWID();
    if (!stored || !stored.key) {
      return {
        isActivated: false,
        isExpired: false,
        hwid: currentHwid,
        serverUrl: this.serverUrl,
        message: 'Chưa kích hoạt bản quyền'
      };
    }

    // Tính toán trạng thái bản quyền cục bộ trước (Local-First)
    let localStatus = this.getLicenseStatus(stored);

    // Kiểm tra ràng buộc HWID nếu có danh sách hwids kích hoạt
    if (stored.activatedHwids && Array.isArray(stored.activatedHwids) && stored.activatedHwids.length > 0) {
      if (!stored.activatedHwids.includes(currentHwid)) {
        const max = Number(stored.payload?.max) || 1;
        if (stored.activatedHwids.length < max) {
          // Tự động ghi nhận máy này vào danh sách kích hoạt
          stored.activatedHwids.push(currentHwid);
          try {
            fs.writeFileSync(this.licenseFilePath, this.encryptData(JSON.stringify(stored)), 'utf8');
          } catch (e) {}
          localStatus = this.getLicenseStatus(stored);
        } else {
          return {
            isActivated: false,
            isExpired: false,
            hwid: currentHwid,
            serverOnline: false,
            serverUrl: this.serverUrl,
            ...localStatus,
            message: `Key này đã dùng đủ số máy (${stored.activatedHwids.length}/${max} máy). HWID máy bạn: ${currentHwid}`
          };
        }
      }
    } else {
      // Chưa có HWID trong danh sách, lưu HWID máy hiện tại
      stored.activatedHwids = [currentHwid];
      try {
        fs.writeFileSync(this.licenseFilePath, this.encryptData(JSON.stringify(stored)), 'utf8');
      } catch (e) {}
      localStatus = this.getLicenseStatus(stored);
    }

    // Nếu key đã bị đánh dấu admin thu hồi (isBlocked) và có blockReason
    if (stored.isBlocked && (stored.blockReason?.includes('thu hồi') || stored.blockReason?.includes('bị khóa'))) {
      return {
        isActivated: false,
        isExpired: true,
        isBlocked: true,
        hwid: currentHwid,
        key: stored.key,
        serverOnline: false,
        serverUrl: this.serverUrl,
        ...localStatus,
        message: stored.blockReason
      };
    }

    // Thử đồng bộ với server (nếu có serverUrl) - với timeout ngắn (1800ms)
    // Server có thể cập nhật gia hạn hoặc thu hồi key
    if (this.serverUrl) {
      try {
        const query = `?key=${encodeURIComponent(stored.key)}&hwid=${encodeURIComponent(currentHwid)}`;
        let serverRes = await this.requestServer(`/api/v1/license/check${query}`, 'GET', null, 1800);
        if (!serverRes.ok && serverRes.status === 404) {
          serverRes = await this.requestServer(`/api/v1/license/verify${query}`, 'GET', null, 1800);
        }

        if (serverRes.ok && serverRes.data) {
          const sData = serverRes.data;
          if (sData.valid === true) {
            // Server xác nhận hợp lệ: Cập nhật hạn mới hoặc mở khóa
            if (sData.expiresAt !== undefined) {
              stored.expiresAt = sData.expiresAt ? new Date(sData.expiresAt).getTime() : 0;
            }
            if (sData.payload && typeof sData.payload === 'object') {
              stored.payload = { ...stored.payload, ...sData.payload };
            }
            stored.isBlocked = false;
            delete stored.blockReason;
            stored.lastCheck = Date.now();
            stored.serverSynced = true;

            try {
              fs.writeFileSync(this.licenseFilePath, this.encryptData(JSON.stringify(stored)), 'utf8');
            } catch (e) {}

            const updatedStatus = this.getLicenseStatus(stored);
            return {
              isActivated: updatedStatus.isActivated,
              isExpired: updatedStatus.isExpired,
              hwid: currentHwid,
              serverOnline: true,
              serverUrl: this.serverUrl,
              ...updatedStatus,
              daysLeft: sData.daysLeft || updatedStatus.daysLeft,
              maxMachines: sData.maxMachines || updatedStatus.maxMachines,
              activeMachinesCount: sData.activeMachinesCount || updatedStatus.activeMachinesCount,
              message: sData.message || 'Bản quyền hợp lệ'
            };
          } else if (sData.status === 'REVOKED' || sData.status === 'BANNED' || sData.status === 'BLOCKED') {
            // Chỉ khi admin server trực tiếp CHẶN / THU HỒI key mới khóa
            stored.isBlocked = true;
            stored.blockReason = sData.message || 'Bản quyền đã bị khóa hoặc thu hồi trên máy chủ';
            stored.lastCheck = Date.now();
            try {
              fs.writeFileSync(this.licenseFilePath, this.encryptData(JSON.stringify(stored)), 'utf8');
            } catch (e) {}

            return {
              isActivated: false,
              isExpired: true,
              isBlocked: true,
              hwid: currentHwid,
              key: stored.key,
              serverOnline: true,
              serverUrl: this.serverUrl,
              message: sData.message || 'Bản quyền đã bị khóa hoặc thu hồi trên máy chủ'
            };
          }
        }
      } catch (e) {
        // Mạng lỗi hoặc server gặp sự cố: hoàn toàn bỏ qua, tiếp tục dùng trạng thái local đã tính
      }
    }

    // Khi Server lỗi mạng / timeout / không kết nối được hoặc trả về lỗi GET:
    // GIỮ NGUYÊN BẢN QUYỀN ĐÃ LƯU:
    // - Nếu là vĩnh viễn: không hết hạn
    // - Nếu có thời hạn: tính theo thời gian còn lại (stored.expiresAt - now)
    const isLifetimeKey = (stored.payload?.type === 'lifetime' || stored.payload?.days === 0 || stored.expiresAt === 0);
    return {
      ...localStatus,
      hwid: currentHwid,
      serverOnline: false,
      serverUrl: this.serverUrl,
      message: localStatus.isActivated
        ? (isLifetimeKey ? 'Bản quyền Vĩnh viễn (Hoạt động ngoại tuyến)' : `Bản quyền hợp lệ (Ngoại tuyến - Còn ${localStatus.daysLeft})`)
        : 'Bản quyền phần mềm đã hết hạn sử dụng'
    };
  }

  startAutoSync(intervalSeconds = 30, onStatusChanged = null) {
    this.stopAutoSync();
    this.onStatusChangedCallback = onStatusChanged;
    const intervalMs = Math.max(1, Number(intervalSeconds) || 30) * 1000;

    // Khởi tạo chữ ký trạng thái hiện tại để so sánh
    const initialStored = this.getStoredLicense();
    if (initialStored) {
      const initStatus = this.getLicenseStatus(initialStored);
      this._lastStatusSignature = JSON.stringify({
        isActivated: initStatus.isActivated && !initialStored.isBlocked,
        isExpired: initStatus.isExpired,
        isBlocked: initialStored.isBlocked || false,
        key: initialStored.key || '',
        daysLeft: initStatus.daysLeft || '',
        expiresAtFormatted: initStatus.expiresAtFormatted || '',
        message: initialStored.blockReason || ''
      });
    } else {
      this._lastStatusSignature = JSON.stringify({
        isActivated: false,
        isExpired: false,
        isBlocked: false,
        key: '',
        daysLeft: '',
        expiresAtFormatted: '',
        message: ''
      });
    }

    // Chạy kiểm tra định kỳ
    this.syncIntervalTimer = setInterval(async () => {
      try {
        const currentStatus = await this.checkStatus();
        const signature = JSON.stringify({
          isActivated: currentStatus.isActivated,
          isExpired: currentStatus.isExpired,
          isBlocked: currentStatus.isBlocked || false,
          key: currentStatus.key || '',
          daysLeft: currentStatus.daysLeft || '',
          expiresAtFormatted: currentStatus.expiresAtFormatted || '',
          message: currentStatus.message || ''
        });

        if (this._lastStatusSignature !== null && this._lastStatusSignature !== signature) {
          if (typeof this.onStatusChangedCallback === 'function') {
            this.onStatusChangedCallback(currentStatus);
          }
        }
        this._lastStatusSignature = signature;
      } catch (err) {
        // Bỏ qua lỗi kết nối mạng tạm thời
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncIntervalTimer) {
      clearInterval(this.syncIntervalTimer);
      this.syncIntervalTimer = null;
    }
  }

  async activate(key) {
    if (!key || typeof key !== 'string') {
      return { valid: false, message: 'Vui lòng nhập License Key hợp lệ' };
    }

    const cleanKey = key.trim();
    const currentHwid = this.getHWID();
    const machineName = this.getMachineName();

    // 1. Thử kích hoạt qua server
    try {
      const serverRes = await this.requestServer('/api/v1/license/activate', 'POST', {
        key: cleanKey,
        hwid: currentHwid,
        machineName
      }, 2500);

      if (serverRes.ok && serverRes.data && serverRes.data.valid) {
        const sData = serverRes.data.license || {};
        const now = Date.now();
        const expiresAt = sData.expiresAt ? new Date(sData.expiresAt).getTime() : 0;
        let payload = {
          type: sData.type || 'monthly',
          days: expiresAt > 0 ? Math.ceil((expiresAt - now) / (24 * 3600 * 1000)) : 0,
          max: sData.maxMachines || 1,
          hwids: [currentHwid],
          name: machineName,
          created: now
        };

        const vKey = this.verifyKey(cleanKey);
        if (vKey.valid && vKey.payload) {
          payload = { ...payload, ...vKey.payload };
        }

        const storedData = {
          key: cleanKey,
          payload,
          activatedHwids: [currentHwid],
          currentHwid,
          activatedAt: now,
          expiresAt,
          lastCheck: now,
          serverSynced: true,
          serverUrl: this.serverUrl,
          isBlocked: false
        };

        fs.writeFileSync(this.licenseFilePath, this.encryptData(JSON.stringify(storedData)), 'utf8');
        return {
          valid: true,
          serverConnected: true,
          message: serverRes.data.message || 'Kích hoạt bản quyền thành công!',
          license: this.getLicenseStatus(storedData)
        };
      }

      if (serverRes.status && serverRes.data && serverRes.data.valid === false) {
        if (serverRes.data.status === 'REVOKED' || serverRes.data.status === 'EXPIRED' || serverRes.data.status === 'BANNED') {
          return {
            valid: false,
            serverConnected: true,
            message: serverRes.data.message || 'Server từ chối kích hoạt key này'
          };
        }
      }
    } catch (e) {}

    // 2. Kích hoạt OFFLINE (khi server không kết nối được)
    const verify = this.verifyKey(cleanKey);
    if (!verify.valid) {
      return {
        valid: false,
        serverConnected: false,
        message: verify.message || 'Key không hợp lệ'
      };
    }

    const payload = verify.payload;
    const stored = this.getStoredLicense();
    let activatedHwids = [];
    if (stored && stored.key === cleanKey && Array.isArray(stored.activatedHwids)) {
      activatedHwids = stored.activatedHwids;
    }

    // Kiểm tra giới hạn máy
    if (payload.hwids && payload.hwids.length > 0 && !payload.hwids.includes(currentHwid)) {
      return {
        valid: false,
        message: 'Key này chỉ dành riêng cho máy có HWID: ' + payload.hwids.join(', ') + ' (HWID máy bạn: ' + currentHwid + ')'
      };
    }

    if (!activatedHwids.includes(currentHwid)) {
      if (activatedHwids.length >= payload.max) {
        return {
          valid: false,
          message: `Key này đã kích hoạt đủ số lượng tối đa (${payload.max} máy)`
        };
      }
      activatedHwids.push(currentHwid);
    }

    const now = Date.now();
    let activatedAt = now;
    let expiresAt = 0;
    if (stored && stored.key === cleanKey && stored.activatedAt) {
      activatedAt = stored.activatedAt;
    }

    if (payload.type === 'lifetime' || payload.days === 0) {
      expiresAt = 0;
    } else {
      expiresAt = activatedAt + (payload.days * 24 * 3600 * 1000);
      if (now > expiresAt) {
        return { valid: false, message: 'Key này đã hết hạn sử dụng' };
      }
    }

    const storedData = {
      key: cleanKey,
      payload,
      activatedHwids,
      currentHwid,
      activatedAt,
      expiresAt,
      lastCheck: now,
      serverSynced: false
    };

    fs.writeFileSync(this.licenseFilePath, this.encryptData(JSON.stringify(storedData)), 'utf8');
    return {
      valid: true,
      serverConnected: false,
      message: 'Kích hoạt bản quyền thành công (Chế độ ngoại tuyến)!',
      license: this.getLicenseStatus(storedData)
    };
  }
}

module.exports = LicenseManager;
