/**
 * Component: ProxyViewComponent
 * Quản lý danh sách Proxy chuẩn theo Ảnh 1 của người dùng:
 * - Top tab: ≡ Quản lý proxy | 🛒 Mua Proxy giá ưu đãi
 * - Action bar: + Thêm mới, Tìm kiếm, Làm mới
 * - Bảng danh sách: Checkbox, Loại, Thông tin, Tags, Thời gian tạo, Trạng thái, Thao tác
 * - Trạng thái trống (Empty): Robot illustration + Không có dữ liệu để hiển thị
 * - Phân trang: < 1 / 1 >, Số bản ghi mỗi trang, Tổng số
 */

export class ProxyViewComponent {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('view-proxy');
    this.proxies = [];
    this.selectedIds = new Set();
    this.searchQuery = '';
    this.proxyStatusFilter = '';
    this.currentPage = 1;
    this.perPage = 30;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="proxy-view-wrapper" style="display: flex; flex-direction: column; height: 100%; width: 100%; background: var(--bg-main, #f8fafc);">
        
        <!-- Header Sub-Tabs (Chuẩn Ảnh 1) -->
        <div class="proxy-header-tabs" style="height: 44px; background: #ffffff; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; align-items: center; padding: 0 20px; gap: 24px;">
          <div class="proxy-tab-item active" style="height: 100%; display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: #0284c7; border-bottom: 2px solid #0284c7; cursor: pointer;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            <span>Quản lý proxy</span>
          </div>
          <a href="https://proxygpm.com" target="_blank" class="proxy-tab-item" style="height: 100%; display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 500; color: #64748b; text-decoration: none; cursor: pointer; transition: color 0.15s;">
            <span>🛒</span>
            <span>Mua Proxy giá ưu đãi</span>
          </a>
        </div>

        <!-- Action Bar (Chuẩn Ảnh 1) -->
        <div class="proxy-action-bar" style="padding: 10px 20px; background: #ffffff; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button type="button" class="btn btn-primary" id="btn-add-proxy-trigger" style="height: 32px; padding: 0 14px; font-size: 13px; font-weight: 600; border-radius: 4px; background: #0284c7; display: inline-flex; align-items: center; gap: 6px;">
              <span>+</span> Thêm mới
            </button>
            <div class="search-box" style="position: relative;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position: absolute; left: 10px; top: 9px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="input-search-proxy" class="form-control" placeholder="Tìm kiếm..." style="height: 32px; width: 220px; padding-left: 32px; font-size: 13px; border-radius: 4px; border: 1px solid #cbd5e1;">
            </div>
            <select class="select-input" id="filter-proxy-status-pv" style="height: 32px; font-size: 13px; border-radius: 4px; border: 1px solid #cbd5e1; min-width: 150px;" title="Lọc theo trạng thái Proxy">
              <option value="">--- Trạng thái ---</option>
              <option value="live" ${this.proxyStatusFilter === 'live' ? 'selected' : ''}>🟢 Live</option>
              <option value="dead" ${this.proxyStatusFilter === 'dead' ? 'selected' : ''}>🔴 False / Die</option>
              <option value="unknown" ${this.proxyStatusFilter === 'unknown' ? 'selected' : ''}>⚪ Chưa kiểm tra</option>
            </select>
            <button type="button" class="btn btn-outline" id="btn-refresh-proxy-list" style="height: 32px; padding: 0 12px; font-size: 12.5px; border-radius: 4px; color: #475569; display: inline-flex; align-items: center; gap: 5px;">
              <span>🔄</span> Làm mới
            </button>
          </div>

