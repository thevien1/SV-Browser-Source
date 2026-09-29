import { renderFlagHtml } from '../data/countries.js';

export class ProfilesViewComponent {

  constructor(options = {}) {
    this.container = options.container || document.getElementById('view-profiles');
    this.modals = options.modals || null;
    this.onAddProfile = options.onAddProfile || (() => {});
    this.onBatchProfile = options.onBatchProfile || (() => {});
    this.profiles = [];
    this.groups = ['Default group'];
    this.tags = [];
    this.selectedIds = new Set();
    const savedPerPage = parseInt(localStorage.getItem('profiles_per_page'), 10);
    this.perPage = (!isNaN(savedPerPage) && savedPerPage > 0) ? savedPerPage : 50;
    this.currentPage = 1;
    const savedSort = localStorage.getItem('profiles_sort_pref');
    this.filter = {
      search: '',
      group: '',
      tag: '',
      sort: savedSort || 'name_asc'
    };
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- License Warning Banner (Hiện khi chưa kích hoạt hoặc đã hết hạn) -->
      <div id="profiles-license-warning-bar" style="display: none; margin-bottom: 14px;"></div>

      <!-- Core Warning Banner (Hiện khi chưa cài đặt Core nào trong máy) -->
      <div id="profiles-core-warning-bar" style="display: none; margin-bottom: 14px;"></div>

      <!-- Action Toolbar -->
      <div class="action-toolbar">
        <div class="action-buttons-group">
          <button class="btn btn-primary" id="btn-add-profile">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Thêm mới</span>
          </button>
          <div style="position: relative; display: inline-block;">
            <button class="btn btn-orange" id="btn-batch-profile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Tạo hàng loạt</span>
            </button>
            <div class="batch-dropdown-menu" id="batch-dropdown-menu" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.12); z-index: 1000; min-width: 155px; padding: 4px 0;">
              <button type="button" class="batch-menu-item" id="btn-batch-by-count" style="display: block; width: 100%; text-align: left; padding: 9px 16px; border: none; background: transparent; font-size: 13.5px; color: var(--text-main); cursor: pointer;">
                Theo số lượng
              </button>
              <button type="button" class="batch-menu-item" id="btn-batch-by-excel" style="display: block; width: 100%; text-align: left; padding: 9px 16px; border: none; background: transparent; font-size: 13.5px; color: var(--text-main); cursor: pointer;">
                Từ file Excel
              </button>
            </div>
          </div>
          <button class="btn btn-outline" id="btn-import">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Import</span>
          </button>
        </div>

        <div class="search-filter-group">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="input-search" placeholder="Tìm kiếm profile, proxy, note..." value="${this.escape(this.filter.search || '')}" autocomplete="off" spellcheck="false">
            <button type="button" id="btn-clear-search" title="Xóa tìm kiếm" style="display: ${this.filter.search ? 'inline-flex' : 'none'}; position: absolute; right: 8px; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; padding: 2px; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%;">✕</button>
          </div>

          <select class="select-input" id="filter-group">
            <option value="">--- Chọn nhóm ---</option>
            <option value="Default group">Default group</option>
          </select>

          <select class="select-input" id="filter-tag" style="min-width: 140px;">
            <option value="">--- Chọn tag ---</option>
          </select>

          <select class="select-input" id="filter-sort">
            <option value="name_asc" ${this.filter.sort === 'name_asc' ? 'selected' : ''}>Tên / STT [001 -> 050 (A -> Z)]</option>
            <option value="name_desc" ${this.filter.sort === 'name_desc' ? 'selected' : ''}>Tên / STT [050 -> 001 (Z -> A)]</option>
            <option value="newest" ${this.filter.sort === 'newest' ? 'selected' : ''}>Ngày tạo [Mới -> Cũ]</option>
            <option value="oldest" ${this.filter.sort === 'oldest' ? 'selected' : ''}>Ngày tạo [Cũ -> Mới]</option>
            <option value="custom" ${this.filter.sort === 'custom' ? 'selected' : ''}>Tùy chỉnh (Thứ tự kéo thả)</option>
          </select>

          <span style="font-size: 13px; color: var(--text-muted); margin-left: 5px;">Chế độ chọn: Truyền thống</span>
        </div>
      </div>

      <!-- Bulk Action Bar (Chuẩn Ảnh 1 & 2) -->
      <div class="bulk-bar disabled" id="bulk-bar">
        <div class="bulk-left-group" style="display: flex; align-items: center; gap: 8px;">
          <button type="button" id="btn-bulk-deselect-all" title="Bỏ chọn tất cả" style="background: transparent; border: none; font-size: 14px; display: flex; align-items: center; padding: 2px;">✕</button>
          <div class="bulk-count" id="bulk-selected-count">0 profile đang chọn</div>
          <span class="bulk-divider">|</span>
        </div>

        <div class="bulk-btn-group" style="display: flex; align-items: center; gap: 6px;">
          <button class="btn-bulk btn-bulk-launch" id="btn-bulk-open" title="Mở các profile đã chọn">▶ Mở</button>
          <button class="btn-bulk btn-bulk-stop" id="btn-bulk-close" title="Đóng các profile đã chọn">■ Đóng</button>

