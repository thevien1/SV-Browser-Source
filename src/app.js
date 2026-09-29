/**
 * GPMLogin Global - Main Application Controller
 * Kiến trúc module hóa sạch sẽ theo từng component:
 * - TitlebarComponent: Quản lý tiêu đề, theme sáng/tối, nút thu nhỏ/phóng to/đóng
 * - SidebarComponent: Quản lý danh mục menu trái (Profiles, Nhóm, Proxy, Automation, Cài đặt...)
 * - ProfilesViewComponent: Quản lý bảng profiles, mở/đóng trình duyệt, tìm kiếm, lọc
 * - SettingsViewComponent: Quản lý màn hình Cài đặt, Local storage path, Private server url
 * - PlaceholderViewComponent: Quản lý các view mở rộng cho Nhóm, Proxy, Extensions...
 * - ModalsComponent: Quản lý các popups (Thêm mới, Tạo hàng loạt, Kích hoạt Key, Admin Keygen)
 */

import { TitlebarComponent } from './components/Titlebar.js';
import { SidebarComponent } from './components/Sidebar.js';
import { ProfilesViewComponent } from './components/ProfilesView.js';
import { GroupsViewComponent } from './components/GroupsView.js';
import { ExtensionsViewComponent } from './components/ExtensionsView.js';
import { ProxyViewComponent } from './components/ProxyView.js';
import { TrashViewComponent } from './components/TrashView.js';
import { SettingsViewComponent } from './components/SettingsView.js';
import { PlaceholderViewComponent } from './components/PlaceholderView.js';
import { ModalsComponent } from './components/Modals.js';

