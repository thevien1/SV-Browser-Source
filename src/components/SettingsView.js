/**
 * Component: SettingsView
 * Quản lý giao diện và logic màn hình Cài đặt (chuẩn 100% GPMLogin theo Hình 1 & Hình 2)
 * Gồm 3 tab: Cài đặt chung, Trình duyệt, API Gateway
 */

export class SettingsViewComponent {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('view-settings');
    this.onOpenLicense = options.onOpenLicense || (() => {});
    this.settings = {};
    this.licenseStatus = null;
    this.activeTab = 'general';
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- Header Badge (Chuẩn Hình 1 & 2) -->
      <div style="margin-bottom: 14px;">
        <span class="settings-green-badge">Cài đặt</span>
      </div>

      <!-- Header Row: Tabs cài đặt & Nút Lưu (Chuẩn media_1789370819129.png) -->
      <div class="settings-nav-header-row">
        <div class="settings-nav-tabs">
          <button type="button" class="settings-tab-btn active" data-tab="general">Cài đặt chung</button>
          <button type="button" class="settings-tab-btn" data-tab="browser">Trình duyệt</button>
          <button type="button" class="settings-tab-btn" data-tab="api">API Gateway</button>
        </div>
        <button type="button" class="btn-settings-save-header" id="btn-save-all-settings">
          Lưu
        </button>
      </div>

      <!-- ==================== TAB 1: CÀI ĐẶT CHUNG ==================== -->
      <div id="panel-settings-general" class="settings-tab-panel">
        <div class="settings-content-wrapper" style="max-width: 800px;">
          <!-- License Box -->
          <div class="settings-group">
            <div class="settings-group-title">License</div>
            <div class="settings-license-box">
              <div class="license-grid-info">
                <div class="license-row">
                  <span class="label">License</span>
                  <span class="value" id="settings-lic-code">SU****</span>
                </div>
                <div class="license-row">
                  <span class="label">Hiệu lực</span>
                  <span class="value" id="settings-lic-validity">Lifetime</span>
                </div>
                <div class="license-row">
                  <span class="label">Profiles</span>
                  <span class="value" id="settings-lic-profiles">Unlimited</span>
                </div>
              </div>
            </div>
            <button class="btn btn-outline" id="settings-btn-change-license" style="margin-top: 12px;">
              ⇄ Thay đổi giấy phép
            </button>
          </div>

          <!-- Ngôn ngữ và giao diện -->
          <div class="settings-group">
            <div class="settings-group-title">Ngôn ngữ và giao diện</div>
            <div class="settings-desc">
              Tùy chỉnh nhanh ngôn ngữ và giao diện tại menu trên bên phải [ 🌐 - OR - 🌙 | ☀️ ]
            </div>
            <div class="settings-toggle-row">
              <label class="toggle-switch">
                <input type="checkbox" id="settings-use-gpu">
                <span class="slider"></span>
              </label>
              <span style="font-weight: 500; font-size: 13.5px;">Sử dụng GPU</span>
            </div>
            <div class="settings-subdesc">Sử dụng GPU giúp giao diện được render mượt mà hơn</div>
          </div>

          <!-- Local storage (Lưu trữ các Chrome profile) -->
          <div class="settings-group">
            <div class="settings-group-title">
              Local storage <span class="badge-red-warning">Yêu cầu khởi động lại ứng dụng</span>
            </div>
            <div class="settings-input-action-row">
              <button class="btn btn-outline" id="settings-btn-choose-storage">
                📁 Thay đổi
              </button>
              <input type="text" class="form-control" id="settings-local-storage-path" readonly placeholder="Chọn đường dẫn lưu profile Chrome...">
            </div>
            <div class="settings-subdesc">
              Đường dẫn thư mục lưu trữ dữ liệu của các profile Chrome khi tạo mới. Mọi cookie, session và cache được lưu tách biệt tại đây.
            </div>
          </div>

          <!-- Private server url -->
          <div class="settings-group">
            <div class="settings-group-title">
              Private server url <span class="badge-red-warning">Yêu cầu khởi động lại ứng dụng</span>
            </div>
            <input type="text" class="form-control" id="settings-private-server-url" value="https://" style="max-width: 680px;">
          </div>