          <!-- Dropdown Export -->
          <div class="bulk-dropdown-wrapper" style="position: relative; display: inline-block;">
            <button class="btn-bulk btn-bulk-normal" id="btn-bulk-export">Export ⌵</button>
            <div class="tools-dropdown-menu" id="export-dropdown-menu" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.12); z-index: 1000; min-width: 170px; padding: 4px 0;">
              <button type="button" class="tools-menu-item" id="btn-export-profiles">
                Export profiles
              </button>
              <button type="button" class="tools-menu-item" id="btn-export-cookies">
                Export cookies
              </button>
            </div>
          </div>

          <!-- Dropdown Sửa (Chuẩn Hình 4) -->
          <div class="bulk-dropdown-wrapper" style="position: relative; display: inline-block;">
            <button class="btn-bulk btn-bulk-normal" id="btn-bulk-edit">Sửa ⌵</button>
            <div class="tools-dropdown-menu" id="edit-dropdown-menu" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.12); z-index: 1000; min-width: 210px; padding: 4px 0;">
              <button type="button" class="tools-menu-item" id="btn-bulk-change-group">
                Thay đổi nhóm
              </button>
              <button type="button" class="tools-menu-item" id="btn-bulk-change-tags">
                Gán / Sửa tags
              </button>
              <button type="button" class="tools-menu-item" id="btn-bulk-rename">
                Đổi tên
              </button>
              <button type="button" class="tools-menu-item" id="btn-bulk-update-proxy">
                Cập nhật proxy
              </button>
              <button type="button" class="tools-menu-item" id="btn-bulk-update-version">
                Cập nhật phiên bản trình duyệt
              </button>
              <button type="button" class="tools-menu-item" id="btn-bulk-update-start-url">
                Thay đổi URL khởi động
              </button>
              <button type="button" class="tools-menu-item" id="btn-bulk-update-fingerprint">
                Thay đổi fingerprint
              </button>
            </div>
          </div>

          <!-- Dropdown Sao chép -->
          <div class="bulk-dropdown-wrapper" style="position: relative; display: inline-block;">
            <button class="btn-bulk btn-bulk-normal" id="btn-bulk-clone">Sao chép ⌵</button>
            <div class="tools-dropdown-menu" id="clone-dropdown-menu" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.12); z-index: 1000; min-width: 170px; padding: 4px 0;">
              <button type="button" class="tools-menu-item" id="btn-bulk-action-clone">
                <span class="tools-item-icon">📑</span> Nhân bản profile
              </button>
              <button type="button" class="tools-menu-item" id="btn-bulk-copy-proxy">
                <span class="tools-item-icon">🌐</span> Copy Proxy
              </button>
              <button type="button" class="tools-menu-item" id="btn-bulk-copy-id">
                <span class="tools-item-icon">🆔</span> Copy ID Profile
              </button>
            </div>
          </div>

          <!-- Nút Xóa -->
          <button class="btn-bulk btn-bulk-delete" id="btn-bulk-delete" title="Xóa các profile đã chọn">🗑 Xóa</button>

          <!-- Dropdown Công cụ -->
          <div class="bulk-dropdown-wrapper" style="position: relative; display: inline-block;">
            <button class="btn-bulk btn-bulk-normal" id="btn-bulk-tools">Công cụ ⌵</button>
            <div class="tools-dropdown-menu" id="tools-dropdown-menu" style="display: none; position: absolute; top: calc(100% + 4px); right: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.12); z-index: 1000; min-width: 190px; padding: 4px 0;">
              <button type="button" class="tools-menu-item" id="btn-tool-check-proxy">
                <span class="tools-item-icon">🔗</span> Kiểm tra proxy
              </button>
              <button type="button" class="tools-menu-item" id="btn-tool-clear-cache">
                <span class="tools-item-icon">🗑</span> Xóa cache
              </button>
              <button type="button" class="tools-menu-item" id="btn-tool-sync-actions">
                <span class="tools-item-icon">🔄</span> Đồng bộ thao tác
              </button>
              <button type="button" class="tools-menu-item" id="btn-tool-arrange-windows">
                <span class="tools-item-icon">🪟</span> Sắp xếp cửa sổ trình duyệt
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Profiles Table -->
      <div class="table-wrapper">
        <table class="profile-table">
          <thead>
            <tr>
              <th style="width: 44px; text-align: center;"><input type="checkbox" id="check-select-all"></th>
              <th style="min-width: 210px; width: 22%; user-select: none;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <span id="btn-sort-name" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Bấm để đảo chiều sắp xếp theo Tên / STT (001 -> 050 hoặc 050 -> 001)">
                    <span>Tên profile</span>
                    <span id="sort-name-indicator" style="font-size: 11px; color: #0284c7; font-weight: bold;">▲</span>
                  </span>
                  <button type="button" id="btn-active-profiles-actions" class="btn-live-actions" title="Thao tác với profile đang mở">Thao tác với profile đang mở</button>
                </div>
              </th>
              <th style="min-width: 170px; width: 18%;">Proxy</th>
              <th style="width: 95px; white-space: nowrap;">Trạng thái</th>
              <th style="width: 105px; white-space: nowrap;">Lần chạy cuối</th>
              <th style="min-width: 190px; width: 22%;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Tags</span>
                  <button type="button" class="btn-header-filter" title="Lọc Tags" style="background: none; border: none; cursor: pointer; color: #64748b; padding: 0 4px; display: flex; align-items: center;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                  </button>
                </div>
              </th>
              <th style="min-width: 130px; width: 14%;">Ghi chú</th>
              <th style="width: 115px; text-align: right;">
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                  <span>Thao tác</span>
                  <button type="button" id="btn-table-settings" title="Cài đặt cột" style="background: none; border: none; cursor: pointer; color: #64748b; padding: 0; display: flex; align-items: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"></path></svg>
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody id="profiles-tbody">
            <!-- Table rows rendered dynamically -->
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="pagination-footer">
        <div class="page-controls">
          <button class="page-btn" id="btn-prev-page" title="Trang trước">&lt;</button>
          <span id="page-display">1 / 1</span>
          <button class="page-btn" id="btn-next-page" title="Trang sau">&gt;</button>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>Số bản ghi mỗi trang: </span>
          <input type="number" id="per-page-input" class="form-control" min="1" max="10000" value="${this.perPage}" style="width: 58px; height: 28px; padding: 0 6px; text-align: center; font-size: 13px; font-weight: 600; border: 1px solid var(--border-color); border-radius: 4px; display: inline-block;" title="Nhập số bản ghi tùy ý">
          <select class="select-input" style="height: 28px; padding: 0 5px;" id="per-page-select" title="Chọn số bản ghi mỗi trang">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50" ${this.perPage === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${this.perPage === 100 ? 'selected' : ''}>100</option>
            <option value="200" ${this.perPage === 200 ? 'selected' : ''}>200</option>
            <option value="500" ${this.perPage === 500 ? 'selected' : ''}>500</option>
            <option value="custom" ${![10, 20, 50, 100, 200, 500].includes(this.perPage) ? 'selected' : ''}>Tùy chọn...</option>
          </select>
        </div>
        <div>
          <span>Tổng số: <strong id="total-count-display">0</strong></span>
        </div>
      </div>

      <!-- MODAL: Sửa Proxy Profile -->
      <div class="modal-overlay" id="modal-edit-proxy">
        <div class="modal-dialog" style="width: 480px; max-width: 92%;">
          <div class="modal-header">
            <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              <span>Sửa Proxy</span>
            </div>
            <button class="window-btn close" id="btn-close-edit-proxy" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="font-size: 13px; color: var(--text-muted);">
              Profile: <strong id="edit-proxy-profile-name" style="color: #0284c7;">Profile Name</strong>
            </div>

            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">
                Cấu hình Proxy:
              </label>
              <textarea id="edit-proxy-input-value" class="form-control" rows="3" placeholder="Định dạng: host:port:user:pass hoặc ip:port (vd: 67.216.237.38:3128)&#10;Để trống nếu không dùng proxy." style="width: 100%; height: 75px; font-size: 13px; padding: 8px 12px; font-family: monospace; resize: vertical; box-sizing: border-box;"></textarea>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
                <span style="font-size: 12px; color: var(--text-muted);">Hỗ trợ HTTP / HTTPS / SOCKS5</span>
                <button type="button" id="btn-set-no-proxy" style="background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: underline;">
                  Không dùng proxy
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button id="btn-cancel-edit-proxy" class="btn btn-outline" style="height: 36px; padding: 0 16px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-muted); font-size: 13px; font-weight: 500; cursor: pointer;">
              Hủy
            </button>
            <button id="btn-save-edit-proxy" class="btn btn-primary" style="height: 36px; padding: 0 20px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;">
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: Sửa Ghi chú Profile -->
      <div class="modal-overlay" id="modal-edit-note">
        <div class="modal-dialog" style="width: 480px; max-width: 92%;">
          <div class="modal-header">
            <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span>Ghi chú Profile</span>
            </div>
            <button class="window-btn close" id="btn-close-edit-note" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="font-size: 13px; color: var(--text-muted);">
              Profile: <strong id="edit-note-profile-name" style="color: #0284c7;">Profile Name</strong>
            </div>

            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">
                Nội dung ghi chú:
              </label>
              <textarea id="edit-note-input-value" class="form-control" rows="3" placeholder="Nhập ghi chú cho profile này...&#10;Để trống nếu không muốn ghi chú." style="width: 100%; height: 85px; font-size: 13px; padding: 8px 12px; resize: vertical; box-sizing: border-box;"></textarea>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
                <span style="font-size: 12px; color: var(--text-muted);">Nhấn Ctrl+Enter hoặc bấm Lưu để hoàn tất</span>
                <button type="button" id="btn-clear-note" style="background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: underline;">
                  Xóa ghi chú
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button id="btn-cancel-edit-note" class="btn btn-outline" style="height: 36px; padding: 0 16px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-muted); font-size: 13px; font-weight: 500; cursor: pointer;">
              Hủy
            </button>
            <button id="btn-save-edit-note" class="btn btn-primary" style="height: 36px; padding: 0 20px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;">
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: Sửa Tags Profile -->
      <div class="modal-overlay" id="modal-edit-tags">
        <div class="modal-dialog" style="width: 480px; max-width: 92%;">
          <div class="modal-header">
            <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🏷️</span>
              <span>Gán & Sửa Tags Profile</span>
            </div>
            <button class="window-btn close" id="btn-close-edit-tags" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="font-size: 13px; color: var(--text-muted);">
              Profile: <strong id="edit-tags-profile-name" style="color: #0284c7;">Profile Name</strong>
            </div>

            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">
                Danh sách Tags (phân cách bằng dấu phẩy):
              </label>
              <input type="text" id="edit-tags-input-value" class="form-control" placeholder="Ví dụ: Ads, Facebook, NuoiNick..." style="width: 100%; height: 38px; font-size: 13px; padding: 8px 12px; box-sizing: border-box;">

              <div id="edit-tags-suggestions" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                <!-- Gợi ý các tag có sẵn -->
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
                <span style="font-size: 12px; color: var(--text-muted);">Nhấn Enter hoặc bấm Lưu để hoàn tất</span>
                <button type="button" id="btn-clear-tags" style="background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: underline;">
                  Xóa hết tag
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button id="btn-cancel-edit-tags" class="btn btn-outline" style="height: 36px; padding: 0 16px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-muted); font-size: 13px; font-weight: 500; cursor: pointer;">
              Hủy
            </button>
            <button id="btn-save-edit-tags" class="btn btn-primary" style="height: 36px; padding: 0 20px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;">
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: Export profiles (Chuẩn 100% theo Hình 2) -->
      <div class="modal-overlay" id="modal-export-profiles">
        <div class="modal-dialog" style="width: 490px; max-width: 95%;">
          <div class="modal-header" style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color);">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #e0f2fe; display: flex; align-items: center; justify-content: center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M12 18v-6"></path>
                  <path d="m9 15 3 3 3-3"></path>
                </svg>
              </div>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Export profiles</span>
            </div>
            <button class="window-btn close" id="btn-close-export-profiles" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 18px;">
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Thư mục đầu ra</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" id="export-output-path" class="form-control" placeholder="Chọn đường dẫn" readonly style="flex: 1; height: 38px; font-size: 13px; padding: 0 12px; background: var(--bg-body); cursor: pointer; border: 1px solid var(--border-color); border-radius: 4px;" />
                <button type="button" id="btn-browse-export-path" class="btn btn-outline" style="width: 44px; height: 38px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); cursor: pointer;">...</button>
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Định dạng export</label>
              <div style="display: inline-flex; border: 1px solid var(--border-color); border-radius: 6px; padding: 3px; background: var(--bg-body); gap: 4px;">
                <button type="button" id="btn-export-fmt-folder" class="export-fmt-btn active" style="padding: 6px 18px; border: none; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; background: #fff; color: #0284c7; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: all 0.15s;">Thư mục</button>
                <button type="button" id="btn-export-fmt-zip" class="export-fmt-btn" style="padding: 6px 18px; border: none; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; background: transparent; color: var(--text-muted); transition: all 0.15s;">Zip file</button>
              </div>
            </div>

            <!-- Progress container cho Export (Hiển thị phần trăm từng cái chuẩn đẹp) -->
            <div id="export-progress-container" style="display: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span id="export-progress-status" style="font-size: 12.5px; font-weight: 600; color: #0284c7; display: flex; align-items: center; gap: 6px;">
                  <span class="spinner-circle" style="width: 14px; height: 14px; border-width: 2px;"></span>
                  <span>Đang chuẩn bị export...</span>
                </span>
                <span id="export-progress-percent" style="font-size: 13px; font-weight: 700; color: #0284c7;">0%</span>
              </div>
              <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                <div id="export-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #0284c7); border-radius: 999px; transition: width 0.2s ease;"></div>
              </div>
            </div>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color);">
            <div id="export-footer-status" style="display: none; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted);">
              <span class="spinner-circle" style="width: 14px; height: 14px; border-width: 2px;"></span>
              <span id="export-footer-text">Zipping...</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
              <button type="button" id="btn-cancel-export-profiles" style="background: none; border: none; color: #0284c7; font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 6px 12px;">Hủy bỏ</button>
              <button type="button" id="btn-submit-export-profiles" class="btn btn-primary" style="height: 36px; padding: 0 22px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;">Export</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: Import profiles (Chuẩn 100% theo ảnh người dùng) -->
      <div class="modal-overlay" id="modal-import-profiles">
        <div class="modal-dialog" style="width: 540px; max-width: 95%;">
          <div class="modal-header" style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color);">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #e0f2fe; display: flex; align-items: center; justify-content: center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Import profiles</span>
            </div>
            <button class="window-btn close" id="btn-close-import-profiles" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
            <!-- Alert 1: Green hint -->
            <div style="background: #e6f9ed; border: 1px solid #b7ebd0; border-radius: 6px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #166534;">
              <span style="font-size: 15px; flex-shrink: 0;">💡</span>
              <span>Bạn có thể đóng Popup này trong quá trình Import</span>
            </div>

            <!-- Alert 2: Orange warning -->
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #b45309; line-height: 1.45;">
              <span style="font-size: 15px; flex-shrink: 0; margin-top: -1px;">📍</span>
              <span>Trong trường hợp profile chứa dữ liệu của Extension, máy thực hiện Import cũng cần cài đặt các Extension tương ứng để đảm bảo dữ liệu được sử dụng đúng cách</span>
            </div>

            <!-- Field 1: Loại -->
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Loại</label>
              <div style="display: inline-flex; border: 1px solid var(--border-color); border-radius: 6px; padding: 3px; background: var(--bg-body); gap: 4px;">
                <button type="button" id="btn-import-type-folder" class="import-type-btn active" style="padding: 6px 18px; border: 1px solid #3b82f6; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; background: #eff6ff; color: #2563eb; transition: all 0.15s;">Thư mục</button>
                <button type="button" id="btn-import-type-zip" class="import-type-btn" style="padding: 6px 18px; border: 1px solid transparent; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; background: transparent; color: var(--text-muted); transition: all 0.15s;">Zip file</button>
              </div>
            </div>

            <!-- Field 2: Nguồn profile -->
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Nguồn profile</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" id="import-source-path" class="form-control" placeholder="Chọn đường dẫn" readonly style="flex: 1; height: 38px; font-size: 13px; padding: 0 12px; background: var(--bg-body); cursor: pointer; border: 1px solid var(--border-color); border-radius: 4px;" />
                <button type="button" id="btn-browse-import-path" class="btn btn-outline" style="width: 44px; height: 38px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); cursor: pointer;">...</button>
              </div>
            </div>

            <!-- Field 3: Chọn nhóm -->
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Chọn nhóm</label>
              <select id="import-target-group" class="form-control" style="width: 100%; height: 38px; font-size: 13px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-main);">
                <option value="">Chọn nhóm</option>
              </select>
            </div>

            <!-- Progress container cho Import (Hiển thị phần trăm từng cái chuẩn đẹp) -->
            <div id="import-progress-container" style="display: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span id="import-progress-status" style="font-size: 12.5px; font-weight: 600; color: #0284c7; display: flex; align-items: center; gap: 6px;">
                  <span class="spinner-circle" style="width: 14px; height: 14px; border-width: 2px;"></span>
                  <span>Đang chuẩn bị import...</span>
                </span>
                <span id="import-progress-percent" style="font-size: 13px; font-weight: 700; color: #0284c7;">0%</span>
              </div>
              <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                <div id="import-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #0284c7); border-radius: 999px; transition: width 0.2s ease;"></div>
              </div>
            </div>

            <div id="import-status-banner" style="display: none; padding: 10px; border-radius: 6px; font-size: 13px;"></div>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color);">
            <div id="import-footer-status" style="display: none; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted);">
              <span class="spinner-circle" style="width: 14px; height: 14px; border-width: 2px;"></span>
              <span id="import-footer-text">Đang import...</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
              <button type="button" id="btn-cancel-import-profiles" style="background: none; border: none; color: #0284c7; font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 6px 12px;">Hủy bỏ</button>
              <button type="button" id="btn-submit-import-profiles" class="btn btn-primary" style="height: 36px; padding: 0 22px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;">Import</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: Cập nhật tên (Chuẩn 100% theo Hình 3) -->
      <div class="modal-overlay" id="modal-bulk-rename">
        <div class="modal-dialog" style="width: 520px; max-width: 95%;">
          <div class="modal-header" style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color);">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </div>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Cập nhật tên</span>
            </div>
            <button class="window-btn close" id="btn-close-bulk-rename" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 8px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Đổi tên</label>
            <textarea id="bulk-rename-textarea" class="form-control" rows="8" style="width: 100%; height: 210px; font-size: 13.5px; padding: 10px 14px; font-family: inherit; line-height: 1.5; resize: vertical; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 6px;"></textarea>
            <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">Mỗi dòng tương ứng với một tên profile</div>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color);">
            <button type="button" id="btn-cancel-bulk-rename" style="background: none; border: none; color: #0284c7; font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 6px 12px;">Cancel</button>
            <button type="button" id="btn-submit-bulk-rename" class="btn btn-primary" style="height: 36px; padding: 0 24px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;">OK</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Cập nhật proxy (Chuẩn 100% theo Hình 5) -->
      <div class="modal-overlay" id="modal-bulk-update-proxy">
        <div class="modal-dialog" style="width: 600px; max-width: 95%;">
          <div class="modal-header" style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color);">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </div>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Cập nhật proxy</span>
            </div>
            <button class="window-btn close" id="btn-close-bulk-update-proxy" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 8px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Cập nhật proxy</label>
            <textarea id="bulk-update-proxy-textarea" class="form-control" rows="8" style="width: 100%; height: 210px; font-size: 13px; padding: 10px 14px; font-family: monospace; line-height: 1.5; resize: vertical; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 6px;"></textarea>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">
              Mỗi dòng tương ứng với một proxy cho profile. Định dạng: IP:Port hoặc socks5://IP:Port (nếu là socks5) (cho phép User:Password). Sử dụng 'null' nếu không sử dụng proxy
            </div>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color);">
            <button type="button" id="btn-cancel-bulk-update-proxy" style="background: none; border: none; color: #0284c7; font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 6px 12px;">Cancel</button>
            <button type="button" id="btn-submit-bulk-update-proxy" class="btn btn-primary" style="height: 36px; padding: 0 24px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;">OK</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Thay đổi nhóm hàng loạt -->
      <div class="modal-overlay" id="modal-bulk-change-group-dialog">
        <div class="modal-dialog" style="width: 440px; max-width: 95%;">
          <div class="modal-header" style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color);">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Thay đổi nhóm</span>
            </div>
            <button class="window-btn close" id="btn-close-bulk-change-group" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main);">Chọn nhóm mới:</label>
            <select id="bulk-change-group-select" class="form-control" style="width: 100%; height: 38px; font-size: 13.5px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-main);"></select>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color);">
            <button type="button" id="btn-cancel-bulk-group" style="background: none; border: none; color: #0284c7; font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 6px 12px;">Cancel</button>
            <button type="button" id="btn-submit-bulk-group" class="btn btn-primary" style="height: 36px; padding: 0 24px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;">OK</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Thay đổi tags hàng loạt -->
      <div class="modal-overlay" id="modal-bulk-change-tags-dialog">
        <div class="modal-dialog" style="width: 480px; max-width: 95%;">
          <div class="modal-header" style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color);">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Thay đổi Tags hàng loạt</span>
            </div>
            <button class="window-btn close" id="btn-close-bulk-change-tags" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main);">Nhập tags (cách nhau bởi dấu phẩy):</label>
            <input type="text" id="bulk-change-tags-input" class="form-control" placeholder="Ví dụ: Ads, Facebook, 2026..." style="width: 100%; height: 38px; padding: 0 12px; font-size: 13px; box-sizing: border-box;">

            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--text-muted); margin-top: 4px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="bulk_tag_mode" value="replace" checked> Thay thế toàn bộ tags cũ bằng tags mới
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="bulk_tag_mode" value="append"> Thêm vào tags hiện có (giữ nguyên tag cũ)
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="bulk_tag_mode" value="remove"> Xóa các tags này khỏi profiles đã chọn
              </label>
            </div>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color);">
            <button type="button" id="btn-cancel-bulk-tags" style="background: none; border: none; color: #0284c7; font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 6px 12px;">Cancel</button>
            <button type="button" id="btn-submit-bulk-tags" class="btn btn-primary" style="height: 36px; padding: 0 24px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;">OK</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Cập nhật phiên bản trình duyệt hàng loạt -->
      <div class="modal-overlay" id="modal-bulk-update-version-dialog">
        <div class="modal-dialog" style="width: 440px; max-width: 95%;">
          <div class="modal-header" style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color);">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Cập nhật phiên bản trình duyệt</span>
            </div>
            <button class="window-btn close" id="btn-close-bulk-version" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main);">Chọn phiên bản Chromium:</label>
            <select id="bulk-update-version-select" class="form-control" style="width: 100%; height: 38px; font-size: 13.5px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-main);">
              <option value="chrome|151.0.7922.76" selected>Chrome 151 (151.0.7922.76)</option>
              <option value="chrome|152.0.7977.83">Chrome 152 (152.0.7977.83)</option>
              <option value="chrome|153.0.8010.37">Chrome 153 (153.0.8010.37)</option>
              <option value="edge|124.0">Edge 124 (124.0)</option>
            </select>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color);">
            <button type="button" id="btn-cancel-bulk-version" style="background: none; border: none; color: #0284c7; font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 6px 12px;">Cancel</button>
            <button type="button" id="btn-submit-bulk-version" class="btn btn-primary" style="height: 36px; padding: 0 24px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;">OK</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Thay đổi URL khởi động hàng loạt -->
      <div class="modal-overlay" id="modal-bulk-start-url-dialog">
        <div class="modal-dialog" style="width: 480px; max-width: 95%;">
          <div class="modal-header" style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color);">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Thay đổi URL khởi động</span>
            </div>
            <button class="window-btn close" id="btn-close-bulk-start-url" style="font-size: 16px;">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-main);">URL trang khởi động:</label>
            <input type="text" id="bulk-start-url-input" class="form-control" placeholder="" style="width: 100%; height: 38px; font-size: 13.5px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-card); color: var(--text-main);" />
            <div style="font-size: 12px; color: var(--text-muted);">Để trống nếu muốn mở trang trắng hoặc trang mặc định.</div>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color);">
            <button type="button" id="btn-cancel-bulk-start-url" style="background: none; border: none; color: #0284c7; font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 6px 12px;">Cancel</button>
            <button type="button" id="btn-submit-bulk-start-url" class="btn btn-primary" style="height: 36px; padding: 0 24px; background: #0284c7; border: none; border-radius: 4px; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;">OK</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#btn-add-profile')?.addEventListener('click', () => this.onAddProfile());

    const btnBatch = this.container.querySelector('#btn-batch-profile');
    const batchMenu = this.container.querySelector('#batch-dropdown-menu');

    btnBatch?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = batchMenu.style.display === 'block';
      batchMenu.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      if (batchMenu) batchMenu.style.display = 'none';
    });

    this.container.querySelector('#btn-batch-by-count')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (batchMenu) batchMenu.style.display = 'none';
      this.onBatchProfile('count');
    });

    this.container.querySelector('#btn-batch-by-excel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (batchMenu) batchMenu.style.display = 'none';
      this.onBatchProfile('excel');
    });

    // Search & Filter
    const inputSearch = this.container.querySelector('#input-search');
    const btnClearSearch = this.container.querySelector('#btn-clear-search');

    inputSearch?.addEventListener('input', (e) => {
      this.filter.search = e.target.value;
      if (btnClearSearch) {
        btnClearSearch.style.display = e.target.value ? 'inline-flex' : 'none';
      }
      this.currentPage = 1;
      this.renderTableRows();
    });

    inputSearch?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        inputSearch.value = '';
        this.filter.search = '';
        if (btnClearSearch) btnClearSearch.style.display = 'none';
        this.currentPage = 1;
        this.renderTableRows();
      }
    });

    btnClearSearch?.addEventListener('click', () => {
      if (inputSearch) {
        inputSearch.value = '';
        inputSearch.focus();
      }
      this.filter.search = '';
      if (btnClearSearch) btnClearSearch.style.display = 'none';
      this.currentPage = 1;
      this.renderTableRows();
    });

    this.container.querySelector('#filter-group')?.addEventListener('change', (e) => {
      this.filter.group = e.target.value;
      this.currentPage = 1;
      this.renderTableRows();
    });

    this.container.querySelector('#filter-tag')?.addEventListener('change', (e) => {
      this.filter.tag = e.target.value;
      this.currentPage = 1;
      this.renderTableRows();
    });

    this.container.querySelector('.btn-header-filter')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectTag = this.container.querySelector('#filter-tag');
      if (selectTag) {
        selectTag.focus();
        if (typeof selectTag.showPicker === 'function') {
          try { selectTag.showPicker(); } catch (_) {}
        }
      }
    });

    this.container.querySelector('#btn-sort-name')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.filter.sort === 'name_asc') {
        this.filter.sort = 'name_desc';
      } else {
        this.filter.sort = 'name_asc';
      }
      localStorage.setItem('profiles_sort_pref', this.filter.sort);
      const sortSelect = this.container.querySelector('#filter-sort');
      if (sortSelect) sortSelect.value = this.filter.sort;
      this.updateSortIndicator();
      this.currentPage = 1;
      this.renderTableRows();
    });

    this.container.querySelector('#filter-sort')?.addEventListener('change', (e) => {
      this.filter.sort = e.target.value;
      localStorage.setItem('profiles_sort_pref', this.filter.sort);
      this.updateSortIndicator();
      this.currentPage = 1;
      this.renderTableRows();
    });

    // Check All (chọn tất cả profile trên trang hiện tại)
    this.container.querySelector('#check-select-all')?.addEventListener('change', (e) => {
      const startIndex = (this.currentPage - 1) * this.perPage;
      const pageProfiles = (this.filteredProfiles && this.filteredProfiles.length > 0) 
        ? this.filteredProfiles.slice(startIndex, startIndex + this.perPage) 
        : [];
      if (e.target.checked) {
        pageProfiles.forEach(p => this.selectedIds.add(p.id));
      } else {
        pageProfiles.forEach(p => this.selectedIds.delete(p.id));
      }
      this.updateBulkBar();
      this.renderTableRows();
    });

    // Pagination Controls
    const prevBtn = this.container.querySelector('#btn-prev-page');
    const nextBtn = this.container.querySelector('#btn-next-page');
    const perPageSelect = this.container.querySelector('#per-page-select');
    const perPageInput = this.container.querySelector('#per-page-input');

    prevBtn?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderTableRows();
      }
    });

    nextBtn?.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil((this.filteredProfiles?.length || 0) / this.perPage));
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.renderTableRows();
      }
    });

    const updatePerPage = (val) => {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) {
        this.perPage = num;
        localStorage.setItem('profiles_per_page', String(num));
        if (perPageInput) perPageInput.value = num;
        if (perPageSelect) {
          const matchOpt = Array.from(perPageSelect.options).some(o => o.value === String(num));
          perPageSelect.value = matchOpt ? String(num) : 'custom';
        }
        this.currentPage = 1;
        this.renderTableRows();
      }
    };

    perPageSelect?.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        perPageInput?.focus();
        perPageInput?.select();
      } else {
        updatePerPage(e.target.value);
      }
    });

    perPageInput?.addEventListener('change', (e) => {
      updatePerPage(e.target.value);
    });

    perPageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        updatePerPage(e.target.value);
      }
    });

    // Deselect all
    this.container.querySelector('#btn-bulk-deselect-all')?.addEventListener('click', () => {
      this.selectedIds.clear();
      const chkAll = this.container.querySelector('#check-select-all');
      if (chkAll) chkAll.checked = false;
      this.updateBulkBar();
      this.renderTableRows();
    });

    // Bulk dropdown toggles
    this.container.querySelector('#btn-bulk-export')?.addEventListener('click', (e) => {
      this.toggleBulkDropdown('export-dropdown-menu', e);
    });

    this.container.querySelector('#btn-bulk-edit')?.addEventListener('click', (e) => {
      this.toggleBulkDropdown('edit-dropdown-menu', e);
    });

    this.container.querySelector('#btn-bulk-clone')?.addEventListener('click', (e) => {
      this.toggleBulkDropdown('clone-dropdown-menu', e);
    });

    this.container.querySelector('#btn-bulk-tools')?.addEventListener('click', (e) => {
      this.toggleBulkDropdown('tools-dropdown-menu', e);
    });

    document.addEventListener('click', () => {
      this.closeAllBulkDropdowns();
    });

    // Dropdown: Export Actions (Chuẩn Hình 1, 2)
    let exportFormat = 'folder';
    const modalExportProfiles = this.container.querySelector('#modal-export-profiles');
    const inputExportPath = this.container.querySelector('#export-output-path');
    const btnFmtFolder = this.container.querySelector('#btn-export-fmt-folder');
    const btnFmtZip = this.container.querySelector('#btn-export-fmt-zip');
    const btnBrowseExport = this.container.querySelector('#btn-browse-export-path');
    const btnCloseExport = this.container.querySelector('#btn-close-export-profiles');
    const btnCancelExport = this.container.querySelector('#btn-cancel-export-profiles');
    const btnSubmitExport = this.container.querySelector('#btn-submit-export-profiles');

    const closeExportModal = () => {
      if (modalExportProfiles) modalExportProfiles.classList.remove('active');
    };

    modalExportProfiles?.addEventListener('click', (e) => {
      if (e.target === modalExportProfiles) closeExportModal();
    });
    btnCloseExport?.addEventListener('click', closeExportModal);
    btnCancelExport?.addEventListener('click', closeExportModal);

    const updateFormatButtons = () => {
      if (exportFormat === 'folder') {
        if (btnFmtFolder) {
          btnFmtFolder.style.background = '#fff';
          btnFmtFolder.style.color = '#0284c7';
          btnFmtFolder.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
          btnFmtFolder.style.fontWeight = '600';
        }
        if (btnFmtZip) {
          btnFmtZip.style.background = 'transparent';
          btnFmtZip.style.color = 'var(--text-muted)';
          btnFmtZip.style.boxShadow = 'none';
          btnFmtZip.style.fontWeight = '500';
        }
      } else {
        if (btnFmtZip) {
          btnFmtZip.style.background = '#fff';
          btnFmtZip.style.color = '#0284c7';
          btnFmtZip.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
          btnFmtZip.style.fontWeight = '600';
        }
        if (btnFmtFolder) {
          btnFmtFolder.style.background = 'transparent';
          btnFmtFolder.style.color = 'var(--text-muted)';
          btnFmtFolder.style.boxShadow = 'none';
          btnFmtFolder.style.fontWeight = '500';
        }
      }
    };

    btnFmtFolder?.addEventListener('click', () => {
      exportFormat = 'folder';
      updateFormatButtons();
    });

    btnFmtZip?.addEventListener('click', () => {
      exportFormat = 'zip';
      updateFormatButtons();
    });

    const handleSelectExportDir = async () => {
      if (window.api && window.api.selectDirectory) {
        const dir = await window.api.selectDirectory(inputExportPath ? inputExportPath.value : '');
        if (dir && inputExportPath) {
          inputExportPath.value = dir;
        }
      }
    };

    const exportProgressContainer = this.container.querySelector('#export-progress-container');
    const exportProgressStatus = this.container.querySelector('#export-progress-status');
    const exportProgressPercent = this.container.querySelector('#export-progress-percent');
    const exportProgressBar = this.container.querySelector('#export-progress-bar');
    const exportFooterStatus = this.container.querySelector('#export-footer-status');
    const exportFooterText = this.container.querySelector('#export-footer-text');

    const resetExportProgress = () => {
      if (exportProgressContainer) exportProgressContainer.style.display = 'none';
      if (exportFooterStatus) exportFooterStatus.style.display = 'none';
      if (exportProgressBar) exportProgressBar.style.width = '0%';
      if (exportProgressPercent) exportProgressPercent.innerText = '0%';
      if (exportProgressStatus) {
        exportProgressStatus.innerHTML = `<span class="spinner-circle" style="width: 14px; height: 14px; border-width: 2px;"></span> <span>Đang chuẩn bị export...</span>`;
      }
      if (exportFooterText) exportFooterText.innerText = 'Zipping...';
    };

    if (window.api && window.api.onExportProgress) {
      window.api.onExportProgress((p) => {
        if (!p) return;
        if (exportProgressContainer) exportProgressContainer.style.display = 'block';
        if (exportFooterStatus) exportFooterStatus.style.display = 'flex';
        const pct = p.percent || 0;
        if (exportProgressBar) exportProgressBar.style.width = pct + '%';
        if (exportProgressPercent) exportProgressPercent.innerText = pct + '%';
        if (exportProgressStatus) {
          exportProgressStatus.innerHTML = `<span class="spinner-circle" style="width: 14px; height: 14px; border-width: 2px;"></span> <span>${this.escape(p.status || (p.name ? `Đang xử lý: ${p.name}` : 'Đang xử lý...'))}</span>`;
        }
        if (exportFooterText) {
          exportFooterText.innerText = exportFormat === 'zip' && pct >= 80 ? `Zipping... ${pct}%` : `Đang export... ${pct}%`;
        }
      });
    }

    btnBrowseExport?.addEventListener('click', handleSelectExportDir);
    inputExportPath?.addEventListener('click', handleSelectExportDir);

    btnSubmitExport?.addEventListener('click', async () => {
      const targetDir = inputExportPath ? inputExportPath.value.trim() : '';
      if (!targetDir) {
        alert('Vui lòng chọn thư mục đầu ra để export.');
        return;
      }
      const targetIds = Array.from(this.selectedIds);
      if (targetIds.length === 0) {
        alert('Vui lòng chọn ít nhất một profile.');
        return;
      }

      try {
        btnSubmitExport.disabled = true;
        btnSubmitExport.innerText = 'Đang export...';
        if (exportProgressContainer) exportProgressContainer.style.display = 'block';
        if (exportFooterStatus) exportFooterStatus.style.display = 'flex';
        if (exportFooterText) exportFooterText.innerText = exportFormat === 'zip' ? 'Zipping... 0%' : 'Đang export... 0%';

        if (window.api && window.api.exportProfiles) {
          const res = await window.api.exportProfiles(targetIds, targetDir, exportFormat);
          if (res && res.success) {
            if (exportProgressBar) exportProgressBar.style.width = '100%';
            if (exportProgressPercent) exportProgressPercent.innerText = '100%';
            if (exportProgressStatus) exportProgressStatus.innerHTML = `<span>✅ Hoàn tất export ${res.count} profile!</span>`;
            if (exportFooterText) exportFooterText.innerText = 'Hoàn tất 100%';

            await new Promise(r => setTimeout(r, 600));
            alert(`Export thành công ${res.count} profile vào:\n${res.filePath || targetDir}`);
            closeExportModal();
          } else {
            alert('Lỗi export: ' + (res?.message || 'Không rõ nguyên nhân'));
          }
        }
      } catch (err) {
        alert('Lỗi khi export profiles: ' + err.message);
      } finally {
        btnSubmitExport.disabled = false;
        btnSubmitExport.innerText = 'Export';
        resetExportProgress();
      }
    });

    this.container.querySelector('#btn-export-profiles')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      if (this.selectedIds.size === 0) {
        alert('Vui lòng chọn profile cần export.');
        return;
      }
      if (modalExportProfiles) {
        resetExportProgress();
        exportFormat = 'folder';
        updateFormatButtons();
        modalExportProfiles.classList.add('active');
      }
    });

    // Toolbar: Import Profiles Modal Logic (Chuẩn 100% theo ảnh người dùng)
    const btnImportToolbar = this.container.querySelector('#btn-import');
    const modalImportProfiles = this.container.querySelector('#modal-import-profiles');
    const inputImportPath = this.container.querySelector('#import-source-path');
    const selectImportGrp = this.container.querySelector('#import-target-group');
    const btnImportTypeFolder = this.container.querySelector('#btn-import-type-folder');
    const btnImportTypeZip = this.container.querySelector('#btn-import-type-zip');
    const btnBrowseImport = this.container.querySelector('#btn-browse-import-path');
    const btnCloseImport = this.container.querySelector('#btn-close-import-profiles');
    const btnCancelImport = this.container.querySelector('#btn-cancel-import-profiles');
    const btnSubmitImport = this.container.querySelector('#btn-submit-import-profiles');
    const importStatusBanner = this.container.querySelector('#import-status-banner');

    let importType = 'folder';

    const updateImportTypeButtons = () => {
      if (importType === 'folder') {
        if (btnImportTypeFolder) {
          btnImportTypeFolder.style.background = '#eff6ff';
          btnImportTypeFolder.style.color = '#2563eb';
          btnImportTypeFolder.style.borderColor = '#3b82f6';
          btnImportTypeFolder.style.fontWeight = '600';
        }
        if (btnImportTypeZip) {
          btnImportTypeZip.style.background = 'transparent';
          btnImportTypeZip.style.color = 'var(--text-muted)';
          btnImportTypeZip.style.borderColor = 'transparent';
          btnImportTypeZip.style.fontWeight = '500';
        }
        if (inputImportPath) inputImportPath.placeholder = 'Chọn đường dẫn thư mục profile';
      } else {
        if (btnImportTypeZip) {
          btnImportTypeZip.style.background = '#eff6ff';
          btnImportTypeZip.style.color = '#2563eb';
          btnImportTypeZip.style.borderColor = '#3b82f6';
          btnImportTypeZip.style.fontWeight = '600';
        }
        if (btnImportTypeFolder) {
          btnImportTypeFolder.style.background = 'transparent';
          btnImportTypeFolder.style.color = 'var(--text-muted)';
          btnImportTypeFolder.style.borderColor = 'transparent';
          btnImportTypeFolder.style.fontWeight = '500';
        }
        if (inputImportPath) inputImportPath.placeholder = 'Chọn file .zip profile';
      }
    };

    const importProgressContainer = this.container.querySelector('#import-progress-container');
    const importProgressStatus = this.container.querySelector('#import-progress-status');
    const importProgressPercent = this.container.querySelector('#import-progress-percent');
    const importProgressBar = this.container.querySelector('#import-progress-bar');
    const importFooterStatus = this.container.querySelector('#import-footer-status');
    const importFooterText = this.container.querySelector('#import-footer-text');

    const resetImportProgress = () => {
      if (importProgressContainer) importProgressContainer.style.display = 'none';
      if (importFooterStatus) importFooterStatus.style.display = 'none';
      if (importProgressBar) importProgressBar.style.width = '0%';
      if (importProgressPercent) importProgressPercent.innerText = '0%';
      if (importProgressStatus) {
        importProgressStatus.innerHTML = `<span class="spinner-circle" style="width: 14px; height: 14px; border-width: 2px;"></span> <span>Đang chuẩn bị import...</span>`;
      }
      if (importFooterText) importFooterText.innerText = 'Đang import...';
    };

    if (window.api && window.api.onImportProgress) {
      window.api.onImportProgress((p) => {
        if (!p) return;
        if (importProgressContainer) importProgressContainer.style.display = 'block';
        if (importFooterStatus) importFooterStatus.style.display = 'flex';
        const pct = p.percent || 0;
        if (importProgressBar) importProgressBar.style.width = pct + '%';
        if (importProgressPercent) importProgressPercent.innerText = pct + '%';
        if (importProgressStatus) {
          importProgressStatus.innerHTML = `<span class="spinner-circle" style="width: 14px; height: 14px; border-width: 2px;"></span> <span>${this.escape(p.status || (p.name ? `Đang import: ${p.name}` : 'Đang import...'))}</span>`;
        }
        if (importFooterText) {
          importFooterText.innerText = `Đang import... ${pct}%`;
        }
      });
    }

    const openImportModal = () => {
      if (!this.licenseStatus?.isActivated || this.licenseStatus?.isExpired) {
        if (window.showGlobalToast) {
          window.showGlobalToast('⚠️ Vui lòng kích hoạt bản quyền trước khi import profile!', true);
        }
        if (this.modals) this.modals.openModal('modal-license');
        else if (window.modalsComp) window.modalsComp.openModal('modal-license');
        return;
      }
      if (!modalImportProfiles) return;
      resetImportProgress();
      importType = 'folder';
      updateImportTypeButtons();
      if (inputImportPath) inputImportPath.value = '';
      if (importStatusBanner) {
        importStatusBanner.style.display = 'none';
        importStatusBanner.innerText = '';
      }
      if (selectImportGrp) {
        selectImportGrp.innerHTML = '<option value="">Chọn nhóm</option>' +
          this.groups.map(g => {
            const name = typeof g === 'object' ? g.name : g;
            return `<option value="${this.escape(name)}">${this.escape(name)}</option>`;
          }).join('');
      }
      modalImportProfiles.classList.add('active');
    };

    const closeImportModal = () => {
      if (modalImportProfiles) modalImportProfiles.classList.remove('active');
      resetImportProgress();
    };

    btnImportToolbar?.addEventListener('click', (e) => {
      e.stopPropagation();
      openImportModal();
    });

    btnCloseImport?.addEventListener('click', closeImportModal);
    btnCancelImport?.addEventListener('click', closeImportModal);
    modalImportProfiles?.addEventListener('click', (e) => {
      if (e.target === modalImportProfiles) closeImportModal();
    });

    btnImportTypeFolder?.addEventListener('click', () => {
      importType = 'folder';
      updateImportTypeButtons();
    });

    btnImportTypeZip?.addEventListener('click', () => {
      importType = 'zip';
      updateImportTypeButtons();
    });

    const handleSelectImportSource = async () => {
      if (importType === 'folder') {
        if (window.api && window.api.selectDirectory) {
          const dir = await window.api.selectDirectory(inputImportPath ? inputImportPath.value : '');
          if (dir && inputImportPath) {
            inputImportPath.value = dir;
          }
        }
      } else {
        if (window.api && window.api.selectZipFile) {
          const res = await window.api.selectZipFile();
          if (res && inputImportPath) {
            inputImportPath.value = Array.isArray(res) ? res.join('; ') : res;
          }
        }
      }
    };

    btnBrowseImport?.addEventListener('click', handleSelectImportSource);
    inputImportPath?.addEventListener('click', handleSelectImportSource);

    btnSubmitImport?.addEventListener('click', async () => {
      const source = inputImportPath ? inputImportPath.value.trim() : '';
      if (!source) {
        alert(importType === 'folder' ? 'Vui lòng chọn thư mục profile để import.' : 'Vui lòng chọn file .zip profile để import.');
        return;
      }

      try {
        btnSubmitImport.disabled = true;
        btnSubmitImport.innerText = 'Đang import...';
        if (importProgressContainer) importProgressContainer.style.display = 'block';
        if (importFooterStatus) importFooterStatus.style.display = 'flex';
        if (importFooterText) importFooterText.innerText = 'Đang import... 0%';

        if (window.api && window.api.importProfiles) {
          const res = await window.api.importProfiles({
            type: importType,
            sourcePath: source,
            group: selectImportGrp ? selectImportGrp.value : ''
          });

          if (res && res.success) {
            if (importProgressBar) importProgressBar.style.width = '100%';
            if (importProgressPercent) importProgressPercent.innerText = '100%';
            if (importProgressStatus) importProgressStatus.innerHTML = `<span>✅ Hoàn tất import ${res.count} profile!</span>`;
            if (importFooterText) importFooterText.innerText = 'Hoàn tất 100%';

            await new Promise(r => setTimeout(r, 600));
            await this.loadProfiles();
            alert(`Import thành công! Đã thêm ${res.count} profile vào hệ thống.`);
            closeImportModal();
          } else {
            alert('Lỗi import: ' + (res?.error || res?.message || 'Không thể import profile'));
          }
        }
      } catch (err) {
        alert('Lỗi trong quá trình import: ' + err.message);
      } finally {
        btnSubmitImport.disabled = false;
        btnSubmitImport.innerText = 'Import';
        resetImportProgress();
      }
    });

    this.container.querySelector('#btn-export-cookies')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      const targetIds = Array.from(this.selectedIds);
      if (targetIds.length === 0) {
        alert('Vui lòng chọn profile cần export cookies.');
        return;
      }
      if (window.api && window.api.exportCookies) {
        try {
          const res = await window.api.exportCookies(targetIds);
          if (res && res.success) {
            alert(`Đã export cookie của ${res.count} profile thành công!\nFile lưu tại: ${res.filePath}`);
          } else if (res && !res.canceled) {
            alert('Lỗi export cookies: ' + (res.error || res.message));
          }
        } catch (err) {
          alert('Lỗi export cookies: ' + err.message);
        }
      }
    });

    // Dropdown: Sửa Actions (Chuẩn Hình 3, 4, 5)

    // 1. Đổi tên hàng loạt (Hình 3 & 4)
    const modalBulkRename = this.container.querySelector('#modal-bulk-rename');
    const textareaBulkRename = this.container.querySelector('#bulk-rename-textarea');
    const btnCloseBulkRename = this.container.querySelector('#btn-close-bulk-rename');
    const btnCancelBulkRename = this.container.querySelector('#btn-cancel-bulk-rename');
    const btnSubmitBulkRename = this.container.querySelector('#btn-submit-bulk-rename');

    const closeBulkRenameModal = () => {
      if (modalBulkRename) modalBulkRename.classList.remove('active');
    };

    modalBulkRename?.addEventListener('click', (e) => {
      if (e.target === modalBulkRename) closeBulkRenameModal();
    });
    btnCloseBulkRename?.addEventListener('click', closeBulkRenameModal);
    btnCancelBulkRename?.addEventListener('click', closeBulkRenameModal);

    this.container.querySelector('#btn-bulk-rename')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      const targets = this.getSelectedProfilesInOrder();
      if (targets.length === 0) {
        alert('Vui lòng chọn ít nhất một profile để đổi tên.');
        return;
      }
      if (textareaBulkRename) {
        textareaBulkRename.value = targets.map(p => p.name || '').join('\n');
      }
      if (modalBulkRename) modalBulkRename.classList.add('active');
    });

    btnSubmitBulkRename?.addEventListener('click', async () => {
      const targets = this.getSelectedProfilesInOrder();
      if (targets.length === 0) return closeBulkRenameModal();
      const rawText = textareaBulkRename ? textareaBulkRename.value : '';
      const lines = rawText.split('\n');

      try {
        btnSubmitBulkRename.disabled = true;
        btnSubmitBulkRename.innerText = 'Đang lưu...';
        for (let i = 0; i < targets.length; i++) {
          const newName = (lines[i] !== undefined) ? lines[i].trim() : '';
          if (newName && newName !== targets[i].name) {
            if (window.api && window.api.updateProfile) {
              await window.api.updateProfile(targets[i].id, { name: newName });
            }
          }
        }
        closeBulkRenameModal();
        await this.loadProfiles();
      } catch (err) {
        alert('Lỗi đổi tên: ' + err.message);
      } finally {
        btnSubmitBulkRename.disabled = false;
        btnSubmitBulkRename.innerText = 'OK';
      }
    });

    // 2. Cập nhật proxy hàng loạt (Hình 4 & 5)
    const modalBulkUpdateProxy = this.container.querySelector('#modal-bulk-update-proxy');
    const textareaBulkProxy = this.container.querySelector('#bulk-update-proxy-textarea');
    const btnCloseBulkProxy = this.container.querySelector('#btn-close-bulk-update-proxy');
    const btnCancelBulkProxy = this.container.querySelector('#btn-cancel-bulk-update-proxy');
    const btnSubmitBulkProxy = this.container.querySelector('#btn-submit-bulk-update-proxy');

    const closeBulkProxyModal = () => {
      if (modalBulkUpdateProxy) modalBulkUpdateProxy.classList.remove('active');
    };

    modalBulkUpdateProxy?.addEventListener('click', (e) => {
      if (e.target === modalBulkUpdateProxy) closeBulkProxyModal();
    });
    btnCloseBulkProxy?.addEventListener('click', closeBulkProxyModal);
    btnCancelBulkProxy?.addEventListener('click', closeBulkProxyModal);

    this.container.querySelector('#btn-bulk-update-proxy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      const targets = this.getSelectedProfilesInOrder();
      if (targets.length === 0) {
        alert('Vui lòng chọn ít nhất một profile để cập nhật proxy.');
        return;
      }
      if (textareaBulkProxy) {
        textareaBulkProxy.value = targets.map(p => {
          const px = (p.proxy || '').trim();
          if (!px || px.toLowerCase() === 'no proxy') return 'null';
          return px;
        }).join('\n');
      }
      if (modalBulkUpdateProxy) modalBulkUpdateProxy.classList.add('active');
    });

    btnSubmitBulkProxy?.addEventListener('click', async () => {
      const targets = this.getSelectedProfilesInOrder();
      if (targets.length === 0) return closeBulkProxyModal();
      const rawText = textareaBulkProxy ? textareaBulkProxy.value : '';
      const lines = rawText.split('\n');

      try {
        btnSubmitBulkProxy.disabled = true;
        btnSubmitBulkProxy.innerText = 'Đang cập nhật...';
        for (let i = 0; i < targets.length; i++) {
          const lineVal = (lines[i] !== undefined) ? lines[i].trim() : '';
          let newProxy = lineVal;
          let proxyCountry = 'us';
          let status = 'ready';
          let ip = '';

          if (!lineVal || lineVal.toLowerCase() === 'null' || lineVal.toLowerCase() === 'no proxy') {
            newProxy = 'No Proxy';
            proxyCountry = 'vn';
            status = 'ready';
          } else if (window.api && window.api.testProxyString) {
            try {
              const testRes = await window.api.testProxyString(newProxy);
              if (testRes) {
                status = testRes.status || 'ready';
                proxyCountry = testRes.country || 'us';
                ip = testRes.ip || '';
              }
            } catch (e) {}
          }

          if (window.api && window.api.updateProfile) {
            await window.api.updateProfile(targets[i].id, {
              proxy: newProxy,
              proxyCountry,
              status,
              ...(ip ? { ip } : {})
            });
          }
        }
        closeBulkProxyModal();
        await this.loadProfiles();
        alert(`Đã cập nhật proxy cho ${targets.length} profile.`);
      } catch (err) {
        alert('Lỗi cập nhật proxy: ' + err.message);
      } finally {
        btnSubmitBulkProxy.disabled = false;
        btnSubmitBulkProxy.innerText = 'OK';
      }
    });

    // 3. Thay đổi nhóm hàng loạt (Hình 4)
    const modalBulkGroup = this.container.querySelector('#modal-bulk-change-group-dialog');
    const selectBulkGroup = this.container.querySelector('#bulk-change-group-select');
    const btnCloseBulkGroup = this.container.querySelector('#btn-close-bulk-change-group');
    const btnCancelBulkGroup = this.container.querySelector('#btn-cancel-bulk-group');
    const btnSubmitBulkGroup = this.container.querySelector('#btn-submit-bulk-group');

    const closeBulkGroupModal = () => {
      if (modalBulkGroup) modalBulkGroup.classList.remove('active');
    };

    modalBulkGroup?.addEventListener('click', (e) => {
      if (e.target === modalBulkGroup) closeBulkGroupModal();
    });
    btnCloseBulkGroup?.addEventListener('click', closeBulkGroupModal);
    btnCancelBulkGroup?.addEventListener('click', closeBulkGroupModal);

    this.container.querySelector('#btn-bulk-change-group')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      if (this.selectedIds.size === 0) {
        alert('Vui lòng chọn profile cần thay đổi nhóm.');
        return;
      }
      if (selectBulkGroup) {
        selectBulkGroup.innerHTML = '';
        (this.groups || ['Default group']).forEach(g => {
          const gName = typeof g === 'object' ? g.name : g;
          const opt = document.createElement('option');
          opt.value = gName;
          opt.textContent = gName;
          selectBulkGroup.appendChild(opt);
        });
      }
      if (modalBulkGroup) modalBulkGroup.classList.add('active');
    });

    btnSubmitBulkGroup?.addEventListener('click', async () => {
      const newGroup = selectBulkGroup ? selectBulkGroup.value : '';
      if (!newGroup) return closeBulkGroupModal();
      const targetIds = Array.from(this.selectedIds);

      try {
        btnSubmitBulkGroup.disabled = true;
        btnSubmitBulkGroup.innerText = 'Đang lưu...';
        await Promise.all(targetIds.map(id => {
          return window.api?.updateProfile ? window.api.updateProfile(id, { group: newGroup }) : Promise.resolve();
        }));
        closeBulkGroupModal();
        await this.loadProfiles();
        alert(`Đã chuyển ${targetIds.length} profile sang nhóm "${newGroup}".`);
      } catch (err) {
        alert('Lỗi thay đổi nhóm: ' + err.message);
      } finally {
        btnSubmitBulkGroup.disabled = false;
        btnSubmitBulkGroup.innerText = 'OK';
      }
    });

    // 3b. Thay đổi tags hàng loạt
    const modalBulkTags = this.container.querySelector('#modal-bulk-change-tags-dialog');
    const inputBulkTags = this.container.querySelector('#bulk-change-tags-input');
    const btnCloseBulkTags = this.container.querySelector('#btn-close-bulk-change-tags');
    const btnCancelBulkTags = this.container.querySelector('#btn-cancel-bulk-tags');
    const btnSubmitBulkTags = this.container.querySelector('#btn-submit-bulk-tags');

    const closeBulkTagsModal = () => {
      if (modalBulkTags) modalBulkTags.classList.remove('active');
    };

    modalBulkTags?.addEventListener('click', (e) => {
      if (e.target === modalBulkTags) closeBulkTagsModal();
    });
    btnCloseBulkTags?.addEventListener('click', closeBulkTagsModal);
    btnCancelBulkTags?.addEventListener('click', closeBulkTagsModal);

    this.container.querySelector('#btn-bulk-change-tags')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      if (this.selectedIds.size === 0) {
        alert('Vui lòng chọn profile cần thay đổi tags.');
        return;
      }
      if (inputBulkTags) inputBulkTags.value = '';
      if (modalBulkTags) modalBulkTags.classList.add('active');
    });

    btnSubmitBulkTags?.addEventListener('click', async () => {
      const mode = modalBulkTags?.querySelector('input[name="bulk_tag_mode"]:checked')?.value || 'replace';
      const inputVal = inputBulkTags ? inputBulkTags.value.trim() : '';
      const inputTags = inputVal ? inputVal.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : [];
      const targetIds = Array.from(this.selectedIds);

      try {
        btnSubmitBulkTags.disabled = true;
        btnSubmitBulkTags.innerText = 'Đang lưu...';

        await Promise.all(targetIds.map(async (id) => {
          if (!window.api?.updateProfile) return;
          const p = this.profiles.find(x => x.id === id);
          let currentTags = [];
          if (p) {
            if (Array.isArray(p.tags)) {
              currentTags = p.tags.map(t => String(t).trim()).filter(Boolean);
            } else if (typeof p.tags === 'string' && p.tags.trim()) {
              currentTags = p.tags.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
            }
          }

          let newTagsList = [];
          if (mode === 'replace') {
            newTagsList = inputTags;
          } else if (mode === 'append') {
            newTagsList = Array.from(new Set([...currentTags, ...inputTags]));
          } else if (mode === 'remove') {
            const removeSet = new Set(inputTags.map(t => t.toLowerCase()));
            newTagsList = currentTags.filter(t => !removeSet.has(t.toLowerCase()));
          }

          return window.api.updateProfile(id, { tags: newTagsList.join(', ') });
        }));

        closeBulkTagsModal();
        await this.loadProfiles();
        if (window.api?.getTags) {
          const allTags = await window.api.getTags();
          this.setTags(allTags);
        }
        alert(`Đã cập nhật tags cho ${targetIds.length} profile.`);
      } catch (err) {
        alert('Lỗi thay đổi tags: ' + err.message);
      } finally {
        btnSubmitBulkTags.disabled = false;
        btnSubmitBulkTags.innerText = 'OK';
      }
    });

    // 4. Cập nhật phiên bản trình duyệt hàng loạt (Hình 4)
    const modalBulkVersion = this.container.querySelector('#modal-bulk-update-version-dialog');
    const selectBulkVersion = this.container.querySelector('#bulk-update-version-select');
    const btnCloseBulkVersion = this.container.querySelector('#btn-close-bulk-version');
    const btnCancelBulkVersion = this.container.querySelector('#btn-cancel-bulk-version');
    const btnSubmitBulkVersion = this.container.querySelector('#btn-submit-bulk-version');

    const closeBulkVersionModal = () => {
      if (modalBulkVersion) modalBulkVersion.classList.remove('active');
    };

    modalBulkVersion?.addEventListener('click', (e) => {
      if (e.target === modalBulkVersion) closeBulkVersionModal();
    });
    btnCloseBulkVersion?.addEventListener('click', closeBulkVersionModal);
    btnCancelBulkVersion?.addEventListener('click', closeBulkVersionModal);

    this.container.querySelector('#btn-bulk-update-version')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      if (this.selectedIds.size === 0) {
        alert('Vui lòng chọn profile cần cập nhật phiên bản.');
        return;
      }
      if (modalBulkVersion) modalBulkVersion.classList.add('active');
    });

    btnSubmitBulkVersion?.addEventListener('click', async () => {
      const val = selectBulkVersion ? selectBulkVersion.value : '';
      const [bType, bVer] = val.split('|');
      const targetIds = Array.from(this.selectedIds);

      try {
        btnSubmitBulkVersion.disabled = true;
        btnSubmitBulkVersion.innerText = 'Đang lưu...';
        await Promise.all(targetIds.map(id => {
          return window.api?.updateProfile ? window.api.updateProfile(id, { browserType: bType || 'chrome', version: bVer || '151.0.7922.76' }) : Promise.resolve();
        }));
        closeBulkVersionModal();
        await this.loadProfiles();
        alert(`Đã cập nhật phiên bản cho ${targetIds.length} profile.`);
      } catch (err) {
        alert('Lỗi cập nhật phiên bản: ' + err.message);
      } finally {
        btnSubmitBulkVersion.disabled = false;
        btnSubmitBulkVersion.innerText = 'OK';
      }
    });

    // 5. Thay đổi URL khởi động hàng loạt (Hình 4)
    const modalBulkStartUrl = this.container.querySelector('#modal-bulk-start-url-dialog');
    const inputBulkStartUrl = this.container.querySelector('#bulk-start-url-input');
    const btnCloseBulkStartUrl = this.container.querySelector('#btn-close-bulk-start-url');
    const btnCancelBulkStartUrl = this.container.querySelector('#btn-cancel-bulk-start-url');
    const btnSubmitBulkStartUrl = this.container.querySelector('#btn-submit-bulk-start-url');

    const closeBulkStartUrlModal = () => {
      if (modalBulkStartUrl) modalBulkStartUrl.classList.remove('active');
    };

    modalBulkStartUrl?.addEventListener('click', (e) => {
      if (e.target === modalBulkStartUrl) closeBulkStartUrlModal();
    });
    btnCloseBulkStartUrl?.addEventListener('click', closeBulkStartUrlModal);
    btnCancelBulkStartUrl?.addEventListener('click', closeBulkStartUrlModal);

    this.container.querySelector('#btn-bulk-update-start-url')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      if (this.selectedIds.size === 0) {
        alert('Vui lòng chọn profile cần thay đổi URL khởi động.');
        return;
      }
      if (inputBulkStartUrl) inputBulkStartUrl.value = '';
      if (modalBulkStartUrl) modalBulkStartUrl.classList.add('active');
    });

    btnSubmitBulkStartUrl?.addEventListener('click', async () => {
      const urlVal = inputBulkStartUrl ? inputBulkStartUrl.value.trim() : '';
      const targetIds = Array.from(this.selectedIds);

      try {
        btnSubmitBulkStartUrl.disabled = true;
        btnSubmitBulkStartUrl.innerText = 'Đang lưu...';
        await Promise.all(targetIds.map(id => {
          return window.api?.updateProfile ? window.api.updateProfile(id, { startUrl: urlVal, startupUrl: urlVal }) : Promise.resolve();
        }));
        closeBulkStartUrlModal();
        await this.loadProfiles();
        alert(`Đã cập nhật URL khởi động cho ${targetIds.length} profile.`);
      } catch (err) {
        alert('Lỗi cập nhật URL: ' + err.message);
      } finally {
        btnSubmitBulkStartUrl.disabled = false;
        btnSubmitBulkStartUrl.innerText = 'OK';
      }
    });

    // 6. Thay đổi Fingerprint hàng loạt (Hình 4)
    this.container.querySelector('#btn-bulk-update-fingerprint')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      const targetIds = Array.from(this.selectedIds);
      if (targetIds.length === 0) {
        alert('Vui lòng chọn profile cần thay đổi fingerprint.');
        return;
      }
      if (confirm(`Bạn có chắc muốn tạo mới ngẫu nhiên Fingerprint (Canvas, WebGL, Audio...) cho ${targetIds.length} profile đã chọn?`)) {
        try {
          if (window.api && window.api.randomizeFingerprint) {
            const res = await window.api.randomizeFingerprint(targetIds);
            if (res && res.success) {
              await this.loadProfiles();
              alert(`Đã tạo mới Fingerprint thành công cho ${res.count} profile.`);
            }
          }
        } catch (err) {
          alert('Lỗi thay đổi fingerprint: ' + err.message);
        }
      }
    });

    // Dropdown: Sao chép Actions
    this.container.querySelector('#btn-bulk-action-clone')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      const targetIds = Array.from(this.selectedIds);
      if (targetIds.length >= 1) {
        const p = this.profiles.find(x => x.id === targetIds[0]);
        if (p) {
          if (this.modals) this.modals.openCloneModal(p);
          else if (window.modalsComp) window.modalsComp.openCloneModal(p);
        }
      }
    });

    this.container.querySelector('#btn-bulk-copy-proxy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      const targets = this.profiles.filter(p => this.selectedIds.has(p.id));
      const proxies = targets.map(p => p.proxy).filter(Boolean).join('\n');
      if (proxies) {
        navigator.clipboard.writeText(proxies);
        alert(`Đã copy ${targets.length} proxy vào clipboard!`);
      }
    });

    this.container.querySelector('#btn-bulk-copy-id')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      const ids = Array.from(this.selectedIds).join('\n');
      if (ids) {
        navigator.clipboard.writeText(ids);
        alert(`Đã copy ${this.selectedIds.size} ID profile vào clipboard!`);
      }
    });

    // Header Button: Thao tác với profile đang mở (Chuẩn Ảnh 1 & 2)
    this.container.querySelector('#btn-active-profiles-actions')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const runningProfiles = this.profiles.filter(p => p.status === 'running');
      if (runningProfiles.length === 0) {
        alert('Hiện không có profile nào đang mở.');
        return;
      }
      runningProfiles.forEach(p => this.selectedIds.add(p.id));
      this.renderTableRows();
      alert(`Đã chọn ${runningProfiles.length} profile đang mở trên hệ thống.`);
    });

    // Tool: Kiểm tra proxy (Chuẩn Ảnh 2, 3, 4)
    this.container.querySelector('#btn-tool-check-proxy')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      const targetProfiles = this.getSelectedProfilesInOrder();
      if (targetProfiles.length === 0) return;

      if (this._isCheckingProxies) {
        if (window.showGlobalToast) window.showGlobalToast('Đang có tiến trình kiểm tra proxy, vui lòng đợi...');
        return;
      }
      this._isCheckingProxies = true;

      try {
        // Kiểm tra lần lượt từng profile giống hệt hình ảnh mẫu
        for (const p of targetProfiles) {
          // 1. Chỉ hiển thị "Đang kiểm tra" cho RIÊNG dòng đang được test
          this.updateProfileRowStatus(p.id, 'checking');

          try {
            if (window.api && window.api.checkProxy) {
              const res = await window.api.checkProxy(p.id);
              if (res && res.result) {
                const finalStatus = res.result.status || 'Live';
                const country = res.result.country || p.proxyCountry;
                const ip = res.result.ip || p.ip;
                // 2. Cập nhật ngay kết quả Live / No connection cho dòng này trước khi sang dòng tiếp theo
                this.updateProfileRowStatus(p.id, finalStatus, country, ip);
              } else {
                this.updateProfileRowStatus(p.id, 'No connection');
              }
            }
          } catch (err) {
            this.updateProfileRowStatus(p.id, 'No connection');
          }
        }
      } finally {
        this._isCheckingProxies = false;
      }
    });

    // Tool: Xóa cache
    this.container.querySelector('#btn-tool-clear-cache')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      this.closeAllBulkDropdowns();
      const targetIds = Array.from(this.selectedIds);
      if (targetIds.length === 0) return;

      for (const id of targetIds) {
        if (window.api && window.api.clearCache) {
          await window.api.clearCache(id);
        }
      }
      alert(`Đã xóa cache thành công cho ${targetIds.length} profile!`);
    });

    // Bulk actions
    this.container.querySelector('#btn-bulk-open')?.addEventListener('click', async () => {
      if (!this.licenseStatus?.isActivated || this.licenseStatus?.isExpired) {
        if (window.showGlobalToast) {
          window.showGlobalToast('⚠️ Bản quyền chưa kích hoạt hoặc đã hết hạn. Vui lòng nhập key để mở profile!', true);
        }
        if (this.modals) this.modals.openModal('modal-license');
        else if (window.modalsComp) window.modalsComp.openModal('modal-license');
        return;
      }

      for (const id of this.selectedIds) {
        if (window.api && window.api.launchProfile) {
          await window.api.launchProfile(id);
        }
      }
    });

    this.container.querySelector('#btn-bulk-close')?.addEventListener('click', async () => {
      for (const id of this.selectedIds) {
        if (window.api && window.api.closeProfile) {
          await window.api.closeProfile(id);
        }
      }
    });

    this.container.querySelector('#btn-bulk-delete')?.addEventListener('click', async () => {
      if (this.selectedIds.size === 0) return;
      const count = this.selectedIds.size;
      const ids = Array.from(this.selectedIds);

      const doDelete = async (options) => {
        if (window.api && window.api.deleteMultipleProfiles) {
          await window.api.deleteMultipleProfiles(ids, options);
          this.selectedIds.clear();
          this.updateBulkBar();
          await this.loadProfiles();
          if (window.showGlobalToast) {
            window.showGlobalToast(options.permanent ? `Đã xóa vĩnh viễn ${count} profile!` : `Đã chuyển ${count} profile vào thùng rác!`);
          }
        }
      };

      if (this.modals && this.modals.openConfirmDeleteModal) {
        this.modals.openConfirmDeleteModal({ count, onConfirm: doDelete });
      } else if (window.modalsComp && window.modalsComp.openConfirmDeleteModal) {
        window.modalsComp.openConfirmDeleteModal({ count, onConfirm: doDelete });
      } else {
        if (confirm(`Bạn có chắc muốn xóa ${count} profile đã chọn?`)) {
          doDelete({ permanent: false });
        }
      }
    });

    // Modal Edit Proxy Events
    const btnCloseProxy = this.container.querySelector('#btn-close-edit-proxy');
    const btnCancelProxy = this.container.querySelector('#btn-cancel-edit-proxy');
    const btnSaveProxy = this.container.querySelector('#btn-save-edit-proxy');
    const btnNoProxy = this.container.querySelector('#btn-set-no-proxy');
    const inputProxyVal = this.container.querySelector('#edit-proxy-input-value');

    const closeModal = () => this.closeEditProxyModal();
    const modalProxy = this.container.querySelector('#modal-edit-proxy');
    modalProxy?.addEventListener('click', (e) => {
      if (e.target === modalProxy) closeModal();
    });
    btnCloseProxy?.addEventListener('click', closeModal);
    btnCancelProxy?.addEventListener('click', closeModal);
    btnNoProxy?.addEventListener('click', () => {
      if (inputProxyVal) inputProxyVal.value = '';
    });

    btnSaveProxy?.addEventListener('click', async () => {
      if (!this.currentEditingProfileId) return;
      const val = inputProxyVal ? inputProxyVal.value.trim() : '';
      const newProxy = val || 'No Proxy';

      try {
        btnSaveProxy.disabled = true;
        btnSaveProxy.innerText = 'Đang lưu...';
        if (window.api && window.api.updateProfile) {
          let country = 'us';
          let status = 'ready';
          let ip = '';
          if (newProxy === 'No Proxy') {
            country = 'vn';
            status = 'ready';
          } else if (window.api.testProxyString) {
            const check = await window.api.testProxyString(newProxy);
            if (check) {
              status = check.status;
              country = check.country || 'us';
              ip = check.ip || '';
            }
          }
          await window.api.updateProfile(this.currentEditingProfileId, {
            proxy: newProxy,
            proxyCountry: country,
            status,
            ...(ip ? { ip } : {})
          });
          closeModal();
          await this.loadProfiles();
        }
      } catch (err) {
        alert('Lỗi lưu proxy: ' + err.message);
      } finally {
        btnSaveProxy.disabled = false;
        btnSaveProxy.innerText = 'Lưu thay đổi';
      }
    });

    // Modal Edit Note Events
    const btnCloseNote = this.container.querySelector('#btn-close-edit-note');
    const btnCancelNote = this.container.querySelector('#btn-cancel-edit-note');
    const btnSaveNote = this.container.querySelector('#btn-save-edit-note');
    const btnClearNote = this.container.querySelector('#btn-clear-note');
    const inputNoteVal = this.container.querySelector('#edit-note-input-value');

    const closeNoteModal = () => this.closeEditNoteModal();
    const modalNote = this.container.querySelector('#modal-edit-note');
    modalNote?.addEventListener('click', (e) => {
      if (e.target === modalNote) closeNoteModal();
    });
    btnCloseNote?.addEventListener('click', closeNoteModal);
    btnCancelNote?.addEventListener('click', closeNoteModal);
    btnClearNote?.addEventListener('click', () => {
      if (inputNoteVal) inputNoteVal.value = '';
    });

    btnSaveNote?.addEventListener('click', async () => {
      if (!this.currentEditingNoteProfileId) return;
      const newNote = inputNoteVal ? inputNoteVal.value.trim() : '';

      try {
        btnSaveNote.disabled = true;
        btnSaveNote.innerText = 'Đang lưu...';
        if (window.api && window.api.updateProfile) {
          await window.api.updateProfile(this.currentEditingNoteProfileId, {
            notes: newNote,
            note: newNote
          });
          closeNoteModal();
          await this.loadProfiles();
        }
      } catch (err) {
        alert('Lỗi lưu ghi chú: ' + err.message);
      } finally {
        btnSaveNote.disabled = false;
        btnSaveNote.innerText = 'Lưu thay đổi';
      }
    });

    inputNoteVal?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        btnSaveNote?.click();
      }
    });

    // Modal Edit Tags Events
    const btnCloseTags = this.container.querySelector('#btn-close-edit-tags');
    const btnCancelTags = this.container.querySelector('#btn-cancel-edit-tags');
    const btnSaveTags = this.container.querySelector('#btn-save-edit-tags');
    const btnClearTags = this.container.querySelector('#btn-clear-tags');
    const inputTagsVal = this.container.querySelector('#edit-tags-input-value');

    const closeTagsModal = () => this.closeEditTagsModal();
    const modalTags = this.container.querySelector('#modal-edit-tags');
    modalTags?.addEventListener('click', (e) => {
      if (e.target === modalTags) closeTagsModal();
    });
    btnCloseTags?.addEventListener('click', closeTagsModal);
    btnCancelTags?.addEventListener('click', closeTagsModal);
    btnClearTags?.addEventListener('click', () => {
      if (inputTagsVal) inputTagsVal.value = '';
    });

    btnSaveTags?.addEventListener('click', async () => {
      if (!this.currentEditingTagsProfileId) return;
      const newTags = inputTagsVal ? inputTagsVal.value.trim() : '';

      try {
        btnSaveTags.disabled = true;
        btnSaveTags.innerText = 'Đang lưu...';
        if (window.api && window.api.updateProfile) {
          await window.api.updateProfile(this.currentEditingTagsProfileId, {
            tags: newTags
          });
          closeTagsModal();
          await this.loadProfiles();
          if (window.api.getTags) {
            const allTags = await window.api.getTags();
            this.setTags(allTags);
          }
        }
      } catch (err) {
        alert('Lỗi lưu tags: ' + err.message);
      } finally {
        btnSaveTags.disabled = false;
        btnSaveTags.innerText = 'Lưu thay đổi';
      }
    });

    inputTagsVal?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnSaveTags?.click();
      }
    });

    // Table row event delegation
    this.container.querySelector('#profiles-tbody')?.addEventListener('click', async (e) => {
      // Copy Proxy
      const btnCopy = e.target.closest('.btn-copy-proxy');
      if (btnCopy) {
        e.stopPropagation();
        const proxyVal = btnCopy.getAttribute('data-proxy');
        if (proxyVal) {
          navigator.clipboard.writeText(proxyVal);
          btnCopy.setAttribute('data-tooltip', 'Copied!');
          setTimeout(() => {
            btnCopy.setAttribute('data-tooltip', 'Copy');
          }, 1500);
        }
        return;
      }

      // Sửa Proxy
      const btnEdit = e.target.closest('.btn-edit-proxy');
      if (btnEdit) {
        e.stopPropagation();
        const id = btnEdit.getAttribute('data-id');
        const name = btnEdit.getAttribute('data-name');
        const proxyVal = btnEdit.getAttribute('data-proxy') || '';
        this.openEditProxyModal(id, name, proxyVal);
        return;
      }

      // Sửa Ghi chú
      const btnEditNote = e.target.closest('.btn-edit-note');
      if (btnEditNote) {
        e.stopPropagation();
        const id = btnEditNote.getAttribute('data-id');
        const name = btnEditNote.getAttribute('data-name');
        const noteVal = btnEditNote.getAttribute('data-note') || '';
        this.openEditNoteModal(id, name, noteVal);
        return;
      }

      const colNote = e.target.closest('td.col-notes');
      if (colNote && !e.target.closest('input, a')) {
        const row = colNote.closest('tr');
        const id = row?.getAttribute('data-id');
        if (id) {
          const p = this.profiles.find(item => item.id === id);
          if (p) {
            this.openEditNoteModal(p.id, p.name, p.notes || p.note || '');
            return;
          }
        }
      }

      // Sửa Tag
      const btnEditTag = e.target.closest('.btn-edit-tag');
      if (btnEditTag) {
        e.stopPropagation();
        const id = btnEditTag.getAttribute('data-id');
        const name = btnEditTag.getAttribute('data-name');
        const tagsVal = btnEditTag.getAttribute('data-tags') || '';
        this.openEditTagsModal(id, name, tagsVal);
        return;
      }

      const colTags = e.target.closest('td.col-tags');
      if (colTags && !e.target.closest('input, a')) {
        const row = colTags.closest('tr');
        const id = row?.getAttribute('data-id');
        if (id) {
          const p = this.profiles.find(item => item.id === id);
          if (p) {
            this.openEditTagsModal(p.id, p.name, p.tags || '');
            return;
          }
        }
      }

      // Row checkbox
      if (e.target.classList.contains('profile-checkbox')) {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          this.selectedIds.add(id);
        } else {
          this.selectedIds.delete(id);
        }
        this.updateBulkBar();
        return;
      }

      // Nút Mở Profile (Chuẩn Ảnh 1 khi loading)
      const btnOpen = e.target.closest('.btn-action-open');
      if (btnOpen) {
        if (!this.licenseStatus?.isActivated || this.licenseStatus?.isExpired) {
          if (window.showGlobalToast) {
            window.showGlobalToast('⚠️ Bản quyền chưa kích hoạt hoặc đã hết hạn. Vui lòng nhập key để mở profile!', true);
          }
          if (this.modals) this.modals.openModal('modal-license');
          else if (window.modalsComp) window.modalsComp.openModal('modal-license');
          return;
        }

        const id = btnOpen.getAttribute('data-id');
        const index = btnOpen.getAttribute('data-index');
        btnOpen.classList.add('loading');
        btnOpen.innerHTML = `<span class="spinner-circle"></span>`;
        btnOpen.disabled = true;

        if (window.api && window.api.launchProfile) {
          const res = await window.api.launchProfile(id, index ? parseInt(index, 10) : null);
          if (!res.success) {
            // Hiển thị thông báo nếu proxy không hoạt động
            alert(res.message || 'Không thể mở profile do lỗi kết nối!');
            await this.loadProfiles();
          }
        }
        return;
      }


      // Nút Đóng Profile
      const btnClose = e.target.closest('.btn-action-close');
      if (btnClose) {
        const id = btnClose.getAttribute('data-id');
        btnClose.innerHTML = `<span>Đang đóng...</span>`;
        btnClose.disabled = true;

        if (window.api && window.api.closeProfile) {
          await window.api.closeProfile(id);
        }
        return;
      }

      // Menu 3 chấm (Chuẩn 100% theo Ảnh 3)
      const btnMore = e.target.closest('.btn-row-more');
      if (btnMore) {
        e.stopPropagation();
        const id = btnMore.getAttribute('data-id');
        this.showContextMenu(btnMore, id);
        return;
      }
    });

    // Đóng context menu khi click ra ngoài hoặc khi cuộn bảng
    document.addEventListener('click', () => {
      this.closeContextMenu();
    });
    window.addEventListener('scroll', () => {
      this.closeContextMenu();
    }, true);
    window.addEventListener('resize', () => {
      this.closeContextMenu();
    });
  }

  showContextMenu(targetBtn, profileId) {
    const existing = document.getElementById('active-profile-context-menu');
    if (existing) {
      const prevId = existing.getAttribute('data-profile-id');
      this.closeContextMenu();
      if (prevId === profileId) {
        return;
      }
    }

    const rect = targetBtn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'profile-context-menu';
    menu.id = 'active-profile-context-menu';
    menu.setAttribute('data-profile-id', profileId);

    menu.innerHTML = `
      <button class="context-menu-item" data-action="check-proxy">
        <span class="menu-icon">🔗</span> Kiểm tra proxy
      </button>
      <button class="context-menu-item" data-action="note">
        <span class="menu-icon">📝</span> Ghi chú
      </button>
      <button class="context-menu-item" data-action="tags">
        <span class="menu-icon">🏷️</span> Gán / Sửa Tags
      </button>
      <button class="context-menu-item" data-action="edit">
        <span class="menu-icon">✏️</span> Sửa
      </button>
      <button class="context-menu-item" data-action="clone">
        <span class="menu-icon">📑</span> Nhân bản
      </button>
      <button class="context-menu-item" data-action="color">
        <span class="menu-icon">🎨</span> Thay đổi màu sắc
      </button>
      <button class="context-menu-item" data-action="cookie">
        <span class="menu-icon">🍪</span> Import cookie
      </button>
      <button class="context-menu-item" data-action="open-folder">
        <span class="menu-icon">📁</span> Mở thư mục profile
      </button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item" data-action="open-incognito">
        <span class="menu-icon">🕶️</span> Mở ẩn danh (Incognito)
      </button>
      <button class="context-menu-item" data-action="remote-port">
        <span class="menu-icon">&gt;_</span> Chạy với remote port
      </button>
      <button class="context-menu-item" data-action="copy-id">
        <span class="menu-icon">📋</span> Copy ID
      </button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item" data-action="move-to-top">
        <span class="menu-icon">⬆️</span> Chuyển lên đầu danh sách
      </button>
      <button class="context-menu-item" data-action="move-to-bottom">
        <span class="menu-icon">⬇️</span> Chuyển xuống cuối danh sách
      </button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item text-red" data-action="delete">
        <span class="menu-icon">🗑️</span> Xóa profile
      </button>
    `;

    menu.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = e.target.closest('.context-menu-item');
      if (!item) return;
      const action = item.getAttribute('data-action');
      this.closeContextMenu();

      if (action === 'check-proxy') {
        this.updateProfileRowStatus(profileId, 'checking');
        try {
          if (window.api && window.api.checkProxy) {
            const res = await window.api.checkProxy(profileId);
            if (res && res.result) {
              const finalStatus = res.result.status || 'Live';
              const country = res.result.country;
              const ip = res.result.ip;
              this.updateProfileRowStatus(profileId, finalStatus, country, ip);
            } else {
              this.updateProfileRowStatus(profileId, 'No connection');
            }
          }
        } catch (err) {
          this.updateProfileRowStatus(profileId, 'No connection');
        }
      } else if (action === 'open-folder') {
        if (window.api && window.api.openProfileFolder) {
          await window.api.openProfileFolder(profileId);
        }
      } else if (action === 'clone') {
        const p = this.profiles.find(x => x.id === profileId);
        if (p) {
          if (this.modals) {
            this.modals.openCloneModal(p);
          } else if (window.modalsComp) {
            window.modalsComp.openCloneModal(p);
          }
        }
      } else if (action === 'copy-id') {
        navigator.clipboard.writeText(profileId);
        alert(`Đã copy ID profile: ${profileId}`);
      } else if (action === 'open-incognito') {
        if (window.api && window.api.launchProfile) {
          const p = this.profiles.find(x => x.id === profileId);
          const index = p ? (p.index || p.order || p.stt) : null;
          this.updateProfileRowStatus(profileId, 'checking');
          const res = await window.api.launchProfile(profileId, index ? parseInt(index, 10) : null, { incognito: true });
          if (!res || !res.success) {
            alert((res && res.message) || 'Không thể mở profile ở chế độ ẩn danh!');
            await this.loadProfiles();
          }
        }
      } else if (action === 'move-to-top') {
        const fromIdx = this.profiles.findIndex(p => p.id === profileId);
        if (fromIdx > 0) {
          const [moved] = this.profiles.splice(fromIdx, 1);
          this.profiles.unshift(moved);
          this.profiles.forEach((p, idx) => { p.order = idx + 1; p.customOrder = idx + 1; });
          this.filter.sort = 'custom';
          localStorage.setItem('profiles_sort_pref', 'custom');
          const sortSelect = this.container.querySelector('#filter-sort');
          if (sortSelect) sortSelect.value = 'custom';
          this.updateSortIndicator();
          if (window.api && window.api.reorderProfiles) {
            await window.api.reorderProfiles(this.profiles.map(p => p.id));
          }
          this.renderTableRows();
          if (window.showGlobalToast) window.showGlobalToast(`Đã chuyển profile ${moved.name} lên đầu!`);
        }
      } else if (action === 'move-to-bottom') {
        const fromIdx = this.profiles.findIndex(p => p.id === profileId);
        if (fromIdx !== -1 && fromIdx < this.profiles.length - 1) {
          const [moved] = this.profiles.splice(fromIdx, 1);
          this.profiles.push(moved);
          this.profiles.forEach((p, idx) => { p.order = idx + 1; p.customOrder = idx + 1; });
          this.filter.sort = 'custom';
          localStorage.setItem('profiles_sort_pref', 'custom');
          const sortSelect = this.container.querySelector('#filter-sort');
          if (sortSelect) sortSelect.value = 'custom';
          this.updateSortIndicator();
          if (window.api && window.api.reorderProfiles) {
            await window.api.reorderProfiles(this.profiles.map(p => p.id));
          }
          this.renderTableRows();
          if (window.showGlobalToast) window.showGlobalToast(`Đã chuyển profile ${moved.name} xuống cuối!`);
        }
      } else if (action === 'remote-port') {
        const p = this.profiles.find(x => x.id === profileId);
        if (p) {
          if (this.modals) {
            this.modals.openRemotePortModal(p);
          } else if (window.modalsComp) {
            window.modalsComp.openRemotePortModal(p);
          }
        }
      } else if (action === 'delete') {
        const p = this.profiles.find(x => x.id === profileId);
        const name = p ? p.name : '';

        const doDelete = async (options) => {
          if (window.api && window.api.deleteProfile) {
            await window.api.deleteProfile(profileId, options);
            this.selectedIds.delete(profileId);
            this.updateBulkBar();
            await this.loadProfiles();
            if (window.showGlobalToast) {
              window.showGlobalToast(options.permanent ? `Đã xóa vĩnh viễn profile ${name}!` : `Đã chuyển profile ${name} vào thùng rác!`);
            }
          }
        };

        if (this.modals && this.modals.openConfirmDeleteModal) {
          this.modals.openConfirmDeleteModal({ count: 1, profileName: name, onConfirm: doDelete });
        } else if (window.modalsComp && window.modalsComp.openConfirmDeleteModal) {
          window.modalsComp.openConfirmDeleteModal({ count: 1, profileName: name, onConfirm: doDelete });
        } else {
          if (confirm('Bạn có chắc chắn muốn xóa profile này không?')) {
            doDelete({ permanent: false });
          }
        }
      } else if (action === 'note') {
        const p = this.profiles.find(x => x.id === profileId);
        if (p) {
          this.openEditNoteModal(p.id, p.name, p.notes || p.note || '');
        }
      } else if (action === 'tags') {
        const p = this.profiles.find(x => x.id === profileId);
        if (p) {
          this.openEditTagsModal(p.id, p.name, p.tags || '');
        }
      } else if (action === 'edit') {
        const p = this.profiles.find(x => x.id === profileId);
        if (p) {
          if (this.modals) {
            this.modals.openEditProfile(p);
          } else if (window.modalsComp) {
            window.modalsComp.openEditProfile(p);
          }
        }
      } else if (action === 'cookie') {
        if (window.api && window.api.selectCookieFile) {
          try {
            const fileRes = await window.api.selectCookieFile();
            if (fileRes && !fileRes.canceled && fileRes.success) {
              await window.api.importCookie(profileId, fileRes.content);
              alert(`Đã import thành công cookie từ file:\n${fileRes.filePath}`);
            }
          } catch (err) {
            alert('Lỗi import cookie: ' + err.message);
          }
        }
      } else if (action === 'color') {
        const p = this.profiles.find(x => x.id === profileId);
        if (p) {
          if (this.modals) {
            this.modals.openColorPicker(p);
          } else if (window.modalsComp) {
            window.modalsComp.openColorPicker(p);
          }
        }
      }
    });

    // Ẩn tạm thời để tính toán kích thước thực tế sau khi gắn vào DOM
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);

    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth || 190;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top;
    // Nếu phía dưới không đủ khoảng trống cho menu và phía trên có nhiều chỗ hơn -> mở lên trên
    if (spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow) {
      top = rect.top - menuHeight - 4;
    } else {
      top = rect.bottom + 4;
    }

    // Đảm bảo menu luôn nằm trọn trong viewport
    if (top < 8) {
      top = 8;
    } else if (top + menuHeight > viewportHeight - 8) {
      top = Math.max(8, viewportHeight - menuHeight - 8);
    }

    // Căn ngang theo mép phải của nút 3 chấm
    let left = rect.right - menuWidth;
    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.visibility = 'visible';
  }

  closeContextMenu() {
    const existing = document.getElementById('active-profile-context-menu');
    if (existing) existing.remove();
  }

  openEditProxyModal(profileId, profileName, currentProxy) {
    const modal = this.container.querySelector('#modal-edit-proxy');
    const nameEl = this.container.querySelector('#edit-proxy-profile-name');
    const inputEl = this.container.querySelector('#edit-proxy-input-value');
    if (!modal) return;

    this.currentEditingProfileId = profileId;
    if (nameEl) nameEl.innerText = profileName || `Profile ${profileId}`;
    if (inputEl) {
      inputEl.value = (currentProxy && currentProxy.toLowerCase() !== 'no proxy') ? currentProxy : '';
      setTimeout(() => inputEl.focus(), 50);
    }
    modal.classList.add('active');
  }

  closeEditProxyModal() {
    const modal = this.container.querySelector('#modal-edit-proxy');
    if (modal) modal.classList.remove('active');
    this.currentEditingProfileId = null;
  }

  openEditNoteModal(profileId, profileName, currentNote) {
    const modal = this.container.querySelector('#modal-edit-note');
    const nameEl = this.container.querySelector('#edit-note-profile-name');
    const inputEl = this.container.querySelector('#edit-note-input-value');
    if (!modal) return;

    this.currentEditingNoteProfileId = profileId;
    if (nameEl) nameEl.innerText = profileName || `Profile ${profileId}`;
    if (inputEl) {
      inputEl.value = currentNote || '';
      setTimeout(() => {
        inputEl.focus();
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
      }, 50);
    }
    modal.classList.add('active');
  }

  closeEditNoteModal() {
    const modal = this.container.querySelector('#modal-edit-note');
    if (modal) modal.classList.remove('active');
    this.currentEditingNoteProfileId = null;
  }

  openEditTagsModal(profileId, profileName, currentTags) {
    const modal = this.container.querySelector('#modal-edit-tags');
    const nameEl = this.container.querySelector('#edit-tags-profile-name');
    const inputEl = this.container.querySelector('#edit-tags-input-value');
    const suggEl = this.container.querySelector('#edit-tags-suggestions');
    if (!modal) return;

    this.currentEditingTagsProfileId = profileId;
    if (nameEl) nameEl.innerText = profileName || `Profile ${profileId}`;
    if (inputEl) {
      inputEl.value = currentTags || '';
    }

    if (suggEl) {
      suggEl.innerHTML = '';
      if (this.tags && this.tags.length > 0) {
        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-right: 4px;';
        titleSpan.textContent = 'Gợi ý:';
        suggEl.appendChild(titleSpan);

        this.tags.forEach(t => {
          const tagName = typeof t === 'object' ? t.name : t;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-quick-tag';
          btn.style.cssText = 'font-size: 11.5px; padding: 2px 8px; border-radius: 12px; border: 1px dashed var(--border-color); background: var(--bg-hover); color: var(--text-main); cursor: pointer; transition: all 0.15s;';
          btn.textContent = '+ ' + tagName;
          btn.onclick = () => {
            if (!inputEl) return;
            const cur = inputEl.value.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
            if (!cur.includes(tagName)) {
              cur.push(tagName);
              inputEl.value = cur.join(', ');
            }
          };
          suggEl.appendChild(btn);
        });
      }
    }

    modal.classList.add('active');
    setTimeout(() => {
      inputEl?.focus();
      inputEl?.setSelectionRange(inputEl.value.length, inputEl.value.length);
    }, 50);
  }

  closeEditTagsModal() {
    const modal = this.container.querySelector('#modal-edit-tags');
    if (modal) modal.classList.remove('active');
    this.currentEditingTagsProfileId = null;
  }

  async loadProfiles() {
    if (!window.api || !window.api.getProfiles) return;
    try {
      this.profiles = await window.api.getProfiles();
      const sortSelect = this.container.querySelector('#filter-sort');
      if (sortSelect && sortSelect.value !== this.filter.sort) {
        sortSelect.value = this.filter.sort;
      }
      this.updateSortIndicator();
      this.renderTableRows();

      if (window.api && window.api.getTags) {
        window.api.getTags().then(tags => {
          this.setTags(tags);
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Lỗi tải profiles:', err);
    }
  }

  setLicenseStatus(status) {
    this.licenseStatus = status;
    this.updateLicenseBanner();
    this.renderTableRows();
  }

  setHwid(hwid) {
    this.currentHwid = hwid;
    this.updateLicenseBanner();
  }

  updateLicenseBanner() {
    const bannerEl = this.container?.querySelector('#profiles-license-warning-bar');
    if (!bannerEl) return;

    const isExpired = this.licenseStatus && this.licenseStatus.isExpired;
    const isUnactivated = !this.licenseStatus || !this.licenseStatus.isActivated;

    if (isExpired || isUnactivated) {
      bannerEl.innerHTML = `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 15px; box-shadow: 0 1px 3px rgba(239, 68, 68, 0.08);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
              ⚠️
            </div>
            <div>
              <div style="font-weight: 700; font-size: 13.5px; color: #991b1b;">
                ${isExpired ? 'Bản quyền phần mềm đã HẾT HẠN!' : 'Bản quyền phần mềm CHƯA KÍCH HOẠT!'}
              </div>
              <div style="font-size: 12.5px; color: #b91c1c; margin-top: 1px;">
                ${isExpired ? 'Thời hạn sử dụng đã kết thúc. Vui lòng nhập License Key mới để tiếp tục tạo và chạy profile.' : 'Vui lòng nhập License Key để bắt đầu tạo profile và sử dụng toàn bộ tính năng.'}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <button type="button" class="btn btn-primary" id="btn-banner-activate-license" style="height: 34px; padding: 0 16px; font-size: 13px; font-weight: 600; background: #ef4444; border-color: #ef4444; display: inline-flex; align-items: center; gap: 6px;">
              🔑 Nhập Key Kích Hoạt
            </button>
          </div>
        </div>
      `;
      bannerEl.style.display = 'block';

      bannerEl.querySelector('#btn-banner-activate-license')?.addEventListener('click', () => {
        if (this.modals) this.modals.openModal('modal-license');
        else if (window.modalsComp) window.modalsComp.openModal('modal-license');
      });
    } else {
      bannerEl.innerHTML = '';
      bannerEl.style.display = 'none';
    }
  }

  setNoCoresWarning(show) {
    const bar = this.container?.querySelector('#profiles-core-warning-bar');
    if (!bar) return;
    if (show) {
      bar.innerHTML = `
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #ea580c; border-radius: 8px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 15px; box-shadow: 0 1px 3px rgba(234, 88, 12, 0.08);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
              ⚠️
            </div>
            <div>
              <div style="font-weight: 700; font-size: 13.5px; color: #9a3412;">
                Hệ thống chưa có Core trình duyệt nào!
              </div>
              <div style="font-size: 12.5px; color: #c2410c; margin-top: 1px;">
                Vui lòng tải & cài đặt Chromium Core để bắt đầu tạo và chạy Profile.
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <button type="button" class="btn btn-primary" id="btn-banner-open-update-manager" style="height: 34px; padding: 0 16px; font-size: 13px; font-weight: 600; background: #ea580c; border-color: #ea580c; display: inline-flex; align-items: center; gap: 6px;">
              ⬇ Tải & Cài đặt Core ngay
            </button>
          </div>
        </div>
      `;
      bar.style.display = 'block';

      bar.querySelector('#btn-banner-open-update-manager')?.addEventListener('click', () => {
        if (this.modals) this.modals.openUpdateManager();
        else if (window.modalsComp) window.modalsComp.openUpdateManager();
      });
    } else {
      bar.innerHTML = '';
      bar.style.display = 'none';
    }
  }

  renderTableRows() {
    const tbody = this.container.querySelector('#profiles-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Filter
    let filtered = this.profiles.filter(p => {
      if (this.filter.search && this.filter.search.trim()) {
        const q = this.filter.search.trim().toLowerCase();
        const nameStr = (p.name || '').toString().toLowerCase();
        const proxyStr = (p.proxy || '').toString().toLowerCase();
        const rawProxyStr = (p.raw_proxy || '').toString().toLowerCase();
        let tagStr = '';
        if (Array.isArray(p.tags)) {
          tagStr = p.tags.join(' ').toLowerCase();
        } else if (p.tags) {
          tagStr = p.tags.toString().toLowerCase();
        }
        const noteStr = (p.notes || p.note || '').toString().toLowerCase();
        const groupStr = (p.group || '').toString().toLowerCase();
        const idStr = (p.id || '').toString().toLowerCase();
        const indexStr = (p.order || p.index || p.stt || '').toString();

        const matchName = nameStr.includes(q);
        const matchProxy = proxyStr.includes(q) || rawProxyStr.includes(q);
        const matchTag = tagStr.includes(q);
        const matchNote = noteStr.includes(q);
        const matchGroup = groupStr.includes(q);
        const matchId = idStr.includes(q);
        const matchIndex = indexStr.includes(q);

        if (!matchName && !matchProxy && !matchTag && !matchNote && !matchGroup && !matchId && !matchIndex) return false;
      }
      if (this.filter.group && p.group !== this.filter.group) {
        return false;
      }
      if (this.filter.tag) {
        let pTags = [];
        if (Array.isArray(p.tags)) {
          pTags = p.tags.map(t => (typeof t === 'string' ? t : t?.name || '').trim().toLowerCase());
        } else if (typeof p.tags === 'string' && p.tags.trim()) {
          pTags = p.tags.split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
        }
        if (!pTags.includes(this.filter.tag.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    // Sort
    if (this.filter.sort === 'newest') {
      filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (this.filter.sort === 'oldest') {
      filtered.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else if (this.filter.sort === 'name' || this.filter.sort === 'name_asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (this.filter.sort === 'name_desc') {
      filtered.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (this.filter.sort === 'custom') {
      filtered.sort((a, b) => (a.order || a.customOrder || 0) - (b.order || b.customOrder || 0));
    }

    this.filteredProfiles = filtered;

    const totalCount = filtered.length;
    const totalEl = this.container.querySelector('#total-count-display');
    if (totalEl) totalEl.innerText = totalCount;

    const totalPages = Math.max(1, Math.ceil(totalCount / this.perPage));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    // Cập nhật điều khiển phân trang
    const pageDisplay = this.container.querySelector('#page-display');
    if (pageDisplay) pageDisplay.innerText = `${this.currentPage} / ${totalPages}`;

    const prevBtn = this.container.querySelector('#btn-prev-page');
    if (prevBtn) {
      const isFirst = this.currentPage <= 1;
      prevBtn.disabled = isFirst;
      prevBtn.style.opacity = isFirst ? '0.4' : '1';
      prevBtn.style.cursor = isFirst ? 'not-allowed' : 'pointer';
    }

    const nextBtn = this.container.querySelector('#btn-next-page');
    if (nextBtn) {
      const isLast = this.currentPage >= totalPages;
      nextBtn.disabled = isLast;
      nextBtn.style.opacity = isLast ? '0.4' : '1';
      nextBtn.style.cursor = isLast ? 'not-allowed' : 'pointer';
    }

    const perPageInput = this.container.querySelector('#per-page-input');
    if (perPageInput && parseInt(perPageInput.value, 10) !== this.perPage) {
      perPageInput.value = this.perPage;
    }

    const perPageSelect = this.container.querySelector('#per-page-select');
    if (perPageSelect) {
      const matchOpt = Array.from(perPageSelect.options).some(o => o.value === String(this.perPage));
      perPageSelect.value = matchOpt ? String(this.perPage) : 'custom';
    }

    // Dọn dẹp selectedIds: loại bỏ các ID không còn tồn tại trong danh sách profiles
    const existingIds = new Set(this.profiles.map(p => p.id));
    for (const id of this.selectedIds) {
      if (!existingIds.has(id)) {
        this.selectedIds.delete(id);
      }
    }

    // Luôn cập nhật trạng thái thanh bulk-bar ngay cả khi danh sách rỗng (filtered.length === 0)
    this.updateBulkBar();

    if (filtered.length === 0) {
      const isExpired = this.licenseStatus && this.licenseStatus.isExpired;
      const isUnactivated = !this.licenseStatus || !this.licenseStatus.isActivated;

      if (isExpired || isUnactivated) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="padding: 60px 20px; text-align: center; background: #ffffff;">
              <div style="max-width: 540px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 14px;">
                <div style="width: 68px; height: 68px; border-radius: 50%; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);">
                  🔑
                </div>
                <div style="font-size: 18px; font-weight: 700; color: #1e293b;">
                  ${isExpired ? 'Bản quyền đã hết hạn sử dụng' : 'Bản quyền chưa được kích hoạt'}
                </div>
                <p style="font-size: 13.5px; color: #64748b; line-height: 1.6; margin: 0;">
                  ${isExpired 
                    ? 'Thời hạn sử dụng bản quyền của bạn đã kết thúc. Vui lòng nhập License Key mới để tiếp tục tạo profile, quản lý và tự động hóa trình duyệt.' 
                    : 'Phần mềm chưa được kích hoạt bản quyền. Vui lòng nhập License Key hợp lệ để bắt đầu sử dụng.'}
                </p>
                <div style="display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; justify-content: center;">
                  <button type="button" class="btn btn-primary" id="btn-empty-activate-key" style="height: 38px; padding: 0 22px; font-weight: 600; font-size: 13.5px; background: #0284c7; display: inline-flex; align-items: center; gap: 6px;">
                    🔑 Nhập License Key ngay
                  </button>
                </div>
              </div>
            </td>
          </tr>
        `;

        tbody.querySelector('#btn-empty-activate-key')?.addEventListener('click', () => {
          if (this.modals) this.modals.openModal('modal-license');
          else if (window.modalsComp) window.modalsComp.openModal('modal-license');
        });
        return;
      }

      if (this.filter.search && this.filter.search.trim()) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 13.5px;">🔍 Không tìm thấy profile nào phù hợp với từ khóa "<strong>${this.escape(this.filter.search.trim())}</strong>"</td></tr>`;
      } else {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">Không tìm thấy profile nào</td></tr>`;
      }
      return;
    }

    const startIndex = (this.currentPage - 1) * this.perPage;
    const pageProfiles = filtered.slice(startIndex, startIndex + this.perPage);

    pageProfiles.forEach((p, indexOnPage) => {
      const rowIndex = startIndex + indexOnPage;
      const isRunning = p.status === 'running';
      const isChecked = this.selectedIds.has(p.id);

      // Tính số thứ tự profile (1, 2, 3...)
      let profileIndex = p.index || p.order || p.stt;
      if (!profileIndex) {
        const match = (p.name || '').match(/(\d+)/);
        profileIndex = match ? parseInt(match[1], 10) : (rowIndex + 1);
      }
      const tr = document.createElement('tr');
      tr.setAttribute('data-id', p.id);
      tr.setAttribute('draggable', 'true');
      tr.classList.add('profile-row-draggable');
      tr.innerHTML = `
        <td style="width: 48px; white-space: nowrap; text-align: center;">
          <span class="drag-handle-cell" title="Kéo thả chuột để đổi vị trí profile">⠿</span>
          <input type="checkbox" class="profile-checkbox" data-id="${p.id}" ${isChecked ? 'checked' : ''}>
        </td>
        <td>
          <div class="profile-cell">
            <div class="browser-icon-badge-container" title="Profile #${profileIndex}">
              ${this.getBrowserIcon(p.browserType)}
              <span class="profile-badge-pill">${profileIndex}</span>
            </div>
            <div class="profile-info">
              <span class="profile-name" style="${p.color ? `color: ${this.escape(p.color)} !important;` : ''}">${this.escape(p.name)}</span>
              <span class="profile-group">📁 ${this.escape(p.group || 'Default group')}</span>
            </div>
          </div>
        </td>
        <td class="col-proxy">
          <div class="proxy-cell">
            ${this.getProxyDisplay(p.proxyCountry, p.proxy, p.id, p.name)}
          </div>
        </td>
        <td class="col-status">
          ${this.getStatusHtml(p, isRunning)}
        </td>
        <td style="color: var(--text-muted); font-size: 12.5px;">
          <span title="Lần chạy gần nhất">⏱ ${this.escape(p.lastRun || 'Chưa chạy')}</span>
        </td>
        <td class="col-tags">
          ${this.getTagDisplay(p.tags, p.id, p.name)}
        </td>
        <td class="col-notes">
          ${this.getNoteDisplay(p.notes || p.note || '', p.id, p.name)}
        </td>
        <td style="text-align: right;">
          <div class="row-actions" style="justify-content: flex-end;">
            ${isRunning
              ? `<button class="btn-action-close" data-id="${p.id}" title="Đóng profile">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink: 0;"><rect width="24" height="24" rx="4"></rect></svg>
                  <span>Đóng</span>
                </button>`
              : `<button class="btn-action-open" data-id="${p.id}" data-index="${profileIndex}" title="Mở profile">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink: 0;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  <span>Mở</span>
                </button>`
            }
            <button class="btn-row-more" data-id="${p.id}" title="Tùy chọn">⋮</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    this.setupTableDragAndDrop();
    this.updateSortIndicator();
    this.updateBulkBar();
  }

  updateSortIndicator() {
    const indicator = this.container.querySelector('#sort-name-indicator');
    if (!indicator) return;
    if (this.filter.sort === 'name_asc') {
      indicator.innerText = '▲';
      indicator.style.color = '#0284c7';
      indicator.title = 'Đang sắp xếp: 001 -> 050 (A -> Z)';
    } else if (this.filter.sort === 'name_desc') {
      indicator.innerText = '▼';
      indicator.style.color = '#0284c7';
      indicator.title = 'Đang sắp xếp: 050 -> 001 (Z -> A)';
    } else {
      indicator.innerText = '⇅';
      indicator.style.color = '#94a3b8';
      indicator.title = 'Bấm để sắp xếp theo Tên / STT';
    }
  }

  setupTableDragAndDrop() {
    const tbody = this.container.querySelector('#profiles-tbody');
    if (!tbody) return;

    let draggedRow = null;
    let draggedId = null;

    tbody.querySelectorAll('tr.profile-row-draggable').forEach(row => {
      row.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.profile-checkbox')) {
          e.preventDefault();
          return;
        }
        draggedRow = row;
        draggedId = row.getAttribute('data-id');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedId);
        setTimeout(() => {
          row.classList.add('is-dragging');
        }, 0);
      });

      row.addEventListener('dragend', () => {
        draggedRow = null;
        draggedId = null;
        tbody.querySelectorAll('tr').forEach(r => {
          r.classList.remove('is-dragging', 'drag-over-top', 'drag-over-bottom');
        });
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!draggedRow || row === draggedRow) return;

        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          row.classList.add('drag-over-top');
          row.classList.remove('drag-over-bottom');
        } else {
          row.classList.add('drag-over-bottom');
          row.classList.remove('drag-over-top');
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        row.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!draggedId) return;
        const targetId = row.getAttribute('data-id');
        if (draggedId === targetId) return;

        const rect = row.getBoundingClientRect();
        const dropBefore = e.clientY < (rect.top + rect.height / 2);

        const fromIdx = this.profiles.findIndex(p => p.id === draggedId);
        if (fromIdx === -1) return;
        const [movedItem] = this.profiles.splice(fromIdx, 1);

        let toIdx = this.profiles.findIndex(p => p.id === targetId);
        if (toIdx === -1) {
          this.profiles.push(movedItem);
        } else {
          if (!dropBefore) toIdx += 1;
          this.profiles.splice(toIdx, 0, movedItem);
        }

        this.profiles.forEach((p, idx) => {
          p.order = idx + 1;
          p.customOrder = idx + 1;
        });

        this.filter.sort = 'custom';
        localStorage.setItem('profiles_sort_pref', 'custom');
        const sortSelect = this.container.querySelector('#filter-sort');
        if (sortSelect) sortSelect.value = 'custom';
        this.updateSortIndicator();

        if (window.api && window.api.reorderProfiles) {
          await window.api.reorderProfiles(this.profiles.map(p => p.id));
        }

        this.renderTableRows();
        if (window.showGlobalToast) {
          window.showGlobalToast(`Đã di chuyển profile "${movedItem.name}" đến vị trí mới!`);
        }
      });
    });
  }

  updateBulkBar() {
    const bar = this.container.querySelector('#bulk-bar');
    const countEl = this.container.querySelector('#bulk-selected-count');
    const deselectBtn = this.container.querySelector('#btn-bulk-deselect-all');
    const checkAll = this.container.querySelector('#check-select-all');
    if (!bar || !countEl) return;

    const count = this.selectedIds.size;
    countEl.innerText = `${count} profile đang chọn`;

    if (count > 0) {
      bar.classList.add('active');
      bar.classList.remove('disabled');
      if (deselectBtn) {
        deselectBtn.style.pointerEvents = 'auto';
        deselectBtn.style.cursor = 'pointer';
      }
      if (checkAll && this.filteredProfiles && this.filteredProfiles.length > 0) {
        const startIndex = (this.currentPage - 1) * this.perPage;
        const pageProfiles = this.filteredProfiles.slice(startIndex, startIndex + this.perPage);
        checkAll.checked = pageProfiles.length > 0 && pageProfiles.every(p => this.selectedIds.has(p.id));
      }
    } else {
      bar.classList.remove('active');
      bar.classList.add('disabled');
      if (deselectBtn) {
        deselectBtn.style.pointerEvents = 'none';
        deselectBtn.style.cursor = 'default';
      }
      if (checkAll) {
        checkAll.checked = false;
      }
      this.closeAllBulkDropdowns();
    }
  }

  getSelectedProfilesInOrder() {
    const source = (this.filteredProfiles && this.filteredProfiles.length > 0) ? this.filteredProfiles : this.profiles;
    return source.filter(p => this.selectedIds.has(p.id));
  }

  closeAllBulkDropdowns() {
    this.container?.querySelectorAll('.tools-dropdown-menu').forEach(m => {
      m.style.display = 'none';
    });
  }

  toggleBulkDropdown(menuId, e) {
    if (e) e.stopPropagation();
    if (this.selectedIds.size === 0) return;
    const menu = this.container?.querySelector(`#${menuId}`);
    if (!menu) return;
    const isVisible = menu.style.display === 'block';
    this.closeAllBulkDropdowns();
    menu.style.display = isVisible ? 'none' : 'block';
  }

  getStatusHtml(p, isRunning) {
    if (isRunning) {
      const portText = p.debugPort ? ` <span style="font-family: monospace; font-size: 11px; color: #0284c7; font-weight: 600; cursor: pointer;" title="Remote Debugging Port - click để copy" onclick="navigator.clipboard.writeText('${p.debugPort}')">[Port: ${p.debugPort}]</span>` : '';
      return `
        <div class="status-pill" title="Remote Debugging Port: ${p.debugPort || 'Auto'}">
          <div class="status-dot running"></div>
          <span>Đang mở${portText}</span>
        </div>
      `;
    }

    if (p.status === 'checking') {
      return `
        <div class="status-pill">
          <div class="status-dot checking"></div>
          <span style="color: #1e293b; font-weight: 500;">Đang kiểm tra</span>
        </div>
      `;
    }

    if (p.status === 'Live' || p.status === 'live') {
      return `
        <div class="status-pill">
          <div class="status-dot live"></div>
          <span style="color: #1e293b; font-weight: 500;">Live</span>
        </div>
      `;
    }

    if (p.status === 'No connection' || p.status === 'error' || p.status === 'dead') {
      return `
        <div class="status-pill">
          <div class="status-dot dead"></div>
          <span style="color: #1e293b; font-weight: 500;">No connection</span>
        </div>
      `;
    }

    return `
      <div class="status-pill">
        <div class="status-dot ready"></div>
        <span>Sẵn sàng</span>
      </div>
    `;
  }

  updateProfileRowStatus(profileId, status, country, ip) {
    const p = this.profiles.find(x => x.id === profileId);
    if (!p) return;
    if (status !== undefined) p.status = status;
    if (country) p.proxyCountry = country;
    if (ip) p.ip = ip;

    const tr = this.container?.querySelector(`#profiles-tbody tr[data-id="${profileId}"]`);
    if (!tr) return;

    // 1. Cập nhật ô Trạng thái
    const statusCell = tr.querySelector('.col-status');
    if (statusCell) {
      const isRunning = p.status === 'running';
      statusCell.innerHTML = this.getStatusHtml(p, isRunning);
    }

    // 2. Cập nhật ô Proxy nếu có thay đổi cờ / IP
    if (country) {
      const proxyCell = tr.querySelector('.col-proxy');
      if (proxyCell) {
        proxyCell.innerHTML = `
          <div class="proxy-cell">
            ${this.getProxyDisplay(p.proxyCountry, p.proxy, p.id, p.name)}
          </div>
        `;
        proxyCell.querySelector('.btn-copy-proxy')?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (p.proxy) {
            navigator.clipboard.writeText(p.proxy);
            if (window.showGlobalToast) window.showGlobalToast('Đã copy proxy vào clipboard!');
          }
        });
        proxyCell.querySelector('.btn-edit-proxy')?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.modals) this.modals.openEditProfileModal(p);
          else if (window.modalsComp) window.modalsComp.openEditProfileModal(p);
        });
      }
    }
  }

  updateProfileStatus(profileId, isRunning) {
    const p = this.profiles.find(item => item.id === profileId);
    if (p) {
      p.status = isRunning ? 'running' : 'ready';
      if (isRunning) p.lastRun = '1s';
      this.renderTableRows();
    }
  }

  updateProfileIp(profileId, ip, country) {
    const p = this.profiles.find(item => item.id === profileId);
    if (p) {
      if (country) p.proxyCountry = country.toLowerCase();
      if (ip) p.ip = ip;
      this.renderTableRows();
    }
  }

  getBrowserIcon(type) {
    const t = (type || 'chrome').toLowerCase();
    if (t === 'brave') {
      return `<span style="color: #ea580c; font-size: 15px;">★</span>`;
    } else if (t === 'edge') {
      return `<div style="width: 13px; height: 13px; border-radius: 50%; background-color: #0284c7;"></div>`;
    } else if (t === 'firefox') {
      return `<div style="width: 13px; height: 13px; border-radius: 50%; background-color: #ea580c;"></div>`;
    }
    return `<svg viewBox="0 0 24 24" width="18" height="18">
      <circle cx="12" cy="12" r="10" fill="#4285F4"/>
      <circle cx="12" cy="12" r="4" fill="#ffffff"/>
      <path d="M12 2a10 10 0 0 1 8.66 5H12z" fill="#EA4335"/>
      <path d="M20.66 7a10 10 0 0 1-5 13.66L12 12z" fill="#FBBC05"/>
      <path d="M3.34 7l4.33 7.5L12 12 3.34 7z" fill="#34A853"/>
    </svg>`;
  }

  getProxyDisplay(country, proxy, profileId, profileName) {
    const hasProxy = proxy && proxy.trim() && proxy.toLowerCase() !== 'no proxy';
    const c = (country || (hasProxy ? 'us' : 'vn')).toLowerCase();
    const flagHtml = renderFlagHtml(c);
    const proxyVal = hasProxy ? proxy.trim() : '';

    if (!hasProxy) {
      return `
        <div class="proxy-row-wrapper" style="display: inline-flex; align-items: center; gap: 8px;">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            <span style="color: #f59e0b; font-size: 14px; font-weight: bold;">★</span>
            ${flagHtml}
            <span style="color: #64748b; font-weight: 500; font-size: 13px;">No Proxy</span>
          </div>
          <button class="proxy-action-btn btn-edit-proxy" data-id="${profileId}" data-name="${this.escape(profileName || '')}" data-proxy="" data-tooltip="Sửa">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
        </div>
      `;
    }

    return `
      <div class="proxy-row-wrapper" style="display: inline-flex; align-items: center; gap: 8px;">
        <div style="display: inline-flex; align-items: center; gap: 6px;">
          ${flagHtml}
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; font-size: 13px; color: #1e293b; font-weight: 500;">${this.escape(proxyVal)}</span>
        </div>
        <div style="display: inline-flex; align-items: center; gap: 4px;">
          <button class="proxy-action-btn btn-copy-proxy" data-proxy="${this.escape(proxyVal)}" data-tooltip="Copy">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="proxy-action-btn btn-edit-proxy" data-id="${profileId}" data-name="${this.escape(profileName || '')}" data-proxy="${this.escape(proxyVal)}" data-tooltip="Sửa">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  getNoteDisplay(notes, profileId, profileName) {
    const hasNote = notes && notes.trim().length > 0;
    const noteVal = hasNote ? notes.trim() : '';

    if (!hasNote) {
      return `
        <div class="note-row-wrapper btn-edit-note" data-id="${profileId}" data-name="${this.escape(profileName || '')}" data-note="" title="Click để thêm ghi chú" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--text-muted);">
          <button class="proxy-action-btn" type="button" style="pointer-events: none;" data-tooltip="Thêm ghi chú">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <span style="font-size: 11.5px; opacity: 0.6; font-style: italic;">Thêm ghi chú</span>
        </div>
      `;
    }

    return `
      <div class="note-row-wrapper" style="display: inline-flex; align-items: center; gap: 8px;">
        <span class="note-text-display btn-edit-note" data-id="${profileId}" data-name="${this.escape(profileName || '')}" data-note="${this.escape(noteVal)}" title="${this.escape(noteVal)}" style="font-size: 12.5px; color: var(--text-main); font-weight: 500; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;">${this.escape(noteVal)}</span>
        <button class="proxy-action-btn btn-edit-note" data-id="${profileId}" data-name="${this.escape(profileName || '')}" data-note="${this.escape(noteVal)}" data-tooltip="Sửa">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
      </div>
    `;
  }



  getTagDisplay(tags, profileId, profileName) {
    let tagList = [];
    if (Array.isArray(tags)) {
      tagList = tags.map(t => (typeof t === 'string' ? t : t?.name || '').trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim()) {
      tagList = tags.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
    }
    const tagsRaw = tagList.join(', ');

    if (tagList.length === 0) {
      return `
        <div class="tag-row-wrapper btn-edit-tag" data-id="${profileId}" data-name="${this.escape(profileName || '')}" data-tags="" title="Click để gán tag" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--text-muted); opacity: 0.7; transition: opacity 0.15s;">
          <span style="font-size: 12px;">🏷️</span>
          <span style="font-size: 12px; font-style: italic;">+ Thêm tag</span>
        </div>
      `;
    }

    const badgeColors = [
      { bg: 'rgba(2, 132, 199, 0.12)', text: '#0284c7', border: 'rgba(2, 132, 199, 0.25)' },
      { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
      { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.25)' },
      { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.25)' },
    ];

    const badges = tagList.slice(0, 3).map((t, idx) => {
      const col = badgeColors[idx % badgeColors.length];
      return `<span class="tag-pill" style="display: inline-flex; align-items: center; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 12px; background: ${col.bg}; color: ${col.text}; border: 1px solid ${col.border}; white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;">${this.escape(t)}</span>`;
    }).join(' ');

    const extra = tagList.length > 3 ? `<span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">+${tagList.length - 3}</span>` : '';

    return `
      <div class="tag-row-wrapper btn-edit-tag" data-id="${profileId}" data-name="${this.escape(profileName || '')}" data-tags="${this.escape(tagsRaw)}" title="${this.escape(tagsRaw)} (Click để sửa)" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; flex-wrap: wrap;">
        ${badges}
        ${extra}
        <button class="proxy-action-btn" type="button" style="pointer-events: none; padding: 2px;" data-tooltip="Sửa tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
      </div>
    `;
  }

  setTags(tags) {
    this.tags = tags || [];
    const select = this.container?.querySelector('#filter-tag');
    if (select) {
      const currentVal = select.value;
      select.innerHTML = '<option value="">--- Chọn tag ---</option>';
      this.tags.forEach(t => {
        const name = typeof t === 'object' ? t.name : t;
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === currentVal) opt.selected = true;
        select.appendChild(opt);
      });
    }
  }

  setGroups(groups) {
    this.groups = groups || [];
    const select = this.container?.querySelector('#filter-group');
    if (select) {
      const currentVal = select.value;
      select.innerHTML = '<option value="">--- Chọn nhóm ---</option>';
      this.groups.forEach(g => {
        const name = typeof g === 'object' ? g.name : g;
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === currentVal) opt.selected = true;
        select.appendChild(opt);
      });
    }
  }

  escape(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
