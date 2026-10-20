/**
 * SV Browser API Documentation Generator
 * Tự động sinh trang tài liệu hướng dẫn API tương tác tại http://localhost:8725/
 * Hỗ trợ tra cứu toàn bộ endpoint GET, POST, PUT, DELETE kèm nút Sao chép JSON 1-click.
 */

const ENDPOINTS_DATA = [
  // ==========================================
  // 1. QUẢN LÝ PROFILES (PROFILES)
  // ==========================================
  {
    id: 'profiles-list',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'GET',
    path: '/api/v1/profiles',
    title: 'Lấy danh sách Profile (Phân trang & Tìm kiếm)',
    description: 'Truy vấn danh sách toàn bộ profile đã lưu. Hỗ trợ tìm kiếm theo tên, phân trang, lọc theo nhóm (group_id), lọc theo thẻ (tag_id), sắp xếp theo tên hoặc thời gian.',
    params: [
      { name: 'page', type: 'number', in: 'query', required: false, default: '1', desc: 'Trang hiện tại (Mặc định: 1)' },
      { name: 'page_size', type: 'number', in: 'query', required: false, default: '30', desc: 'Số lượng profile mỗi trang (Mặc định: 30)' },
      { name: 'search', type: 'string', in: 'query', required: false, default: '', desc: 'Từ khóa tìm kiếm theo tên profile' },
      { name: 'group_id', type: 'string', in: 'query', required: false, default: '', desc: 'Lọc theo ID hoặc tên nhóm profile' },
      { name: 'tag_id', type: 'string', in: 'query', required: false, default: '', desc: 'Lọc theo thẻ (Tag)' },
      { name: 'sort', type: 'string', in: 'query', required: false, default: 'custom', desc: 'Sắp xếp: name_asc, name_desc, custom, updated_at' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: {
        current_page: 1,
        per_page: 30,
        total: 56,
        last_page: 2,
        data: [
          {
            id: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
            name: "Profile 001",
            group_id: "Default group",
            raw_proxy: "136.162.249.147:3128:user:pass",
            proxy: "136.162.249.147:3128:user:pass",
            browser: { name: "chrome", version: "132.0.6834.83" },
            os: "windows",
            note: "Tài khoản nuôi chính",
            tags: ["fb", "mmo"],
            status: "ready",
            created_at: "2026-10-15T08:30:00.000Z",
            updated_at: "2026-10-16T12:00:00.000Z"
          }
        ]
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-get-one',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'GET',
    path: '/api/v1/profiles/{id}',
    title: 'Lấy thông tin chi tiết 1 Profile',
    description: 'Truy vấn chi tiết thông số cấu hình của một profile dựa theo UUID của profile.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: '8eda4c94-689b-45f3-9bfa-4b5c3b86c537', desc: 'UUID của profile cần lấy thông tin' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: {
        id: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        name: "Profile 001",
        group_id: "Default group",
        storage_path: "D:\\Phần mềm\\GPMLoginGlobal-v1\\profiles_data\\8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        raw_proxy: "136.162.249.147:3128:user:pass",
        browser: { name: "chrome", version: "132.0.6834.83" },
        os: "windows",
        note: "Tài khoản nuôi chính",
        status: "ready",
        port: null,
        remote_debugging_port: null,
        remote_debugging_address: null,
        websocket_debugging_url: null,
        tags: ["fb", "mmo"],
        created_at: "2026-10-15T08:30:00.000Z",
        updated_at: "2026-10-16T12:00:00.000Z"
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-create',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'POST',
    path: '/api/v1/profiles/create',
    title: 'Tạo Profile mới (Fingerprint, Proxy, Canvas, WebGL)',
    description: 'Tạo một profile trình duyệt hoàn toàn mới với các thông số vân tay chống phát hiện (Fingerprint) hoặc chỉ định proxy và cấu hình mong muốn. Có thể dùng POST /api/v1/profiles.',
    params: [],
    requestBody: {
      name: "Profile Nuôi Facebook 01",
      group_name: "Default group",
      raw_proxy: "136.162.249.147:3128:username:password",
      proxy_type: "http",
      browser_type: "chrome",
      browser_version: "132",
      os: "win",
      canvas: "noise",
      audio: "noise",
      webgl: "noise",
      webgl_vendor: "Google Inc. (NVIDIA)",
      webgl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      start_url: "https://www.google.com",
      note: "Nick chính",
      tags: ["facebook", "ads"]
    },
    responseBody: {
      success: true,
      data: {
        id: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        name: "Profile Nuôi Facebook 01",
        proxy: "136.162.249.147:3128:username:password",
        raw_proxy: "136.162.249.147:3128:username:password",
        status: "ready"
      },
      message: "Tạo profile thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-update',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'POST',
    path: '/api/v1/profiles/update/{id}',
    title: 'Cập nhật Profile (Đổi tên, Proxy, Ghi chú, Tags)',
    description: 'Cập nhật các trường cấu hình của profile. Hỗ trợ cả phương thức PUT /api/v1/profiles/{id}. Trường raw_proxy nhận dạng ip:port hoặc ip:port:user:pass.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: '8eda4c94-689b-45f3-9bfa-4b5c3b86c537', desc: 'UUID của profile cần cập nhật' }
    ],
    requestBody: {
      name: "Profile 001 - Đã đổi Proxy",
      raw_proxy: "136.162.249.147:3128:new_user:new_pass",
      note: "Đã cập nhật proxy xoay mới",
      tags: ["verified", "vip"],
      browser_type: "chrome"
    },
    responseBody: {
      success: true,
      data: {
        id: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        name: "Profile 001 - Đã đổi Proxy",
        raw_proxy: "136.162.249.147:3128:new_user:new_pass",
        proxy: "136.162.249.147:3128:new_user:new_pass",
        note: "Đã cập nhật proxy xoay mới",
        tags: ["verified", "vip"],
        updatedAt: 1760713000000
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-start',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'GET',
    path: '/api/v1/profiles/start/{id}',
    title: 'Khởi chạy Profile (Mở Chrome + Trả về WebSocket DevTools & Port)',
    description: 'Mở cửa sổ trình duyệt cho profile. Hỗ trợ truyền Proxy động qua query/body (ghi đè lúc chạy mà không làm hỏng cấu hình gốc), cờ vị trí cửa sổ, kích thước và tham số khởi động Chromium.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: '8eda4c94-689b-45f3-9bfa-4b5c3b86c537', desc: 'UUID của profile cần khởi chạy' },
      { name: 'proxy', type: 'string', in: 'query/body', required: false, default: '', desc: 'Proxy động ghi đè lúc chạy (dạng host:port hoặc host:port:user:pass)' },
      { name: 'win_size', type: 'string', in: 'query/body', required: false, default: '1280,720', desc: 'Kích thước cửa sổ (Ví dụ: 1280,720 hoặc 960,1080)' },
      { name: 'win_pos', type: 'string', in: 'query/body', required: false, default: '0,0', desc: 'Tọa độ cửa sổ (Ví dụ: 0,0 hoặc 960,0)' },
      { name: 'win_scale', type: 'number', in: 'query/body', required: false, default: '0.8', desc: 'Tỉ lệ zoom cửa sổ (Ví dụ: 0.8 hoặc 1.0)' },
      { name: 'skip_proxy_check', type: 'boolean', in: 'query/body', required: false, default: 'false', desc: 'Bỏ qua bước test proxy trước khi mở (true / false)' },
      { name: 'add_args', type: 'string', in: 'query/body', required: false, default: '', desc: 'Tham số dòng lệnh bổ sung truyền vào Chrome (Ví dụ: --disable-notifications)' }
    ],
    requestBody: {
      proxy: "136.162.249.147:3128:user:pass",
      win_size: "1280,720",
      win_pos: "100,50",
      win_scale: 0.8,
      skip_proxy_check: false,
      add_args: "--disable-notifications"
    },
    responseBody: {
      success: true,
      data: {
        profile_id: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        remote_debugging_port: 52341,
        remote_debugging_address: "127.0.0.1:52341",
        websocket_debugging_url: "ws://127.0.0.1:52341/devtools/browser/7f83a45c-2041-4822-a541-11928421b021",
        browser_location: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        driver_path: "D:\\Phần mềm\\GPMLoginGlobal-v1\\chromedriver.exe"
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-start-incognito',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'GET',
    path: '/api/v1/profiles/start-incognito/{id}',
    title: 'Khởi chạy Profile ở chế độ ẩn danh (Incognito)',
    description: 'Mở profile với cờ --incognito của Chrome, không lưu lại lịch sử duyệt web sau phiên làm việc.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: '8eda4c94-689b-45f3-9bfa-4b5c3b86c537', desc: 'UUID của profile' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: {
        profile_id: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        remote_debugging_port: 52342,
        remote_debugging_address: "127.0.0.1:52342",
        websocket_debugging_url: "ws://127.0.0.1:52342/devtools/browser/3b75c12e",
        incognito: true
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-close',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'GET',
    path: '/api/v1/profiles/close/{id}',
    title: 'Đóng Profile đang chạy (Hỗ trợ cả /stop/{id})',
    description: 'Tắt cửa sổ trình duyệt và giải phóng cổng kết nối DevTools / WebDriver của profile.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: '8eda4c94-689b-45f3-9bfa-4b5c3b86c537', desc: 'UUID của profile cần đóng' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: null,
      message: "Đã đóng profile thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-delete',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'DELETE',
    path: '/api/v1/profiles/delete/{id}',
    title: 'Xóa Profile (Thùng rác hoặc Vĩnh viễn)',
    description: 'Xóa profile. Mặc định là xóa vĩnh viễn (hard). Thêm tham số query mode=soft nếu muốn chuyển profile vào Thùng rác để có thể khôi phục sau.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: '8eda4c94-689b-45f3-9bfa-4b5c3b86c537', desc: 'UUID của profile cần xóa' },
      { name: 'mode', type: 'string', in: 'query', required: false, default: 'hard', desc: '"soft" (Thùng rác) hoặc "hard" (Xóa vĩnh viễn)' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: null,
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-update-note',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'POST',
    path: '/api/v1/profiles/update-note/{id}',
    title: 'Cập nhật nhanh Ghi chú Profile',
    description: 'Chỉ cập nhật nội dung ghi chú (note) của profile mà không ảnh hưởng đến các thông số khác.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: '8eda4c94-689b-45f3-9bfa-4b5c3b86c537', desc: 'UUID của profile' }
    ],
    requestBody: {
      note: "Tài khoản đã đổi pass ngày 17/10/2026"
    },
    responseBody: {
      success: true,
      data: {
        id: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        note: "Tài khoản đã đổi pass ngày 17/10/2026"
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-update-tags',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'POST',
    path: '/api/v1/profiles/update-tags/{id}',
    title: 'Gán / Sửa Thẻ (Tags) cho Profile',
    description: 'Cập nhật mảng danh sách thẻ (tags) cho profile để phân loại và quản lý.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: '8eda4c94-689b-45f3-9bfa-4b5c3b86c537', desc: 'UUID của profile' }
    ],
    requestBody: {
      tags: ["tiktok", "us", "verified", "clone"]
    },
    responseBody: {
      success: true,
      data: {
        id: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        tags: ["tiktok", "us", "verified", "clone"]
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-free-disk-one',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'GET',
    path: '/api/v1/profiles/free-disk/{id}',
    title: 'Giải phóng dung lượng 1 Profile (Bảo toàn 100% Cookie & Tiện ích)',
    description: 'Dọn dẹp triệt để bộ nhớ đệm rác (HTTP Cache, Code Cache, Shader Cache, Crash Dumps, Logs) giúp giảm 50% - 65% dung lượng ổ đĩa. Bảo toàn tuyệt đối 100% Cookie, Mật khẩu, Tài khoản đã đăng nhập và Tiện ích mở rộng. Hỗ trợ cả POST /api/v1/profiles/free-disk/{id} và /api/v1/profiles/clear-cache/{id}.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: '8eda4c94-689b-45f3-9bfa-4b5c3b86c537', desc: 'UUID của profile cần dọn dẹp' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: {
        profileId: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        name: "Profile 001",
        beforeBytes: 337641472,
        afterBytes: 141123584,
        freedBytes: 196517888,
        freedMB: "187.42",
        message: "Đã giải phóng 187.42 MB (Đã bảo toàn Cookie & Tiện ích)"
      },
      message: "Đã giải phóng 187.42 MB (Đã bảo toàn Cookie & Tiện ích)",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-free-disk-bulk',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'POST',
    path: '/api/v1/profiles/free-disk',
    title: 'Giải phóng dung lượng hàng loạt (Bulk Free Disk Space)',
    description: 'Dọn dẹp giải phóng dung lượng đồng thời cho nhiều profile theo danh sách UUID. Tự động bỏ qua các profile đang mở để đảm bảo an toàn tuyệt đối.',
    params: [],
    requestBody: {
      ids: [
        "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
        "2fe9f80c-ac88-4eae-893b-190d4bd19720",
        "01a28893-d232-4a1d-8cec-867d4577946a"
      ]
    },
    responseBody: {
      success: true,
      data: {
        count: 3,
        skippedRunning: 0,
        totalFreedBytes: 589553664,
        totalFreedMB: "562.24",
        message: "Đã giải phóng thành công 562.24 MB trên 3 profile (Đã bảo toàn Cookie & Tiện ích)"
      },
      message: "Đã giải phóng thành công 562.24 MB trên 3 profile (Đã bảo toàn Cookie & Tiện ích)",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'profiles-active',
    category: 'profiles',
    categoryName: 'Quản lý Profile',
    method: 'GET',
    path: '/api/v1/profiles/active',
    title: 'Lấy danh sách Profile đang chạy (Active / Opened)',
    description: 'Truy vấn danh sách tất cả các profile hiện đang mở trên màn hình, kèm theo thông tin cổng DevTools Debugging Port của từng profile.',
    params: [],
    requestBody: null,
    responseBody: {
      success: true,
      data: [
        {
          id: "8eda4c94-689b-45f3-9bfa-4b5c3b86c537",
          name: "Profile 001",
          port: 52341,
          debug_port: 52341,
          remote_debugging_address: "127.0.0.1:52341",
          websocket_debugging_url: "ws://127.0.0.1:52341/devtools/browser/abc-123"
        }
      ],
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },

  // ==========================================
  // 2. QUẢN LÝ PROXIES (PROXIES)
  // ==========================================
  {
    id: 'proxies-list',
    category: 'proxies',
    categoryName: 'Quản lý Proxy',
    method: 'GET',
    path: '/api/v1/proxies',
    title: 'Lấy danh sách Proxy đã lưu',
    description: 'Truy vấn toàn bộ kho proxy đã lưu trên ứng dụng SV Browser, kèm thông tin trạng thái Live/Die và IP kiểm tra.',
    params: [
      { name: 'page', type: 'number', in: 'query', required: false, default: '1', desc: 'Trang hiện tại' },
      { name: 'page_size', type: 'number', in: 'query', required: false, default: '30', desc: 'Số lượng proxy trên mỗi trang' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: {
        total: 10,
        page: 1,
        page_size: 30,
        items: [
          {
            id: "proxy_1760710000_abc",
            host: "136.162.249.147",
            port: 3128,
            user: "username",
            pass: "password",
            type: "http",
            status: "Live",
            country: "us",
            ip: "136.162.249.147",
            note: "Proxy US xoay",
            tags: ["us", "residential"]
          }
        ]
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'proxies-get-one',
    category: 'proxies',
    categoryName: 'Quản lý Proxy',
    method: 'GET',
    path: '/api/v1/proxies/{id}',
    title: 'Lấy thông tin chi tiết 1 Proxy',
    description: 'Truy vấn thông số cấu hình và trạng thái của 1 proxy theo ID.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: 'proxy_1760710000_abc', desc: 'ID của proxy' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: {
        id: "proxy_1760710000_abc",
        host: "136.162.249.147",
        port: 3128,
        user: "username",
        pass: "password",
        type: "http",
        status: "Live",
        country: "us",
        ip: "136.162.249.147",
        note: "Proxy US xoay",
        tags: ["us"]
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'proxies-create',
    category: 'proxies',
    categoryName: 'Quản lý Proxy',
    method: 'POST',
    path: '/api/v1/proxies/create',
    title: 'Thêm Proxy mới vào kho',
    description: 'Thêm proxy mới vào kho lưu trữ của phần mềm. Hỗ trợ truyền từng trường riêng lẻ hoặc truyền chuỗi proxy dạng host:port:user:pass.',
    params: [],
    requestBody: {
      host: "136.162.249.147",
      port: 3128,
      user: "proxy_username",
      pass: "proxy_password",
      type: "http",
      note: "Proxy US dân cư",
      tags: ["us", "residential"]
    },
    responseBody: {
      success: true,
      data: {
        id: "proxy_1760710000_abc",
        host: "136.162.249.147",
        port: 3128,
        type: "http"
      },
      message: "Thêm proxy thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'proxies-update',
    category: 'proxies',
    categoryName: 'Quản lý Proxy',
    method: 'POST',
    path: '/api/v1/proxies/update/{id}',
    title: 'Cập nhật Proxy (Hỗ trợ cả PUT /api/v1/proxies/{id})',
    description: 'Cập nhật địa chỉ IP, cổng Port, tài khoản, mật khẩu, loại proxy (http/socks5) hoặc ghi chú của proxy.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: 'proxy_1760710000_abc', desc: 'ID của proxy cần cập nhật' }
    ],
    requestBody: {
      host: "136.162.249.148",
      port: 1080,
      user: "new_username",
      pass: "new_password",
      type: "socks5",
      note: "Đã chuyển sang SOCKS5"
    },
    responseBody: {
      success: true,
      data: {
        id: "proxy_1760710000_abc",
        host: "136.162.249.148",
        port: 1080,
        type: "socks5"
      },
      message: "Cập nhật proxy thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'proxies-delete',
    category: 'proxies',
    categoryName: 'Quản lý Proxy',
    method: 'DELETE',
    path: '/api/v1/proxies/delete/{id}',
    title: 'Xóa Proxy khỏi hệ thống',
    description: 'Xóa bỏ proxy đã lưu theo ID. Cũng hỗ trợ phương thức DELETE /api/v1/proxies/{id}.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: 'proxy_1760710000_abc', desc: 'ID của proxy cần xóa' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: null,
      message: "Đã xóa proxy thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'proxies-check',
    category: 'proxies',
    categoryName: 'Quản lý Proxy',
    method: 'GET',
    path: '/api/v1/proxies/check/{id}',
    title: 'Kiểm tra kết nối Proxy (Live / Die)',
    description: 'Gửi yêu cầu kiểm tra thực tế xem proxy có online không, lấy IP outbound và quốc gia.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: 'proxy_1760710000_abc', desc: 'ID của proxy cần kiểm tra' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: {
        id: "proxy_1760710000_abc",
        live: true,
        status: "Live",
        ip: "136.162.249.147",
        country: "us"
      },
      message: "Proxy hoạt động tốt (Live)",
      sender: "SV Browser v5.0.8-stable"
    }
  },

  // ==========================================
  // 3. QUẢN LÝ NHÓM (GROUPS)
  // ==========================================
  {
    id: 'groups-list',
    category: 'groups',
    categoryName: 'Quản lý Nhóm',
    method: 'GET',
    path: '/api/v1/groups',
    title: 'Lấy danh sách các Nhóm Profile',
    description: 'Truy vấn danh sách nhóm profile, kèm số lượng profile hiện có trong từng nhóm.',
    params: [
      { name: 'page', type: 'number', in: 'query', required: false, default: '1', desc: 'Trang' },
      { name: 'page_size', type: 'number', in: 'query', required: false, default: '30', desc: 'Kích thước trang' },
      { name: 'search', type: 'string', in: 'query', required: false, default: '', desc: 'Tìm theo tên nhóm' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: {
        total: 3,
        page: 1,
        page_size: 30,
        items: [
          { id: "group_default", name: "Default group", total_profiles: 45 },
          { id: "group_fb", name: "Facebook Ads", total_profiles: 10 },
          { id: "group_tiktok", name: "TikTok MMO", total_profiles: 5 }
        ]
      },
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'groups-create',
    category: 'groups',
    categoryName: 'Quản lý Nhóm',
    method: 'POST',
    path: '/api/v1/groups/create',
    title: 'Tạo Nhóm Profile mới',
    description: 'Tạo một nhóm mới để gom và phân loại các profile.',
    params: [],
    requestBody: {
      name: "Nhóm Nuôi Shopee"
    },
    responseBody: {
      success: true,
      data: {
        id: "group_1760712000",
        name: "Nhóm Nuôi Shopee"
      },
      message: "Tạo nhóm thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'groups-update',
    category: 'groups',
    categoryName: 'Quản lý Nhóm',
    method: 'POST',
    path: '/api/v1/groups/update/{id}',
    title: 'Đổi tên Nhóm Profile',
    description: 'Cập nhật lại tên của một nhóm profile. Cũng hỗ trợ phương thức PUT /api/v1/groups/{id}.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: 'group_1760712000', desc: 'ID hoặc tên nhóm cần sửa' }
    ],
    requestBody: {
      name: "Nhóm Nuôi Shopee VIP"
    },
    responseBody: {
      success: true,
      data: {
        id: "group_1760712000",
        name: "Nhóm Nuôi Shopee VIP"
      },
      message: "Cập nhật nhóm thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'groups-delete',
    category: 'groups',
    categoryName: 'Quản lý Nhóm',
    method: 'DELETE',
    path: '/api/v1/groups/delete/{id}',
    title: 'Xóa Nhóm Profile',
    description: 'Xóa nhóm profile. Các profile thuộc nhóm này sẽ tự động được chuyển về nhóm mặc định.',
    params: [
      { name: 'id', type: 'string', in: 'path', required: true, default: 'group_1760712000', desc: 'ID hoặc tên nhóm cần xóa' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: null,
      message: "Đã xóa nhóm thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },

  // ==========================================
  // 4. QUẢN LÝ THẺ (TAGS)
  // ==========================================
  {
    id: 'tags-list',
    category: 'tags',
    categoryName: 'Quản lý Thẻ (Tags)',
    method: 'GET',
    path: '/api/v1/tags',
    title: 'Lấy danh sách tất cả Thẻ (Tags)',
    description: 'Lấy toàn bộ các thẻ đã tạo trong ứng dụng để phân loại hồ sơ hoặc proxy.',
    params: [],
    requestBody: null,
    responseBody: {
      success: true,
      data: [
        { id: "tag_fb", name: "facebook", color: "#3b82f6" },
        { id: "tag_mmo", name: "mmo", color: "#10b981" },
        { id: "tag_vip", name: "vip", color: "#f59e0b" }
      ],
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'tags-create',
    category: 'tags',
    categoryName: 'Quản lý Thẻ (Tags)',
    method: 'POST',
    path: '/api/v1/tags/create',
    title: 'Tạo Thẻ (Tag) mới',
    description: 'Tạo thẻ tag mới để gán cho profile hoặc proxy.',
    params: [],
    requestBody: {
      name: "automation"
    },
    responseBody: {
      success: true,
      data: {
        id: "tag_1760713000",
        name: "automation"
      },
      message: "Tạo tag thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },

  // ==========================================
  // 5. TIỆN ÍCH MỞ RỘNG (EXTENSIONS)
  // ==========================================
  {
    id: 'extensions-list',
    category: 'extensions',
    categoryName: 'Tiện ích mở rộng',
    method: 'GET',
    path: '/api/v1/extensions',
    title: 'Lấy danh sách Tiện ích mở rộng toàn cục',
    description: 'Truy vấn danh sách các extension được cài đặt toàn cục trong SV Browser.',
    params: [],
    requestBody: null,
    responseBody: {
      success: true,
      data: [
        {
          id: "Bookmarks_Quick_Search",
          name: "Bookmarks Quick Search",
          enabled: true,
          is_active: true
        }
      ],
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'extensions-toggle',
    category: 'extensions',
    categoryName: 'Tiện ích mở rộng',
    method: 'POST',
    path: '/api/v1/extensions/update-state',
    title: 'Bật / Tắt Tiện ích mở rộng toàn cục',
    description: 'Bật hoặc tắt extension toàn cục khi khởi chạy các profile.',
    params: [],
    requestBody: {
      id: "Bookmarks_Quick_Search",
      enabled: true
    },
    responseBody: {
      success: true,
      data: {
        id: "Bookmarks_Quick_Search",
        enabled: true
      },
      message: "Cập nhật trạng thái extension thành công",
      sender: "SV Browser v5.0.8-stable"
    }
  },

  // ==========================================
  // 6. TRÌNH DUYỆT & HỆ THỐNG (BROWSERS)
  // ==========================================
  {
    id: 'browsers-versions',
    category: 'browsers',
    categoryName: 'Trình duyệt & Hệ thống',
    method: 'GET',
    path: '/api/v1/browsers/versions',
    title: 'Lấy danh sách các nhân Chromium Core có sẵn',
    description: 'Lấy danh sách các phiên bản Chromium Core nội bộ và trình duyệt được cài đặt trên máy.',
    params: [],
    requestBody: null,
    responseBody: {
      success: true,
      data: [
        {
          name: "ChromiumCore_v153",
          version: "153.0.7922.76",
          majorVersion: "153",
          path: "D:\\Phần mềm\\GPMLoginGlobal-v1\\drivers\\ChromiumCore_v153\\Chrome-bin\\chrome.exe"
        },
        {
          name: "Google Chrome",
          version: "132.0.6834.83",
          majorVersion: "132",
          path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        }
      ],
      message: "OK",
      sender: "SV Browser v5.0.8-stable"
    }
  },
  {
    id: 'system-ping',
    category: 'browsers',
    categoryName: 'Trình duyệt & Hệ thống',
    method: 'GET',
    path: '/',
    title: 'Kiểm tra trạng thái máy chủ (Ping Server)',
    description: 'Kiểm tra API server SV Browser có đang hoạt động trên cổng 8725 hay không. Thêm query format=json để nhận JSON thay vì trang tài liệu HTML.',
    params: [
      { name: 'format', type: 'string', in: 'query', required: false, default: 'json', desc: 'Truyền format=json để nhận dữ liệu JSON' }
    ],
    requestBody: null,
    responseBody: {
      success: true,
      data: "SV Browser API",
      message: null,
      sender: "SV Browser v5.0.8-stable"
    }
  }
];

function getApiDocsHtml(host = '127.0.0.1:8725') {
  const baseUrl = `http://${host}`;
  const totalEndpoints = ENDPOINTS_DATA.length;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SV Browser API - Tài liệu hướng dẫn lập trình & Tương tác</title>
  <style>
    :root, [data-theme="dark"] {
      --bg-main: #0b0f19;
      --bg-card: #111827;
      --bg-sub: #1e293b;
      --border-color: #1f2937;
      --border-light: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #0ea5e9;
      --accent-hover: #0284c7;
      --code-bg: #070a12;
      --code-header-bg: #141b2d;
      --header-bg: rgba(11, 15, 25, 0.94);
      --body-bg-tint: rgba(15, 23, 42, 0.4);
      
      --color-get: #10b981;
      --bg-get: rgba(16, 185, 129, 0.12);
      --border-get: rgba(16, 185, 129, 0.35);

      --color-post: #3b82f6;
      --bg-post: rgba(59, 130, 246, 0.12);
      --border-post: rgba(59, 130, 246, 0.35);

      --color-put: #f59e0b;
      --bg-put: rgba(245, 158, 11, 0.12);
      --border-put: rgba(245, 158, 11, 0.35);

      --color-delete: #ef4444;
      --bg-delete: rgba(239, 68, 68, 0.12);
      --border-delete: rgba(239, 68, 68, 0.35);
    }

    [data-theme="light"] {
      --bg-main: #f8fafc;
      --bg-card: #ffffff;
      --bg-sub: #f1f5f9;
      --border-color: #e2e8f0;
      --border-light: #cbd5e1;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --accent: #0284c7;
      --accent-hover: #0369a1;
      --code-bg: #0f172a;
      --code-header-bg: #1e293b;
      --header-bg: rgba(255, 255, 255, 0.95);
      --body-bg-tint: rgba(241, 245, 249, 0.85);

      --color-get: #059669;
      --bg-get: rgba(16, 185, 129, 0.1);
      --border-get: rgba(16, 185, 129, 0.3);

      --color-post: #2563eb;
      --bg-post: rgba(59, 130, 246, 0.1);
      --border-post: rgba(59, 130, 246, 0.3);

      --color-put: #d97706;
      --bg-put: rgba(245, 158, 11, 0.1);
      --border-put: rgba(245, 158, 11, 0.3);

      --color-delete: #dc2626;
      --bg-delete: rgba(239, 68, 68, 0.1);
      --border-delete: rgba(239, 68, 68, 0.3);
    }

    [data-theme="ocean"] {
      --bg-main: #06152b;
      --bg-card: #0c2340;
      --bg-sub: #133358;
      --border-color: #1a4576;
      --border-light: #245c9c;
      --text-main: #f0f7ff;
      --text-muted: #93c5fd;
      --accent: #38bdf8;
      --accent-hover: #0ea5e9;
      --code-bg: #040e1d;
      --code-header-bg: #0d2747;
      --header-bg: rgba(6, 21, 43, 0.94);
      --body-bg-tint: rgba(12, 35, 64, 0.4);

      --color-get: #10b981;
      --bg-get: rgba(16, 185, 129, 0.15);
      --border-get: rgba(16, 185, 129, 0.35);

      --color-post: #38bdf8;
      --bg-post: rgba(56, 189, 248, 0.15);
      --border-post: rgba(56, 189, 248, 0.35);

      --color-put: #fbbf24;
      --bg-put: rgba(251, 191, 36, 0.15);
      --border-put: rgba(251, 191, 36, 0.35);

      --color-delete: #f87171;
      --bg-delete: rgba(248, 113, 113, 0.15);
      --border-delete: rgba(248, 113, 113, 0.35);
    }

    [data-theme="dracula"] {
      --bg-main: #14121e;
      --bg-card: #1f1b2e;
      --bg-sub: #2e2844;
      --border-color: #3e365b;
      --border-light: #5a4e84;
      --text-main: #f5f3ff;
      --text-muted: #c4b5fd;
      --accent: #bd93f9;
      --accent-hover: #ff79c6;
      --code-bg: #0d0c14;
      --code-header-bg: #221d33;
      --header-bg: rgba(20, 18, 30, 0.94);
      --body-bg-tint: rgba(31, 27, 46, 0.4);

      --color-get: #50fa7b;
      --bg-get: rgba(80, 250, 123, 0.15);
      --border-get: rgba(80, 250, 123, 0.35);

      --color-post: #8be9fd;
      --bg-post: rgba(139, 233, 253, 0.15);
      --border-post: rgba(139, 233, 253, 0.35);

      --color-put: #ffb86c;
      --bg-put: rgba(255, 184, 108, 0.15);
      --border-put: rgba(255, 184, 108, 0.35);

      --color-delete: #ff5555;
      --bg-delete: rgba(255, 85, 85, 0.15);
      --border-delete: rgba(255, 85, 85, 0.35);
    }

    [data-theme="emerald"] {
      --bg-main: #061913;
      --bg-card: #0c2b21;
      --bg-sub: #133e30;
      --border-color: #1a5542;
      --border-light: #25785d;
      --text-main: #ecfdf5;
      --text-muted: #86efac;
      --accent: #10b981;
      --accent-hover: #34d399;
      --code-bg: #03110d;
      --code-header-bg: #0f3327;
      --header-bg: rgba(6, 25, 19, 0.94);
      --body-bg-tint: rgba(12, 43, 33, 0.4);

      --color-get: #10b981;
      --bg-get: rgba(16, 185, 129, 0.15);
      --border-get: rgba(16, 185, 129, 0.35);

      --color-post: #34d399;
      --bg-post: rgba(52, 211, 153, 0.15);
      --border-post: rgba(52, 211, 153, 0.35);

      --color-put: #f59e0b;
      --bg-put: rgba(245, 158, 11, 0.15);
      --border-put: rgba(245, 158, 11, 0.35);

      --color-delete: #ef4444;
      --bg-delete: rgba(239, 68, 68, 0.15);
      --border-delete: rgba(239, 68, 68, 0.35);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      line-height: 1.5;
      font-size: 14px;
    }

    /* Top Sticky Header */
    header.top-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--header-bg);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      padding: 12px 24px;
    }
    .header-content {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
      color: #fff;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
    }
    .brand-title h1 {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 8px;
      border-radius: 12px;
    }
    .dot-pulse {
      width: 7px;
      height: 7px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
    }

    /* Theme Switcher Styles */
    .theme-control-container {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      padding: 5px 12px;
      border-radius: 8px;
    }
    .theme-title {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .theme-select-input {
      background: var(--bg-sub);
      color: var(--text-main);
      border: 1px solid var(--border-light);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      outline: none;
      transition: border-color 0.15s;
    }
    .theme-select-input:focus {
      border-color: var(--accent);
    }
    .theme-color-dots {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 4px;
    }
    .color-dot {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      padding: 0;
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .color-dot:hover {
      transform: scale(1.25);
    }
    .color-dot.active {
      border-color: #fff;
      box-shadow: 0 0 0 1.5px var(--accent);
    }
    .dot-dark { background: #0b0f19; border: 1px solid #475569; }
    .dot-light { background: #ffffff; border: 1px solid #94a3b8; }
    .dot-ocean { background: #0ea5e9; }
    .dot-dracula { background: #bd93f9; }
    .dot-emerald { background: #10b981; }

    .base-url-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 13px;
    }
    .base-url-text {
      color: #38bdf8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
    }
    .btn-action-small {
      background: var(--bg-sub);
      color: var(--text-main);
      border: 1px solid var(--border-light);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-action-small:hover {
      background: var(--border-light);
      color: var(--text-main);
    }

    /* Sub Toolbar: Search & Filters */
    .toolbar-bar {
      max-width: 1400px;
      margin: 20px auto 0;
      padding: 0 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .search-box {
      flex: 1;
      min-width: 280px;
      position: relative;
    }
    .search-input {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 10px 16px 10px 38px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .pill-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .pill-btn:hover {
      color: var(--text-main);
      background: var(--bg-sub);
    }
    .pill-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
      box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
    }

    /* Category Navigation */
    .category-nav {
      max-width: 1400px;
      margin: 14px auto 0;
      padding: 0 24px;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    .cat-btn {
      white-space: nowrap;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .cat-btn:hover {
      color: var(--text-main);
      background: var(--bg-sub);
    }
    .cat-btn.active {
      color: var(--accent);
      background: rgba(14, 165, 233, 0.12);
      border-color: var(--accent);
      font-weight: 600;
    }

    /* Main Container */
    main.main-content {
      max-width: 1400px;
      margin: 20px auto 60px;
      padding: 0 24px;
    }
    .stats-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-muted);
      font-size: 12px;
      margin-bottom: 16px;
      padding: 0 4px;
    }

    /* Endpoint Card */
    .endpoint-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      margin-bottom: 14px;
      overflow: hidden;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .endpoint-card:hover {
      border-color: var(--border-light);
    }
    .endpoint-card.border-GET:hover { border-color: var(--color-get); }
    .endpoint-card.border-POST:hover { border-color: var(--color-post); }
    .endpoint-card.border-PUT:hover { border-color: var(--color-put); }
    .endpoint-card.border-DELETE:hover { border-color: var(--color-delete); }

    .endpoint-header {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      cursor: pointer;
      user-select: none;
    }
    .endpoint-main {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      flex: 1;
    }
    .method-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 800;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      min-width: 65px;
      text-align: center;
    }
    .badge-GET { background: var(--bg-get); color: var(--color-get); border: 1px solid var(--border-get); }
    .badge-POST { background: var(--bg-post); color: var(--color-post); border: 1px solid var(--border-post); }
    .badge-PUT { background: var(--bg-put); color: var(--color-put); border: 1px solid var(--border-put); }
    .badge-DELETE { background: var(--bg-delete); color: var(--color-delete); border: 1px solid var(--border-delete); }

    .endpoint-path {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }
    .endpoint-path span.param {
      color: #38bdf8;
      font-weight: 700;
    }
    .endpoint-title {
      color: var(--text-muted);
      font-size: 13px;
      margin-left: 6px;
    }
    .chevron-icon {
      color: var(--text-muted);
      font-size: 16px;
      transition: transform 0.2s;
    }
    .endpoint-card.open .chevron-icon {
      transform: rotate(180deg);
    }

    /* Endpoint Body Details */
    .endpoint-body {
      display: none;
      padding: 16px 20px 22px;
      border-top: 1px solid var(--border-color);
      background: var(--body-bg-tint);
    }
    .endpoint-card.open .endpoint-body {
      display: block;
    }

    .desc-text {
      color: var(--text-muted);
      font-size: 13.5px;
      margin-bottom: 18px;
      line-height: 1.6;
    }

    /* Params Table */
    .params-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .params-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: var(--bg-card);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .params-table th, .params-table td {
      padding: 8px 12px;
      text-align: left;
      font-size: 12.5px;
      border-bottom: 1px solid var(--border-color);
    }
    .params-table th {
      background: var(--bg-sub);
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .params-table tr:last-child td { border-bottom: none; }
    .param-name {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: #38bdf8;
    }
    .param-type {
      color: #a855f7;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
    }
    .param-required {
      color: #ef4444;
      font-size: 11px;
      font-weight: 700;
    }
    .param-optional {
      color: #64748b;
      font-size: 11px;
    }

    /* Code Box Container */
    .code-box-wrapper {
      margin-bottom: 16px;
    }
    .code-box {
      background: var(--code-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .code-header {
      background: var(--code-header-bg);
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
    }
    .code-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-copy {
      background: var(--bg-sub);
      color: #e2e8f0;
      border: 1px solid var(--border-light);
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .btn-copy:hover {
      background: #334155;
      color: #fff;
    }
    .btn-copy.copied {
      background: #065f46;
      border-color: #059669;
      color: #34d399;
    }

    pre.code-block {
      padding: 12px 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12.5px;
      color: #e2e8f0;
      overflow-x: auto;
      white-space: pre;
      line-height: 1.5;
    }

    /* Footer */
    footer.page-footer {
      border-top: 1px solid var(--border-color);
      padding: 24px;
      text-align: center;
      color: var(--text-muted);
      font-size: 12.5px;
      background: var(--bg-main);
    }
    footer a { color: var(--accent); text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    /* Toast Notification */
    #toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #10b981;
      color: #fff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
      display: none;
      align-items: center;
      gap: 8px;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header class="top-header">
    <div class="header-content">
      <div class="brand">
        <div class="brand-logo">SV</div>
        <div class="brand-title">
          <h1>
            SV Browser API Documentation
            <span class="badge-status"><span class="dot-pulse"></span> Online :8725</span>
          </h1>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <!-- Theme Switcher (Đổi màu) -->
        <div class="theme-control-container">
          <span class="theme-title">🎨 Đổi màu:</span>
          <select id="theme-select" class="theme-select-input" onchange="switchTheme(this.value)" title="Chọn giao diện màu">
            <option value="dark">🌙 Tối (Mặc định)</option>
            <option value="light">☀️ Sáng (Light)</option>
            <option value="ocean">🌊 Xanh Biển</option>
            <option value="dracula">🔮 Tím Cyber</option>
            <option value="emerald">🌲 Xanh Ngọc</option>
          </select>
          <div class="theme-color-dots">
            <button type="button" class="color-dot dot-dark" title="Giao diện Tối" onclick="switchTheme('dark')"></button>
            <button type="button" class="color-dot dot-light" title="Giao diện Sáng" onclick="switchTheme('light')"></button>
            <button type="button" class="color-dot dot-ocean" title="Xanh Biển" onclick="switchTheme('ocean')"></button>
            <button type="button" class="color-dot dot-dracula" title="Tím Cyber" onclick="switchTheme('dracula')"></button>
            <button type="button" class="color-dot dot-emerald" title="Xanh Ngọc" onclick="switchTheme('emerald')"></button>
          </div>
        </div>

        <div class="base-url-box">
          <span style="color: var(--text-muted);">Base URL:</span>
          <span class="base-url-text" id="base-url-display">${baseUrl}</span>
          <button class="btn-action-small" onclick="copyBaseUrl()" title="Sao chép Base URL">📋 Sao chép</button>
        </div>

        <a href="https://svbrowser.site" target="_blank" rel="noopener noreferrer" class="btn-action-small" style="color: var(--accent); font-weight: 600;" title="Trang chủ & Tài liệu online">
          🌐 svbrowser.site ↗
        </a>

        <button class="btn-action-small" onclick="toggleAllCards()" id="btn-toggle-all">Mở tất cả ⌵</button>
      </div>
    </div>
  </header>

  <!-- Toolbar: Search & Methods Filters -->
  <div class="toolbar-bar">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" id="search-input" placeholder="Tìm kiếm endpoint, đường dẫn (URL), từ khóa (start, proxy, update, delete)..." oninput="handleSearch()">
    </div>

    <div class="filter-group">
      <button class="pill-btn active" data-method="ALL" onclick="filterByMethod('ALL', this)">TẤT CẢ (${totalEndpoints})</button>
      <button class="pill-btn" data-method="GET" onclick="filterByMethod('GET', this)">GET</button>
      <button class="pill-btn" data-method="POST" onclick="filterByMethod('POST', this)">POST</button>
      <button class="pill-btn" data-method="PUT" onclick="filterByMethod('PUT', this)">PUT</button>
      <button class="pill-btn" data-method="DELETE" onclick="filterByMethod('DELETE', this)">DELETE</button>
    </div>
  </div>

  <!-- Category Nav -->
  <div class="category-nav">
    <button class="cat-btn active" data-cat="all" onclick="filterByCategory('all', this)">⚡ Tất cả danh mục</button>
    <button class="cat-btn" data-cat="profiles" onclick="filterByCategory('profiles', this)">📁 Quản lý Profile (13)</button>
    <button class="cat-btn" data-cat="proxies" onclick="filterByCategory('proxies', this)">🌐 Quản lý Proxy (6)</button>
    <button class="cat-btn" data-cat="groups" onclick="filterByCategory('groups', this)">📂 Quản lý Nhóm (4)</button>
    <button class="cat-btn" data-cat="tags" onclick="filterByCategory('tags', this)">🏷️ Thẻ Tags (2)</button>
    <button class="cat-btn" data-cat="extensions" onclick="filterByCategory('extensions', this)">🧩 Tiện ích Extensions (2)</button>
    <button class="cat-btn" data-cat="browsers" onclick="filterByCategory('browsers', this)">🖥️ Trình duyệt & Ping (2)</button>
  </div>

  <!-- Main Content -->
  <main class="main-content">
    <div class="stats-summary">
      <span id="filtered-count">Hiển thị ${totalEndpoints} / ${totalEndpoints} endpoints</span>
      <span>Chuẩn tương thích hoàn toàn GPMLogin Global API & SV Browser v5.0.8</span>
    </div>

    <div id="endpoints-container">
      ${ENDPOINTS_DATA.map((ep, idx) => renderEndpointCard(ep, idx, baseUrl)).join('\n')}
    </div>
  </main>

  <footer class="page-footer">
    <p>SV Browser Automation Server API &bull; Cổng dịch vụ HTTP: <strong>8725</strong></p>
    <p style="margin-top: 6px; font-size: 11.5px;">Bản quyền &copy; 2026 SV Browser Team. Tài liệu hướng dẫn lập trình kết nối bot / tool automation.</p>
  </footer>

  <!-- Toast -->
  <div id="toast-notification">✓ Đã sao chép vào bộ nhớ tạm!</div>

  <script>
    const BASE_URL = '${baseUrl}';
    let currentMethodFilter = 'ALL';
    let currentCategoryFilter = 'all';

    function toggleCard(cardHeader) {
      const card = cardHeader.closest('.endpoint-card');
      card.classList.toggle('open');
    }

    let allOpened = false;
    function toggleAllCards() {
      allOpened = !allOpened;
      document.querySelectorAll('.endpoint-card').forEach(card => {
        if (allOpened) card.classList.add('open');
        else card.classList.remove('open');
      });
      document.getElementById('btn-toggle-all').innerText = allOpened ? 'Thu gọn tất cả ⌃' : 'Mở tất cả ⌵';
    }

    function copySnippet(btn) {
      const codeBlock = btn.closest('.code-box').querySelector('pre.code-block');
      const textToCopy = codeBlock.innerText.trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Đã chép!';
        btn.classList.add('copied');
        showToast('Đã sao chép JSON vào clipboard!');
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('copied');
        }, 2000);
      });
    }

    function copyBaseUrl() {
      navigator.clipboard.writeText(BASE_URL).then(() => {
        showToast('Đã sao chép Base URL: ' + BASE_URL);
      });
    }

    function showToast(msg) {
      const toast = document.getElementById('toast-notification');
      toast.innerText = msg;
      toast.style.display = 'flex';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 2500);
    }

    function filterByMethod(method, btn) {
      currentMethodFilter = method;
      document.querySelectorAll('.filter-group .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    }

    function filterByCategory(cat, btn) {
      currentCategoryFilter = cat;
      document.querySelectorAll('.category-nav .cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    }

    function handleSearch() {
      applyFilters();
    }

    function applyFilters() {
      const query = document.getElementById('search-input').value.toLowerCase().trim();
      const cards = document.querySelectorAll('.endpoint-card');
      let visibleCount = 0;

      cards.forEach(card => {
        const method = card.getAttribute('data-method');
        const category = card.getAttribute('data-category');
        const searchableText = card.getAttribute('data-search');

        const matchesMethod = (currentMethodFilter === 'ALL' || method === currentMethodFilter);
        const matchesCategory = (currentCategoryFilter === 'all' || category === currentCategoryFilter);
        const matchesQuery = !query || searchableText.includes(query);

        if (matchesMethod && matchesCategory && matchesQuery) {
          card.style.display = 'block';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      document.getElementById('filtered-count').innerText = 'Hiển thị ' + visibleCount + ' / ' + cards.length + ' endpoints';
    }

    function switchTheme(themeName) {
      document.documentElement.setAttribute('data-theme', themeName);
      try {
        localStorage.setItem('sv_api_theme', themeName);
      } catch (e) {}

      const sel = document.getElementById('theme-select');
      if (sel && sel.value !== themeName) {
        sel.value = themeName;
      }

      document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.toggle('active', dot.classList.contains('dot-' + themeName));
      });
    }

    // Khởi tạo theme ban đầu từ localStorage
    try {
      const savedTheme = localStorage.getItem('sv_api_theme') || 'dark';
      switchTheme(savedTheme);
    } catch (e) {}
  </script>
</body>
</html>`;
}

function renderEndpointCard(ep, idx, baseUrl) {
  const methodClass = `badge-${ep.method}`;
  const borderClass = `border-${ep.method}`;
  const isOpen = idx === 0 ? 'open' : '';

  // Render path with highlighted parameters {id}
  const formattedPath = ep.path.replace(/\{([^}]+)\}/g, '<span class="param">{$1}</span>');

  // Generate Curl command sample
  const curlCmd = generateCurl(ep, baseUrl);

  const searchableText = `${ep.method} ${ep.path} ${ep.title} ${ep.description} ${ep.categoryName}`.toLowerCase();

  return `
    <div class="endpoint-card ${borderClass} ${isOpen}" id="card-${ep.id}" data-method="${ep.method}" data-category="${ep.category}" data-search="${escapeHtml(searchableText)}">
      <div class="endpoint-header" onclick="toggleCard(this)">
        <div class="endpoint-main">
          <span class="method-badge ${methodClass}">${ep.method}</span>
          <span class="endpoint-path">${formattedPath}</span>
          <span class="endpoint-title">&bull; ${escapeHtml(ep.title)}</span>
        </div>
        <div class="chevron-icon">⌵</div>
      </div>

      <div class="endpoint-body">
        <p class="desc-text">${escapeHtml(ep.description)}</p>

        <!-- Parameters Table -->
        ${ep.params && ep.params.length > 0 ? `
          <div class="params-title">📌 Danh sách tham số (Parameters)</div>
          <table class="params-table">
            <thead>
              <tr>
                <th style="width: 180px;">Tên tham số</th>
                <th style="width: 100px;">Vị trí</th>
                <th style="width: 100px;">Kiểu</th>
                <th style="width: 100px;">Bắt buộc</th>
                <th>Mô tả chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${ep.params.map(p => `
                <tr>
                  <td><span class="param-name">${escapeHtml(p.name)}</span></td>
                  <td><span style="color: #cbd5e1;">${escapeHtml(p.in)}</span></td>
                  <td><span class="param-type">${escapeHtml(p.type)}</span></td>
                  <td>${p.required ? '<span class="param-required">BẮT BUỘC</span>' : '<span class="param-optional">Tùy chọn</span>'}</td>
                  <td>${escapeHtml(p.desc)}${p.default ? ` <em>(Mặc định: <code>${escapeHtml(p.default)}</code>)</em>` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <!-- Request Body JSON (If exists) -->
        ${ep.requestBody ? `
          <div class="code-box-wrapper">
            <div class="code-box">
              <div class="code-header">
                <span class="code-label">📤 REQUEST BODY (JSON)</span>
                <button type="button" class="btn-copy" onclick="copySnippet(this)">📋 Sao chép JSON</button>
              </div>
              <pre class="code-block"><code>${escapeHtml(JSON.stringify(ep.requestBody, null, 2))}</code></pre>
            </div>
          </div>
        ` : ''}

        <!-- Response Body JSON -->
        ${ep.responseBody ? `
          <div class="code-box-wrapper">
            <div class="code-box">
              <div class="code-header">
                <span class="code-label">📥 PHẢN HỒI MẪU (RESPONSE 200 OK)</span>
                <button type="button" class="btn-copy" onclick="copySnippet(this)">📋 Sao chép JSON</button>
              </div>
              <pre class="code-block"><code>${escapeHtml(JSON.stringify(ep.responseBody, null, 2))}</code></pre>
            </div>
          </div>
        ` : ''}

        <!-- cURL Sample -->
        <div class="code-box-wrapper">
          <div class="code-box">
            <div class="code-header">
              <span class="code-label">💻 VÍ DỤ LỆNH cURL</span>
              <button type="button" class="btn-copy" onclick="copySnippet(this)">📋 Sao chép cURL</button>
            </div>
            <pre class="code-block"><code>${escapeHtml(curlCmd)}</code></pre>
          </div>
        </div>

      </div>
    </div>
  `;
}

function generateCurl(ep, baseUrl) {
  let samplePath = ep.path.replace('{id}', '8eda4c94-689b-45f3-9bfa-4b5c3b86c537');
  const fullUrl = `${baseUrl}${samplePath}`;

  if (ep.method === 'GET') {
    return `curl -X GET "${fullUrl}"`;
  }
  if (ep.method === 'DELETE') {
    return `curl -X DELETE "${fullUrl}"`;
  }
  if (ep.requestBody) {
    const jsonStr = JSON.stringify(ep.requestBody, null, 2).replace(/"/g, '\\"');
    return `curl -X ${ep.method} "${fullUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d "${jsonStr}"`;
  }
  return `curl -X ${ep.method} "${fullUrl}"`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  getApiDocsHtml,
  ENDPOINTS_DATA
};
