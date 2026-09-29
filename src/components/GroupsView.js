/**
 * Component: GroupsViewComponent
 * Quản lý danh sách Nhóm & Tags profile
 * - Quản lý Nhóm: Thêm, sửa, xóa, copy tên nhóm
 * - Quản lý Tags: Thêm tag mới, xóa tag, thống kê số profile đang dùng tag
 */

export class GroupsViewComponent {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('view-groups');
    this.onGroupsChanged = options.onGroupsChanged || (() => {});
    this.onTagsChanged = options.onTagsChanged || (() => {});
    this.groups = [];
    this.tags = [];
    this.profiles = [];
    this.currentTab = 'groups'; // 'groups' | 'tags'
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="groups-view-wrapper" style="padding: 24px 30px; display: flex; flex-direction: column; gap: 16px; height: 100%; overflow-y: auto;">
        
        <!-- Header & Subtab Switch -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="group-badge-header" style="font-size: 15px; font-weight: 700; color: var(--text-main);">
              Quản lý Nhóm & Tags
            </div>
          </div>

          <div style="display: flex; gap: 6px; background: var(--table-header); padding: 4px; border-radius: 6px; border: 1px solid var(--border-color);">
            <button type="button" class="btn-subtab ${this.currentTab === 'groups' ? 'active' : ''}" id="btn-tab-groups" style="padding: 6px 18px; border-radius: 4px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; ${this.currentTab === 'groups' ? 'background: #0284c7; color: #fff;' : 'background: transparent; color: var(--text-muted);'}">
              📁 Danh sách Nhóm (<span id="badge-groups-count">0</span>)
            </button>
            <button type="button" class="btn-subtab ${this.currentTab === 'tags' ? 'active' : ''}" id="btn-tab-tags" style="padding: 6px 18px; border-radius: 4px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; ${this.currentTab === 'tags' ? 'background: #0284c7; color: #fff;' : 'background: transparent; color: var(--text-muted);'}">
              🏷️ Danh sách Tags (<span id="badge-tags-count">0</span>)
            </button>
          </div>
        </div>

        <!-- SECTION 1: QUẢN LÝ NHÓM -->
        <div id="section-groups" style="display: ${this.currentTab === 'groups' ? 'flex' : 'none'}; flex-direction: column; gap: 14px;">
          <!-- Add Group Bar -->
          <div class="group-action-bar" style="display: flex; align-items: center; gap: 10px; max-width: 680px;">
            <input type="text" id="input-group-name" class="form-control" placeholder="Nhập tên nhóm mới..." style="flex: 1; height: 38px; font-size: 13.5px; background: var(--bg-main);">
            <button id="btn-add-group" class="btn btn-primary" style="height: 38px; padding: 0 22px; font-weight: 600; font-size: 13px; white-space: nowrap;">
              Thêm mới nhóm
            </button>
            <button id="btn-refresh-groups" class="btn btn-outline" style="height: 38px; width: 38px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 15px;" title="Tải lại danh sách nhóm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>

          <!-- Groups Table -->
          <div class="table-wrapper" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; margin-top: 4px;">
            <table class="profile-table" style="width: 100%;">
              <thead>
                <tr style="background: var(--table-header); border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 12px 18px; font-weight: 600; color: var(--text-main); width: 30%;">Tên nhóm</th>
                  <th style="padding: 12px 18px; font-weight: 600; color: var(--text-main); width: 15%;">Thứ tự</th>
                  <th style="padding: 12px 18px; font-weight: 600; color: var(--text-main); width: 35%;">Creator</th>
                  <th style="padding: 12px 18px; font-weight: 600; color: var(--text-main); width: 20%; text-align: right;">Thao tác</th>
                </tr>
              </thead>
              <tbody id="groups-tbody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- SECTION 2: QUẢN LÝ TAGS -->
        <div id="section-tags" style="display: ${this.currentTab === 'tags' ? 'flex' : 'none'}; flex-direction: column; gap: 14px;">
          <!-- Add Tag Bar -->
          <div class="tag-action-bar" style="display: flex; align-items: center; gap: 10px; max-width: 680px;">
            <input type="text" id="input-tag-name" class="form-control" placeholder="Nhập tên tag mới (vd: Facebook, VIP, Nuôi, US)..." style="flex: 1; height: 38px; font-size: 13.5px; background: var(--bg-main);">
            <button id="btn-add-tag" class="btn btn-primary" style="height: 38px; padding: 0 22px; font-weight: 600; font-size: 13px; white-space: nowrap; background: #0284c7;">
              Thêm mới tag
            </button>
            <button id="btn-refresh-tags" class="btn btn-outline" style="height: 38px; width: 38px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 15px;" title="Tải lại danh sách tags">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: -6px;">
            Tags được dùng để phân loại và lọc profiles nhanh chóng. Các tag mới được tạo qua API hoặc giao diện sẽ tự động xuất hiện ở đây.
          </div>

