/**
 * Component: PlaceholderViewComponent
 * Hiển thị giao diện cho các mục như Nhóm, Proxy, Extensions, Automation... khi người dùng bấm vào trên sidebar
 */

export class PlaceholderViewComponent {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('view-placeholder');
  }

  async show(tabName, displayName, description = '') {
    if (!this.container) return;

    if (tabName === 'automation') {
      await this.showAutomationView(displayName);
      return;
    }

    if (tabName === 'developer') {
      await this.showDeveloperDocsView(displayName);
      return;
    }

    if (tabName === 'about') {
      this.container.innerHTML = `
        <div style="padding: 30px; display: flex; flex-direction: column; gap: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">Giới thiệu SV Browser</h2>
            <span style="font-size: 12px; background: #ecfdf5; color: #059669; padding: 3px 10px; border-radius: 12px; font-weight: 600;">Bản quyền chính thức</span>
          </div>

          <p style="color: var(--text-muted); font-size: 13.5px; max-width: 650px; line-height: 1.6;">
            <strong>SV Browser</strong> là giải pháp quản lý đa hồ sơ trình duyệt (Antidetect Browser) & Tự động hóa chuyên nghiệp, bảo vệ vân tay số và phục vụ quy trình làm việc hiệu suất cao.
          </p>

          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 24px; max-width: 700px; display: flex; flex-direction: column; gap: 14px;">
            <div style="font-weight: 600; font-size: 15px; color: var(--text-main); margin-bottom: 4px;">🌐 Kênh Chính Thức & Cổng Quản Trị</div>
            
            <div style="display: flex; align-items: center; gap: 10px; font-size: 13.5px;">
              <span style="color: var(--text-muted); width: 150px;">Trang chủ chính thức:</span>
              <a href="https://svbrowser.site" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: none;">https://svbrowser.site</a>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; font-size: 13.5px;">
              <span style="color: var(--text-muted); width: 150px;">Cổng Quản Lý Bản Quyền:</span>
              <a href="https://manager.svbrowser.site" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: none;">https://manager.svbrowser.site</a>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; font-size: 13.5px;">
              <span style="color: var(--text-muted); width: 150px;">Hệ thống API:</span>
              <span style="color: var(--text-main); font-family: monospace;">https://api.svbrowser.site</span>
            </div>

            <div style="margin-top: 10px; padding-top: 14px; border-top: 1px solid var(--border-color); display: flex; gap: 12px;">
              <button class="btn btn-primary" onclick="window.sidebarComp?.setActiveTab('profiles'); window.appSwitchTab?.('profiles');">
                ← Quay lại Quản lý Profiles
              </button>
              <a href="https://manager.svbrowser.site" target="_blank" class="btn btn-outline" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; color: #0284c7;">
                🔑 Quản lý bản quyền online
              </a>
            </div>
          </div>
        </div>
      `;
      this.container.style.display = 'flex';
      return;
    }

    this.container.innerHTML = `
      <div style="padding: 30px; display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">${displayName}</h2>
          <span style="font-size: 12px; background: #eff6ff; color: #0284c7; padding: 3px 10px; border-radius: 12px; font-weight: 600;">Sẵn sàng</span>
        </div>

        <p style="color: var(--text-muted); font-size: 13.5px; max-width: 650px;">
          ${description || `Khu vực quản lý ${displayName}. Tại đây bạn có thể cấu hình các thông số nâng cao hoặc kết nối dữ liệu cho profile trình duyệt.`}
        </p>

        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 24px; max-width: 700px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">Trạng thái hệ thống</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 15px;">
            Mô-đun đang hoạt động ổn định và sẵn sàng đồng bộ với engine Chromium/Chrome-bin.
          </div>
          <button class="btn btn-primary" onclick="window.sidebarComp?.setActiveTab('profiles'); window.appSwitchTab?.('profiles');">
            ← Quay lại Quản lý Profiles
          </button>
        </div>
      </div>
    `;
    this.container.style.display = 'flex';
  }

  async showAutomationView(displayName) {
    this.container.style.display = 'flex';

    // Hiển thị trạng thái đang kiểm tra
    this.container.innerHTML = `
      <div style="padding: 30px; display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">${displayName || 'SV Browser Automate Editor'}</h2>
          <span style="font-size: 12px; background: #f1f5f9; color: #64748b; padding: 3px 10px; border-radius: 12px; font-weight: 600;">Đang kiểm tra...</span>
        </div>
        <div style="color: var(--text-muted); font-size: 13.5px;">Đang kiểm tra phần mềm SV Browser Automate Editor trên máy...</div>
      </div>
    `;

    let info = { installed: false, targetPath: 'D:\\Phần mềm\\GPMAutomateEditor' };
    try {
      if (window.api && window.api.checkAutomateInstalled) {
        info = await window.api.checkAutomateInstalled();
      }
    } catch (e) {
      console.error('Lỗi check automate installed:', e);
    }

    if (info.installed) {
      // ĐÃ CÀI ĐẶT -> Tự động mở phần mềm lên
      try {
        if (window.api && window.api.launchAutomate) {
          const launchRes = await window.api.launchAutomate();
          if (launchRes && launchRes.success) {
            if (window.showGlobalToast) {
              window.showGlobalToast('🚀 Đang mở phần mềm SV Browser Automate Editor...');
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khởi chạy SV Browser Automate Editor:', err);
      }

      this.container.innerHTML = `
        <div style="padding: 30px; display: flex; flex-direction: column; gap: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">${displayName || 'SV Browser Automate Editor'}</h2>
            <span style="font-size: 12px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
              <span style="width: 7px; height: 7px; background: #10b981; border-radius: 50%; display: inline-block;"></span>
              Đã kết nối & Sẵn sàng
            </span>
          </div>

          <p style="color: var(--text-muted); font-size: 13.5px; max-width: 720px; line-height: 1.6;">
            <strong>SV Browser Automate Editor</strong> - Công cụ thiết kế và vận hành kịch bản tự động hóa trực quan (Visual Workflow Editor). Phần mềm tự động đồng bộ và điều khiển các profile SV Browser qua cổng API nội bộ (port 8725).
          </p>

          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 24px; max-width: 750px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="font-weight: 600; font-size: 14px; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                <span style="color: #10b981; font-size: 16px;">✔</span> Trạng thái phần mềm tự động hóa
              </div>
              <span style="font-size: 12px; color: #10b981; background: #ecfdf5; padding: 2px 8px; border-radius: 4px; font-weight: 500;">Sẵn sàng hoạt động</span>
            </div>

            <div style="background: var(--bg-main, #f8fafc); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px 14px; font-size: 13px; margin-bottom: 18px; color: var(--text-muted);">
              <div style="margin-bottom: 6px;"><strong>📁 Vị trí phần mềm:</strong> <code style="color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-size: 12.5px;">${info.path || 'D:\\Phần mềm\\GPMAutomateEditor'}</code></div>
              ${info.executable ? `<div style="margin-bottom: 6px;"><strong>⚡ File thực thi:</strong> <code style="color: #166534; background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-size: 12.5px;">${info.executable}</code></div>` : ''}
              <div><strong>🔗 Cổng kết nối API:</strong> Cổng <code>http://localhost:8725</code> đang mở sẵn sàng để Automate Editor điều khiển mở/đóng profiles.</div>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
              <button class="btn btn-primary" id="btn-relaunch-automate" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px;">
                🚀 Mở SV Browser Automate Editor
              </button>
              <button class="btn btn-outline" id="btn-open-folder-automate" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;">
                📁 Mở thư mục
              </button>
              <button class="btn btn-outline" id="btn-change-automate-path" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;">
                ⚙ Đổi đường dẫn...
              </button>
              <button class="btn btn-outline" id="btn-refresh-automate" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;">
                🔄 Quét lại
              </button>
              <button class="btn btn-outline" onclick="window.sidebarComp?.setActiveTab('profiles'); window.appSwitchTab?.('profiles');" style="margin-left: auto;">
                ← Quay lại Profiles
              </button>
            </div>
          </div>
        </div>
      `;

      this.container.querySelector('#btn-relaunch-automate')?.addEventListener('click', async () => {
        if (window.api && window.api.launchAutomate) {
          const res = await window.api.launchAutomate();
          if (res && res.success) {
            if (window.showGlobalToast) {
              window.showGlobalToast('🚀 Đang mở SV Browser Automate Editor...');
            }
          } else {
            alert('Không thể mở phần mềm: ' + (res?.error || 'Lỗi không xác định'));
          }
        }
      });

      this.container.querySelector('#btn-open-folder-automate')?.addEventListener('click', async () => {
        if (window.api && window.api.openAutomateFolder) {
          await window.api.openAutomateFolder();
        }
      });

      this.container.querySelector('#btn-change-automate-path')?.addEventListener('click', async () => {
        if (window.api && window.api.selectDirectory) {
          const selected = await window.api.selectDirectory(info.path || 'D:\\Phần mềm\\GPMAutomateEditor');
          if (selected && window.api.setAutomatePath) {
            await window.api.setAutomatePath(selected);
            await this.showAutomationView(displayName);
          }
        }
      });

      this.container.querySelector('#btn-refresh-automate')?.addEventListener('click', async () => {
        await this.showAutomationView(displayName);
      });

    } else {
      // CHƯA TÌM THẤY -> Cho phép chọn thư mục hoặc quét lại
      if (window.showGlobalToast) {
        window.showGlobalToast('⚠️ Chưa phát hiện SV Browser Automate Editor trên máy', true);
      }

      this.container.innerHTML = `
        <div style="padding: 30px; display: flex; flex-direction: column; gap: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">${displayName || 'SV Browser Automate Editor'}</h2>
            <span style="font-size: 12px; background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; padding: 3px 10px; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
              <span style="width: 7px; height: 7px; background: #e11d48; border-radius: 50%; display: inline-block;"></span>
              Chưa tìm thấy
            </span>
          </div>

          <p style="color: var(--text-muted); font-size: 13.5px; max-width: 720px; line-height: 1.6;">
            Khu vực quản lý Kịch bản Tự động hóa (Automation). Bạn cần cài đặt hoặc chỉ định thư mục chứa phần mềm <strong>SV Browser Automate Editor</strong> để thiết kế kịch bản kéo - thả cho trình duyệt.
          </p>

          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 24px; max-width: 750px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: #e11d48; font-weight: 600; font-size: 14px;">
              <span>⚠️</span> Chưa tìm thấy phần mềm tại: <code style="font-size: 13px; background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px;">${info.targetPath || 'D:\\Phần mềm\\GPMAutomateEditor'}</code>
            </div>

            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #1e40af; line-height: 1.6;">
              Nếu bạn đã có thư mục <strong>SV Browser Automate Editor</strong> (ví dụ: <code>D:\\Phần mềm\\GPMAutomateEditor</code>), vui lòng bấm nút <strong>"📁 Chọn thư mục phần mềm..."</strong> bên dưới để liên kết ngay.
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
              <button class="btn btn-primary" id="btn-select-automate-dir" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px;">
                📁 Chọn thư mục SV Browser Automate Editor...
              </button>
              <button class="btn btn-outline" id="btn-recheck-install" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; color: #0284c7;">
                🔄 Quét lại
              </button>
              <button class="btn btn-outline" onclick="window.sidebarComp?.setActiveTab('profiles'); window.appSwitchTab?.('profiles');" style="margin-left: auto;">
                ← Quay lại Profiles
              </button>
            </div>
          </div>
        </div>
      `;

      this.container.querySelector('#btn-select-automate-dir')?.addEventListener('click', async () => {
        if (window.api && window.api.selectDirectory) {
          const selected = await window.api.selectDirectory(info.targetPath || 'D:\\Phần mềm\\GPMAutomateEditor');
          if (selected && window.api.setAutomatePath) {
            await window.api.setAutomatePath(selected);
            await this.showAutomationView(displayName);
          }
        }
      });

      this.container.querySelector('#btn-recheck-install')?.addEventListener('click', async () => {
        await this.showAutomationView(displayName);
      });
    }
  }

  async showDeveloperDocsView(displayName) {
    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div style="padding: 30px; display: flex; flex-direction: column; gap: 24px; max-width: 1000px; width: 100%; box-sizing: border-box;">
        <!-- Header Title -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <h2 style="font-size: 22px; font-weight: 700; color: var(--text-main); margin: 0;">${displayName || 'Tài liệu Dành cho Lập trình viên (Developer)'}</h2>
            <span style="font-size: 12px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
              <span style="width: 7px; height: 7px; background: #10b981; border-radius: 50%; display: inline-block;"></span>
              Cổng API :8725 Sẵn sàng
            </span>
          </div>
          <button class="btn btn-outline" onclick="window.sidebarComp?.setActiveTab('profiles'); window.appSwitchTab?.('profiles');">
            ← Quay lại Quản lý Profiles
          </button>
        </div>

        <p style="color: var(--text-muted); font-size: 14px; line-height: 1.6; margin: 0;">
          SV Browser tích hợp sẵn cổng <strong>REST API Cục bộ (Port 8725)</strong> chuẩn xác theo đặc tả GPMLogin Global API. Hỗ trợ kết nối và điều khiển từ <strong>Python, C#, Node.js, Go</strong> cũng như các thư viện tự động hóa <strong>Selenium, Puppeteer, Playwright</strong>.
        </p>

        <!-- Main Action Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 18px;">
          
          <!-- Card 1: Local API Dashboard & Documentation -->
          <div style="background: var(--bg-card); border: 2px solid #0284c7; border-radius: 10px; padding: 22px; display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.1);">
            <div style="position: absolute; top: 0; right: 0; background: #0284c7; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 12px; border-bottom-left-radius: 8px; text-transform: uppercase;">
              Trực tiếp trên máy
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 44px; height: 44px; background: #e0f2fe; color: #0284c7; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold;">
                ⚡
              </div>
              <div>
                <div style="font-weight: 700; font-size: 16px; color: var(--text-main);">Tài liệu API Local (Interactive Docs)</div>
                <div style="font-size: 13px; color: #0284c7; font-family: monospace; font-weight: 600;">http://localhost:8725/</div>
              </div>
            </div>

            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0;">
              Tra cứu toàn bộ endpoint <strong>GET, POST, PUT, DELETE</strong>, nút <strong>Sao chép JSON 1-click</strong>, lệnh cURL, và tính năng <strong>Đổi màu giao diện</strong> ngay trên trình duyệt (hoạt động 100% offline).
            </p>

            <div style="display: flex; gap: 10px; margin-top: auto; padding-top: 10px;">
              <button class="btn btn-primary" id="btn-dev-open-local" style="display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; font-weight: 600;">
                🚀 Mở http://localhost:8725/
              </button>
              <button class="btn btn-outline" id="btn-dev-copy-local" style="display: inline-flex; align-items: center; gap: 5px; padding: 9px 14px; font-size: 12.5px;">
                📋 Copy Link
              </button>
            </div>
          </div>

          <!-- Card 2: Official Website & Online Documentation -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 22px; display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 44px; height: 44px; background: #ecfdf5; color: #059669; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px;">
                🌐
              </div>
              <div>
                <div style="font-weight: 700; font-size: 16px; color: var(--text-main);">Trang Chủ & Tài Liệu Online</div>
                <div style="font-size: 13px; color: #059669; font-family: monospace; font-weight: 600;">https://svbrowser.site/</div>
              </div>
            </div>

            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0;">
              Kênh chính thức của SV Browser: tra cứu tài liệu hướng dẫn online, tải bản cài đặt mới nhất, cập nhật phiên bản và hỗ trợ kỹ thuật trực tuyến.
            </p>

            <div style="display: flex; gap: 10px; margin-top: auto; padding-top: 10px;">
              <button class="btn btn-outline" id="btn-dev-open-online" style="display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; color: #059669; border-color: #a7f3d0; font-weight: 600;">
                🌐 Mở svbrowser.site ↗
              </button>
            </div>
          </div>

        </div>

        <!-- Quick API Cheat Sheet -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 22px;">
          <div style="font-weight: 700; font-size: 15px; color: var(--text-main); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <span>📌</span> Bảng tra cứu nhanh các Endpoint API phổ biến nhất:
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: var(--bg-sub, #f8fafc); border-bottom: 2px solid var(--border-color); text-align: left;">
                  <th style="padding: 10px 12px; font-weight: 600;">Phương thức</th>
                  <th style="padding: 10px 12px; font-weight: 600;">Đường dẫn (Endpoint)</th>
                  <th style="padding: 10px 12px; font-weight: 600;">Mô tả chức năng</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 9px 12px;"><span style="background: rgba(16,185,129,0.15); color: #059669; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">GET</span></td>
                  <td style="padding: 9px 12px;"><code style="color: #0284c7; font-weight: 600;">/api/v1/profiles</code></td>
                  <td style="padding: 9px 12px; color: var(--text-muted);">Lấy danh sách profiles (phân trang, tìm kiếm, lọc nhóm/tags)</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 9px 12px;"><span style="background: rgba(16,185,129,0.15); color: #059669; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">GET</span></td>
                  <td style="padding: 9px 12px;"><code style="color: #0284c7; font-weight: 600;">/api/v1/profiles/active</code></td>
                  <td style="padding: 9px 12px; color: var(--text-muted);">Lấy danh sách profile đang chạy kèm cổng debug và WebSocket URL</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 9px 12px;"><span style="background: rgba(16,185,129,0.15); color: #059669; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">GET</span></td>
                  <td style="padding: 9px 12px;"><code style="color: #0284c7; font-weight: 600;">/api/v1/profiles/start/{id}</code></td>
                  <td style="padding: 9px 12px; color: var(--text-muted);">Khởi chạy profile Chrome và trả về remote_debugging_port</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 9px 12px;"><span style="background: rgba(16,185,129,0.15); color: #059669; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">GET</span></td>
                  <td style="padding: 9px 12px;"><code style="color: #0284c7; font-weight: 600;">/api/v1/profiles/stop/{id}</code></td>
                  <td style="padding: 9px 12px; color: var(--text-muted);">Đóng profile Chrome theo ID</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 9px 12px;"><span style="background: rgba(59,130,246,0.15); color: #2563eb; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">POST</span></td>
                  <td style="padding: 9px 12px;"><code style="color: #0284c7; font-weight: 600;">/api/v1/profiles/create</code></td>
                  <td style="padding: 9px 12px; color: var(--text-muted);">Tạo profile mới (cấu hình tên, proxy, vân tay canvas/webgl)</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 9px 12px;"><span style="background: rgba(245,158,11,0.15); color: #d97706; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">PUT/POST</span></td>
                  <td style="padding: 9px 12px;"><code style="color: #0284c7; font-weight: 600;">/api/v1/profiles/update/{id}</code></td>
                  <td style="padding: 9px 12px; color: var(--text-muted);">Cập nhật proxy, tên, thông số fingerprint của profile</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 9px 12px;"><span style="background: rgba(59,130,246,0.15); color: #2563eb; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">POST</span></td>
                  <td style="padding: 9px 12px;"><code style="color: #0284c7; font-weight: 600;">/api/v1/profiles/free-disk/{id}</code></td>
                  <td style="padding: 9px 12px; color: var(--text-muted);">Giải phóng dung lượng (dọn cache/log, bảo toàn cookie & đăng nhập)</td>
                </tr>
                <tr>
                  <td style="padding: 9px 12px;"><span style="background: rgba(16,185,129,0.15); color: #059669; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">GET</span></td>
                  <td style="padding: 9px 12px;"><code style="color: #0284c7; font-weight: 600;">/api/v1/proxies/check/{id}</code></td>
                  <td style="padding: 9px 12px; color: var(--text-muted);">Kiểm tra proxy Live/Die và truy vấn IP, Quốc gia thực tế</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-dev-open-local')?.addEventListener('click', () => {
      if (window.api && window.api.openExternal) {
        window.api.openExternal('http://localhost:8725/');
      } else {
        window.open('http://localhost:8725/', '_blank');
      }
    });

    this.container.querySelector('#btn-dev-copy-local')?.addEventListener('click', () => {
      navigator.clipboard.writeText('http://localhost:8725/').then(() => {
        if (window.showGlobalToast) {
          window.showGlobalToast('📋 Đã sao chép http://localhost:8725/ vào bộ nhớ tạm!');
        }
      });
    });

    this.container.querySelector('#btn-dev-open-online')?.addEventListener('click', () => {
      if (window.api && window.api.openExternal) {
        window.api.openExternal('https://svbrowser.site/');
      } else {
        window.open('https://svbrowser.site/', '_blank');
      }
    });
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}
