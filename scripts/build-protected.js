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
const macBuild = process.argv.includes('--mac');
const distDir = path.join(rootDir, macBuild ? 'dist-mac' : 'dist');

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
  if (path.resolve(dir) !== stagingDir) throw new Error('Unsafe staging cleanup path');
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
  if (macBuild && process.platform !== 'darwin') throw Error('Build macOS cần chạy trên máy Mac. Dùng workflow build-macos trên GitHub Actions hoặc npm run build:mac trên Mac.');
  console.log('====================================================');
  console.log('  SV BROWSER - BẮT ĐẦU ĐÓNG GÓI & BẢO VỆ MÃ NGUỒN  ');
  console.log('====================================================\n');

  const startTime = Date.now();

  // Tự động tăng số phiên bản lên 1 (ví dụ: 1.0.1 -> 1.0.2)
  const pkgPath = path.join(rootDir, 'package.json');
  const rootPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldVer = rootPkg.version || "1.0.1";
  const verParts = oldVer.split('.');
  if (process.argv.includes('--no-bump')) {
    // Reuse the release version when building a second platform.
  } else if (verParts.length >= 3 && !isNaN(parseInt(verParts[verParts.length - 1], 10))) {
    verParts[verParts.length - 1] = parseInt(verParts[verParts.length - 1], 10) + 1;
  } else {
    verParts.push(1);
  }
  const appVersion = verParts.join('.');
  rootPkg.version = appVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(rootPkg, null, 2), 'utf8');
  console.log(`[Phiên bản mới]: Tự động tăng phiên bản: v${oldVer} -> v${appVersion}\n`);

  // 1. Dọn dẹp thư mục staging & các file build cũ trong dist
  console.log('[Bước 1/4] Chuẩn bị thư mục staging & xóa sạch bản build cũ trong dist...');
  cleanDir(stagingDir);
  fs.mkdirSync(stagingDir, { recursive: true });

  // Tự động xóa sạch các file cài đặt / portable cũ trong dist/ để tránh tích tụ tăng dần dung lượng sau mỗi lần build
  if (fs.existsSync(distDir)) {
    try {
      const distFiles = fs.readdirSync(distDir);
      for (const f of distFiles) {
        if (f.endsWith('.exe') || f.endsWith('.blockmap') || f.endsWith('.zip')) {
          const fp = path.join(distDir, f);
          try {
            fs.unlinkSync(fp);
            console.log(`  ✓ Đã xóa file build cũ: ${f}`);
          } catch (delErr) {
            console.warn(`  ! Không thể xóa file cũ ${f}:`, delErr.message);
          }
        }
      }
    } catch (e) {}
  }

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
    'macBrowser.js',
    'appUpdater.js',
    'driverStorage.js',
    'licenseManager.js',
    'browserLauncher.js',
    'profileStore.js',
    'proxyStore.js',
    'proxyChecker.js',
    'extensionStore.js',
    'gpmApiServer.js',
    'apiDocsTemplate.js',
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
  const helperFiles = ['generate_icon.ps1', 'taskbar_helper.ps1', 'dpapi_helper.ps1'];
  for (const hf of helperFiles) {
    const src = path.join(rootDir, hf);
    const srcTools = path.join(rootDir, 'tools', hf);
    const srcScripts = path.join(rootDir, 'scripts', hf);
    const actualSrc = fs.existsSync(src) ? src : (fs.existsSync(srcTools) ? srcTools : (fs.existsSync(srcScripts) ? srcScripts : null));
    if (actualSrc) {
      fs.copyFileSync(actualSrc, path.join(stagingDir, hf));
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
    version: appVersion,
    description: "SV Browser Antidetect Multi-Browser Profile Manager",
    main: "main.js",
    dependencies: rootPkg.dependencies,
    author: "SV Browser Team"
  };
  if (macBuild) appPkg.macAutoUpdateSigned = Boolean(process.env.CSC_LINK);
  fs.writeFileSync(path.join(stagingDir, 'package.json'), JSON.stringify(appPkg, null, 2), 'utf8');

  require('child_process').execSync(`${process.platform === 'win32' ? 'npm.cmd' : 'npm'} install --omit=dev --ignore-scripts --no-audit --no-fund`, { cwd: stagingDir, stdio: 'inherit' });

  console.log('\n[Bước 3/4] Cấu hình Electron Builder đóng gói...');

  // Chuẩn bị danh sách extraResources
  const extraResources = [];

  // KHÔNG đóng gói thư mục Extensions vào bộ cài (người dùng tự thêm hoặc tải theo nhu cầu để bộ cài nhẹ)
  if (!macBuild && fs.existsSync(path.join(rootDir, 'tools'))) {
    extraResources.push({ from: path.join(rootDir, 'tools'), to: 'tools', filter: ['**/*'] });
  }
  if (fs.existsSync(path.join(rootDir, 'policy_templates'))) {
    extraResources.push({ from: path.join(rootDir, 'policy_templates'), to: 'policy_templates', filter: ['**/*'] });
  }
  if (!macBuild && fs.existsSync(path.join(rootDir, 'chromedriver.exe'))) {
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
    publish: [{ provider: "github", owner: "thevien1", repo: "SV-Browser", releaseType: "release" }],
    nsis: {
      artifactName: "SV-Browser-Setup-${version}.${ext}",
      include: path.join(rootDir, "scripts", "preserve-drivers.nsh"),
      deleteAppDataOnUninstall: false,
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: "SV Browser"
    },
    portable: {
      artifactName: "SV-Browser-${version}-Portable.exe"
    }
  };

  console.log('\n[Bước 4/4] Bắt đầu đóng gói Windows (.exe)... Vui lòng đợi trong giây lát...');
  if (macBuild) {
    delete builderConfig.win;
    delete builderConfig.nsis;
    delete builderConfig.portable;
    builderConfig.mac = {
      category: 'public.app-category.productivity',
      target: ['dmg', 'zip'],
      artifactName: 'SV-Browser-${version}-mac-${arch}.${ext}',
      ...(process.env.CSC_LINK ? {
        hardenedRuntime: true,
        entitlements: path.join(rootDir, 'scripts', 'entitlements.mac.plist'),
        entitlementsInherit: path.join(rootDir, 'scripts', 'entitlements.mac.plist'),
        notarize: true
      } : { identity: null })
    };
    if (process.env.CSC_LINK) builderConfig.forceCodeSigning = true;
    // Keep per-architecture updater metadata separate.
    builderConfig.directories.output = path.join(distDir, process.arch);
  }
  const buildResult = await builder.build({
    publish: "never",
    ...(macBuild ? { targets: builder.Platform.MAC.createTarget(['dmg', 'zip'], process.arch === 'arm64' ? builder.Arch.arm64 : builder.Arch.x64) } : {}),
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
