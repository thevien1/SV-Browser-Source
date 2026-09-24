/**
 * Component: GroupsViewComponent
 * Quản lý danh sách nhóm profile (Chuẩn 100% theo Ảnh 1 người dùng cung cấp)
 * - Nút badge: "Quản lý nhóm"
 * - Hàng thêm mới: Tên nhóm input, nút Thêm mới, nút Reload
 * - Bảng hiển thị: Tên nhóm, Thứ tự, Creator, Thao tác (Sửa ✏️, Xóa 🗑️, Chia sẻ 🔗)
 */

export class GroupsViewComponent {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('view-groups');
    this.onGroupsChanged = options.onGroupsChanged || (() => {});
    this.groups = [];
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="groups-view-wrapper" style="padding: 24px 30px; display: flex; flex-direction: column; gap: 16px; height: 100%; overflow-y: auto;">
        
        <!-- Header Badge -->
        <div style="display: flex; align-items: center;">
          <div class="group-badge-header">
            Quản lý nhóm
          </div>
        </div>

        <!-- Add Group Bar -->
        <div class="group-action-bar" style="display: flex; align-items: center; gap: 10px; max-width: 680px;">
          <input type="text" id="input-group-name" class="form-control" placeholder="Tên nhóm" style="flex: 1; height: 38px; font-size: 13.5px; background: #ffffff;">
          <button id="btn-add-group" class="btn btn-primary" style="height: 38px; padding: 0 22px; font-weight: 600; font-size: 13px; white-space: nowrap;">
            Thêm mới
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
              <tr style="background: #f8fafc; border-bottom: 1px solid var(--border-color);">
                <th style="padding: 12px 18px; font-weight: 600; color: #475569; width: 30%;">Tên nhóm</th>
                <th style="padding: 12px 18px; font-weight: 600; color: #475569; width: 15%;">Thứ tự</th>
                <th style="padding: 12px 18px; font-weight: 600; color: #475569; width: 35%;">Creator</th>
                <th style="padding: 12px 18px; font-weight: 600; color: #475569; width: 20%; text-align: right;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="groups-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const inputName = this.container.querySelector('#input-group-name');
    const btnAdd = this.container.querySelector('#btn-add-group');
    const btnRefresh = this.container.querySelector('#btn-refresh-groups');

    // Thêm nhóm mới khi bấm Thêm mới
    btnAdd?.addEventListener('click', async () => {
      await this.handleCreateGroup();
    });

    // Thêm nhóm mới khi nhấn phím Enter
    inputName?.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        await this.handleCreateGroup();
      }
    });

    // Tải lại danh sách
    btnRefresh?.addEventListener('click', async () => {
      await this.loadGroups();
    });

    // Thao tác trong hàng bảng (Sửa, Xóa, Share)
    const tbody = this.container.querySelector('#groups-tbody');
    tbody?.addEventListener('click', async (e) => {
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

  async loadGroups() {
    if (!window.api || !window.api.getGroups) return;
    try {
      const groups = await window.api.getGroups();
      this.groups = groups || [];
      this.renderRows();
    } catch (e) {
      console.error('Lỗi load groups trong GroupsView:', e);
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
            ${name}
          </td>
          <td style="padding: 12px 18px; color: var(--text-muted); font-weight: 500;">
            ${order}
          </td>
          <td style="padding: 12px 18px; color: var(--text-muted); font-size: 13px;">
            ${creator}
          </td>
          <td style="padding: 12px 18px; text-align: right;">
            <div style="display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end;">
              <!-- Sửa nhóm -->
              <button class="btn-group-action btn-edit-group" data-id="${id}" data-name="${name}" data-order="${order}" title="Chỉnh sửa nhóm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>

              <!-- Xóa nhóm (Disabled nếu là Default group) -->
              <button class="btn-group-action btn-delete-group ${isDefault ? 'disabled' : ''}" data-id="${id}" data-name="${name}" title="${isDefault ? 'Không thể xóa Default group' : 'Xóa nhóm'}" ${isDefault ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>

              <!-- Sao chép tên nhóm -->
              <button class="btn-group-action btn-copy-group btn-share-group" data-name="${name}" title="Sao chép tên nhóm">
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
}
