const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { serverDecision, OFFLINE_GRACE_MS } = require('./licensePolicy');

const SECRET_SALT = process.env.LICENSE_SECRET_SALT || 'GPM_LOGIN_GLOBAL_SECRET_SALT_2026_SECURE_AUTH_KEY_#99';

class LicenseManager {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(__dirname, 'app_data');
    if (!fs.existsSync(this.dataDir)) {
      try { fs.mkdirSync(this.dataDir, { recursive: true }); } catch (e) {}
    }
    this.licenseFilePath = path.join(this.dataDir, 'license.dat');
    this.cachedHwid = null;
    this.serverBlocks = new Map();
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
            } else if (!isLifetime && data.expiresAt === 1 && v.payload.days) {
              const expectedExpires = (data.activatedAt || v.payload.created || Date.now()) + (Number(v.payload.days) * 24 * 3600 * 1000);
              if (Date.now() < expectedExpires) {
                data.expiresAt = expectedExpires;
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

  _saveLicense(stored) {
    fs.writeFileSync(this.licenseFilePath, this.encryptData(JSON.stringify(stored)), 'utf8');
  }

  checkStatus() {
    if (!this._licenseCheck) {
      this._licenseCheck = this._checkStatus().finally(() => { this._licenseCheck = null; });
    }
    return this._licenseCheck;
  }

  async _checkStatus() {
    const stored = this.getStoredLicense();
    const hwid = this.getHWID();
    if (!stored?.key) return { ...this.getLicenseStatus(null), hwid, serverOnline: false, serverUrl: this.serverUrl, message: 'Chưa kích hoạt bản quyền' };
    if (this.serverBlocks.has(stored.key)) {
      stored.isBlocked = true;
      stored.blockReason = this.serverBlocks.get(stored.key);
    }
    try {
      const query = '?key=' + encodeURIComponent(stored.key) + '&hwid=' + encodeURIComponent(hwid);
      let response = await this.requestServer('/api/v1/license/check' + query, 'GET', null, 6000);
      if (response.status === 404) response = await this.requestServer('/api/v1/license/verify' + query, 'GET', null, 6000);
      if (this.getStoredLicense()?.key !== stored.key) return this._checkStatus();
      const decision = serverDecision(response);
      if (decision.valid === false) {
        this.serverBlocks.set(stored.key, decision.message);
        stored.isBlocked = true;
        stored.blockReason = decision.message;
        stored.lastCheck = Date.now();
        this._saveLicense(stored);
        return { ...this.getLicenseStatus(stored), isActivated: false, isBlocked: true, hwid, serverOnline: true, serverUrl: this.serverUrl, message: decision.message };
      }
      if (decision.valid === true) {
        this.serverBlocks.delete(stored.key);
        const data = decision.data;
        const license = data.license || data;
        if (license.expiresAt !== undefined) stored.expiresAt = license.expiresAt ? new Date(license.expiresAt).getTime() : 0;
        if (data.payload && typeof data.payload === 'object') stored.payload = { ...stored.payload, ...data.payload };
        stored.isBlocked = false;
        delete stored.blockReason;
        stored.lastCheck = Date.now();
        stored.serverSynced = true;
        stored.activatedHwids = [...new Set([...(stored.activatedHwids || []), hwid])];
        this._saveLicense(stored);
        const status = this.getLicenseStatus(stored);
        return { ...status, hwid, serverOnline: true, serverUrl: this.serverUrl,
          daysLeft: data.daysLeft ?? status.daysLeft,
          maxMachines: license.maxMachines ?? data.maxMachines ?? status.maxMachines,
          activeMachinesCount: data.activeMachinesCount ?? status.activeMachinesCount,
          message: data.message || 'Bản quyền hợp lệ' };
      }
    } catch {}
    const status = this.getLicenseStatus(stored);
    const elapsed = Date.now() - Number(stored.lastCheck || 0);
    const grace = stored.serverSynced === true && !stored.isBlocked && status.isActivated && elapsed >= 0 && elapsed <= OFFLINE_GRACE_MS;
    return { ...status, isActivated: Boolean(grace), hwid, serverOnline: false, serverUrl: this.serverUrl,
      message: stored.isBlocked ? stored.blockReason || 'Key đã bị khóa trên máy chủ.'
        : grace ? 'Đang dùng xác nhận server gần nhất; sẽ kiểm tra lại trong 30 giây.'
        : 'Không xác minh được bản quyền với server. Vui lòng kết nối mạng và thử lại.' };
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
    if (!key || typeof key !== 'string') return { valid: false, message: 'Vui lòng nhập License Key hợp lệ' };
    if (this._licenseCheck) await this._licenseCheck;
    const cleanKey = key.trim();
    const currentHwid = this.getHWID();
    let response;
    try {
      response = await this.requestServer('/api/v1/license/activate', 'POST', { key: cleanKey, hwid: currentHwid, machineName: this.getMachineName() }, 6000);
    } catch { response = { ok: false }; }
    const decision = serverDecision(response);
    if (decision.valid !== true) {
      const existing = this.getStoredLicense();
      if (decision.valid === false && existing?.key === cleanKey) {
        this.serverBlocks.set(cleanKey, decision.message);
        existing.isBlocked = true;
        existing.blockReason = decision.message;
        existing.lastCheck = Date.now();
        this._saveLicense(existing);
      }
      return { valid: false, serverConnected: decision.valid === false,
        message: decision.message || 'Cần kết nối máy chủ để kích hoạt bản quyền. Không thể kích hoạt ngoại tuyến.' };
    }
    const license = decision.data.license || decision.data;
    this.serverBlocks.delete(cleanKey);
    const now = Date.now();
    const expiresAt = license.expiresAt ? new Date(license.expiresAt).getTime() : 0;
    const verified = this.verifyKey(cleanKey);
    const payload = { ...(verified.valid ? verified.payload : {}), type: license.type || verified.payload?.type || 'monthly',
      days: expiresAt > 0 ? Math.ceil((expiresAt - now) / 86400000) : 0,
      max: license.maxMachines || 1, hwids: [currentHwid], name: license.customerName || this.getMachineName(), created: now };
    const stored = { key: cleanKey, payload, activatedHwids: [currentHwid], currentHwid, activatedAt: now,
      expiresAt, lastCheck: now, serverSynced: true, serverUrl: this.serverUrl, isBlocked: false };
    this._saveLicense(stored);
    return { valid: true, serverConnected: true, message: decision.data.message || 'Kích hoạt bản quyền thành công!', license: this.getLicenseStatus(stored) };
  }

}

module.exports = LicenseManager;