          <!-- Tags Table -->
          <div class="table-wrapper" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; margin-top: 4px;">
            <table class="profile-table" style="width: 100%;">
              <thead>
                <tr style="background: var(--table-header); border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 12px 18px; font-weight: 600; color: var(--text-main); width: 35%;">Tên Tag / Huy hiệu</th>
                  <th style="padding: 12px 18px; font-weight: 600; color: var(--text-main); width: 25%;">Số profile đang dùng</th>
                  <th style="padding: 12px 18px; font-weight: 600; color: var(--text-main); width: 25%;">Ngày tạo</th>
                  <th style="padding: 12px 18px; font-weight: 600; color: var(--text-main); width: 15%; text-align: right;">Thao tác</th>
                </tr>
              </thead>
              <tbody id="tags-tbody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const btnTabGroups = this.container.querySelector('#btn-tab-groups');
    const btnTabTags = this.container.querySelector('#btn-tab-tags');
    const secGroups = this.container.querySelector('#section-groups');
    const secTags = this.container.querySelector('#section-tags');

    // Chuyển tab Groups / Tags
    btnTabGroups?.addEventListener('click', () => {
      this.currentTab = 'groups';
      btnTabGroups.style.background = '#0284c7';
      btnTabGroups.style.color = '#fff';
      btnTabTags.style.background = 'transparent';
      btnTabTags.style.color = 'var(--text-muted)';
      if (secGroups) secGroups.style.display = 'flex';
      if (secTags) secTags.style.display = 'none';
    });

    btnTabTags?.addEventListener('click', () => {
      this.currentTab = 'tags';
      btnTabTags.style.background = '#0284c7';
      btnTabTags.style.color = '#fff';
      btnTabGroups.style.background = 'transparent';
      btnTabGroups.style.color = 'var(--text-muted)';
      if (secTags) secTags.style.display = 'flex';
      if (secGroups) secGroups.style.display = 'none';
      this.loadTags();
    });

    // Thêm nhóm mới
    const inputName = this.container.querySelector('#input-group-name');
    const btnAdd = this.container.querySelector('#btn-add-group');
    const btnRefresh = this.container.querySelector('#btn-refresh-groups');

    btnAdd?.addEventListener('click', async () => {
      await this.handleCreateGroup();
    });

