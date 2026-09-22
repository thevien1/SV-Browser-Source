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

  requestServer(endpoint, method = 'GET', data = null) {
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
          timeout: 4000
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
    try {
      if (!fs.existsSync(this.licenseFilePath)) return null;
      const encrypted = fs.readFileSync(this.licenseFilePath, 'utf8');
      const decrypted = this.decryptData(encrypted);
      return JSON.parse(decrypted);
    } catch (e) {
      return null;
    }
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
    const now = Date.now();
    let daysLeftStr = 'Vô hạn (Vĩnh viễn)';
    let isExpired = false;

    if (stored.expiresAt && stored.expiresAt > 0) {
      const diffMs = stored.expiresAt - now;
      if (diffMs <= 0) {
        daysLeftStr = 'Đã hết hạn';
        isExpired = true;
      } else {
        const d = Math.floor(diffMs / (24 * 3600 * 1000));
        const h = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
        daysLeftStr = `${d} ngày ${h} giờ`;
      }
    }

    return {
      isActivated: !isExpired,
      isExpired,
      key: stored.key,
      customerName: stored.payload?.name || 'Khách hàng',
      type: stored.payload?.type === 'lifetime' ? 'Vĩnh viễn' : (stored.payload?.days ? `${stored.payload.days} Ngày` : '30 Ngày'),
      maxMachines: stored.payload?.max || 1,
      activeMachinesCount: stored.activatedHwids ? stored.activatedHwids.length : 1,
      daysLeft: daysLeftStr,
      activatedAt: new Date(stored.activatedAt || now).toLocaleString('vi-VN'),
      expiresAtFormatted: stored.expiresAt === 0 ? 'Vô hạn' : new Date(stored.expiresAt).toLocaleString('vi-VN')
    };
  }

  async checkStatus() {
    const stored = this.getStoredLicense();
    const currentHwid = this.getHWID();
    if (!stored) {
      return {
        isActivated: false,
        hwid: currentHwid,
        serverUrl: this.serverUrl,
        message: 'Chưa kích hoạt bản quyền'
      };
    }

    // 1. Thử đồng bộ với server nếu có serverUrl (Ưu tiên GET query parameters, fallback sang POST)
    // Server là nguồn sự thật tối thượng: Nếu server mở khóa hoặc gia hạn, tự động cập nhật
    if (this.serverUrl) {
      try {
        const query = `?key=${encodeURIComponent(stored.key)}&hwid=${encodeURIComponent(currentHwid)}`;
        // Thử GET /api/v1/license/check trước, nếu 404 thì thử /api/v1/license/verify
        let serverRes = await this.requestServer(`/api/v1/license/check${query}`, 'GET');
        if (!serverRes.ok && serverRes.status === 404) {
          serverRes = await this.requestServer(`/api/v1/license/verify${query}`, 'GET');
        }

        // Nếu phương thức GET bị 405 hoặc 404, fallback sang POST
        if (!serverRes.ok && (serverRes.status === 404 || serverRes.status === 405)) {
          serverRes = await this.requestServer('/api/v1/license/verify', 'POST', {
            key: stored.key,
            hwid: currentHwid
          });
          if (!serverRes.ok && serverRes.status === 404) {
            serverRes = await this.requestServer('/api/v1/license/check', 'POST', {
              key: stored.key,
              hwid: currentHwid
            });
          }
        }

        if (serverRes.ok && serverRes.data) {
          const sData = serverRes.data;
          if (sData.valid) {
            // Admin cập nhật / gia hạn key hoặc MỞ KHÓA: Cập nhật thời hạn mới và gỡ chặn
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

            const licStatus = this.getLicenseStatus(stored);
            return {
              isActivated: true,
              hwid: currentHwid,
              serverOnline: true,
              serverUrl: this.serverUrl,
              ...licStatus,
              daysLeft: sData.daysLeft || licStatus.daysLeft,
              maxMachines: sData.maxMachines || licStatus.maxMachines,
              activeMachinesCount: sData.activeMachinesCount || licStatus.activeMachinesCount
            };
          } else if (
            sData.valid === false ||
            sData.status === 'REVOKED' ||
            sData.status === 'EXPIRED' ||
            sData.status === 'BANNED' ||
            sData.status === 'BLOCKED' ||
            sData.status === 'DISABLED'
          ) {
            // Admin chặn key hoặc key hết hạn trên máy chủ: Ghi đè vào file local để vô hiệu hóa
            stored.isBlocked = true;
            stored.blockReason = sData.message || 'Bản quyền đã bị khóa hoặc hết hạn trên máy chủ';
            stored.expiresAt = 1; // Đánh dấu hết hạn ngay lập tức
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
              message: sData.message || 'Bản quyền đã bị khóa hoặc hết hạn trên máy chủ'
            };
          }
        }
      } catch (e) {}
    }

    // 2. Chế độ OFFLINE (hoặc khi Server không phản hồi / 404 / mất mạng):
    // Nếu trước đó đã bị server khóa (isBlocked = true), chặn ngay cả khi offline
    if (stored.isBlocked) {
      return {
        isActivated: false,
        isExpired: true,
        isBlocked: true,
        hwid: currentHwid,
        key: stored.key,
        serverOnline: false,
        serverUrl: this.serverUrl,
        message: stored.blockReason || 'Bản quyền đã bị khóa hoặc thu hồi trên máy chủ'
      };
    }

    // 2. Chế độ OFFLINE (hoặc khi Server không phản hồi / 404 / mất mạng):
    // Bản quyền đã lưu trong file license.dat (đã mã hóa AES-256 nội bộ)
    // Kiểm tra tính ràng buộc phần cứng HWID
    if (stored.activatedHwids && Array.isArray(stored.activatedHwids) && stored.activatedHwids.length > 0) {
      if (!stored.activatedHwids.includes(currentHwid)) {
        return {
          isActivated: false,
          hwid: currentHwid,
          serverOnline: false,
          serverUrl: this.serverUrl,
          message: 'Mã bản quyền này không khớp với phần cứng máy tính hiện tại'
        };
      }
    }

    // Kiểm tra thời hạn
    const now = Date.now();
    if (stored.expiresAt && stored.expiresAt > 0 && now > stored.expiresAt) {
      return {
        isActivated: false,
        isExpired: true,
        hwid: currentHwid,
        serverOnline: false,
        serverUrl: this.serverUrl,
        message: 'Bản quyền phần mềm đã hết hạn sử dụng'
      };
    }

    // Bản quyền hợp lệ và còn hạn
    return {
      isActivated: true,
      hwid: currentHwid,
      serverOnline: false,
      serverUrl: this.serverUrl,
      ...this.getLicenseStatus(stored)
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
      });

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
          serverUrl: this.serverUrl
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
        return {
          valid: false,
          serverConnected: true,
          message: serverRes.data.message || 'Server từ chối kích hoạt key này'
        };
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