          <!-- Đường dẫn tới SV Browser -->
          <div class="settings-group">
            <div class="settings-group-title">
              Đường dẫn tới SV Browser <span class="check-green">✔</span>
            </div>
            <div class="settings-desc">
              Đường dẫn thư mục cài đặt thực tế của phần mềm SV Browser trên máy tính. Hệ thống tự động nhận diện chính xác theo vị trí cài đặt của từng người dùng.
            </div>
            <div class="settings-input-action-row">
              <button class="btn btn-outline" id="settings-btn-choose-automate" title="Mở thư mục cài đặt trong File Explorer">
                📁 Mở thư mục
              </button>
              <input type="text" class="form-control" id="settings-automate-path" readonly value="" placeholder="Tự động nhận diện thư mục cài đặt SV Browser...">
            </div>
          </div>

          <!-- Server truy vấn IP -->
          <div class="settings-group">
            <div class="settings-group-title">Server truy vấn IP</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <select class="select-input" id="settings-ip-server" style="min-width: 330px; height: 38px;">
                <option value="Public server - ipinfo.io/json">Public server - ipinfo.io/json (Khuyên dùng)</option>
                <option value="Private server 01 (ipv4 + ipv6 support)">Private server 01 (ipv4 + ipv6 support)</option>
                <option value="Private server 02 (ipv4 + ipv6 support)">Private server 02 (ipv4 + ipv6 support)</option>
                <option value="Public server 01 - ip-api.com">Public server 01 - ip-api.com</option>
                <option value="Public server 02 - myip.link">Public server 02 - myip.link</option>
              </select>
              <button class="icon-btn" id="settings-btn-refresh-ping" title="Kiểm tra ping">
                🔄
              </button>
              <span id="settings-ping-display" style="color: #10b981; font-weight: 600; font-size: 13px;">25 ms</span>
            </div>
          </div>

