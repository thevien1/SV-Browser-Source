const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { shell } = require('electron');

class ExtensionStore {
  constructor(baseDir, dataDir) {
    const isAsar = __dirname.includes('app.asar');
    const rootDir = baseDir ? path.resolve(baseDir) : path.resolve(__dirname);
    this.dataDir = dataDir ? path.resolve(dataDir) : path.resolve(rootDir, 'app_data');
    this.configFilePath = path.join(this.dataDir, 'extensions.json');

    // Nếu chạy dev và có folder Extensions thì dùng, khi đóng gói thì lưu vào AppData của người dùng
    const localExtDir = path.join(rootDir, 'Extensions');
    if (!isAsar && fs.existsSync(localExtDir)) {
      this.extensionsDir = localExtDir;
    } else {
      this.extensionsDir = path.join(this.dataDir, 'Extensions');
    }

    if (!fs.existsSync(this.extensionsDir)) {
      try { fs.mkdirSync(this.extensionsDir, { recursive: true }); } catch (e) {}
    }
    if (!fs.existsSync(this.dataDir)) {
      try { fs.mkdirSync(this.dataDir, { recursive: true }); } catch (e) {}
    }

    this.configs = {}; // { [folderName]: { enabled: true, customName, addedAt } }
    this.loadConfigs();
  }