class App {
  constructor() {
    this.currentHwid = '';
    this.licenseStatus = null;

    // Khởi tạo các components
    this.titlebar = new TitlebarComponent({
      onRefresh: () => this.refreshData(),
      onOpenUpdates: () => this.modals.openUpdateManager()
    });

    this.sidebar = new SidebarComponent({
      onTabChange: (tab) => this.switchTab(tab),
      onOpenLicense: () => this.modals.openModal('modal-license'),
      onOpenKeygen: () => this.modals.openModal('modal-admin-keygen'),
      onOpenUpdates: () => this.modals.openUpdateManager()
    });

    this.profilesView = new ProfilesViewComponent({
      onAddProfile: () => {
        if (!this.licenseStatus?.isActivated || this.licenseStatus?.isExpired) {
          if (window.showGlobalToast) {
            window.showGlobalToast('⚠️ Vui lòng kích hoạt bản quyền trước khi tạo profile!', true);
          }
          this.modals.openModal('modal-license');
          return;
        }
        this.modals.openModal('modal-add-profile');
      },
      onBatchProfile: (type) => {
        if (!this.licenseStatus?.isActivated || this.licenseStatus?.isExpired) {
          if (window.showGlobalToast) {
            window.showGlobalToast('⚠️ Vui lòng kích hoạt bản quyền trước khi tạo profile!', true);
          }
          this.modals.openModal('modal-license');
          return;
        }
        if (type === 'excel') {
          alert('Tính năng nhập từ Excel: Bạn có thể chọn file Excel/CSV chứa danh sách Profile & Proxy để import tự động.');
        } else {
          this.modals.openModal('modal-batch-create');
        }
      }
    });

    this.groupsView = new GroupsViewComponent({
      onGroupsChanged: () => this.loadGroups(),
      onTagsChanged: () => this.loadTags()
    });

    this.extensionsView = new ExtensionsViewComponent();

    this.proxyView = new ProxyViewComponent();

    this.trashView = new TrashViewComponent({
      onRestored: () => this.profilesView.loadProfiles()
    });

    this.settingsView = new SettingsViewComponent({
      onOpenLicense: () => this.modals.openModal('modal-license')
    });

    this.placeholderView = new PlaceholderViewComponent();

    this.modals = new ModalsComponent({
      onProfileCreated: () => this.profilesView.loadProfiles(),
      onLicenseActivated: async () => {
        await this.checkAndDisplayLicense();
        await this.profilesView.loadProfiles();
        if (window.showGlobalToast) {
          window.showGlobalToast('🎉 Kích hoạt bản quyền thành công!');
        }
        await this.checkLocalStorageSetup();
      }
    });
    this.profilesView.modals = this.modals;

    // Gán vào window để các component gọi chéo khi cần
    window.sidebarComp = this.sidebar;
    window.modalsComp = this.modals;
    window.proxyViewComp = this.proxyView;
    window.trashViewComp = this.trashView;
    window.appSwitchTab = (tab) => this.switchTab(tab);

    window.showGlobalToast = (message, isWarning = false) => {
      let toast = document.getElementById('gpm-global-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'gpm-global-toast';
        toast.className = 'settings-toast-banner';
        document.body.appendChild(toast);
      }
      if (isWarning) {
        toast.style.background = '#ef4444';
        toast.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.35)';
        toast.innerHTML = `<span style="font-size: 14px;">⚠️</span> <span>${message}</span>`;
      } else {
        toast.style.background = '#10b981';
        toast.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.28)';
        toast.innerHTML = `<span style="font-size: 14px;">✔</span> <span>${message}</span>`;
      }
      toast.style.display = 'flex';
      toast.style.opacity = '1';
      clearTimeout(window._globalToastTimer);
      window._globalToastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          toast.style.display = 'none';
        }, 250);
      }, 3000);
    };
  }

  async init() {
    // 1. Render tất cả components ra giao diện
    this.titlebar.render();
    this.sidebar.render();
    this.profilesView.render();
    this.proxyView.render();
    this.trashView.render();
    this.groupsView.render();
    this.extensionsView.render();
    this.settingsView.render();
    this.modals.render();

    // 2. Tải dữ liệu ban đầu
    await this.checkAndDisplayLicense();
    await this.loadGroups();
    await this.loadTags();
    await this.profilesView.loadProfiles();
    await this.settingsView.loadData(this.licenseStatus);

    // 3. Kiểm tra thiết lập thư mục lưu trữ Local Storage & Core trình duyệt lần đầu
    if (this.licenseStatus?.isActivated && !this.licenseStatus?.isExpired) {
      await this.checkLocalStorageSetup();
      await this.checkBrowserCoresSetup();
    }

    // 4. Đăng ký lắng nghe sự kiện thay đổi trạng thái Profile từ Backend
    if (window.api && window.api.onProfileStatusChanged) {
      window.api.onProfileStatusChanged((data) => {
        this.profilesView.updateProfileStatus(data.profileId, data.isRunning);
      });
    }

    // Lắng nghe sự kiện cập nhật IP và Quốc gia ngầm từ Backend
    if (window.api && window.api.onProfileIpUpdated) {
      window.api.onProfileIpUpdated((data) => {
        this.profilesView.updateProfileIp(data.profileId, data.ip, data.country);
      });
    }

    // Lắng nghe sự kiện đồng bộ bản quyền ngầm từ Backend (Auto-Sync khi server chặn hoặc gia hạn key)
    if (window.api && window.api.onLicenseStatusChanged) {
      window.api.onLicenseStatusChanged((status) => {
        const wasValid = this.licenseStatus && this.licenseStatus.isActivated && !this.licenseStatus.isExpired;
        this.licenseStatus = status;
        this.sidebar.updateLicenseStatus(status);
        this.modals.setLicenseInfo(status);
        this.settingsView.loadData(status);
        this.profilesView.setLicenseStatus(status);

        if (!status || !status.isActivated || status.isExpired) {
          // Bị khóa hoặc hết hạn từ server: hiện cảnh báo và bật popup nhập key
          this.modals.openModal('modal-license');
          if (window.showGlobalToast) {
            const msg = status?.message || '⚠️ Bản quyền đã bị khóa hoặc hết hạn trên máy chủ!';
            window.showGlobalToast(msg, true);
          }
        } else if (status.isActivated && !status.isExpired) {
          // Được kích hoạt hoặc gia hạn thành công từ server
          this.checkBrowserCoresSetup();
          if (!wasValid) {
            this.modals.closeModal('modal-license');
            if (window.showGlobalToast) {
              window.showGlobalToast(`🎉 Bản quyền đã được cập nhật từ máy chủ! Hạn dùng: ${status.daysLeft || status.expiresAtFormatted}`);
            }
          } else {
            if (window.showGlobalToast) {
              window.showGlobalToast(`Đã đồng bộ bản quyền: ${status.daysLeft || status.expiresAtFormatted}`);
            }
          }
        }
      });
    }
  }

  async checkLocalStorageSetup() {
    if (!window.api || !window.api.getSettings) return;
    try {
      const s = await window.api.getSettings();
      if (!s.hasConfiguredStoragePath || !s.localStoragePath) {
        this.modals.openStorageSetupModal(s.localStoragePath, async (newPath) => {
          await this.profilesView.loadProfiles();
          await this.settingsView.loadData(this.licenseStatus);
        });
      }
    } catch (err) {
      console.error('Lỗi kiểm tra cài đặt lưu trữ:', err);
    }
  }

  async checkBrowserCoresSetup() {
    if (!window.api || !window.api.getAvailableCores) return;
    try {
      const cores = await window.api.getAvailableCores();
      const hasCores = Array.isArray(cores) && cores.length > 0;

      if (this.profilesView && this.profilesView.setNoCoresWarning) {
        this.profilesView.setNoCoresWarning(!hasCores);
      }

      // Nếu chưa cài đặt Core nào: TỰ ĐỘNG BẬT POPUP TRÌNH QUẢN LÝ CẬP NHẬT GIỐNG NHƯ KHI CHƯA NHẬP KEY!
      if (!hasCores) {
        setTimeout(() => {
          this.modals.openUpdateManager();
          if (window.showGlobalToast) {
            window.showGlobalToast('⚠️ Chưa cài đặt Core trình duyệt. Vui lòng tải & cài đặt Core để sử dụng!', true);
          }
        }, 500);
      }
    } catch (err) {
      console.error('Lỗi kiểm tra Core trình duyệt:', err);
    }
  }

  async checkAndDisplayLicense() {
    if (!window.api) return;
    try {
      this.currentHwid = await window.api.getHWID();
      this.modals.setHwid(this.currentHwid);
      this.profilesView.setHwid(this.currentHwid);

      this.licenseStatus = await window.api.checkLicense();
      this.sidebar.updateLicenseStatus(this.licenseStatus);
      this.modals.setLicenseInfo(this.licenseStatus);
      this.settingsView.loadData(this.licenseStatus);
      this.profilesView.setLicenseStatus(this.licenseStatus);

      // Nếu bản quyền chưa kích hoạt hoặc đã hết hạn: TỰ ĐỘNG BẬT POPUP NHẬP KEY (KHÔNG CHO TẮT BẢNG)!
      if (!this.licenseStatus || !this.licenseStatus.isActivated || this.licenseStatus.isExpired) {
        setTimeout(() => {
          this.modals.openModal('modal-license');
          if (window.showGlobalToast) {
            const msg = (this.licenseStatus && this.licenseStatus.isExpired)
              ? '⚠️ Bản quyền đã hết hạn sử dụng. Vui lòng nhập License Key mới!'
              : '⚠️ Ứng dụng chưa kích hoạt bản quyền. Vui lòng nhập License Key để sử dụng!';
            window.showGlobalToast(msg, true);
          }
        }, 300);
      }
    } catch (err) {
      console.error('Lỗi check license:', err);
    }
  }

  async loadGroups() {
    if (!window.api || !window.api.getGroups) return;
    try {
      const groups = await window.api.getGroups();
      this.profilesView.setGroups(groups);
      this.modals.setGroups(groups);
      this.groupsView.loadGroups();
    } catch (e) {
      console.error(e);
    }
  }

  async loadTags() {
    if (!window.api || !window.api.getTags) return;
    try {
      const tags = await window.api.getTags();
      if (this.profilesView && this.profilesView.setTags) {
        this.profilesView.setTags(tags);
      }
      if (this.modals && this.modals.setTags) {
        this.modals.setTags(tags);
      }
      if (this.groupsView && this.groupsView.loadTags) {
        this.groupsView.loadTags();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async refreshData() {
    await this.profilesView.loadProfiles();
    await this.loadGroups();
    await this.loadTags();
    await this.checkAndDisplayLicense();
  }

  async switchTab(tab) {
    // Chặn chuyển tab nếu chưa kích hoạt bản quyền hợp lệ
    if (!this.licenseStatus?.isActivated || this.licenseStatus?.isExpired) {
      if (window.showGlobalToast) {
        window.showGlobalToast('⚠️ Vui lòng nhập License Key kích hoạt bản quyền trước khi sử dụng!', true);
      }
      this.modals.openModal('modal-license');
      return;
    }

    const viewProfiles = document.getElementById('view-profiles');
    const viewProxy = document.getElementById('view-proxy');
    const viewTrash = document.getElementById('view-trash');
    const viewSettings = document.getElementById('view-settings');
    const viewGroups = document.getElementById('view-groups');
    const viewExtensions = document.getElementById('view-extensions');
    const viewPlaceholder = document.getElementById('view-placeholder');
    const titleEl = document.getElementById('current-view-title');

    // Ẩn tất cả view
    if (viewProfiles) viewProfiles.style.display = 'none';
    if (viewProxy) viewProxy.style.display = 'none';
    if (viewTrash) viewTrash.style.display = 'none';
    if (viewSettings) viewSettings.style.display = 'none';
    if (viewGroups) viewGroups.style.display = 'none';
    if (viewExtensions) viewExtensions.style.display = 'none';
    if (viewPlaceholder) viewPlaceholder.style.display = 'none';

    if (tab === 'profiles') {
      if (viewProfiles) viewProfiles.style.display = 'flex';
      if (titleEl) titleEl.innerText = 'Quản lý Profile';
      this.profilesView.loadProfiles();
    } else if (tab === 'proxy') {
      if (viewProxy) viewProxy.style.display = 'flex';
      if (titleEl) titleEl.innerText = 'Quản lý Proxy';
      this.proxyView.loadProxies();
    } else if (tab === 'trash') {
      if (viewTrash) viewTrash.style.display = 'flex';
      if (titleEl) titleEl.innerText = 'Thùng rác Profile';
      this.trashView.loadTrash();
    } else if (tab === 'groups') {
      if (viewGroups) viewGroups.style.display = 'flex';
      if (titleEl) titleEl.innerText = 'Quản lý Nhóm & Tags';
      this.groupsView.loadGroups();
      this.groupsView.loadTags();
    } else if (tab === 'extensions') {
      if (viewExtensions) viewExtensions.style.display = 'flex';
      if (titleEl) titleEl.innerText = 'Quản lý Extensions';
      this.extensionsView.loadExtensions();
    } else if (tab === 'settings') {
      if (viewSettings) viewSettings.style.display = 'block';
      if (titleEl) titleEl.innerText = 'Cài đặt';
      this.settingsView.loadData(this.licenseStatus);
    } else {
      // Các tab phụ (Plugins, Automation, Appstore...)
      const tabNames = {
        plugins: 'Quản lý Plugins',
        automation: 'SV Browser Automate Editor',
        appstore: 'Cửa hàng Ứng dụng (App Store)',
        developer: 'Tài liệu Dành cho Lập trình viên (Developer)',
        log: 'Nhật ký Hoạt động (Logs)',
        about: 'Giới thiệu SV Browser'
      };

      const title = tabNames[tab] || tab.toUpperCase();
      if (titleEl) titleEl.innerText = title;
      await this.placeholderView.show(tab, title);
    }
  }
}

// Khởi tạo ứng dụng khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
