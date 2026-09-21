/**
 * SV Browser - Script tự động tải file cài đặt lên GitHub Releases
 * 
 * Cách sử dụng:
 * 1. Tạo GitHub Personal Access Token (classic hoặc fine-grained có quyền repo) tại:
 *    https://github.com/settings/tokens
 * 2. Chạy lệnh:
 *    node scripts/upload-release.js <GITHUB_TOKEN>
 *    (hoặc set GITHUB_TOKEN trong biến môi trường / file .env)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const pkg = require('../package.json');
const REPO_OWNER = 'thevien1';
const REPO_NAME = 'SV-Browser';
const TAG_NAME = `v${pkg.version || '1.0.1'}`;
const RELEASE_TITLE = `SV Browser v${pkg.version || '1.0.1'} - Antidetect Multi-Browser Profile Manager`;

const token = process.argv[2] || process.env.GITHUB_TOKEN;
if (!token) {
  console.log('====================================================================');
  console.log('  HƯỚNG DẪN TẢI LÊN GITHUB RELEASES TỰ ĐỘNG BẰNG TOKEN');
  console.log('====================================================================');
  console.log('Vui lòng cung cấp GitHub Personal Access Token:');
  console.log('  node scripts/upload-release.js ghp_xxxxxxxxxxxxxxxxxxxx');
  console.log('\nHoặc tải thủ công cực nhanh qua giao diện web (khuyên dùng):');
  console.log(`  👉 https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/new?tag=${TAG_NAME}`);
  process.exit(0);
}

const distDir = path.join(__dirname, '..', 'dist');
const filesToUpload = [
  `SV Browser Setup ${pkg.version || '1.0.1'}.exe`,
  `SV Browser ${pkg.version || '1.0.1'} Portable.exe`
];

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${json.message || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
          else reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadAsset(uploadUrlTemplate, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileSize = fs.statSync(filePath).size;
    const uploadUrlStr = uploadUrlTemplate.replace(/\{(\?.*)?\}$/, '') + `?name=${encodeURIComponent(fileName)}`;
    const urlObj = new URL(uploadUrlStr);

    console.log(`Đang tải lên: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

    const fileStream = fs.createReadStream(filePath);
    let uploadedBytes = 0;
    let lastPercent = 0;

    fileStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const percent = Math.round((uploadedBytes / fileSize) * 100);
      if (percent >= lastPercent + 10 || percent === 100) {
        lastPercent = percent;
        process.stdout.write(`  -> Tiến trình ${fileName}: ${percent}%\r`);
      }
    });

    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'User-Agent': 'SV-Browser-Uploader',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`\n  ✓ Tải lên thành công: ${fileName}`);
          resolve(JSON.parse(body));
        } else {
          console.log(`\n  ✗ Lỗi khi tải lên ${fileName}: HTTP ${res.statusCode}`);
          reject(new Error(body));
        }
      });
    });

    req.on('error', reject);
    fileStream.pipe(req);
  });
}

async function main() {
  console.log(`\n[1/3] Đang kiểm tra / tạo GitHub Release cho tag ${TAG_NAME}...`);
  
  let release;
  try {
    release = await request({
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${TAG_NAME}`,
      method: 'GET',
      headers: {
        'User-Agent': 'SV-Browser-Uploader',
        'Authorization': `token ${token}`
      }
    });
    console.log(`  -> Tìm thấy Release ID: ${release.id}`);
  } catch (e) {
    console.log('  -> Chưa có Release, đang tạo mới...');
    release = await request({
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
      method: 'POST',
      headers: {
        'User-Agent': 'SV-Browser-Uploader',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      tag_name: TAG_NAME,
      name: RELEASE_TITLE,
      body: `### 🚀 SV Browser Version 1.0.0\n\nBộ cài đặt phần mềm SV Browser Antidetect & Automation.\n\n- **SV Browser Setup 1.0.0.exe**: Bộ cài đặt chuẩn Windows có shortcut Desktop & Start Menu.\n- **SV Browser 1.0.0 Portable.exe**: Bản Portable chạy ngay không cần cài đặt.\n\n© 2026 SV Browser Team.`,
      draft: false,
      prerelease: false
    }));
    console.log(`  ✓ Đã tạo thành công Release ID: ${release.id}`);
  }

  console.log(`\n[2/3] Bắt đầu tải các file cài đặt vào Release...`);
  for (const fileName of filesToUpload) {
    const filePath = path.join(distDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ! Không tìm thấy file: ${filePath}`);
      continue;
    }
    await uploadAsset(release.upload_url, filePath, fileName);
  }

  console.log('\n====================================================================');
  console.log('  HOÀN TẤT TẢI LÊN GITHUB RELEASES!                               ');
  console.log('====================================================================');
  console.log(`Link trang tải phần mềm: ${release.html_url}`);
}

main().catch(err => {
  console.error('\nLỗi:', err.message);
  process.exit(1);
});
