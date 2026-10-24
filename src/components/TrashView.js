/**
 * Component: TrashViewComponent
 * Quản lý Thùng rác Profile chuẩn 100% theo Ảnh 3 của người dùng:
 * - Thanh tìm kiếm & bộ lọc nhóm, sắp xếp ngày tạo, làm mới
 * - Thanh thao tác hàng loạt (Bulk bar): Xóa vĩnh viễn, Khôi phục
 * - Bảng danh sách profile trong thùng rác: Checkbox, Tên profile, Proxy, Trạng thái, Lần chạy cuối, Tags, Ghi chú, Thao tác
 * - Trạng thái trống (Empty): Robot illustration + Không có dữ liệu để hiển thị
 * - Phân trang: < 1 / 1 >, Số bản ghi mỗi trang: 50, Tổng số
 */

import { getBrowserIconHtml } from '../data/browserIcons.js';

export class TrashViewComponent {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('view-trash');
    this.trashProfiles = [];
    this.selectedIds = new Set();
    this.searchQuery = '';
    this.groupFilter = '';
    this.sortOrder = 'newest';
    this.currentPage = 1;
    this.perPage = 50;
    this.onRestored = options.onRestored || (() => {});
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="trash-view-wrapper" style="display: flex; flex-direction: column; height: 100%; width: 100%; background: var(--bg-main, #f8fafc);">
        
        <!-- Top Filter Bar (Chuẩn Ảnh 3) -->
        <div class="trash-top-bar" style="padding: 10px 20px; background: #ffffff; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="search-box" style="position: relative;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position: absolute; left: 10px; top: 9px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="input-search-trash" class="form-control" placeholder="Tìm kiếm..." style="height: 32px; width: 220px; padding-left: 32px; font-size: 13px; border-radius: 4px; border: 1px solid #cbd5e1;">
            </div>

            <select id="select-trash-group" class="form-control" style="height: 32px; font-size: 13px; border-radius: 4px; border: 1px solid #cbd5e1; padding: 0 10px; min-width: 150px;">
              <option value="">--- Chọn nhóm ---</option>
            </select>

            <select id="select-trash-sort" class="form-control" style="height: 32px; font-size: 13px; border-radius: 4px; border: 1px solid #cbd5e1; padding: 0 10px;">
              <option value="newest" selected>Ngày tạo [Mới -> Cũ]</option>
              <option value="oldest">Ngày tạo [Cũ -> Mới]</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 12.5px; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 4px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 5px;">
              <span>⚡</span> Chế độ chọn: Truyền thống
            </div>
            <button type="button" class="btn btn-outline" id="btn-refresh-trash" title="Tải lại danh sách thùng rác" style="width: 32px; height: 32px; padding: 0; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #475569;">
              🔄
            </button>
          </div>
        </div>

        <!-- Bulk Bar (Chuẩn Ảnh 3: ✕ 0 profile đang chọn | Xóa | Khôi phục) -->
        <div class="trash-bulk-bar" id="trash-bulk-bar" style="padding: 6px 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px; min-height: 42px;">
          <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b;">
            <span style="cursor: pointer; font-weight: bold;" id="btn-trash-clear-selection">✕</span>
            <span id="trash-selected-count-label">0 profile đang chọn</span>
          </div>
          <div style="height: 18px; width: 1px; background: #cbd5e1; margin: 0 4px;"></div>
          <button type="button" class="btn btn-outline" id="btn-trash-bulk-delete" disabled style="height: 28px; padding: 0 12px; font-size: 12.5px; border-radius: 4px; color: #ef4444; border-color: #e2e8f0; opacity: 0.5; cursor: default; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; transition: all 0.15s ease;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>Xóa vĩnh viễn</span>
          </button>
          <button type="button" class="btn btn-outline" id="btn-trash-bulk-restore" disabled style="height: 28px; padding: 0 12px; font-size: 12.5px; border-radius: 4px; color: #0284c7; border-color: #e2e8f0; opacity: 0.5; cursor: default; display: inline-flex; align-items: center; gap: 6px; font-weight: 500; transition: all 0.15s ease;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            <span>Khôi phục</span>
          </button>
        </div>

