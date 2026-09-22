const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const DriverIconManager = require('./driverIconManager');

class DriverDownloader {
  constructor(baseDir) {
    this.baseDir = baseDir || __dirname;
    this.driversDir = path.join(this.baseDir, 'drivers');
    this.iconManager = new DriverIconManager(this.baseDir);
  }

  getArchiverPath() {
    const candidates = [
      path.join(this.baseDir, 'tools', '7za.exe'),
      path.join(this.baseDir, 'tools', '7z.exe'),
      path.join(__dirname, 'tools', '7za.exe'),
      path.join(__dirname, 'tools', '7z.exe'),
      (process.resourcesPath ? path.join(process.resourcesPath, 'tools', '7za.exe') : null),
      (process.resourcesPath ? path.join(process.resourcesPath, 'tools', '7z.exe') : null),
    ].filter(Boolean);

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  /**
   * Tự động tải, giải nén và nạp icon cho ChromiumCore từ link GitHub hoặc link trực tiếp
   * @param {string} url - Link download chrome.7z hoặc link tag GitHub
   * @param {function} onProgress - Callback tiến trình (string)
   */
  async downloadAndInstall(url, onProgress = console.log, targetName = '') {
    if (!url || typeof url !== 'string') {
      throw new Error('URL không hợp lệ');
    }

    let downloadUrl = url.trim();

    // Nếu người dùng đưa link tag (releases/tag/v...), tự động chuyển thành link download chrome.7z
    if (downloadUrl.includes('/releases/tag/')) {
      downloadUrl = downloadUrl.replace('/releases/tag/', '/releases/download/') + '/chrome.7z';
    }

    // Trích xuất version chuẩn (ưu tiên sau /download/v hoặc \bv153..., tránh khớp số 64 trong win64)
    let majorVersion = '';
    let fullVersion = '';

    const vMatch = downloadUrl.match(/(?:download|tag)\/v?(\d+)(?:\.(\d+)\.(\d+)\.(\d+))?/i) ||
                   downloadUrl.match(/\bv(\d+)(?:\.(\d+)\.(\d+)\.(\d+))?/i);
    if (vMatch) {
      majorVersion = vMatch[1];
      fullVersion = vMatch[0].replace(/^(?:download|tag)\/v?/i, '').replace(/^v/i, '');
    }

    if (!majorVersion && targetName) {
      const matchTarget = targetName.match(/v?(\d+)/i);
      if (matchTarget) majorVersion = matchTarget[1];
    }

    if (!majorVersion) majorVersion = 'latest';
    if (!fullVersion) fullVersion = `${majorVersion}.0.0.0`;

    const folderName = targetName ? targetName.trim() : `ChromiumCore_v${majorVersion}`;
    const targetDir = path.join(this.driversDir, folderName);
    let ext = '.7z';
    const lowerUrl = downloadUrl.toLowerCase();
    if (lowerUrl.includes('.zip')) ext = '.zip';
    else if (lowerUrl.includes('.rar')) ext = '.rar';
    else if (lowerUrl.includes('.tar.gz') || lowerUrl.includes('.tgz')) ext = '.tar.gz';

    const tempFileName = `temp_download_${Date.now()}${ext}`;
    const tempFile = path.join(targetDir, tempFileName);

    if (!fs.existsSync(this.driversDir)) {
      fs.mkdirSync(this.driversDir, { recursive: true });
    }
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    onProgress(`[1/4] Đang tải Chromium Core v${majorVersion} từ:\n${downloadUrl}`);

    // Sử dụng curl.exe với cwd là targetDir để tránh lỗi đường dẫn Unicode tiếng Việt (Phần mềm)
    await new Promise((resolve, reject) => {
      const curl = spawn('curl.exe', ['-L', '--fail', '-o', tempFileName, downloadUrl], {
        cwd: targetDir,
        windowsHide: true
      });

      curl.stderr.on('data', (data) => {
        // curl xuất tiến trình qua stderr
        const str = data.toString();
        if (str.includes('%') || str.includes('k') || str.includes('M')) {
          onProgress(`[Tải xuống] ${str.trim().split('\r').pop()}`);
        }
      });

      curl.on('close', (code) => {
        if (code === 0 && fs.existsSync(tempFile) && fs.statSync(tempFile).size > 1024 * 1024) {
          resolve();
        } else {
          if (fs.existsSync(tempFile)) try { fs.unlinkSync(tempFile); } catch (e) {}
          reject(new Error(`Tải file thất bại (curl mã lỗi: ${code}). Hãy kiểm tra lại kết nối mạng hoặc link tải.`));
        }
      });

      curl.on('error', (err) => reject(err));
    });

    onProgress(`[2/4] Đã tải xong (~${(fs.statSync(tempFile).size / (1024 * 1024)).toFixed(1)} MB). Đang giải nén vào ${folderName}...`);

    // Hỗ trợ giải nén đa năng (7za.exe > tar.exe > powershell Expand-Archive)
    // 7za.exe xử lý hoàn hảo định dạng 7z mã hóa LZMA/LZMA2 trên mọi phiên bản Windows 10/11
    const archiverExe = this.getArchiverPath();
    let extractSuccess = false;
    let extractError = '';

    if (archiverExe) {
      const res = spawnSync(archiverExe, ['x', '-y', tempFileName], {
        cwd: targetDir,
        encoding: 'utf8',
        windowsHide: true
      });
      if (res.status === 0) {
        extractSuccess = true;
      } else {
        extractError = res.stderr || res.stdout || '7za.exe giải nén thất bại';
      }
    }

    if (!extractSuccess) {
      // Fallback sang tar.exe của Windows
      const tarRes = spawnSync('tar.exe', ['-xf', tempFileName], {
        cwd: targetDir,
        encoding: 'utf8',
        windowsHide: true
      });
      if (tarRes.status === 0) {
        extractSuccess = true;
      } else {
        extractError = (extractError ? extractError + '\n' : '') + (tarRes.stderr || 'tar.exe không giải nén được file');
      }
    }

    if (!extractSuccess && (ext === '.zip' || lowerUrl.includes('.zip'))) {
      // Fallback cho file .zip bằng PowerShell Expand-Archive
      const psRes = spawnSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath "${tempFileName}" -DestinationPath "." -Force`], {
        cwd: targetDir,
        encoding: 'utf8',
        windowsHide: true
      });
      if (psRes.status === 0) {
        extractSuccess = true;
      } else {
        extractError = (extractError ? extractError + '\n' : '') + (psRes.stderr || 'PowerShell Expand-Archive thất bại');
      }
    }

    // Xóa file tạm sau khi giải nén
    try { fs.unlinkSync(tempFile); } catch (e) {}

    if (!extractSuccess) {
      throw new Error(`Lỗi giải nén: ${extractError || 'Không thể giải nén file driver'}`);
    }

    // Đảm bảo cấu trúc chuẩn Chrome-bin
    const chromeBin = path.join(targetDir, 'Chrome-bin');
    if (!fs.existsSync(chromeBin)) {
      // Nếu tar giải nén các file trực tiếp vào targetDir thay vì Chrome-bin
      if (fs.existsSync(path.join(targetDir, 'chrome.exe'))) {
        fs.mkdirSync(chromeBin, { recursive: true });
        const items = fs.readdirSync(targetDir);
        for (const item of items) {
          if (item === 'Chrome-bin') continue;
          const oldPath = path.join(targetDir, item);
          const newPath = path.join(chromeBin, item);
          try { fs.renameSync(oldPath, newPath); } catch (e) {}
        }
      }
    }

    onProgress(`[3/4] Đang tự động nạp rcedit-x64.exe và áp dụng icon Google Chrome...`);
    this.iconManager.syncAllDriverIcons();

    const finalExe = path.join(targetDir, 'Chrome-bin', 'chrome.exe');
    if (!fs.existsSync(finalExe)) {
      throw new Error('Không tìm thấy chrome.exe sau khi giải nén!');
    }

    onProgress(`[4/4] Hoàn tất! Đã cài đặt thành công ${folderName} (Version ${fullVersion})`);
    return {
      success: true,
      folderName,
      version: fullVersion,
      majorVersion,
      path: finalExe
    };
  }
}

// Chạy trực tiếp từ dòng lệnh nếu được gọi: node driverDownloader.js <url>
if (require.main === module) {
  const targetUrl = process.argv[2] || 'https://github.com/Hibbiki/chromium-win64/releases/download/v153.0.8010.37-r1681091/chrome.7z';
  console.log(`Bắt đầu tải và cài đặt ChromiumCore...`);
  const downloader = new DriverDownloader(__dirname);
  downloader.downloadAndInstall(targetUrl, (msg) => console.log(msg))
    .then((res) => {
      console.log('\n=== KẾT QUẢ CÀI ĐẶT ===');
      console.log(JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error('\nLỗi:', err.message);
      process.exit(1);
    });
}

module.exports = DriverDownloader;