  loadConfigs() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        this.configs = JSON.parse(fs.readFileSync(this.configFilePath, 'utf8'));
      }
    } catch (e) {
      this.configs = {};
    }
  }

  saveConfigs() {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.configs, null, 2), 'utf8');
    } catch (e) {
      console.error('Lỗi lưu cấu hình extensions.json:', e);
    }
  }

  /**
   * Tạo Chrome Extension ID chuẩn 32 ký tự (từ 'a' đến 'p') dựa trên chuỗi định danh
   */
  generateExtensionId(identifier) {
    const hash = crypto.createHash('sha256').update(identifier).digest();
    let id = '';
    for (let i = 0; i < 16; i++) {
      const byte = hash[i];
      id += String.fromCharCode(97 + (byte & 0x0F));
      id += String.fromCharCode(97 + ((byte >> 4) & 0x0F));
    }
    return id.substring(0, 32);
  }

  /**
   * Đọc manifest.json và lấy thông tin chi tiết của Extension
   */
  parseExtensionManifest(extDirPath, folderName) {
    const manifestPath = path.join(extDirPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      let name = manifest.name || folderName;

      // Xử lý i18n nếu name dạng __MSG_appName__
      if (typeof name === 'string' && name.startsWith('__MSG_') && name.endsWith('__')) {
        const msgKey = name.slice(6, -2);
        const localesDir = path.join(extDirPath, '_locales');
        if (fs.existsSync(localesDir)) {
          const tryLocales = ['vi', 'en', 'en_US', 'en_GB'];
          for (const loc of tryLocales) {
            const msgFile = path.join(localesDir, loc, 'messages.json');
            if (fs.existsSync(msgFile)) {
              try {
                const msgObj = JSON.parse(fs.readFileSync(msgFile, 'utf8'));
                if (msgObj[msgKey] && msgObj[msgKey].message) {
                  name = msgObj[msgKey].message;
                  break;
                }
              } catch (e) {}
            }
          }
        }
      }

      // Xử lý icon: tìm icon lớn nhất và chuyển thành base64 data URL để UI hiển thị trực tiếp
      let iconDataUrl = null;
      let iconRelPath = null;
      if (manifest.icons && typeof manifest.icons === 'object') {
        const sizes = Object.keys(manifest.icons).sort((a, b) => Number(b) - Number(a));
        if (sizes.length > 0) {
          iconRelPath = manifest.icons[sizes[0]];
        }
      } else if (manifest.action && manifest.action.default_icon) {
        if (typeof manifest.action.default_icon === 'string') {
          iconRelPath = manifest.action.default_icon;
        } else if (typeof manifest.action.default_icon === 'object') {
          const sizes = Object.keys(manifest.action.default_icon).sort((a, b) => Number(b) - Number(a));
          if (sizes.length > 0) iconRelPath = manifest.action.default_icon[sizes[0]];
        }
      } else if (manifest.browser_action && manifest.browser_action.default_icon) {
        if (typeof manifest.browser_action.default_icon === 'string') {
          iconRelPath = manifest.browser_action.default_icon;
        } else if (typeof manifest.browser_action.default_icon === 'object') {
          const sizes = Object.keys(manifest.browser_action.default_icon).sort((a, b) => Number(b) - Number(a));
          if (sizes.length > 0) iconRelPath = manifest.browser_action.default_icon[sizes[0]];
        }
      }

      if (iconRelPath) {
        const fullIconPath = path.join(extDirPath, iconRelPath);
        if (fs.existsSync(fullIconPath)) {
          try {
            const ext = path.extname(fullIconPath).toLowerCase().replace('.', '');
            const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png');
            const iconBase64 = fs.readFileSync(fullIconPath).toString('base64');
            iconDataUrl = `data:${mime};base64,${iconBase64}`;
          } catch (e) {}
        }
      }

      const id = this.generateExtensionId(folderName);
      const conf = this.configs[folderName] || {};
      const enabled = conf.enabled !== undefined ? conf.enabled : true;

      return {
        id,
        folderName,
        name,
        version: manifest.version || '1.0.0',
        description: manifest.description || '',
        icon: iconDataUrl,
        path: extDirPath,
        enabled,
        addedAt: conf.addedAt || new Date().toISOString()
      };
    } catch (e) {
      console.error(`Lỗi đọc manifest.json tại ${extDirPath}:`, e);
      return null;
    }
  }

  /**
   * Tự động dọn dẹp các file nén thừa (.zip, .crx) bên trong thư mục extension nếu có
   */
  cleanupOrphanArchives(extDirPath) {
    try {
      if (!fs.existsSync(extDirPath)) return;
      const files = fs.readdirSync(extDirPath);
      for (const f of files) {
        if (f.toLowerCase().endsWith('.zip') || f.toLowerCase().endsWith('.crx')) {
          try {
            fs.unlinkSync(path.join(extDirPath, f));
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  /**
   * Lấy danh sách tất cả extension trong thư mục Extensions
   */
  getAll() {
    this.loadConfigs();
    if (!fs.existsSync(this.extensionsDir)) return [];

    const items = fs.readdirSync(this.extensionsDir);
    const list = [];

    for (const item of items) {
      const fullPath = path.join(this.extensionsDir, item);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          this.cleanupOrphanArchives(fullPath);
          const extInfo = this.parseExtensionManifest(fullPath, item);
          if (extInfo) {
            list.push(extInfo);
          }
        }
      } catch (e) {}
    }

    return list;
  }

  /**
   * Lấy danh sách đường dẫn các extension đang được BẬT (để nạp vào Chrome --load-extension)
   */
  getEnabledExtensionPaths() {
    const list = this.getAll();
    return list.filter(e => e.enabled).map(e => e.path);
  }

  /**
   * Bật hoặc tắt trạng thái của Extension
   */
  toggleExtension(folderName, enabled) {
    this.configs[folderName] = this.configs[folderName] || {};
    this.configs[folderName].enabled = !!enabled;
    this.saveConfigs();
    return { success: true, enabled: this.configs[folderName].enabled };
  }

  /**
   * Mở thư mục chứa Extension bằng File Explorer
   */
  openFolder(folderName) {
    const targetDir = path.join(this.extensionsDir, folderName);
    if (fs.existsSync(targetDir)) {
      shell.openPath(targetDir);
      return { success: true };
    }
    return { success: false, message: 'Thư mục không tồn tại' };
  }

  /**
   * Xóa Extension (xóa cả folder và cấu hình)
   */
  deleteExtension(folderName) {
    const targetDir = path.join(this.extensionsDir, folderName);
    try {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
      delete this.configs[folderName];
      this.saveConfigs();
      return { success: true };
    } catch (e) {
      console.error(`Lỗi xóa extension ${folderName}:`, e);
      return { success: false, message: e.message };
    }
  }

  /**
   * Tìm thư mục chứa manifest.json (đề phòng zip bọc trong một thư mục con)
   */
  findManifestDir(dir) {
    if (fs.existsSync(path.join(dir, 'manifest.json'))) {
      return dir;
    }
    const subdirs = fs.readdirSync(dir);
    for (const sub of subdirs) {
      const fullSub = path.join(dir, sub);
      if (fs.statSync(fullSub).isDirectory()) {
        if (fs.existsSync(path.join(fullSub, 'manifest.json'))) {
          return fullSub;
        }
      }
    }
    return null;
  }

  /**
   * Tự động giải nén và thêm extension từ file (.zip, .crx) hoặc thư mục
   */
  async addExtensionFromPath(srcPath) {
    if (!fs.existsSync(srcPath)) {
      throw new Error('Đường dẫn nguồn không tồn tại: ' + srcPath);
    }

    const stat = fs.statSync(srcPath);
    const tempDir = path.join(this.extensionsDir, `.temp_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      let rootDir = '';

      if (stat.isDirectory()) {
        // Là thư mục unpacked
        const manifestDir = this.findManifestDir(srcPath);
        if (!manifestDir) {
          throw new Error('Không tìm thấy file manifest.json trong thư mục đã chọn!');
        }
        rootDir = manifestDir;
      } else {
        // Là file (.zip hoặc .crx)
        const ext = path.extname(srcPath).toLowerCase();
        let zipToExtract = srcPath;

        if (ext === '.crx') {
          // Xử lý CRX: Bỏ header để lấy raw ZIP
          const buffer = fs.readFileSync(srcPath);
          // Tìm PK\x03\x04
          let pkIndex = -1;
          for (let i = 0; i < Math.min(buffer.length - 4, 10000); i++) {
            if (buffer[i] === 0x50 && buffer[i + 1] === 0x4B && buffer[i + 2] === 0x03 && buffer[i + 3] === 0x04) {
              pkIndex = i;
              break;
            }
          }

          if (pkIndex === -1) {
            throw new Error('Định dạng CRX không hợp lệ (không tìm thấy cấu trúc ZIP)');
          }

          const rawZip = buffer.slice(pkIndex);
          const tempCrxZip = path.join(tempDir, 'archive.zip');
          fs.writeFileSync(tempCrxZip, rawZip);
          zipToExtract = tempCrxZip;
        }

        // Dùng tar (có sẵn trên Windows 10/11) hoặc PowerShell Expand-Archive
        try {
          execSync(`tar -xf "${zipToExtract}" -C "${tempDir}"`, { stdio: 'pipe' });
        } catch (tarErr) {
          execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipToExtract}' -DestinationPath '${tempDir}' -Force"`, { stdio: 'pipe' });
        }

        // Xóa ngay file nén zip / crx tạm trước khi copy vào thư mục Extensions
        try {
          if (fs.existsSync(zipToExtract)) fs.unlinkSync(zipToExtract);
          const leftovers = fs.readdirSync(tempDir);
          for (const lf of leftovers) {
            if (lf.toLowerCase().endsWith('.zip') || lf.toLowerCase().endsWith('.crx')) {
              try { fs.unlinkSync(path.join(tempDir, lf)); } catch (_) {}
            }
          }
        } catch (_) {}

        const manifestDir = this.findManifestDir(tempDir);
        if (!manifestDir) {
          throw new Error('File nén không chứa manifest.json hợp lệ của Chrome Extension');
        }
        rootDir = manifestDir;
      }

      // Đọc manifest để đặt tên thư mục
      const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
      let rawName = manifest.name || path.basename(srcPath, path.extname(srcPath));
      let cleanName = rawName.replace(/[^a-zA-Z0-9_\-\.]/g, '_').substring(0, 50);
      if (!cleanName || cleanName === '_') cleanName = `Extension_${Date.now()}`;

      let destDir = path.join(this.extensionsDir, cleanName);
      let counter = 1;
      while (fs.existsSync(destDir) && destDir !== rootDir) {
        destDir = path.join(this.extensionsDir, `${cleanName}_${counter++}`);
      }

      // Copy nội dung vào thư mục đích trong Extensions/
      if (rootDir !== destDir) {
        fs.cpSync(rootDir, destDir, { recursive: true });
      }

      const finalFolderName = path.basename(destDir);
      this.configs[finalFolderName] = {
        enabled: true,
        addedAt: new Date().toISOString()
      };
      this.saveConfigs();

      return this.parseExtensionManifest(destDir, finalFolderName);
    } finally {
      // Dọn dẹp thư mục tạm nếu có
      if (fs.existsSync(tempDir)) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
      }
    }
  }

  /**
   * Trích xuất Extension ID (32 ký tự a-z) từ link Chrome Web Store hoặc chuỗi nhập vào
   */
  extractExtensionId(input) {
    if (!input || typeof input !== 'string') return null;
    const clean = input.trim();
    // 32 ký tự a-z
    if (/^[a-z]{32}$/i.test(clean)) {
      return clean.toLowerCase();
    }
    // URL chromewebstore.google.com/detail/... hoặc chrome.google.com/webstore/detail/...
    const match = clean.match(/\/detail\/(?:[^\/]+\/)?([a-z]{32})/i) || clean.match(/([a-z]{32})/i);
    if (match) {
      return match[1].toLowerCase();
    }
    return null;
  }

  /**
   * Tải file từ URL với hỗ trợ tự động theo dõi chuyển hướng (Redirect 301/302)
   */
  downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const downloadWithRedirect = (targetUrl, redirectsLeft = 5) => {
        if (redirectsLeft <= 0) {
          return reject(new Error('Quá nhiều lần chuyển hướng (redirect) khi tải extension.'));
        }

        const client = targetUrl.startsWith('https:') ? https : http;
        const req = client.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
          }
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let nextUrl = res.headers.location;
            if (!nextUrl.startsWith('http')) {
              const parsed = new URL(targetUrl);
              nextUrl = new URL(nextUrl, parsed.origin).href;
            }
            return downloadWithRedirect(nextUrl, redirectsLeft - 1);
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`Tải extension thất bại, HTTP status: ${res.statusCode}`));
          }

          const file = fs.createWriteStream(destPath);
          res.pipe(file);
          file.on('finish', () => {
            file.close(() => resolve(destPath));
          });
          file.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
          });
        });

        req.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });

        req.setTimeout(35000, () => {
          req.destroy(new Error('Hết thời gian tải (Timeout 35s)'));
        });
      };

      downloadWithRedirect(url);
    });
  }

  /**
   * Tự động tải extension từ link Chrome Web Store hoặc link tải trực tiếp và giải nén vào Extensions
   */
  async addExtensionFromUrl(urlOrId) {
    if (!urlOrId || typeof urlOrId !== 'string') {
      throw new Error('Vui lòng nhập link Chrome Web Store hoặc ID tiện ích');
    }

    const extId = this.extractExtensionId(urlOrId);
    let downloadUrl = '';
    let isDirectUrl = false;

    if (extId) {
      // Endpoint chính thức từ Google Update Server
      downloadUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=128.0.0.0&acceptformat=crx2,crx3&x=id%3D${extId}%26uc`;
    } else if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://')) {
      downloadUrl = urlOrId.trim();
      isDirectUrl = true;
    } else {
      throw new Error('Không tìm thấy Extension ID hợp lệ (cần 32 ký tự) trong liên kết cung cấp.');
    }

    const tempFileName = `.download_${Date.now()}.${isDirectUrl && urlOrId.endsWith('.zip') ? 'zip' : 'crx'}`;
    const tempFilePath = path.join(this.extensionsDir, tempFileName);

    try {
      await this.downloadFile(downloadUrl, tempFilePath);
      if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
        throw new Error('File tải về bị rỗng hoặc không thành công.');
      }
      const result = await this.addExtensionFromPath(tempFilePath);
      return result;
    } finally {
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
      }
    }
  }
}

module.exports = ExtensionStore;