        <!-- Table Container -->
        <div class="table-wrapper" style="flex: 1; overflow: auto; background: #ffffff;">
          <table class="profile-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">
                <th style="width: 40px; padding: 10px 14px; text-align: center;">
                  <input type="checkbox" id="check-select-all-trash" style="cursor: pointer;">
                </th>
                <th style="min-width: 250px; padding: 10px 14px;">Tên profile</th>
                <th style="min-width: 180px; padding: 10px 14px;">Proxy</th>
                <th style="width: 130px; padding: 10px 14px;">Trạng thái</th>
                <th style="width: 130px; padding: 10px 14px;">Lần chạy cuối</th>
                <th style="width: 120px; padding: 10px 14px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Tags</span>
                    <button type="button" style="background: none; border: none; cursor: pointer; color: #64748b; padding: 0 2px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    </button>
                  </div>
                </th>
                <th style="min-width: 120px; padding: 10px 14px;">Ghi chú</th>
                <th style="min-width: 180px; width: 180px; padding: 10px 14px; text-align: right;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="trash-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer (Chuẩn Ảnh 3) -->
        <div class="pagination-footer" style="height: 46px; background: #ffffff; border-top: 1px solid var(--border-color, #e2e8f0); padding: 0 20px; display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #64748b;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="page-btn" id="btn-trash-prev-page" style="width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&lt;</button>
            <span id="trash-page-display">1 / 1</span>
            <button class="page-btn" id="btn-trash-next-page" style="width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&gt;</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>Số bản ghi mỗi trang:</span>
            <select id="trash-per-page-select" class="form-control" style="height: 28px; padding: 0 6px; font-size: 12.5px; border-radius: 4px; border: 1px solid #cbd5e1;">
              <option value="20">20</option>
              <option value="50" selected>50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div>
            <span>Tổng số: <strong id="trash-total-count" style="color: #1e293b;">0</strong></span>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Search
    this.container.querySelector('#input-search-trash')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target.value || '').trim();
      this.currentPage = 1;
      this.renderTable();
    });

    // Group Filter
    this.container.querySelector('#select-trash-group')?.addEventListener('change', (e) => {
      this.groupFilter = e.target.value;
      this.currentPage = 1;
      this.renderTable();
    });

    // Sort
    this.container.querySelector('#select-trash-sort')?.addEventListener('change', (e) => {
      this.sortOrder = e.target.value;
      this.renderTable();
    });

    // Refresh
    this.container.querySelector('#btn-refresh-trash')?.addEventListener('click', () => {
      this.loadTrash();
    });

    // Check all
    this.container.querySelector('#check-select-all-trash')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.getFilteredTrash().forEach(p => this.selectedIds.add(p.id));
      } else {
        this.selectedIds.clear();
      }
      this.renderTable();
    });

    // Deselect all (✕ button)
    this.container.querySelector('#btn-trash-clear-selection')?.addEventListener('click', () => {
      this.selectedIds.clear();
      const chkAll = this.container.querySelector('#check-select-all-trash');
      if (chkAll) chkAll.checked = false;
      this.renderTable();
    });

    // Phân trang
    this.container.querySelector('#btn-trash-prev-page')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderTable();
      }
    });

    this.container.querySelector('#btn-trash-next-page')?.addEventListener('click', () => {
      const maxPage = Math.ceil(this.getFilteredTrash().length / this.perPage) || 1;
      if (this.currentPage < maxPage) {
        this.currentPage++;
        this.renderTable();
      }
    });

    this.container.querySelector('#trash-per-page-select')?.addEventListener('change', (e) => {
      this.perPage = parseInt(e.target.value, 10) || 50;
      this.currentPage = 1;
      this.renderTable();
    });

    // Bulk Delete Permanently from Trash
    this.container.querySelector('#btn-trash-bulk-delete')?.addEventListener('click', async () => {
      if (this.selectedIds.size === 0) return;
      const count = this.selectedIds.size;
      if (confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa VĨNH VIỄN ${count} profile này? Hành động này không thể hoàn tác!`)) {
        if (window.api && window.api.deleteTrashProfiles) {
          await window.api.deleteTrashProfiles(Array.from(this.selectedIds));
          this.selectedIds.clear();
          await this.loadTrash();
          if (window.showGlobalToast) {
            window.showGlobalToast(`✔ Đã xóa vĩnh viễn ${count} profile khỏi hệ thống!`);
          }
        }
      }
    });

    // Bulk Restore from Trash
    this.container.querySelector('#btn-trash-bulk-restore')?.addEventListener('click', async () => {
      if (this.selectedIds.size === 0) return;
      const count = this.selectedIds.size;
      if (window.api && window.api.restoreProfiles) {
        await window.api.restoreProfiles(Array.from(this.selectedIds));
        this.selectedIds.clear();
        await this.loadTrash();
        if (window.showGlobalToast) {
          window.showGlobalToast(`🎉 Đã khôi phục thành công ${count} profile về danh sách hoạt động!`);
        }
        this.onRestored();
      }
    });

    // Table body actions (Single Restore, Single Delete permanently)
    const tbody = this.container.querySelector('#trash-tbody');
    tbody?.addEventListener('click', async (e) => {
      // Row checkbox
      const chk = e.target.closest('.trash-row-check');
      if (chk) {
        const id = chk.getAttribute('data-id');
        if (chk.checked) this.selectedIds.add(id);
        else this.selectedIds.delete(id);
        this.updateBulkBar();
        return;
      }

      // Single restore
      const btnRestore = e.target.closest('.btn-trash-restore-single');
      if (btnRestore) {
        const id = btnRestore.getAttribute('data-id');
        if (window.api && window.api.restoreProfiles) {
          await window.api.restoreProfiles([id]);
          this.selectedIds.delete(id);
          await this.loadTrash();
          if (window.showGlobalToast) {
            window.showGlobalToast('🎉 Đã khôi phục profile thành công!');
          }
          this.onRestored();
        }
        return;
      }

      // Single delete permanently
      const btnDelete = e.target.closest('.btn-trash-delete-single');
      if (btnDelete) {
        const id = btnDelete.getAttribute('data-id');
        if (confirm('Bạn có chắc muốn xóa VĨNH VIỄN profile này? Dữ liệu sẽ không thể khôi phục lại!')) {
          if (window.api && window.api.deleteTrashProfiles) {
            await window.api.deleteTrashProfiles([id]);
            this.selectedIds.delete(id);
            await this.loadTrash();
            if (window.showGlobalToast) {
              window.showGlobalToast('✔ Đã xóa vĩnh viễn profile!');
            }
          }
        }
        return;
      }
    });
  }

  async loadTrash() {
    if (!window.api || !window.api.getTrashProfiles) return;
    try {
      this.trashProfiles = await window.api.getTrashProfiles();
      await this.loadGroupOptions();
      this.renderTable();
    } catch (e) {
      console.error('Lỗi tải danh sách thùng rác:', e);
    }
  }

  async loadGroupOptions() {
    if (!window.api || !window.api.getGroups) return;
    try {
      const groups = await window.api.getGroups();
      const select = this.container.querySelector('#select-trash-group');
      if (select) {
        const currentVal = select.value;
        select.innerHTML = '<option value="">--- Chọn nhóm ---</option>';
        groups.forEach(g => {
          const name = typeof g === 'object' ? g.name : g;
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          if (name === currentVal) opt.selected = true;
          select.appendChild(opt);
        });
      }
    } catch (e) {}
  }

  getFilteredTrash() {
    let list = [...this.trashProfiles];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchProxy = (p.proxy || '').toLowerCase().includes(q);
        const matchTag = p.tags && p.tags.toLowerCase().includes(q);
        const matchNote = (p.note || p.notes || '').toLowerCase().includes(q);
        return matchName || matchProxy || matchTag || matchNote;
      });
    }

    if (this.groupFilter) {
      list = list.filter(p => p.group === this.groupFilter);
    }

    if (this.sortOrder === 'newest') {
      list.sort((a, b) => (b.deletedAt || b.createdAt || 0) - (a.deletedAt || a.createdAt || 0));
    } else if (this.sortOrder === 'oldest') {
      list.sort((a, b) => (a.deletedAt || a.createdAt || 0) - (b.deletedAt || b.createdAt || 0));
    }

    return list;
  }

  updateBulkBar() {
    const label = this.container.querySelector('#trash-selected-count-label');
    const btnDel = this.container.querySelector('#btn-trash-bulk-delete');
    const btnRestore = this.container.querySelector('#btn-trash-bulk-restore');

    const count = this.selectedIds.size;
    if (label) label.textContent = `${count} profile đang chọn`;

    if (count > 0) {
      if (btnDel) {
        btnDel.disabled = false;
        btnDel.style.opacity = '1';
        btnDel.style.cursor = 'pointer';
        btnDel.style.borderColor = '#fca5a5';
        btnDel.style.background = '#fef2f2';
        btnDel.style.fontWeight = '600';
      }
      if (btnRestore) {
        btnRestore.disabled = false;
        btnRestore.style.opacity = '1';
        btnRestore.style.cursor = 'pointer';
        btnRestore.style.borderColor = '#7dd3fc';
        btnRestore.style.background = '#f0f9ff';
        btnRestore.style.fontWeight = '600';
      }
    } else {
      if (btnDel) {
        btnDel.disabled = true;
        btnDel.style.opacity = '0.5';
        btnDel.style.cursor = 'default';
        btnDel.style.borderColor = '#e2e8f0';
        btnDel.style.background = 'transparent';
        btnDel.style.fontWeight = '500';
      }
      if (btnRestore) {
        btnRestore.disabled = true;
        btnRestore.style.opacity = '0.5';
        btnRestore.style.cursor = 'default';
        btnRestore.style.borderColor = '#e2e8f0';
        btnRestore.style.background = 'transparent';
        btnRestore.style.fontWeight = '500';
      }
    }

    const chkAll = this.container.querySelector('#check-select-all-trash');
    if (chkAll) {
      const filtered = this.getFilteredTrash();
      chkAll.checked = (count > 0 && filtered.length > 0) ? filtered.every(p => this.selectedIds.has(p.id)) : false;
    }
  }

  getBrowserIcon(type) {
    return getBrowserIconHtml(type, 22);
  }

  renderTable() {
    const tbody = this.container.querySelector('#trash-tbody');
    if (!tbody) return;

    const filtered = this.getFilteredTrash();
    const totalCountEl = this.container.querySelector('#trash-total-count');
    const pageDisplayEl = this.container.querySelector('#trash-page-display');

    if (totalCountEl) totalCountEl.textContent = filtered.length;

    const maxPage = Math.ceil(filtered.length / this.perPage) || 1;
    if (this.currentPage > maxPage) this.currentPage = maxPage;
    if (pageDisplayEl) pageDisplayEl.textContent = `${this.currentPage} / ${maxPage}`;

    this.updateBulkBar();

    // Hiển thị Robot Empty State khi rỗng (Chuẩn Ảnh 3)
    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="padding: 60px 20px; text-align: center; background: #ffffff;">
            <div class="empty-data-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;">
              <svg width="110" height="125" viewBox="0 0 120 135" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Drop Shadow -->
                <ellipse cx="60" cy="130" rx="35" ry="5" fill="#e2e8f0" />
                <!-- Ears / Antennae -->
                <path d="M42 22L33 10C32 9 30 10 31 12L37 28" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round" />
                <path d="M78 22L87 10C88 9 90 10 89 12L83 28" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round" />
                <!-- Head Base -->
                <rect x="30" y="16" width="60" height="48" rx="20" fill="url(#robot_head_grad_trash)" stroke="#cbd5e1" stroke-width="1.5" />
                <!-- Head Screen -->
                <rect x="36" y="24" width="48" height="32" rx="14" fill="#0f172a" />
                <!-- Cyan Eyes (Sad / Downward curved) -->
                <path d="M44 38C46 36 50 36 52 39" stroke="#38bdf8" stroke-width="3.2" stroke-linecap="round" fill="none" />
                <path d="M68 39C70 36 74 36 76 38" stroke="#38bdf8" stroke-width="3.2" stroke-linecap="round" fill="none" />
                <!-- Neck -->
                <rect x="52" y="62" width="16" height="5" rx="2" fill="#94a3b8" />
                <!-- Body -->
                <rect x="34" y="66" width="52" height="44" rx="18" fill="url(#robot_body_grad_trash)" stroke="#cbd5e1" stroke-width="1.5" />
                <!-- Arms -->
                <rect x="23" y="72" width="9" height="24" rx="4.5" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.2" />
                <rect x="88" y="72" width="9" height="24" rx="4.5" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.2" />
                <!-- Legs -->
                <rect x="44" y="108" width="12" height="15" rx="5" fill="#cbd5e1" />
                <rect x="64" y="108" width="12" height="15" rx="5" fill="#cbd5e1" />
                <!-- Power Button on Belly -->
                <circle cx="60" cy="88" r="5" stroke="#38bdf8" stroke-width="1.5" fill="none" />
                <line x1="60" y1="84" x2="60" y2="88" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" />
                <defs>
                  <linearGradient id="robot_head_grad_trash" x1="60" y1="16" x2="60" y2="64" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#ffffff" />
                    <stop offset="1" stop-color="#e2e8f0" />
                  </linearGradient>
                  <linearGradient id="robot_body_grad_trash" x1="60" y1="66" x2="60" y2="110" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#ffffff" />
                    <stop offset="1" stop-color="#e2e8f0" />
                  </linearGradient>
                </defs>
              </svg>
              <div style="font-size: 13.5px; color: #64748b; font-weight: 500;">Không có dữ liệu để hiển thị</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const startIndex = (this.currentPage - 1) * this.perPage;
    const pageItems = filtered.slice(startIndex, startIndex + this.perPage);

    tbody.innerHTML = pageItems.map((p, idx) => {
      const isChecked = this.selectedIds.has(p.id);
      const name = this.escape(p.name || `Profile ${p.id}`);
      const group = this.escape(p.group || 'Default group');
      const proxy = this.escape(p.proxy || 'No Proxy');
      const lastRun = this.escape(p.lastRun || 'Chưa chạy');
      const notes = this.escape(p.note || p.notes || '');
      const tags = this.escape(p.tags || '');

      let profileIndex = p.index || p.order || p.stt;
      if (!profileIndex) {
        const match = (p.name || '').match(/(\d+)/);
        profileIndex = match ? parseInt(match[1], 10) : (startIndex + idx + 1);
      }

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.1s;">
          <td style="padding: 10px 14px; text-align: center;">
            <input type="checkbox" class="trash-row-check" data-id="${p.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
          </td>
          <td style="padding: 10px 14px;">
            <div class="profile-cell">
              <div class="browser-icon-badge-container" title="Profile #${profileIndex}">
                ${this.getBrowserIcon(p.browserType)}
                <span class="profile-badge-pill" style="background-color: #64748b;">${profileIndex}</span>
              </div>
              <div class="profile-info">
                <span class="profile-name" style="${p.color ? `color: ${this.escape(p.color)} !important;` : ''}">${name}</span>
                <span class="profile-group">📁 ${group}</span>
              </div>
            </div>
          </td>
          <td style="padding: 10px 14px;">
            <span style="font-family: monospace; font-size: 12px; color: ${proxy.toLowerCase() === 'no proxy' ? '#94a3b8' : '#334155'}; font-weight: ${proxy.toLowerCase() === 'no proxy' ? 'normal' : '500'};">${proxy}</span>
          </td>
          <td style="padding: 10px 14px;">
            <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: #ef4444; background: #fef2f2; padding: 2px 8px; border-radius: 12px; border: 1px solid #fee2e2; font-weight: 500; white-space: nowrap;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444;"></span>
              Đã xóa
            </span>
          </td>
          <td style="padding: 10px 14px; color: #64748b; font-size: 12px; white-space: nowrap;">
            ⏱ ${lastRun}
          </td>
          <td style="padding: 10px 14px; color: #64748b; font-size: 12px;">
            ${tags ? `<span style="font-size: 12px; color: #0284c7; font-weight: 500;">${tags}</span>` : '<span style="color: #cbd5e1;">---</span>'}
          </td>
          <td style="padding: 10px 14px; color: #64748b; font-size: 12px;">
            ${notes || '<span style="color: #cbd5e1;">---</span>'}
          </td>
          <td style="padding: 10px 14px; text-align: right; white-space: nowrap;">
            <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 8px; white-space: nowrap;">
              <button type="button" class="btn-trash-restore-single" data-id="${p.id}" title="Khôi phục profile về danh sách hoạt động">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                <span>Khôi phục</span>
              </button>
              <button type="button" class="btn-trash-delete-single" data-id="${p.id}" title="Xóa vĩnh viễn profile này">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  escape(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

