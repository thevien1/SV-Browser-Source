/**
 * SV Browser - Protected Build Script
 * 
 * Quy trình đóng gói an toàn & mã hóa bảo vệ mã nguồn:
 * 1. Thu thập toàn bộ file mã nguồn JS (backend, preload, UI frontend).
 * 2. Sử dụng javascript-obfuscator làm rối toàn diện:
 *    - Mã hóa chuỗi String sang Base64
 *    - Làm phẳng luồng điều khiển (Control Flow Flattening)
 *    - Xóa toàn bộ comment, làm gọn mã (Compact)
 *    - Đổi tên biến / hàm nội bộ sang dạng hex không thể đọc hiểu
 * 3. Loại bỏ hoàn toàn các file nhạy cảm quản trị (licenseGen.js, Tao_Key_Admin.bat, .env).
 * 4. Đóng gói thành bản cài đặt Windows (.exe installer & portable) bằng electron-builder.
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const builder = require('electron-builder');

const rootDir = path.resolve(__dirname, '..');
const stagingDir = path.join(rootDir, 'dist-build-staging');
const distDir = path.join(rootDir, 'dist');

// Cấu hình Obfuscate cho Node.js backend
const nodeObfuscateOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.8,
  splitStrings: true,
  splitStringsChunkLength: 8,
  target: 'node'
};

// Cấu hình Obfuscate cho Browser / ES Modules UI
const browserObfuscateOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.8,
  splitStrings: true,
  splitStringsChunkLength: 8,
  target: 'browser'
};

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Không thể xóa thư mục ${dir}:`, e.message);
    }
  }
}

function obfuscateFile(srcPath, destPath, options) {
  const code = fs.readFileSync(srcPath, 'utf8');
  try {
    const result = JavaScriptObfuscator.obfuscate(code, options);
    const destFolder = path.dirname(destPath);
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }
    fs.writeFileSync(destPath, result.getObfuscatedCode(), 'utf8');
    console.log(`  ✓ Đã mã hóa bảo vệ: ${path.relative(rootDir, srcPath)}`);
  } catch (err) {
    console.error(`  ✗ Lỗi khi mã hóa ${srcPath}:`, err.message);
    throw err;
  }
}

async function run() {
  console.log('====================================================');
  console.log('  SV BROWSER - BẮT ĐẦU ĐÓNG GÓI & BẢO VỆ MÃ NGUỒN  ');
  console.log('====================================================\n');

  const startTime = Date.now();

  // 1. Dọn dẹp thư mục staging
  console.log('[Bước 1/4] Chuẩn bị thư mục staging...');
  cleanDir(stagingDir);
  fs.mkdirSync(stagingDir, { recursive: true });

  // Đảm bảo icon app tồn tại
  const iconPath = path.join(rootDir, 'assets', 'icon.ico');
  if (!fs.existsSync(iconPath)) {
    console.log('  -> Đang tạo lại icon SV Browser từ script make_icon.ps1...');
    try {
      require('child_process').execSync('powershell -ExecutionPolicy Bypass -File scripts\\make_icon.ps1', { cwd: rootDir });
    } catch (e) {}
  }

  // 2. Danh sách các file backend Node.js cần mã hóa
  const nodeFiles = [
    'main.js',
    'licenseManager.js',
    'browserLauncher.js',
    'profileStore.js',
    'proxyStore.js',
    'proxyChecker.js',
    'extensionStore.js',
    'gpmApiServer.js',
    'driverDownloader.js',
    'driverIconManager.js',
    'taskbarManager.js',
    'iconGenerator.js'
  ];

  console.log('\n[Bước 2/4] Đang mã hóa bảo vệ toàn bộ mã nguồn Backend...');
  for (const file of nodeFiles) {
    const src = path.join(rootDir, file);
    const dest = path.join(stagingDir, file);
    if (fs.existsSync(src)) {
      obfuscateFile(src, dest, nodeObfuscateOptions);
    }
  }

  // Mã hóa preload.js
  const preloadSrc = path.join(rootDir, 'preload.js');
  if (fs.existsSync(preloadSrc)) {
    obfuscateFile(preloadSrc, path.join(stagingDir, 'preload.js'), browserObfuscateOptions);
  }

  // Mã hóa toàn bộ mã nguồn Frontend trong src/
  console.log('\n[Bước 2b/4] Đang mã hóa bảo vệ toàn bộ mã nguồn Frontend (src)...');
  function processSrcDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(rootDir, fullPath);
      const destPath = path.join(stagingDir, relPath);

      if (entry.isDirectory()) {
        processSrcDir(fullPath);
      } else if (entry.name.endsWith('.js')) {
        obfuscateFile(fullPath, destPath, browserObfuscateOptions);
      } else {
        // Copy trực tiếp HTML, CSS, SVG, PNG...
        const destFolder = path.dirname(destPath);
        if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
        fs.copyFileSync(fullPath, destPath);
        console.log(`  ✓ Đã sao chép tài nguyên: ${relPath}`);
      }
    }
  }
  processSrcDir(path.join(rootDir, 'src'));

  // Sao chép các script hỗ trợ nếu có
  const helperFiles = ['generate_icon.ps1', 'taskbar_helper.ps1'];
  for (const hf of helperFiles) {
    const src = path.join(rootDir, hf);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(stagingDir, hf));
    }
  }

  // Sao chép assets (icon.ico, icon.png)
  const assetsDir = path.join(rootDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    copyDirRecursive(assetsDir, path.join(stagingDir, 'assets'));
  }

  // Tạo package.json sạch cho ứng dụng (chỉ chứa metadata cần thiết, không lộ keygen hay devDependencies)
  const appPkg = {
    name: "sv-browser",
    version: "1.0.0",
    description: "SV Browser Antidetect Multi-Browser Profile Manager",
    main: "main.js",
    author: "SV Browser Team"
  };
  fs.writeFileSync(path.join(stagingDir, 'package.json'), JSON.stringify(appPkg, null, 2), 'utf8');

  console.log('\n[Bước 3/4] Cấu hình Electron Builder đóng gói...');

  // Chuẩn bị danh sách extraResources
  const extraResources = [];

  // KHÔNG đóng gói thư mục Extensions vào bộ cài (người dùng tự thêm hoặc tải theo nhu cầu để bộ cài nhẹ)
  if (fs.existsSync(path.join(rootDir, 'tools'))) {
    extraResources.push({ from: path.join(rootDir, 'tools'), to: 'tools', filter: ['**/*'] });
  }
  if (fs.existsSync(path.join(rootDir, 'policy_templates'))) {
    extraResources.push({ from: path.join(rootDir, 'policy_templates'), to: 'policy_templates', filter: ['**/*'] });
  }
  if (fs.existsSync(path.join(rootDir, 'chromedriver.exe'))) {
    extraResources.push({ from: path.join(rootDir, 'chromedriver.exe'), to: 'chromedriver.exe' });
  }
  if (fs.existsSync(path.join(rootDir, 'assets'))) {
    extraResources.push({ from: path.join(rootDir, 'assets'), to: 'assets', filter: ['**/*'] });
  }

  const includeDrivers = process.argv.includes('--include-drivers') || process.env.INCLUDE_DRIVERS === 'true';
  if (includeDrivers && fs.existsSync(path.join(rootDir, 'drivers'))) {
    console.log('  -> Đã bật tùy chọn tích hợp thư mục drivers/ (Chromium Cores)');
    extraResources.push({ from: path.join(rootDir, 'drivers'), to: 'drivers', filter: ['**/*'] });
  } else {
    console.log('  -> Thư mục drivers/ (1.2GB) được giữ ngoài gói để bộ cài siêu nhẹ (~80MB)');
    console.log('     (Người dùng có thể tải driver tự động qua nút bấm trong ứng dụng hoặc copy thư mục drivers cạnh file .exe)');
  }

  const builderConfig = {
    appId: "com.svbrowser.app",
    productName: "SV Browser",
    directories: {
      app: stagingDir,
      output: distDir
    },
    asar: true,
    extraResources: extraResources,
    win: {
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
      target: [
        {
          target: "nsis",
          arch: ["x64"]
        },
        {
          target: "portable",
          arch: ["x64"]
        }
      ]
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: "SV Browser"
    },
    portable: {
      artifactName: "SV Browser ${version} Portable.exe"
    }
  };

  console.log('\n[Bước 4/4] Bắt đầu đóng gói Windows (.exe)... Vui lòng đợi trong giây lát...');
  const buildResult = await builder.build({
    config: builderConfig
  });

  console.log('\n====================================================');
  console.log('  ĐÓNG GÓI HOÀN TẤT THÀNH CÔNG!                      ');
  console.log('====================================================');
  for (const artifact of buildResult) {
    console.log(`  -> Tạo thành công: ${artifact}`);
  }

  // Dọn dẹp staging folder
  console.log('\nĐang dọn dẹp thư mục staging...');
  cleanDir(stagingDir);

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`Tổng thời gian thực thi: ${durationSec}s`);
}

run().catch((err) => {
  console.error('\n[LỖI ĐÓNG GÓI]:', err);
  process.exit(1);
});
