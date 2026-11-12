# Phát hành để ứng dụng nhận cập nhật

## Repository

- Mã nguồn/workflow: `thevien1/SV-Browser-Source`.
- Bộ cài và metadata cập nhật công khai: `thevien1/SV-Browser`.
- Nhánh phát triển Mac: `codex/macos-build`.

## Thiết lập một lần

Trong **SV-Browser-Source → Settings → Secrets and variables → Actions**, thêm repository secret `RELEASE_TOKEN`: token GitHub có quyền **Contents: Read and write** với repository `thevien1/SV-Browser`. Token mặc định của Actions chỉ có quyền với repository nguồn, không thể phát hành sang repository bộ cài. Không đưa token vào mã nguồn hoặc gửi qua chat.

Để Mac tự cài cập nhật, cần chứng chỉ **Developer ID Application** của Apple và các secret:

- `MAC_CSC_LINK`: chứng chỉ `.p12` dạng Base64.
- `MAC_CSC_KEY_PASSWORD`: mật khẩu `.p12`.
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`: thông tin notarization.

Thiếu chứng chỉ, vẫn build được bản Mac thử nghiệm chưa ký, nhưng không hỗ trợ tự cài cập nhật. Muốn dùng tự cập nhật trên Mac, phải cài bản đã ký lần đầu vào `/Applications`.

## Mỗi lần phát hành

Sau khi đưa các thay đổi vào nhánh dùng phát hành, mở Terminal trong dự án:

```sh
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "Release new version"
git push origin HEAD
```

Xem version trong `package.json`; ví dụ nếu là `1.0.54`:

```sh
git tag v1.0.54
git push origin v1.0.54
```

Tag phải khớp chính xác version trong package.json. Workflow **Publish app update** kiểm thử, build Windows và hai kiến trúc Mac, rồi tạo release nháp tại `SV-Browser`. Chỉ khi tải đủ file thành công mới chuyển release sang công khai và đánh dấu Latest. Nếu tag đã có release, dùng version mới; workflow không thay thế bản đã phát hành.

## File cần giữ cùng nhau

- Windows: Setup `.exe`, `.exe.blockmap`, `latest.yml`; Portable là bản tải riêng.
- Mac: `.dmg`, `.zip` cho cả `arm64`/`x64` và **một** `latest-mac.yml` đã gộp metadata hai kiến trúc. Không lấy YAML của một kiến trúc ghi đè kiến trúc còn lại.
- Workflow tự gộp và tải các file này, giữ nguyên tên và checksum.

## Thao tác trong ứng dụng

App kiểm tra khi mở. Sau khi publish, bấm **Chi tiết → Kiểm tra lại** nếu app đã mở từ trước, rồi bấm **Cập nhật ngay**. Windows phải dùng bản Setup; Mac phải dùng bản đã ký. Ứng dụng giữ Chromium trong thư mục dữ liệu người dùng trước khi cài lại và khởi động lại. Bản Portable không tự cập nhật.

## Tải bản Mac thử nghiệm

Workflow **Build macOS** chạy khi đẩy nhánh `codex/macos-build`, thử hai profile Chrome đồng thời trên máy Mac Intel và Apple Silicon. Kết quả thành công tạo release `mac-v<version>` ngay tại repository nguồn. Đây là release thử nghiệm để tải thủ công, không phải nguồn cập nhật của app.
