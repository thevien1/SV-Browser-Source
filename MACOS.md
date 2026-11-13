# Build macOS

Trên Mac cài Node.js 22, mở Terminal tại thư mục dự án:

```sh
npm ci
npm run build:mac
```

Bộ cài DMG và ZIP nằm trong `dist-mac/arm64` (Apple Silicon) hoặc `dist-mac/x64` (Intel). Lệnh này giữ nguyên phiên bản để khớp bản Windows. Không đóng gói các core Windows vào bản Mac.

Có thể chạy workflow **Build macOS** trong GitHub Actions sau khi đưa mã nguồn lên repository. Đẩy nhánh `codex/macos-build` sẽ tự chạy workflow. Workflow thử chạy hai profile Chrome đồng thời trên từng kiến trúc, tạo artifact và đăng DMG/ZIP trong release `mac-v<version>` của chính repository nguồn. Không đăng mã hoặc bộ cài sang repository khác. Kết quả từng kiến trúc được ghi vào nhánh `codex/macos-result-arm64` và `codex/macos-result-x64` để có thể kiểm tra qua SSH.

Bản mặc định chưa ký Developer ID và chưa notarize; để phân phối công khai cần cấu hình chứng chỉ Apple, notarization và kiểm thử thực tế trên cả hai kiến trúc.

Ứng dụng phát hiện Chrome cài trong `/Applications` hoặc `~/Applications`, và tải core macOS theo downloadUrl do API https://api.svbrowser.site/api/v1/updates/cores cung cấp. Có thể tạo nhiều profile Chrome với thư mục dữ liệu riêng. Core Chrome/Chromium `.exe` của Windows không dùng được trên Mac. Gói core phải chứa Chromium.app đã build đúng kiến trúc; ZIP mã nguồn không thể cài làm trình duyệt.

Đã kiểm thử trên GitHub macOS runners Intel và Apple Silicon: hai profile Chrome đồng thời qua CDP; ứng dụng đóng gói mở được, preload hoạt động, bảng profile và phiên bản hiển thị. Chưa kiểm thử tương tác đầy đủ trên Mac của người dùng. Bản chưa ký vẫn kiểm tra release Mac và cho tải DMG mới; người dùng mở DMG để thay app trong Applications. Tự cài lại qua Squirrel.Mac chỉ bật cho bản ký Developer ID; xem RELEASE_GUIDE.md. Tích hợp Automate Editor và tùy biến biểu tượng/taskbar của Windows chưa hỗ trợ trên Mac. Selenium cần chromedriver macOS tương ứng đặt trong thư mục drivers; CDP dùng cổng debug của Chrome. Không dùng lại thư mục profile đang mở đồng thời trên hai máy.
