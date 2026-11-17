import { uiIcon } from './UIIcons.js';
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
      const version = await window.api.getAppVersion();
      this.container.innerHTML = `<section class="about-page"><div class="about-orb"></div><div class="about-brand"><img src="../assets/icon.png" alt="SV Browser"><span class="page-eyebrow">YOUR WORKSPACE. YOUR FLOW.</span><h1>SV Browser</h1><p>Không gian làm việc dành cho mọi profile của bạn.</p><span class="about-version">Phiên bản ${version}</span></div><div class="about-features"><div>${uiIcon('profiles',26)}<h3>Profiles tập trung</h3><p>Sắp xếp hồ sơ, nhóm và ghi chú trong một không gian gọn gàng.</p></div><div>${uiIcon('automation',26)}<h3>Làm việc liền mạch</h3><p>Kết nối kịch bản tự động và tiếp tục quy trình của bạn.</p></div><div>${uiIcon('log',26)}<h3>Theo dõi rõ ràng</h3><p>Xem lại lịch sử mở profile ngay trên máy đang sử dụng.</p></div></div><div class="about-links"><a href="https://svbrowser.site" target="_blank" rel="noopener noreferrer">Trang chủ ↗</a><a href="https://svbrowser.site/docs" target="_blank" rel="noopener noreferrer">Tài liệu sử dụng ↗</a></div><p class="about-copyright">SV Browser · Profile & Automation Workspace</p></section>`;
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

  async showDeveloperDocsView() {
    const settings = await window.api.getSettings();
    const port = Number.parseInt(settings.apiPort, 10);
    const local = 'http://localhost:' + (port > 0 && port <= 65535 ? port : 8725);
    this.container.style.display = 'flex';
    this.container.innerHTML = `<section class="docs-page"><span class="page-eyebrow">KNOWLEDGE HUB</span><h1>Bắt đầu từ tài liệu</h1><p>Hướng dẫn sử dụng và kết nối công cụ của bạn với SV Browser.</p><div class="docs-grid"><article class="docs-card">${uiIcon('developer',32)}<span class="docs-label">HƯỚNG DẪN CHÍNH THỨC</span><h2>Tài liệu SV Browser</h2><p>Khám phá tính năng, cách quản lý profile và các hướng dẫn sử dụng.</p><button class="btn btn-primary" id="docs-online">Mở tài liệu ↗</button><small>https://svbrowser.site/docs</small></article><article class="docs-card">${uiIcon('automation',32)}<span class="docs-label">DÀNH CHO AUTOMATION</span><h2>API trên máy của bạn</h2><p>Tra cứu endpoint, ghi chú (Notes), request mẫu và phản hồi của API đang chạy.</p><button class="btn btn-outline" id="docs-local">Xem tài liệu API ↗</button><small>${local}</small></article></div></section>`;
    this.container.querySelector('#docs-online').onclick = () => window.api.openExternal('https://svbrowser.site/docs');
    this.container.querySelector('#docs-local').onclick = () => window.api.openExternal(local);
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}
