const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

class DriverIconManager {
  constructor(baseDir) {
    this.baseDir = baseDir || __dirname;
    this.driversDir = path.join(this.baseDir, 'drivers');
    this.toolsDir = path.join(this.baseDir, 'tools');
    this.ensureTools();
  }

  ensureTools() {
    if (process.platform !== 'win32') return;
    if (!fs.existsSync(this.toolsDir)) {
      try { fs.mkdirSync(this.toolsDir, { recursive: true }); } catch (e) {}
    }

    const v151Bin = path.join(this.driversDir, 'ChromiumCore_v151', 'Chrome-bin');
    const masterRcedit = path.join(this.toolsDir, 'rcedit-x64.exe');
    const masterIco = path.join(this.toolsDir, 'logo.ico');

    if (!fs.existsSync(masterRcedit)) {
      const src = path.join(v151Bin, 'rcedit-x64.exe');
      if (fs.existsSync(src)) {
        try { fs.copyFileSync(src, masterRcedit); } catch (e) {}
      }
    }

    if (!fs.existsSync(masterIco)) {
      const src = path.join(v151Bin, 'logo.ico');
      if (fs.existsSync(src)) {
        try { fs.copyFileSync(src, masterIco); } catch (e) {}
      }
    }
  }

  /**
   * Quét và tự động thêm rcedit-x64.exe cùng đổi icon cho tất cả các phiên bản ChromiumCore
   */
  syncAllDriverIcons() {
    if (process.platform !== 'win32') return;
    if (!fs.existsSync(this.driversDir)) return;

    this.ensureTools();

    const masterRcedit = path.join(this.toolsDir, 'rcedit-x64.exe');
    const masterIco = path.join(this.toolsDir, 'logo.ico');

    if (!fs.existsSync(masterRcedit) || !fs.existsSync(masterIco)) {
      console.warn('[DriverIconManager] Thiếu rcedit-x64.exe hoặc logo.ico');
      return;
    }

    try {
      const entries = fs.readdirSync(this.driversDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!entry.name.toLowerCase().startsWith('chromiumcore')) continue;

        const coreDir = path.join(this.driversDir, entry.name);
        let targetBinDir = path.join(coreDir, 'Chrome-bin');
        if (!fs.existsSync(targetBinDir)) {
          if (fs.existsSync(path.join(coreDir, 'chrome.exe'))) {
            targetBinDir = coreDir;
          } else {
            continue;
          }
        }

        const chromeExe = path.join(targetBinDir, 'chrome.exe');
        if (!fs.existsSync(chromeExe)) continue;

        // 1. Tự động copy rcedit-x64.exe nếu chưa có
        const localRcedit = path.join(targetBinDir, 'rcedit-x64.exe');
        if (!fs.existsSync(localRcedit)) {
          try {
            fs.copyFileSync(masterRcedit, localRcedit);
            console.log(`[DriverIconManager] Đã copy rcedit-x64.exe vào ${entry.name}`);
          } catch (e) {
            console.error(`[DriverIconManager] Lỗi copy rcedit vào ${entry.name}:`, e.message);
          }
        }

        // 2. Tự động copy logo.ico nếu chưa có
        const localIco = path.join(targetBinDir, 'logo.ico');
        if (!fs.existsSync(localIco)) {
          try {
            fs.copyFileSync(masterIco, localIco);
          } catch (e) {}
        }

        // 3. Kiểm tra xem đã patch icon chưa
        const patchFlag = path.join(targetBinDir, '.icon_patched');
        if (fs.existsSync(patchFlag)) continue;

        const rceditToRun = fs.existsSync(localRcedit) ? localRcedit : masterRcedit;
        const icoToUse = fs.existsSync(localIco) ? localIco : masterIco;

        console.log(`[DriverIconManager] Đang áp dụng icon cho ${entry.name}...`);

        // Sao lưu chrome.exe.bak nếu chưa có
        const bakExe = path.join(targetBinDir, 'chrome.exe.bak');
        if (!fs.existsSync(bakExe)) {
          try { fs.copyFileSync(chromeExe, bakExe); } catch (e) {}
        }

        let patchSuccess = false;
        // Đổi icon cho chrome.exe
        try {
          const res1 = spawnSync(rceditToRun, [chromeExe, '--set-icon', icoToUse], { encoding: 'utf8' });
          if (res1.status === 0) {
            patchSuccess = true;
          } else {
            console.warn(`[DriverIconManager] Không thể đổi icon cho ${entry.name} (trình duyệt có thể đang chạy):`, (res1.stderr || res1.stdout || '').trim());
          }
        } catch (e) {}

        // Đổi icon cho chrome_proxy.exe nếu có
        const proxyExe = path.join(targetBinDir, 'chrome_proxy.exe');
        if (fs.existsSync(proxyExe)) {
          try {
            spawnSync(rceditToRun, [proxyExe, '--set-icon', icoToUse], { encoding: 'utf8' });
          } catch (e) {}
        }

        // Đổi icon cho chrome.dll trong thư mục version nếu có
        try {
          const subItems = fs.readdirSync(targetBinDir);
          for (const sub of subItems) {
            if (/^\d+\.\d+\.\d+/.test(sub)) {
              const dllPath = path.join(targetBinDir, sub, 'chrome.dll');
              if (fs.existsSync(dllPath)) {
                spawnSync(rceditToRun, [dllPath, '--set-icon', icoToUse], { encoding: 'utf8' });
              }
            }
          }
        } catch (e) {}

        // Chỉ ghi cờ đánh dấu nếu patch thành công
        if (patchSuccess) {
          try {
            fs.writeFileSync(patchFlag, new Date().toISOString(), 'utf8');
            console.log(`[DriverIconManager] Đã cập nhật icon thành công cho ${entry.name}`);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('[DriverIconManager] Lỗi khi đồng bộ icon drivers:', err);
    }
  }
}

module.exports = DriverIconManager;