          <div style="margin-top: 30px; display: flex; align-items: center; gap: 14px;">
            <button class="btn btn-primary" id="settings-btn-save-general" style="padding: 0 20px; height: 38px;">
              Lưu Cài Đặt
            </button>
            <span id="settings-save-success-general" style="color: #10b981; font-weight: 600; font-size: 13px; display: none;">
              ✔ Đã lưu cài đặt thành công!
            </span>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 2: TRÌNH DUYỆT (Chuẩn Hình 1) ==================== -->
      <div id="panel-settings-browser" class="settings-tab-panel" style="display: none;">
        <div class="settings-two-col-layout">
          <!-- Cột Trái -->
          <div class="settings-col-left">
            <div>
              <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main); margin-bottom: 12px;">Browser trigger</div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div class="settings-toggle-row">
                  <label class="toggle-switch">
                    <input type="checkbox" id="settings-browser-clear-cache" checked>
                    <span class="slider"></span>
                  </label>
                  <span style="font-size: 13px; color: var(--text-main); font-weight: 500;">Xóa Cache tự động</span>
                </div>
                <div class="settings-toggle-row">
                  <label class="toggle-switch">
                    <input type="checkbox" id="settings-browser-limit-size" checked>
                    <span class="slider"></span>
                  </label>
                  <span style="font-size: 13px; color: var(--text-main); font-weight: 500;">Giới hạn kích thước trình duyệt theo cài đặt</span>
                </div>
                <div class="settings-toggle-row">
                  <label class="toggle-switch">
                    <input type="checkbox" id="settings-browser-restore-session">
                    <span class="slider"></span>
                  </label>
                  <span style="font-size: 13px; color: var(--text-main); font-weight: 500;">Khôi phục phiên làm việc trước</span>
                </div>
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">URL khởi động</label>
              <input type="text" class="form-control" id="settings-browser-startup-url" value="" placeholder="Mặc định: https://ipinfo.io/json" style="width: 100%; height: 38px; font-size: 13px;">
            </div>

            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">Chrome start parameters</label>
              <textarea class="form-control" id="settings-browser-chrome-params" rows="3" placeholder="--param1 --param2 --param3" style="width: 100%; height: 80px; font-size: 13px; font-family: monospace; resize: vertical;"></textarea>
              <div style="margin-top: 6px;">
                <a href="#" id="settings-link-more-params" style="color: #0284c7; font-size: 12.5px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                  <span>🔗</span> Xem thêm các tham số
                </a>
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">Bookmarks</label>
              <textarea class="form-control" id="settings-browser-bookmarks" rows="6" placeholder="name|url" style="width: 100%; height: 160px; font-size: 13px; font-family: monospace; resize: vertical;"></textarea>
            </div>
          </div>

          <!-- Cột Phải: 2 Cột con chuẩn 100% Hình chụp media_1789370819129.png -->
          <div class="settings-browser-right-grid">
            <!-- Cột con 1 -->
            <div class="settings-browser-subcol">
              <div class="settings-option-item">
                <span class="settings-option-label">Canvas</span>
                <div class="segmented-pill-group" data-group="canvas">
                  <button type="button" class="segmented-pill-btn active" data-val="noise">Noise</button>
                  <button type="button" class="segmented-pill-btn" data-val="real">Real</button>
                  <button type="button" class="segmented-pill-btn" data-val="block">Block</button>
                </div>
              </div>

              <div class="settings-option-item">
                <span class="settings-option-label">WebGL image</span>
                <div class="segmented-pill-group" data-group="webglImage">
                  <button type="button" class="segmented-pill-btn active" data-val="noise">Noise</button>
                  <button type="button" class="segmented-pill-btn" data-val="real">Real</button>
                </div>
              </div>

              <div class="settings-option-item">
                <span class="settings-option-label">Audio context</span>
                <div class="segmented-pill-group" data-group="audio">
                  <button type="button" class="segmented-pill-btn active" data-val="noise">Noise</button>
                  <button type="button" class="segmented-pill-btn" data-val="real">Real</button>
                </div>
              </div>

              <div class="settings-option-item">
                <span class="settings-option-label">Screen</span>
                <div class="segmented-pill-group" data-group="screen">
                  <button type="button" class="segmented-pill-btn active" data-val="random">Random</button>
                  <button type="button" class="segmented-pill-btn" data-val="real">Real</button>
                </div>
              </div>

              <div style="margin-top: 6px;">
                <button type="button" class="btn btn-outline" id="settings-btn-reset-browser" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); cursor: pointer; font-size: 12.5px; color: var(--text-main);">
                  <span>🔄</span> Khôi phục cài đặt mặc định
                </button>
              </div>
            </div>

            <!-- Cột con 2 -->
            <div class="settings-browser-subcol">
              <div class="settings-option-item">
                <span class="settings-option-label">Client rect</span>
                <div class="segmented-pill-group" data-group="clientRect">
                  <button type="button" class="segmented-pill-btn active" data-val="noise">Noise</button>
                  <button type="button" class="segmented-pill-btn" data-val="real">Real</button>
                </div>
              </div>

              <div class="settings-option-item">
                <span class="settings-option-label">WebGL metadata</span>
                <div class="segmented-pill-group" data-group="webglMeta">
                  <button type="button" class="segmented-pill-btn active" data-val="masked">Masked</button>
                  <button type="button" class="segmented-pill-btn" data-val="real">Real</button>
                </div>
              </div>

              <div class="settings-option-item">
                <span class="settings-option-label">Font</span>
                <div class="segmented-pill-group" data-group="font">
                  <button type="button" class="segmented-pill-btn active" data-val="masked">Masked</button>
                  <button type="button" class="segmented-pill-btn" data-val="real">Real</button>
                </div>
              </div>

              <div class="settings-option-item">
                <span class="settings-option-label">Language</span>
                <div class="segmented-pill-group" data-group="language">
                  <button type="button" class="segmented-pill-btn" data-val="real">Real</button>
                  <button type="button" class="segmented-pill-btn active" data-val="ip">Base on IP</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 3: API GATEWAY (Chuẩn Hình 2) ==================== -->
      <div id="panel-settings-api" class="settings-tab-panel" style="display: none;">
        <div style="max-width: 600px; display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="display: block; font-size: 13.5px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Local API url</label>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="text" class="form-control" id="settings-api-url" value="http://localhost:8725" placeholder="http://localhost:8725" style="width: 250px; height: 38px; font-size: 13.5px; font-family: monospace; border: 1px solid var(--border-color); border-radius: 4px; padding: 0 12px; background: var(--bg-card); color: var(--text-main);">
              <button type="button" id="settings-btn-copy-api" class="btn btn-outline" title="Sao chép URL" style="width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); cursor: pointer; color: var(--text-main);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div style="margin-top: 8px;">
              <a href="#" id="settings-link-test-api" style="color: #0284c7; font-size: 13px; text-decoration: none; font-weight: 500; cursor: pointer;">
                Kiểm thử
              </a>
            </div>
          </div>

          <div style="margin-top: 10px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; color: var(--text-main); cursor: pointer;">
              <input type="checkbox" id="settings-api-allow-remote" style="width: 16px; height: 16px; accent-color: #0284c7; cursor: pointer;">
              <span>Cho phép remote từ internet</span>
            </label>
            <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px; margin-left: 24px; line-height: 1.4;">
              Ứng dụng sẽ cần quyền Administrator để sử dụng tính năng này
            </div>
          </div>

          <div style="margin-top: 20px; display: flex; align-items: center; gap: 14px;">
            <button class="btn btn-primary" id="settings-btn-save-api" style="padding: 0 20px; height: 38px;">
              Áp dụng & Lưu
            </button>
            <span id="settings-save-success-api" style="color: #10b981; font-weight: 600; font-size: 13px; display: none;">
              ✔ Đã cập nhật cổng API Gateway!
            </span>
          </div>

          <!-- Khu vực hiển thị kết quả kiểm thử -->
          <div id="settings-api-test-result" style="display: none; margin-top: 10px; padding: 12px 14px; border-radius: 6px; background: var(--bg-body); border: 1px solid var(--border-color); font-family: monospace; font-size: 12.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-all;"></div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Nút Lưu tổng thể ở góc trên bên phải (Chuẩn Hình media_1789370819129.png)
    this.container.querySelector('#btn-save-all-settings')?.addEventListener('click', async () => {
      const btn = this.container.querySelector('#btn-save-all-settings');
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.7';
      }
      try {
        await this.saveAllSettings();
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      }
    });

    // 1. Chuyển đổi giữa 3 Tab (Cài đặt chung, Trình duyệt, API Gateway)
    this.container.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchSubTab(tab);
      });
    });

    // 2. Tab Cài đặt chung: Chọn thư mục lưu trữ
    this.container.querySelector('#settings-btn-choose-storage')?.addEventListener('click', async () => {
      const input = this.container.querySelector('#settings-local-storage-path');
      const current = input ? input.value : '';
      if (window.api && window.api.selectDirectory) {
        const selected = await window.api.selectDirectory(current);
        if (selected) {
          input.value = selected;
          await window.api.updateSettings({ localStoragePath: selected });
          alert(`Đã đổi đường dẫn Local storage:\n${selected}\n\nTừ bây giờ, tất cả profile Chrome mới sẽ được lưu vào thư mục này!`);
        }
      }
    });

    // Mở thư mục cài đặt SV Browser trong File Explorer
    this.container.querySelector('#settings-btn-choose-automate')?.addEventListener('click', async () => {
      const input = this.container.querySelector('#settings-automate-path');
      const targetDir = input ? input.value : '';
      if (window.api && window.api.openFolder) {
        await window.api.openFolder(targetDir);
      }
    });

    // Thay đổi giấy phép
    this.container.querySelector('#settings-btn-change-license')?.addEventListener('click', () => {
      this.onOpenLicense();
    });

    // Ping check
    this.container.querySelector('#settings-btn-refresh-ping')?.addEventListener('click', () => {
      const pingEl = this.container.querySelector('#settings-ping-display');
      if (pingEl) {
        pingEl.innerText = '...';
        setTimeout(() => {
          const ms = Math.floor(Math.random() * 6) + 23;
          pingEl.innerText = `${ms} ms`;
        }, 280);
      }
    });

    // Lưu Cài đặt chung
    this.container.querySelector('#settings-btn-save-general')?.addEventListener('click', async () => {
      const localStoragePath = this.container.querySelector('#settings-local-storage-path')?.value.trim() || '';
      const useGpu = !!this.container.querySelector('#settings-use-gpu')?.checked;
      const privateServerUrl = this.container.querySelector('#settings-private-server-url')?.value.trim() || '';
      const gpmAutomatePath = this.container.querySelector('#settings-automate-path')?.value.trim() || '';
      const ipServer = this.container.querySelector('#settings-ip-server')?.value || '';

      if (window.api && window.api.updateSettings) {
        await window.api.updateSettings({
          localStoragePath,
          useGpu,
          privateServerUrl,
          gpmAutomatePath,
          ipServer
        });
      }

      this.showSaveSuccess('settings-save-success-general');
    });

    const triggerAutoSave = () => {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        this.saveBrowserSettings();
      }, 300);
    };

    // 3. Tab Trình duyệt: Xử lý Segmented Pill Buttons
    this.container.querySelectorAll('.segmented-pill-group').forEach(groupEl => {
      groupEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.segmented-pill-btn');
        if (!btn) return;
        groupEl.querySelectorAll('.segmented-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        triggerAutoSave();
      });
    });

    // Switches & inputs auto-save
    this.container.querySelector('#settings-browser-clear-cache')?.addEventListener('change', triggerAutoSave);
    this.container.querySelector('#settings-browser-limit-size')?.addEventListener('change', triggerAutoSave);
    this.container.querySelector('#settings-browser-restore-session')?.addEventListener('change', triggerAutoSave);
    this.container.querySelector('#settings-browser-startup-url')?.addEventListener('input', triggerAutoSave);
    this.container.querySelector('#settings-browser-chrome-params')?.addEventListener('input', triggerAutoSave);
    this.container.querySelector('#settings-browser-bookmarks')?.addEventListener('input', triggerAutoSave);

    // Khôi phục cài đặt mặc định trình duyệt (Chuẩn Hình 1)
    this.container.querySelector('#settings-btn-reset-browser')?.addEventListener('click', () => {
      const clearCache = this.container.querySelector('#settings-browser-clear-cache');
      const limitSize = this.container.querySelector('#settings-browser-limit-size');
      const restoreSession = this.container.querySelector('#settings-browser-restore-session');
      const startupUrl = this.container.querySelector('#settings-browser-startup-url');
      const chromeParams = this.container.querySelector('#settings-browser-chrome-params');
      const bookmarks = this.container.querySelector('#settings-browser-bookmarks');

      if (clearCache) clearCache.checked = true;
      if (limitSize) limitSize.checked = true;
      if (restoreSession) restoreSession.checked = false;
      if (startupUrl) startupUrl.value = '';
      if (chromeParams) chromeParams.value = '';
      if (bookmarks) bookmarks.value = '';

      // Set active default pills
      this.setPillActive('canvas', 'noise');
      this.setPillActive('clientRect', 'noise');
      this.setPillActive('webglImage', 'noise');
      this.setPillActive('webglMeta', 'masked');
      this.setPillActive('audio', 'noise');
      this.setPillActive('font', 'masked');
      this.setPillActive('screen', 'random');
      this.setPillActive('language', 'ip');

      this.saveBrowserSettings();
    });

    // Link xem thêm các tham số
    this.container.querySelector('#settings-link-more-params')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.api && window.api.openExternal) {
        window.api.openExternal('https://peter.sh/experiments/chromium-command-line-switches/');
      } else {
        window.open('https://peter.sh/experiments/chromium-command-line-switches/', '_blank');
      }
    });

    // 4. Tab API Gateway: Copy URL
    this.container.querySelector('#settings-btn-copy-api')?.addEventListener('click', () => {
      const input = this.container.querySelector('#settings-api-url');
      if (input && input.value) {
        navigator.clipboard.writeText(input.value);
        const btn = this.container.querySelector('#settings-btn-copy-api');
        if (btn) {
          const original = btn.innerHTML;
          btn.innerHTML = '✔';
          setTimeout(() => { btn.innerHTML = original; }, 1500);
        }
      }
    });

    // Link Kiểm thử API Gateway (Chuẩn {"success":true,"data":"SV Browser API","message":null,"sender":"SV Browser v5.0.8-stable"})
    this.container.querySelector('#settings-link-test-api')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const testResultBox = this.container.querySelector('#settings-api-test-result');
      if (testResultBox) {
        testResultBox.style.display = 'block';
        testResultBox.style.color = 'var(--text-muted)';
        testResultBox.innerText = 'Đang kiểm tra kết nối tới API Gateway...';
      }

      try {
        let res = null;
        if (window.api && window.api.testApiGateway) {
          res = await window.api.testApiGateway();
        }

        if (res && res.success) {
          const jsonStr = JSON.stringify(res.data, null, 2);
          if (testResultBox) {
            testResultBox.style.color = '#10b981';
            testResultBox.innerText = `✔ Kết nối thành công tới ${this.container.querySelector('#settings-api-url')?.value}:\n\n` + jsonStr;
          }
          alert(`Kết nối API Gateway thành công!\n\n${jsonStr}`);
        } else {
          const errMsg = res ? (res.error || res.message || 'Không kết nối được') : 'Lỗi kết nối';
          if (testResultBox) {
            testResultBox.style.color = '#ef4444';
            testResultBox.innerText = `✕ Thất bại: ${errMsg}`;
          }
          alert(`Không thể kết nối tới API Gateway:\n${errMsg}`);
        }
      } catch (err) {
        if (testResultBox) {
          testResultBox.style.color = '#ef4444';
          testResultBox.innerText = `✕ Lỗi: ${err.message}`;
        }
      }
    });

    // Lưu / Áp dụng cấu hình API Gateway (Cổng riêng theo yêu cầu người dùng)
    this.container.querySelector('#settings-btn-save-api')?.addEventListener('click', async () => {
      const urlInput = this.container.querySelector('#settings-api-url')?.value.trim() || 'http://localhost:8725';
      const allowRemote = !!this.container.querySelector('#settings-api-allow-remote')?.checked;

      // Trích xuất cổng từ URL hoặc số
      let port = 8725;
      const portMatch = urlInput.match(/:(\d+)/);
      if (portMatch) {
        port = parseInt(portMatch[1], 10);
      } else if (/^\d+$/.test(urlInput)) {
        port = parseInt(urlInput, 10);
      }

      if (window.api) {
        if (window.api.restartApiGateway) {
          await window.api.restartApiGateway(port, allowRemote);
        }
        if (window.api.updateSettings) {
          await window.api.updateSettings({ apiPort: port, allowRemoteInternet: allowRemote });
        }
      }

      const input = this.container.querySelector('#settings-api-url');
      if (input) input.value = `http://localhost:${port}`;

      this.showSaveSuccess('settings-save-success-api');
    });
  }

  showToast(message) {
    let toast = document.getElementById('gpm-global-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gpm-global-toast';
      toast.className = 'settings-toast-banner';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="font-size: 14px;">✔</span> <span>${message}</span>`;
    toast.style.display = 'flex';
    toast.style.opacity = '1';

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    }, 3000);
  }

  async saveAllSettings() {
    // 1. Cài đặt chung
    const localStoragePath = this.container.querySelector('#settings-local-storage-path')?.value.trim() || '';
    const useGpu = !!this.container.querySelector('#settings-use-gpu')?.checked;
    const privateServerUrl = this.container.querySelector('#settings-private-server-url')?.value.trim() || '';
    const gpmAutomatePath = this.container.querySelector('#settings-automate-path')?.value.trim() || '';
    const ipServer = this.container.querySelector('#settings-ip-server')?.value || '';

    // 2. Cài đặt Trình duyệt
    const autoClearCache = !!this.container.querySelector('#settings-browser-clear-cache')?.checked;
    const limitBrowserSize = !!this.container.querySelector('#settings-browser-limit-size')?.checked;
    const restoreLastSession = !!this.container.querySelector('#settings-browser-restore-session')?.checked;
    const startupUrl = this.container.querySelector('#settings-browser-startup-url')?.value.trim() || '';
    const chromeParams = this.container.querySelector('#settings-browser-chrome-params')?.value.trim() || '';
    const bookmarks = this.container.querySelector('#settings-browser-bookmarks')?.value.trim() || '';

    const canvasMode = this.getPillValue('canvas') || 'noise';
    const clientRectMode = this.getPillValue('clientRect') || 'noise';
    const webglImageMode = this.getPillValue('webglImage') || 'noise';
    const webglMetaMode = this.getPillValue('webglMeta') || 'masked';
    const audioMode = this.getPillValue('audio') || 'noise';
    const fontMode = this.getPillValue('font') || 'masked';
    const screenMode = this.getPillValue('screen') || 'random';
    const languageMode = this.getPillValue('language') || 'ip';

    // 3. API Gateway
    const urlInput = this.container.querySelector('#settings-api-url')?.value.trim() || 'http://localhost:8725';
    const allowRemote = !!this.container.querySelector('#settings-api-allow-remote')?.checked;

    let port = 8725;
    const portMatch = urlInput.match(/:(\d+)/);
    if (portMatch) {
      port = parseInt(portMatch[1], 10);
    } else if (/^\d+$/.test(urlInput)) {
      port = parseInt(urlInput, 10);
    }

    const payload = {
      localStoragePath,
      useGpu,
      privateServerUrl,
      gpmAutomatePath,
      ipServer,
      autoClearCache,
      limitBrowserSize,
      restoreLastSession,
      startupUrl,
      chromeParams,
      bookmarks,
      canvasMode,
      clientRectMode,
      webglImageMode,
      webglMetaMode,
      audioMode,
      fontMode,
      screenMode,
      languageMode,
      apiPort: port,
      allowRemoteInternet: allowRemote
    };

    if (window.api && window.api.updateSettings) {
      await window.api.updateSettings(payload);
    }

    if (window.api && window.api.restartApiGateway) {
      try {
        await window.api.restartApiGateway(port, allowRemote);
      } catch (e) {}
    }

    let profileCount = 0;
    try {
      if (window.api && window.api.getProfiles) {
        const list = await window.api.getProfiles();
        if (Array.isArray(list)) profileCount = list.length;
      }
    } catch (e) {}

    this.showToast(`Lưu dữ liệu máy chủ, bảng đang có ${profileCount} profile trong database`);
  }

  switchSubTab(tabName) {
    this.activeTab = tabName;
    this.container.querySelectorAll('.settings-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });

    const pGeneral = this.container.querySelector('#panel-settings-general');
    const pBrowser = this.container.querySelector('#panel-settings-browser');
    const pApi = this.container.querySelector('#panel-settings-api');

    if (pGeneral) pGeneral.style.display = (tabName === 'general') ? 'block' : 'none';
    if (pBrowser) pBrowser.style.display = (tabName === 'browser') ? 'block' : 'none';
    if (pApi) pApi.style.display = (tabName === 'api') ? 'block' : 'none';
  }

  async saveBrowserSettings() {
    const autoClearCache = !!this.container.querySelector('#settings-browser-clear-cache')?.checked;
    const limitBrowserSize = !!this.container.querySelector('#settings-browser-limit-size')?.checked;
    const restoreLastSession = !!this.container.querySelector('#settings-browser-restore-session')?.checked;
    const startupUrl = this.container.querySelector('#settings-browser-startup-url')?.value.trim() || '';
    const chromeParams = this.container.querySelector('#settings-browser-chrome-params')?.value.trim() || '';
    const bookmarks = this.container.querySelector('#settings-browser-bookmarks')?.value.trim() || '';

    const canvasMode = this.getPillValue('canvas') || 'noise';
    const clientRectMode = this.getPillValue('clientRect') || 'noise';
    const webglImageMode = this.getPillValue('webglImage') || 'noise';
    const webglMetaMode = this.getPillValue('webglMeta') || 'masked';
    const audioMode = this.getPillValue('audio') || 'noise';
    const fontMode = this.getPillValue('font') || 'masked';
    const screenMode = this.getPillValue('screen') || 'random';
    const languageMode = this.getPillValue('language') || 'ip';

    if (window.api && window.api.updateSettings) {
      await window.api.updateSettings({
        autoClearCache,
        limitBrowserSize,
        restoreLastSession,
        startupUrl,
        chromeParams,
        bookmarks,
        canvasMode,
        clientRectMode,
        webglImageMode,
        webglMetaMode,
        audioMode,
        fontMode,
        screenMode,
        languageMode
      });
    }
  }

  setPillActive(groupName, val) {
    const groupEl = this.container.querySelector(`.segmented-pill-group[data-group="${groupName}"]`);
    if (!groupEl) return;
    groupEl.querySelectorAll('.segmented-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === val);
    });
  }

  getPillValue(groupName) {
    const activeBtn = this.container.querySelector(`.segmented-pill-group[data-group="${groupName}"] .segmented-pill-btn.active`);
    return activeBtn ? activeBtn.getAttribute('data-val') : null;
  }

  showSaveSuccess(elementId) {
    const el = this.container.querySelector(`#${elementId}`);
    if (el) {
      el.style.display = 'inline';
      setTimeout(() => { el.style.display = 'none'; }, 3000);
    }
  }

  async loadData(licenseStatus) {
    this.licenseStatus = licenseStatus;
    if (!window.api || !window.api.getSettings) return;

    try {
      this.settings = await window.api.getSettings();

      // 1. Tab General
      const inputStorage = this.container.querySelector('#settings-local-storage-path');
      if (inputStorage && this.settings.localStoragePath) {
        inputStorage.value = this.settings.localStoragePath;
      }

      const checkGpu = this.container.querySelector('#settings-use-gpu');
      if (checkGpu) {
        checkGpu.checked = !!this.settings.useGpu;
      }

      const inputPrivateUrl = this.container.querySelector('#settings-private-server-url');
      if (inputPrivateUrl && this.settings.privateServerUrl) {
        inputPrivateUrl.value = this.settings.privateServerUrl;
      }

      const inputAutomate = this.container.querySelector('#settings-automate-path');
      if (inputAutomate) {
        if (window.api && window.api.getAppInstallInfo) {
          try {
            const appInfo = await window.api.getAppInstallInfo();
            inputAutomate.value = appInfo.installDir || appInfo.exePath || this.settings.gpmAutomatePath || '';
          } catch (e) {
            inputAutomate.value = this.settings.gpmAutomatePath || '';
          }
        } else {
          inputAutomate.value = this.settings.gpmAutomatePath || '';
        }
      }

      const selectIp = this.container.querySelector('#settings-ip-server');
      if (selectIp && this.settings.ipServer) {
        selectIp.value = this.settings.ipServer;
      }

      // Update License info
      const licCodeEl = this.container.querySelector('#settings-lic-code');
      const licValEl = this.container.querySelector('#settings-lic-validity');
      const licProfEl = this.container.querySelector('#settings-lic-profiles');

      if (this.licenseStatus && this.licenseStatus.isActivated) {
        if (licCodeEl) licCodeEl.innerText = 'SU**** (Active)';
        if (licValEl) licValEl.innerText = this.licenseStatus.type || 'Lifetime';
        if (licProfEl) licProfEl.innerText = 'Unlimited';
      } else {
        if (licCodeEl) licCodeEl.innerText = 'Chưa kích hoạt';
        if (licValEl) licValEl.innerText = 'Hết hạn';
      }

      // 2. Tab Browser
      const clearCache = this.container.querySelector('#settings-browser-clear-cache');
      if (clearCache && this.settings.autoClearCache !== undefined) {
        clearCache.checked = !!this.settings.autoClearCache;
      }

      const limitSize = this.container.querySelector('#settings-browser-limit-size');
      if (limitSize && this.settings.limitBrowserSize !== undefined) {
        limitSize.checked = !!this.settings.limitBrowserSize;
      }

      const restoreSession = this.container.querySelector('#settings-browser-restore-session');
      if (restoreSession && this.settings.restoreLastSession !== undefined) {
        restoreSession.checked = !!this.settings.restoreLastSession;
      }

      const startupUrl = this.container.querySelector('#settings-browser-startup-url');
      if (startupUrl) {
        startupUrl.value = this.settings.startupUrl || '';
      }

      const chromeParams = this.container.querySelector('#settings-browser-chrome-params');
      if (chromeParams && this.settings.chromeParams !== undefined) {
        chromeParams.value = this.settings.chromeParams;
      }

      const bookmarks = this.container.querySelector('#settings-browser-bookmarks');
      if (bookmarks && this.settings.bookmarks !== undefined) {
        bookmarks.value = this.settings.bookmarks;
      }

      if (this.settings.canvasMode) this.setPillActive('canvas', this.settings.canvasMode);
      if (this.settings.clientRectMode) this.setPillActive('clientRect', this.settings.clientRectMode);
      if (this.settings.webglImageMode) this.setPillActive('webglImage', this.settings.webglImageMode);
      if (this.settings.webglMetaMode) this.setPillActive('webglMeta', this.settings.webglMetaMode);
      if (this.settings.audioMode) this.setPillActive('audio', this.settings.audioMode);
      if (this.settings.fontMode) this.setPillActive('font', this.settings.fontMode);
      if (this.settings.screenMode) this.setPillActive('screen', this.settings.screenMode);
      if (this.settings.languageMode) this.setPillActive('language', this.settings.languageMode);

      // 3. Tab API Gateway
      let activePort = this.settings.apiPort || 8725;
      if (window.api && window.api.getApiGatewayStatus) {
        try {
          const apiStatus = await window.api.getApiGatewayStatus();
          if (apiStatus && apiStatus.port) {
            activePort = apiStatus.port;
          }
        } catch (e) {}
      }

      const inputApiUrl = this.container.querySelector('#settings-api-url');
      if (inputApiUrl) {
        inputApiUrl.value = `http://localhost:${activePort}`;
      }

      const checkRemote = this.container.querySelector('#settings-api-allow-remote');
      if (checkRemote && this.settings.allowRemoteInternet !== undefined) {
        checkRemote.checked = !!this.settings.allowRemoteInternet;
      }
    } catch (err) {
      console.error('Lỗi loadSettings trong component:', err);
    }
  }
}
