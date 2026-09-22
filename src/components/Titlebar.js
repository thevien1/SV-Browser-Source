/**
 * Component: TitlebarComponent
 * Quản lý thanh tiêu đề custom frameless window, đổi theme sáng/tối và các nút thu nhỏ/phóng to/đóng
 */

export class TitlebarComponent {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('titlebar');
    this.onRefresh = options.onRefresh || (() => {});
    this.onOpenUpdates = options.onOpenUpdates || (() => {});
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="titlebar-left">
        <span class="title-badge">SV Browser</span>
        <span id="titlebar-app-ver-text">v1.0.1 [Multi-Browser & Automation Platform]</span>
      </div>
      <div class="titlebar-right">
        <button class="icon-btn" id="btn-open-updates" title="Trình quản lý cập nhật (Cores & App)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button class="icon-btn" id="btn-toggle-theme" title="Chuyển chế độ Sáng / Tối">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button class="icon-btn" id="btn-refresh-app" title="Làm mới">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
        <button class="window-btn" id="btn-min" title="Thu nhỏ">
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button class="window-btn" id="btn-max" title="Phóng to">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        </button>
        <button class="window-btn close" id="btn-close" title="Đóng">
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    if (window.api && window.api.getAppVersion) {
      window.api.getAppVersion().then(ver => {
        const verEl = this.container.querySelector('#titlebar-app-ver-text');
        if (verEl && ver) {
          verEl.textContent = `v${ver} [Multi-Browser & Automation Platform]`;
        }
      }).catch(() => {});
    }

    const maxBtn = this.container.querySelector('#btn-max');

    const updateMaxBtnState = (isMaximized) => {
      if (!maxBtn) return;
      if (isMaximized) {
        maxBtn.title = 'Khôi phục';
        maxBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="7" width="13" height="13" rx="1.5" ry="1.5"></rect>
            <path d="M7 3h12a2 2 0 0 1 2 2v12"></path>
          </svg>
        `;
      } else {
        maxBtn.title = 'Phóng to';
        maxBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        `;
      }
    };

    if (window.api && window.api.isWindowMaximized) {
      window.api.isWindowMaximized().then(updateMaxBtnState);
    }
    if (window.api && window.api.onWindowMaximizeChanged) {
      window.api.onWindowMaximizeChanged(updateMaxBtnState);
    }

    this.container.querySelector('#btn-min')?.addEventListener('click', () => {
      if (window.api && window.api.minimizeWindow) window.api.minimizeWindow();
    });

    this.container.querySelector('#btn-max')?.addEventListener('click', () => {
      if (window.api && window.api.maximizeWindow) window.api.maximizeWindow();
    });

    this.container.querySelector('#btn-close')?.addEventListener('click', () => {
      if (window.api && window.api.closeWindow) window.api.closeWindow();
    });

    // Double-click thanh tiêu đề để phóng to hoặc khôi phục kích thước
    this.container.addEventListener('dblclick', (e) => {
      if (e.target.closest('button')) return;
      if (window.api && window.api.maximizeWindow) window.api.maximizeWindow();
    });

    // Toggle Sáng/Tối
    this.container.querySelector('#btn-toggle-theme')?.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('gpm_dark_theme', document.documentElement.classList.contains('dark'));
    });

    // Open Update Manager
    this.container.querySelector('#btn-open-updates')?.addEventListener('click', () => {
      this.onOpenUpdates();
    });

    // Refresh
    this.container.querySelector('#btn-refresh-app')?.addEventListener('click', () => {
      this.onRefresh();
    });

    // Load saved theme
    const isDark = localStorage.getItem('gpm_dark_theme') === 'true';
    if (isDark) document.documentElement.classList.add('dark');
  }
}
