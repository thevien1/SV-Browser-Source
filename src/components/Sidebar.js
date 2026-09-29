/**
 * Component: Sidebar
 * Quản lý toàn bộ thanh điều hướng bên trái (như hình ảnh người dùng cung cấp)
 * Bao gồm:
 * - MAIN: Profiles, Nhóm, Proxy, Extensions, Plugins, Thùng rác
 * - AUTOMATION: Automation, App store, </> Developer
 * - OTHERS: Cài đặt, Log, Giới thiệu, Admin Tạo Key
 * - License chip footer
 */

export class SidebarComponent {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('sidebar');
    this.onTabChange = options.onTabChange || (() => {});
    this.onOpenLicense = options.onOpenLicense || (() => {});
    this.onOpenKeygen = options.onOpenKeygen || (() => {});
    this.onOpenUpdates = options.onOpenUpdates || (() => {});
    this.currentTab = 'profiles';
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="sidebar-brand">
        <img src="../assets/icon.png" class="brand-icon" alt="SV Browser" style="width: 28px; height: 28px; border-radius: 7px; object-fit: contain; box-shadow: 0 2px 8px rgba(6, 182, 212, 0.35);">
        <div class="logo-text">SV <span>BROWSER</span></div>
      </div>

      <div class="sidebar-nav">
        <!-- MAIN SECTION -->
        <div class="sidebar-section-title">MAIN</div>
        
        <div class="nav-item ${this.currentTab === 'profiles' ? 'active' : ''}" data-tab="profiles">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span>Profiles</span>
        </div>

        <div class="nav-item ${this.currentTab === 'groups' ? 'active' : ''}" data-tab="groups">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Nhóm & Tags</span>
        </div>

        <div class="nav-item ${this.currentTab === 'proxy' ? 'active' : ''}" data-tab="proxy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span>Proxy</span>
        </div>

        <div class="nav-item ${this.currentTab === 'extensions' ? 'active' : ''}" data-tab="extensions">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/>
          </svg>
          <span>Extensions</span>
        </div>

        <div class="nav-item ${this.currentTab === 'plugins' ? 'active' : ''}" data-tab="plugins">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <span>Plugins</span>
        </div>

        <div class="nav-item ${this.currentTab === 'trash' ? 'active' : ''}" data-tab="trash">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>Thùng rác</span>
        </div>

        <!-- AUTOMATION SECTION -->
        <div class="sidebar-section-title">AUTOMATION</div>

        <div class="nav-item ${this.currentTab === 'automation' ? 'active' : ''}" data-tab="automation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <circle cx="12" cy="5" r="2"></circle>
            <path d="M12 7v4"></path>
            <line x1="8" y1="16" x2="8" y2="16"></line>
            <line x1="16" y1="16" x2="16" y2="16"></line>
          </svg>
          <span>Automation</span>
        </div>

        <div class="nav-item ${this.currentTab === 'appstore' ? 'active' : ''}" data-tab="appstore">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span>App store</span>
        </div>

        <div class="nav-item ${this.currentTab === 'developer' ? 'active' : ''}" data-tab="developer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span>Developer</span>
        </div>

        <!-- OTHERS SECTION -->
        <div class="sidebar-section-title">OTHERS</div>

        <div class="nav-item ${this.currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Cài đặt</span>
        </div>

        <div class="nav-item ${this.currentTab === 'log' ? 'active' : ''}" data-tab="log">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>Log</span>
        </div>

        <div class="nav-item ${this.currentTab === 'about' ? 'active' : ''}" data-tab="about">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Giới thiệu</span>
        </div>

        <div class="nav-item" id="nav-open-updates" style="color: #0284c7;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Trình quản lý cập nhật</span>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="license-chip" id="btn-show-license-modal">
          <div>
            <div style="font-size: 11px; color: #94a3b8;">Bản quyền:</div>
            <strong id="license-status-text">Đang kiểm tra...</strong>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Click tab chuyển trang
    this.container.querySelectorAll('.nav-item[data-tab]').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        this.setActiveTab(tab);
        this.onTabChange(tab);
      });
    });

    // Mở Trình quản lý cập nhật
    this.container.querySelector('#nav-open-updates')?.addEventListener('click', () => {
      this.onOpenUpdates();
    });

    // Mở modal bản quyền
    this.container.querySelector('#btn-show-license-modal')?.addEventListener('click', () => {
      this.onOpenLicense();
    });
  }

  setActiveTab(tab) {
    this.currentTab = tab;
    this.container.querySelectorAll('.nav-item[data-tab]').forEach(item => {
      if (item.getAttribute('data-tab') === tab) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  updateLicenseStatus(status) {
    const textEl = this.container.querySelector('#license-status-text');
    if (!textEl) return;
    if (status && status.isActivated) {
      textEl.innerText = status.type || 'Đã kích hoạt';
      textEl.style.color = '#10b981';
    } else if (status && status.isExpired) {
      textEl.innerText = 'Đã hết hạn';
      textEl.style.color = '#ef4444';
    } else {
      textEl.innerText = 'Chưa kích hoạt';
      textEl.style.color = '#ef4444';
    }
  }
}