          <!-- Bulk bar when selected -->
          <div id="proxy-bulk-actions" style="display: none; align-items: center; gap: 8px;">
            <span style="font-size: 12.5px; font-weight: 600; color: #0284c7;" id="proxy-selected-count">0 đang chọn</span>
            <button type="button" class="btn btn-outline" id="btn-bulk-check-proxy" style="height: 28px; padding: 0 12px; font-size: 12.5px; border-radius: 4px; color: #0284c7; border-color: #7dd3fc; background: #f0f9ff; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <span>Kiểm tra</span>
            </button>
            <button type="button" class="btn btn-outline" id="btn-bulk-delete-proxy" style="height: 28px; padding: 0 12px; font-size: 12.5px; border-radius: 4px; color: #ef4444; border-color: #fca5a5; background: #fef2f2; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              <span>Xóa</span>
            </button>
          </div>
        </div>

        <!-- Table Container -->
        <div class="table-wrapper" style="flex: 1; overflow: auto; background: #ffffff;">
          <table class="profile-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">
                <th style="width: 40px; padding: 10px 14px; text-align: center;">
                  <input type="checkbox" id="check-select-all-proxies" style="cursor: pointer;">
                </th>
                <th style="width: 100px; padding: 10px 14px;">Loại</th>
                <th style="min-width: 240px; padding: 10px 14px;">Thông tin</th>
                <th style="width: 140px; padding: 10px 14px;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Tags</span>
                    <button type="button" style="background: none; border: none; cursor: pointer; color: #64748b; padding: 0 2px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    </button>
                  </div>
                </th>
                <th style="width: 160px; padding: 10px 14px;">Thời gian tạo</th>
                <th style="width: 140px; padding: 10px 14px;">Trạng thái</th>
                <th style="min-width: 170px; width: 170px; padding: 10px 14px; text-align: right;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="proxy-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer (Chuẩn Ảnh 1) -->
        <div class="pagination-footer" style="height: 46px; background: #ffffff; border-top: 1px solid var(--border-color, #e2e8f0); padding: 0 20px; display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #64748b;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="page-btn" id="btn-proxy-prev-page" style="width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&lt;</button>
            <span id="proxy-page-display">1 / 1</span>
            <button class="page-btn" id="btn-proxy-next-page" style="width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&gt;</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>Số bản ghi mỗi trang:</span>
            <select id="proxy-per-page-select" class="form-control" style="height: 28px; padding: 0 6px; font-size: 12.5px; border-radius: 4px; border: 1px solid #cbd5e1;">
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30" selected>30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div>
            <span>Tổng số: <strong id="proxy-total-count" style="color: #1e293b;">0</strong></span>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Nút Thêm mới -> Mở modal Add Proxy
    this.container.querySelector('#btn-add-proxy-trigger')?.addEventListener('click', () => {
      if (window.modalsComp && window.modalsComp.openAddProxyModal) {
        window.modalsComp.openAddProxyModal(() => {
          this.loadProxies();
        });
      }
    });