    inputName?.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        await this.handleCreateGroup();
      }
    });

    btnRefresh?.addEventListener('click', async () => {
      await this.loadGroups();
    });

    // Thêm tag mới
    const inputTagName = this.container.querySelector('#input-tag-name');
    const btnAddTag = this.container.querySelector('#btn-add-tag');
    const btnRefreshTags = this.container.querySelector('#btn-refresh-tags');

    btnAddTag?.addEventListener('click', async () => {
      await this.handleCreateTag();
    });

    inputTagName?.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        await this.handleCreateTag();
      }
    });

    btnRefreshTags?.addEventListener('click', async () => {
      await this.loadTags();
    });

    // Thao tác trong hàng bảng Nhóm (Sửa, Xóa, Share)
    const tbodyGroups = this.container.querySelector('#groups-tbody');
    tbodyGroups?.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.btn-edit-group');
      const deleteBtn = e.target.closest('.btn-delete-group');
      const copyBtn = e.target.closest('.btn-copy-group, .btn-share-group');

      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        const name = editBtn.getAttribute('data-name');
        const order = editBtn.getAttribute('data-order');
        await this.handleEditGroup(id, name, order);
      } else if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        const name = deleteBtn.getAttribute('data-name');
        await this.handleDeleteGroup(id, name);
      } else if (copyBtn) {
        const name = copyBtn.getAttribute('data-name');
        navigator.clipboard.writeText(name);
        alert(`Đã sao chép tên nhóm: ${name}`);
      }
    });

    // Thao tác trong hàng bảng Tags (Xóa tag)
    const tbodyTags = this.container.querySelector('#tags-tbody');
    tbodyTags?.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.btn-delete-tag');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        const name = deleteBtn.getAttribute('data-name');
        await this.handleDeleteTag(id, name);
      }
    });
  }

  async handleCreateGroup() {
    const inputName = this.container.querySelector('#input-group-name');
    const name = inputName?.value.trim();
    if (!name) {
      alert('Vui lòng nhập tên nhóm!');
      return;
    }

    if (window.api && window.api.addGroup) {
      try {
        await window.api.addGroup({ name });
        if (inputName) inputName.value = '';
        await this.loadGroups();
        this.onGroupsChanged();
      } catch (err) {
        alert('Lỗi tạo nhóm: ' + err.message);
      }
    }
  }

  async handleCreateTag() {
    const inputName = this.container.querySelector('#input-tag-name');
    const name = inputName?.value.trim();
    if (!name) {
      alert('Vui lòng nhập tên tag!');
      return;
    }

    if (window.api && window.api.addTag) {
      try {
        await window.api.addTag({ name });
        if (inputName) inputName.value = '';
        await this.loadTags();
        this.onTagsChanged();
      } catch (err) {
        alert('Lỗi tạo tag: ' + err.message);
      }
    }
  }

  async handleEditGroup(id, currentName, currentOrder) {
    const newName = prompt('Nhập tên nhóm mới:', currentName);
    if (newName === null) return;
    const trimmedName = newName.trim();
    if (!trimmedName) {
      alert('Tên nhóm không được để trống!');
      return;
    }

    const newOrderStr = prompt('Nhập số thứ tự sắp xếp:', currentOrder || 0);
    const newOrder = newOrderStr !== null ? parseInt(newOrderStr) || 0 : parseInt(currentOrder) || 0;

    if (window.api && window.api.updateGroup) {
      try {
        await window.api.updateGroup(id, { name: trimmedName, order: newOrder });
        await this.loadGroups();
        this.onGroupsChanged();
      } catch (err) {
        alert('Lỗi cập nhật nhóm: ' + err.message);
      }
    }
  }

  async handleDeleteGroup(id, name) {
    if (name.toLowerCase() === 'default group' || id === 'default') {
      alert('Không thể xóa nhóm mặc định (Default group)!');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa nhóm "${name}"?\n(Các profile thuộc nhóm này sẽ được tự động chuyển về Default group)`)) {
      if (window.api && window.api.deleteGroup) {
        try {
          const res = await window.api.deleteGroup(id);
          if (res && res.success === false) {
            alert(res.message);
            return;
          }
          await this.loadGroups();
          this.onGroupsChanged();
        } catch (err) {
          alert('Lỗi xóa nhóm: ' + err.message);
        }
      }
    }
  }

  async handleDeleteTag(id, name) {
    if (confirm(`Bạn có chắc chắn muốn xóa tag "${name}" khỏi hệ thống?`)) {
      if (window.api && window.api.deleteTag) {
        try {
          await window.api.deleteTag(id);
          await this.loadTags();
          this.onTagsChanged();
        } catch (err) {
          alert('Lỗi xóa tag: ' + err.message);
        }
      }
    }
  }

  async loadGroups() {
    if (!window.api || !window.api.getGroups) return;
    try {
      const groups = await window.api.getGroups();
      this.groups = groups || [];
      const badge = this.container.querySelector('#badge-groups-count');
      if (badge) badge.innerText = this.groups.length;
      this.renderRows();
    } catch (e) {
      console.error('Lỗi load groups trong GroupsView:', e);
    }
  }

  async loadTags() {
    if (!window.api) return;
    try {
      const [tags, profiles] = await Promise.all([
        window.api.getTags ? window.api.getTags() : [],
        window.api.getProfiles ? window.api.getProfiles() : []
      ]);
      this.tags = tags || [];
      this.profiles = profiles || [];
      const badge = this.container.querySelector('#badge-tags-count');
      if (badge) badge.innerText = this.tags.length;
      this.renderTagRows();
    } catch (e) {
      console.error('Lỗi load tags trong GroupsView:', e);
    }
  }

  renderRows() {
    const tbody = this.container.querySelector('#groups-tbody');
    if (!tbody) return;

    if (this.groups.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">
            Chưa có nhóm nào. Vui lòng thêm nhóm mới ở ô phía trên.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.groups.map(g => {
      const id = g.id || g.name;
      const name = g.name || g;
      const order = g.order !== undefined ? g.order : 0;
      const creator = g.creator || 'DESKTOP-AVFTTS1';
      const isDefault = name.toLowerCase() === 'default group';

      return `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s;">
          <td style="padding: 12px 18px; font-weight: 500; color: var(--text-main);">
            ${this.escape(name)}
          </td>
          <td style="padding: 12px 18px; color: var(--text-muted); font-weight: 500;">
            ${order}
          </td>
          <td style="padding: 12px 18px; color: var(--text-muted); font-size: 13px;">
            ${this.escape(creator)}
          </td>
          <td style="padding: 12px 18px; text-align: right;">
            <div style="display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end;">
              <!-- Sửa nhóm -->
              <button class="btn-group-action btn-edit-group" data-id="${id}" data-name="${this.escape(name)}" data-order="${order}" title="Chỉnh sửa nhóm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>

              <!-- Xóa nhóm (Disabled nếu là Default group) -->
              <button class="btn-group-action btn-delete-group ${isDefault ? 'disabled' : ''}" data-id="${id}" data-name="${this.escape(name)}" title="${isDefault ? 'Không thể xóa Default group' : 'Xóa nhóm'}" ${isDefault ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>

              <!-- Sao chép tên nhóm -->
              <button class="btn-group-action btn-copy-group btn-share-group" data-name="${this.escape(name)}" title="Sao chép tên nhóm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderTagRows() {
    const tbody = this.container.querySelector('#tags-tbody');
    if (!tbody) return;

    if (this.tags.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">
            Chưa có tag nào trong hệ thống. Nhập tên tag ở ô phía trên và bấm "Thêm mới tag".
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.tags.map(t => {
      const id = t.id || t.name;
      const name = t.name || t;
      const createdAt = t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : 'Mặc định';

      // Tính số profile đang dùng tag này
      const count = this.profiles.filter(p => {
        if (Array.isArray(p.tags)) {
          return p.tags.some(tagItem => (typeof tagItem === 'string' ? tagItem : tagItem?.name || '').toLowerCase() === name.toLowerCase());
        } else if (typeof p.tags === 'string') {
          return p.tags.toLowerCase().includes(name.toLowerCase());
        }
        return false;
      }).length;

      return `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s;">
          <td style="padding: 12px 18px; font-weight: 600;">
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(2, 132, 199, 0.1); color: #0284c7; border-radius: 4px; font-size: 12.5px;">
              🏷️ ${this.escape(name)}
            </span>
          </td>
          <td style="padding: 12px 18px; color: var(--text-muted); font-size: 13px;">
            <strong style="color: var(--text-main); font-size: 13.5px;">${count}</strong> profiles
          </td>
          <td style="padding: 12px 18px; color: var(--text-muted); font-size: 12.5px;">
            ${createdAt}
          </td>
          <td style="padding: 12px 18px; text-align: right;">
            <div style="display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end;">
              <!-- Xóa Tag -->
              <button class="btn-group-action btn-delete-tag" data-id="${id}" data-name="${this.escape(name)}" title="Xóa tag này">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  escape(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
