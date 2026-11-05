# Cập nhật SV Browser và giữ Chromium

- Dùng electron-updater với GitHub Releases `thevien1/SV-Browser`. Bản Setup tự tải cập nhật nền, có tiến độ. Bấm Cập nhật là tải phần còn lại (nếu có), giữ lại Chromium, cài im lặng và mở lại. Không hỏi xác nhận lần hai.
- Không hiển thị release notes dài hoặc HTML thô trong bảng cập nhật.
- Chromium tải mới luôn lưu tại `app.getPath('userData')/SVBrowserData/drivers`, thông thường `%APPDATA%/sv-browser/SVBrowserData/drivers`, nằm ngoài thư mục cài đặt. Không đổi tên package `sv-browser` hay vị trí này tùy tiện.
- `driverStorage.js` sao chép core cũ từ resources/drivers và drivers cạnh exe sang nơi lưu bền vững, không xóa nguồn, không ghi đè file đã có. App launcher tìm trong nơi lưu bền vững trước.
- Trước cập nhật, sao chép core phải thành công; lỗi như hết dung lượng sẽ chặn cài đặt.
- `scripts/preserve-drivers.nsh` chạy customInit trước uninstaller cũ, sao chép core tại InstallLocation đã đăng ký. Điều này bảo vệ cả lần nâng cấp đầu từ bản cũ còn lưu Chromium trong resources. Không bỏ hook này khi đổi script đóng gói.
- Bản portable chưa hỗ trợ tự cập nhật. Giữ nguyên hồ sơ và cấu hình người dùng.

## Build và phát hành

`npm run build` tự tăng patch version và tạo Setup/Portable trong `dist/`. Build script phải đóng gói cả `appUpdater.js`, `driverStorage.js` và dependencies production của electron-updater; cấu hình publish tạo app-update.yml và latest.yml, không tự upload khi build.

Mỗi GitHub Release ổn định mới phải có Setup `.exe`, `.exe.blockmap` và `latest.yml` từ cùng lần build, giữ nguyên tên file. Portable là tùy chọn. Script upload-release.js đã bổ sung metadata và blockmap; chỉ chạy upload khi được người dùng yêu cầu.

## Kiểm tra

`node --test scripts/test-update.cjs` kiểm tra giữ core khi thư mục cài cũ bị xóa, không ghi đè bản đã bảo lưu, cập nhật một lần bấm và không cài nếu giữ core thất bại.

Trước phát hành rộng, kiểm thử nâng cấp từ Setup cũ sang mới trên Windows với core đã tải và profile thật. Kiểm thử tự động dùng dữ liệu tạm, không thay thế một phiên nâng cấp thực tế. Core đã bị xóa ở các lần cập nhật trước không thể khôi phục từ không có dữ liệu nguồn.