    // Tìm kiếm
    this.container.querySelector('#input-search-proxy')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target.value || '').trim();
      this.currentPage = 1;
      this.renderTable();
    });

    // Lọc theo trạng thái Proxy
    this.container.querySelector('#filter-proxy-status-pv')?.addEventListener('change', (e) => {
      this.proxyStatusFilter = e.target.value;
      this.currentPage = 1;
      this.renderTable();
    });

    // Làm mới
    this.container.querySelector('#btn-refresh-proxy-list')?.addEventListener('click', () => {
      this.loadProxies();
    });

    // Check All
    this.container.querySelector('#check-select-all-proxies')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.getFilteredProxies().forEach(p => this.selectedIds.add(p.id));
      } else {
        this.selectedIds.clear();
      }
      this.renderTable();
    });

    // Phân trang
    this.container.querySelector('#btn-proxy-prev-page')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderTable();
      }
    });

    this.container.querySelector('#btn-proxy-next-page')?.addEventListener('click', () => {
      const maxPage = Math.ceil(this.getFilteredProxies().length / this.perPage) || 1;
      if (this.currentPage < maxPage) {
        this.currentPage++;
        this.renderTable();
      }
    });

    this.container.querySelector('#proxy-per-page-select')?.addEventListener('change', (e) => {
      this.perPage = parseInt(e.target.value, 10) || 30;
      this.currentPage = 1;
      this.renderTable();
    });

    // Bulk actions
    this.container.querySelector('#btn-bulk-delete-proxy')?.addEventListener('click', async () => {
      if (this.selectedIds.size === 0) return;
      if (confirm(`Bạn có chắc chắn muốn xóa ${this.selectedIds.size} proxy đã chọn?`)) {
        if (window.api && window.api.deleteMultipleProxies) {
          await window.api.deleteMultipleProxies(Array.from(this.selectedIds));
          this.selectedIds.clear();
          await this.loadProxies();
          if (window.showGlobalToast) window.showGlobalToast('✔ Đã xóa proxy thành công!');
        }
      }
    });

    this.container.querySelector('#btn-bulk-check-proxy')?.addEventListener('click', async () => {
      if (this.selectedIds.size === 0) return;
      const ids = Array.from(this.selectedIds);
      for (const id of ids) {
        const p = this.proxies.find(x => x.id === id);
        if (p) p.status = 'checking';
      }
      this.renderTable();

      for (const id of ids) {
        if (window.api && window.api.checkProxyLive) {
          try {
            await window.api.checkProxyLive(id);
          } catch (e) {}
        }
      }
      await this.loadProxies();
    });

    // Table body actions (Check live, Delete, Copy)
    const tbody = this.container.querySelector('#proxy-tbody');
    tbody?.addEventListener('click', async (e) => {
      // Checkbox hàng
      const chk = e.target.closest('.proxy-row-check');
      if (chk) {
        const id = chk.getAttribute('data-id');
        if (chk.checked) this.selectedIds.add(id);
        else this.selectedIds.delete(id);
        this.updateBulkBar();
        return;
      }

      // Nút copy thông tin proxy
      const btnCopy = e.target.closest('.btn-copy-proxy-info');
      if (btnCopy) {
        const val = btnCopy.getAttribute('data-val');
        if (val) {
          navigator.clipboard.writeText(val);
          if (window.showGlobalToast) window.showGlobalToast('📋 Đã copy thông tin proxy!');
        }
        return;
      }

      // Nút kiểm tra proxy lẻ
      const btnCheck = e.target.closest('.btn-check-single-proxy');
      if (btnCheck) {
        const id = btnCheck.getAttribute('data-id');
        const p = this.proxies.find(x => x.id === id);
        if (p) {
          p.status = 'checking';
          this.renderTable();
          if (window.api && window.api.checkProxyLive) {
            await window.api.checkProxyLive(id);
            await this.loadProxies();
          }
        }
        return;
      }

      // Nút xóa proxy lẻ
      const btnDel = e.target.closest('.btn-del-single-proxy');
      if (btnDel) {
        const id = btnDel.getAttribute('data-id');
        if (confirm('Bạn có chắc muốn xóa proxy này?')) {
          if (window.api && window.api.deleteProxy) {
            await window.api.deleteProxy(id);
            this.selectedIds.delete(id);
            await this.loadProxies();
            if (window.showGlobalToast) window.showGlobalToast('✔ Đã xóa proxy!');
          }
        }
        return;
      }
    });
  }

  async loadProxies() {
    if (!window.api || !window.api.getProxies) return;
    try {
      this.proxies = await window.api.getProxies();
      this.renderTable();
    } catch (e) {
      console.error('Lỗi load proxies:', e);
    }
  }

  getFilteredProxies() {
    let list = this.proxies || [];

    // Lọc theo trạng thái Proxy (Live, Dead / False, Unknown)
    if (this.proxyStatusFilter) {
      list = list.filter(p => {
        const s = (p.status || '').toLowerCase();
        if (this.proxyStatusFilter === 'live') {
          return s === 'live';
        } else if (this.proxyStatusFilter === 'dead' || this.proxyStatusFilter === 'false') {
          return s === 'no connection' || s === 'error' || s === 'dead' || s === 'false' || s === 'die';
        } else if (this.proxyStatusFilter === 'unknown') {
          return s !== 'live' && s !== 'no connection' && s !== 'error' && s !== 'dead' && s !== 'false' && s !== 'die';
        }
        return true;
      });
    }

    if (!this.searchQuery) return list;
    const q = this.searchQuery.toLowerCase();
    return list.filter(p => {
      const matchHost = (p.host || '').toLowerCase().includes(q);
      const matchPort = (p.port + '').includes(q);
      const matchType = (p.type || '').toLowerCase().includes(q);
      const matchRaw = (p.raw || '').toLowerCase().includes(q);
      const matchTags = Array.isArray(p.tags) ? p.tags.some(t => t.toLowerCase().includes(q)) : (p.tags || '').toLowerCase().includes(q);
      const matchNote = (p.note || '').toLowerCase().includes(q);
      const statusStr = (p.status || '').toLowerCase();
      let matchStatus = statusStr.includes(q);
      if (q === 'live' || q === 'line') matchStatus = matchStatus || statusStr === 'live';
      if (q === 'false' || q === 'die' || q === 'dead' || q === 'error' || q === 'no connection') {
        matchStatus = matchStatus || statusStr === 'no connection' || statusStr === 'dead' || statusStr === 'error' || statusStr === 'false';
      }
      return matchHost || matchPort || matchType || matchRaw || matchTags || matchNote || matchStatus;
    });
  }

  updateBulkBar() {
    const bulkBar = this.container.querySelector('#proxy-bulk-actions');
    const bulkCount = this.container.querySelector('#proxy-selected-count');
    if (this.selectedIds.size > 0) {
      if (bulkBar) bulkBar.style.display = 'flex';
      if (bulkCount) bulkCount.textContent = `${this.selectedIds.size} đang chọn`;
    } else {
      if (bulkBar) bulkBar.style.display = 'none';
    }
  }

  renderTable() {
    const tbody = this.container.querySelector('#proxy-tbody');
    if (!tbody) return;

    const filtered = this.getFilteredProxies();
    const totalCountEl = this.container.querySelector('#proxy-total-count');
    const pageDisplayEl = this.container.querySelector('#proxy-page-display');

    if (totalCountEl) totalCountEl.textContent = filtered.length;

    const maxPage = Math.ceil(filtered.length / this.perPage) || 1;
    if (this.currentPage > maxPage) this.currentPage = maxPage;
    if (pageDisplayEl) pageDisplayEl.textContent = `${this.currentPage} / ${maxPage}`;

    this.updateBulkBar();

    // Hiển thị Robot Empty State khi danh sách rỗng (Chuẩn Ảnh 1)
    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 60px 20px; text-align: center; background: #ffffff;">
            <div class="empty-data-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;">
              <svg width="110" height="125" viewBox="0 0 120 135" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Drop Shadow -->
                <ellipse cx="60" cy="130" rx="35" ry="5" fill="#e2e8f0" />
                <!-- Ears / Antennae -->
                <path d="M42 22L33 10C32 9 30 10 31 12L37 28" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round" />
                <path d="M78 22L87 10C88 9 90 10 89 12L83 28" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round" />
                <!-- Head Base -->
                <rect x="30" y="16" width="60" height="48" rx="20" fill="url(#robot_head_grad_proxy)" stroke="#cbd5e1" stroke-width="1.5" />
                <!-- Head Screen -->
                <rect x="36" y="24" width="48" height="32" rx="14" fill="#0f172a" />
                <!-- Cyan Eyes (Sad / Downward curved) -->
                <path d="M44 38C46 36 50 36 52 39" stroke="#38bdf8" stroke-width="3.2" stroke-linecap="round" fill="none" />
                <path d="M68 39C70 36 74 36 76 38" stroke="#38bdf8" stroke-width="3.2" stroke-linecap="round" fill="none" />
                <!-- Neck -->
                <rect x="52" y="62" width="16" height="5" rx="2" fill="#94a3b8" />
                <!-- Body -->
                <rect x="34" y="66" width="52" height="44" rx="18" fill="url(#robot_body_grad_proxy)" stroke="#cbd5e1" stroke-width="1.5" />
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
                  <linearGradient id="robot_head_grad_proxy" x1="60" y1="16" x2="60" y2="64" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#ffffff" />
                    <stop offset="1" stop-color="#e2e8f0" />
                  </linearGradient>
                  <linearGradient id="robot_body_grad_proxy" x1="60" y1="66" x2="60" y2="110" gradientUnits="userSpaceOnUse">
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

    tbody.innerHTML = pageItems.map(p => {
      const isChecked = this.selectedIds.has(p.id);
      const typeLabel = (p.type || 'HTTP').toUpperCase();
      const infoStr = p.raw || `${p.host}:${p.port}`;
      const createdDateStr = p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '---';

      // Status pill badge
      let statusBadge = `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #64748b;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;"></span> Chưa kiểm tra</span>`;
      if (p.status === 'checking') {
        statusBadge = `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #0284c7;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #0284c7; animation: pulse 1s infinite;"></span> Đang kiểm tra...</span>`;
      } else if (p.status === 'Live' || p.status === 'live') {
        const countryFlag = p.country ? `<span style="font-size: 13px; text-transform: uppercase; font-weight: 700; color: #059669;">[${p.country}]</span>` : '';
        statusBadge = `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #16a34a; font-weight: 600;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #16a34a;"></span> Live ${countryFlag}</span>`;
      } else if (p.status === 'Die' || p.status === 'die' || p.status === 'No connection') {
        statusBadge = `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #ef4444; font-weight: 600;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #ef4444;"></span> Die</span>`;
      }

      // Tags
      const tagsList = Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : []);
      const tagsHtml = tagsList.length > 0 
        ? tagsList.map(t => `<span style="display: inline-block; padding: 2px 7px; font-size: 11px; background: #e0f2fe; color: #0369a1; border-radius: 4px; margin-right: 4px;">${t}</span>`).join('')
        : '<span style="color: #cbd5e1;">---</span>';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.1s;">
          <td style="padding: 10px 14px; text-align: center;">
            <input type="checkbox" class="proxy-row-check" data-id="${p.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
          </td>
          <td style="padding: 10px 14px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: ${typeLabel === 'SOCKS5' ? '#fef3c7' : '#f1f5f9'}; color: ${typeLabel === 'SOCKS5' ? '#b45309' : '#334155'};">
              ${typeLabel}
            </span>
          </td>
          <td style="padding: 10px 14px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-family: monospace; font-size: 12.5px; color: #1e293b; font-weight: 500;">${infoStr}</span>
              <button type="button" class="btn-copy-proxy-info" data-val="${infoStr}" title="Copy proxy" style="background: none; border: none; cursor: pointer; color: #94a3b8; padding: 2px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </td>
          <td style="padding: 10px 14px;">
            ${tagsHtml}
          </td>
          <td style="padding: 10px 14px; color: #64748b; font-size: 12px;">
            ${createdDateStr}
          </td>
          <td style="padding: 10px 14px;">
            ${statusBadge}
          </td>
          <td style="padding: 10px 14px; text-align: right; white-space: nowrap;">
            <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 8px; white-space: nowrap;">
              <button type="button" class="btn-proxy-check-single btn-check-single-proxy" data-id="${p.id}" title="Kiểm tra kết nối proxy">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                <span>Check</span>
              </button>
              <button type="button" class="btn-proxy-del-single btn-del-single-proxy" data-id="${p.id}" title="Xóa proxy này">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}
