/**
 * Component: ModalsComponent
 * Quản lý các cửa sổ Modal:
 * 1. Modal "+ Tạo profile" (Chuẩn 100% theo Ảnh 2 của bạn - 2 cột, 5 tabs, tóm tắt thông số trực tiếp)
 * 2. Modal Kích hoạt Bản quyền (License & HWID)
 * 3. Modal Admin Tạo Key bản quyền (7 ngày, 5 máy, Vô hạn...)
 */

export class ModalsComponent {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('modals-container');
    this.onProfileCreated = options.onProfileCreated || (() => {});
    this.onLicenseActivated = options.onLicenseActivated || (() => {});
    this.selectedOs = 'Windows';
    this.batchSelectedOs = 'Windows';
    this.editSelectedOs = 'Windows';
    this.groups = ['Default group'];
    this.activeTab = 'quick';
    this.editActiveTab = 'edit-quick';
    this.editingProfile = null;
    this.cloningProfile = null;
    this.colorProfile = null;
    this.remotePortProfile = null;
    this.cpState = { h: 0, s: 0.92, v: 0.31, a: 1 }; // Default #4F0606FF
  }

  setGroups(groups) {
    this.groups = groups || [];
    ['#add-profile-group', '#edit-profile-group'].forEach(selector => {
      const select = this.container?.querySelector(selector);
      if (select) {
        const currentVal = select.value;
        select.innerHTML = '';
        this.groups.forEach(g => {
          const name = typeof g === 'object' ? g.name : g;
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          if (name === currentVal || name === 'Default group') opt.selected = true;
          select.appendChild(opt);
        });
      }
    });
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- MODAL: + Tạo profile (Chuẩn 100% theo Ảnh 2) -->
      <div class="modal-overlay" id="modal-add-profile">
        <div class="modal-dialog modal-dialog-wide" style="width: 960px; max-width: 95vw; max-height: 90vh;">
          
          <!-- Modal Header -->
          <div class="modal-header" style="padding: 14px 24px;">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <div class="modal-title-badge">+</div>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Tạo profile</span>
            </div>
            <button class="window-btn close" data-close="modal-add-profile" style="font-size: 16px;">✕</button>
          </div>

          <!-- Top Action Bar (Tên profile, Nhóm, Tạo ngẫu nhiên, Thêm mới) -->
          <div class="modal-top-bar" style="padding: 14px 24px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; background: #ffffff;">
            <input type="text" class="form-control" id="add-profile-name" value="Profile 8397" style="width: 240px; height: 36px; font-weight: 500;">
            <select class="form-control" id="add-profile-group" style="width: 220px; height: 36px; cursor: pointer;">
              <option value="Default group" selected>Default group</option>
            </select>
            <button type="button" class="btn btn-outline" id="btn-random-params" style="height: 36px; padding: 0 16px; gap: 8px; font-weight: 500; font-size: 13px; border-color: #cbd5e1; color: #334155;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
              <span>Tạo thông số ngẫu nhiên</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-submit-create-profile" style="margin-left: auto; height: 36px; padding: 0 26px; font-weight: 600; font-size: 13px; background: #0284c7;">
              Thêm mới
            </button>
          </div>

          <!-- Navigation Tabs Bar -->
          <div class="modal-tabs-header" style="padding: 0 24px; border-bottom: 1px solid var(--border-color); display: flex; gap: 24px; background: #ffffff;">
            <button class="modal-tab-btn active" data-tab="quick">Thao tác nhanh</button>
            <button class="modal-tab-btn" data-tab="connection">Kết nối</button>
            <button class="modal-tab-btn" data-tab="hardware">Hardware</button>
            <button class="modal-tab-btn" data-tab="software">Software</button>
            <button class="modal-tab-btn" data-tab="cookies">Cookies</button>
          </div>

          <!-- Modal Body Split: 2 Columns (Form Left & Specifications Right) -->
          <div class="modal-body-split" style="display: flex; flex: 1; overflow: hidden; height: 530px;">
            
            <!-- LEFT COLUMN: Tab Contents Form -->
            <div class="modal-form-pane" style="flex: 1.6; padding: 22px 24px; overflow-y: auto;">
              
              <!-- TAB 1: THAO TÁC NHANH (Mặc định) -->
              <div class="tab-pane active" id="pane-quick">
                <!-- Row 1: Trình duyệt & Taskbar title -->
                <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                  <div style="flex: 1.4;">
                    <label class="field-label">Trình duyệt</label>
                    <div class="browser-select-box" style="position: relative;">
                      <select class="form-control" id="quick-browser-core" style="height: 38px; padding-left: 36px; cursor: pointer;">
                        <option value="chrome|151.0.7922.76" selected>Chrome (151.0.7922.76)</option>
                        <option value="chrome|152.0.7977.83">Chrome (152.0.7977.83)</option>
                        <option value="chrome|153.0.8010.37">Chrome (153.0.8010.37)</option>
                        <option value="firefox|125.0">Firefox (125.0)</option>
                        <option value="edge|124.0">Edge (124.0)</option>
                        <option value="brave|1.65">Brave (1.65)</option>
                      </select>
                      <div style="position: absolute; left: 10px; top: 9px; pointer-events: none;">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="#EA4335" />
                          <circle cx="12" cy="12" r="6" fill="#FBBC05" />
                          <path d="M12 2a10 10 0 0 1 8.66 5H12z" fill="#4285F4" />
                          <circle cx="12" cy="12" r="3.5" fill="#ffffff" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div style="flex: 1;">
                    <label class="field-label">Taskbar title</label>
                    <input type="text" class="form-control" id="quick-taskbar-title" placeholder="" style="height: 38px;">
                  </div>
                </div>

                <!-- Row 2: URL khởi động -->
                <div style="margin-bottom: 16px;">
                  <label class="field-label">URL khởi động</label>
                  <input type="text" class="form-control" id="quick-start-url" placeholder="" style="height: 38px;">
                </div>

                <!-- Row 3: Loại proxy & Chọn từ thư viện -->
                <div style="margin-bottom: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label class="field-label" style="margin-bottom: 0;">Loại proxy</label>
                    <a href="javascript:void(0)" id="link-choose-proxy-lib" style="font-size: 12.5px; color: #0284c7; text-decoration: none; font-weight: 500;">
                      Chọn từ thư viện proxy
                    </a>
                  </div>
                  <select class="form-control" id="quick-proxy-type" style="height: 38px; cursor: pointer;">
                    <option value="None" selected>None</option>
                    <option value="HTTP">HTTP</option>
                    <option value="Socks5">Socks5</option>
                    <option value="Tinsoft">Tinsoft</option>
                    <option value="TMProxy">TMProxy</option>
                  </select>
                </div>

                <!-- Row 3b: Nhập proxy (hiển thị khi loại proxy != None) -->
                <div id="quick-proxy-input-container" style="display: none; margin-bottom: 16px;">
                  <div style="margin-bottom: 6px;">
                    <label class="field-label">Địa chỉ proxy (IP:Port hoặc IP:Port:User:Pass)</label>
                    <input type="text" class="form-control" id="quick-proxy-address" placeholder="192.168.1.1:8080" style="height: 38px; font-family: monospace;">
                  </div>
                </div>

                <!-- Row 3c: Link kiểm tra proxy -->
                <div style="margin-bottom: 18px;">
                  <a href="javascript:void(0)" id="link-check-proxy" style="font-size: 13px; color: #0284c7; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                    Kiểm tra proxy
                  </a>
                  <span id="check-proxy-result" style="font-size: 12px; margin-left: 10px; font-weight: 500;"></span>
                </div>

                <!-- Row 4: Cho phép request file tĩnh không qua proxy -->
                <div style="margin-top: 10px;">
                  <label class="field-label">Cho phép request file tĩnh không qua proxy</label>
                  <p style="font-size: 12px; color: var(--text-muted); line-height: 1.45; margin-bottom: 8px;">
                    Bạn có thể tiết kiệm băng thông hoặc cải thiện tốc độ load trang bằng cách cài đặt các extension file tĩnh không chạy qua proxy. Ví dụ: .css;.png;.jpg;.jpeg ... Lưu ý: cần có kiến thức chuyên môn để sử dụng hiệu quả
                  </p>
                  <input type="text" class="form-control" id="quick-static-files" placeholder="Eg: .css;.png;.jpg" style="height: 38px;">
                </div>
              </div>

              <!-- TAB 2: KẾT NỐI -->
              <div class="tab-pane" id="pane-connection" style="display: none;">
                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div>
                    <label class="field-label">Loại Proxy kết nối</label>
                    <select class="form-control" id="conn-proxy-type" style="height: 38px;">
                      <option value="None" selected>None (Không dùng Proxy)</option>
                      <option value="HTTP">HTTP</option>
                      <option value="Socks5">Socks5</option>
                      <option value="TMProxy">TMProxy</option>
                      <option value="Tinsoft">Tinsoft</option>
                    </select>
                  </div>
                  <div style="display: flex; gap: 12px;">
                    <div style="flex: 2;">
                      <label class="field-label">Host / IP</label>
                      <input type="text" class="form-control" id="conn-proxy-host" placeholder="127.0.0.1">
                    </div>
                    <div style="flex: 1;">
                      <label class="field-label">Port</label>
                      <input type="text" class="form-control" id="conn-proxy-port" placeholder="8080">
                    </div>
                  </div>
                  <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                      <label class="field-label">Username (Tùy chọn)</label>
                      <input type="text" class="form-control" id="conn-proxy-user" placeholder="User...">
                    </div>
                    <div style="flex: 1;">
                      <label class="field-label">Password (Tùy chọn)</label>
                      <input type="password" class="form-control" id="conn-proxy-pass" placeholder="Password...">
                    </div>
                  </div>
                  <div>
                    <label class="field-label">URL xoay IP / Lấy IP mới</label>
                    <input type="text" class="form-control" id="conn-proxy-change-url" placeholder="https://api.tmproxy.com/v1/new-ip?key=...">
                  </div>
                  <div>
                    <button type="button" class="btn btn-outline" id="btn-conn-check-proxy" style="font-weight: 600; color: #0284c7; border-color: #0284c7;">
                      🔍 Kiểm tra kết nối Proxy
                    </button>
                    <span id="conn-proxy-result" style="font-size: 12.5px; margin-left: 10px; font-weight: 600;"></span>
                  </div>
                </div>
              </div>

              <!-- TAB 3: HARDWARE -->
              <div class="tab-pane" id="pane-hardware" style="display: none;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                  <div>
                    <label class="field-label">Canvas</label>
                    <select class="form-control" id="hw-canvas">
                      <option value="Noise" selected>Noise (Chống phát hiện)</option>
                      <option value="Off">Off</option>
                      <option value="Block">Block</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Client rect</label>
                    <select class="form-control" id="hw-clientrect">
                      <option value="Noise" selected>Noise</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">WebGL image</label>
                    <select class="form-control" id="hw-webgl-img">
                      <option value="Noise" selected>Noise</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">WebGL metadata</label>
                    <select class="form-control" id="hw-webgl-meta">
                      <option value="Masked" selected>Masked (Ẩn thông số card màn hình)</option>
                      <option value="Custom">Custom</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Audio</label>
                    <select class="form-control" id="hw-audio">
                      <option value="Noise" selected>Noise</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Font</label>
                    <select class="form-control" id="hw-font">
                      <option value="Masked" selected>Masked</option>
                      <option value="System">System</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">CPU Cores (Số nhân vi xử lý)</label>
                    <select class="form-control" id="hw-cpu">
                      <option value="2">2 Cores</option>
                      <option value="4">4 Cores</option>
                      <option value="6">6 Cores</option>
                      <option value="8" selected>8 Cores</option>
                      <option value="12">12 Cores</option>
                      <option value="16">16 Cores</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Dung lượng RAM (Memory)</label>
                    <select class="form-control" id="hw-ram">
                      <option value="2GB">2 GB</option>
                      <option value="4GB">4 GB</option>
                      <option value="8GB" selected>8 GB</option>
                      <option value="16GB">16 GB</option>
                      <option value="32GB">32 GB</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Video inputs</label>
                    <select class="form-control" id="hw-video-in">
                      <option value="-1" selected>-1 (Auto)</option>
                      <option value="0">0</option>
                      <option value="1">1</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Audio inputs / outputs</label>
                    <select class="form-control" id="hw-audio-in-out">
                      <option value="-1" selected>-1 (Auto)</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- TAB 4: SOFTWARE -->
              <div class="tab-pane" id="pane-software" style="display: none;">
                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div>
                    <label class="field-label">Hệ điều hành (OS)</label>
                    <div class="os-button-group">
                      <button type="button" class="os-btn active" data-os="Windows"><span>🪟</span> Windows</button>
                      <button type="button" class="os-btn" data-os="Mac"><span>🍏</span> Mac</button>
                      <button type="button" class="os-btn" data-os="Linux"><span>🐧</span> Linux</button>
                      <button type="button" class="os-btn" data-os="Android"><span>🤖</span> Android</button>
                    </div>
                  </div>
                  <div>
                    <label class="field-label">User agent</label>
                    <input type="text" class="form-control" id="sw-user-agent" value="Auto" placeholder="Auto" style="font-family: monospace; font-size: 12px;">
                  </div>
                  <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                      <label class="field-label">Ngôn ngữ (Language)</label>
                      <select class="form-control" id="sw-language">
                        <option value="Auto" selected>Auto</option>
                        <option value="vi-VN,vi">Tiếng Việt (vi-VN)</option>
                        <option value="en-US,en">English (en-US)</option>
                        <option value="ja-JP,ja">Japanese (ja-JP)</option>
                        <option value="ko-KR,ko">Korean (ko-KR)</option>
                      </select>
                    </div>
                    <div style="flex: 1;">
                      <label class="field-label">Múi giờ (Timezone)</label>
                      <select class="form-control" id="sw-timezone">
                        <option value="Auto" selected>Auto (BaseOnIp)</option>
                        <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (+07:00)</option>
                        <option value="America/New_York">America/New_York (-05:00)</option>
                        <option value="Europe/London">Europe/London (+00:00)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (+09:00)</option>
                      </select>
                    </div>
                  </div>
                  <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                      <label class="field-label">WebRTC</label>
                      <select class="form-control" id="sw-webrtc">
                        <option value="BaseOnIp" selected>BaseOnIp (Chuẩn)</option>
                        <option value="Real">Real</option>
                        <option value="Disable">Disable</option>
                        <option value="Noise">Noise</option>
                      </select>
                    </div>
                    <div style="flex: 1;">
                      <label class="field-label">Geolocation</label>
                      <select class="form-control" id="sw-geo">
                        <option value="Prompt" selected>Prompt (Hỏi khi mở)</option>
                        <option value="Allow">Allow</option>
                        <option value="Block">Block</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="field-label">Độ phân giải màn hình (Screen)</label>
                    <select class="form-control" id="sw-screen">
                      <option value="-1x-1" selected>-1x-1 (Mặc định)</option>
                      <option value="1920x1080">1920 x 1080 (FHD)</option>
                      <option value="1366x768">1366 x 768 (HD)</option>
                      <option value="1440x900">1440 x 900</option>
                      <option value="1536x864">1536 x 864</option>
                      <option value="2560x1440">2560 x 1440 (2K)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- TAB 5: COOKIES -->
              <div class="tab-pane" id="pane-cookies" style="display: none;">
                <div>
                  <label class="field-label">Cookies khởi động</label>
                  <textarea class="form-control" id="tab-cookies-input" style="height: 240px; font-family: monospace; font-size: 12px;" placeholder="[&#10;  {&#10;    &quot;name&quot;: &quot;session_id&quot;,&#10;    &quot;value&quot;: &quot;...&quot;,&#10;    &quot;domain&quot;: &quot;.google.com&quot;&#10;  }&#10;]"></textarea>
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
                    Dán danh sách cookies định dạng JSON ([{...}]) hoặc Netscape cookies để nạp tự động khi profile khởi động.
                  </div>
                </div>
              </div>

            </div>

            <!-- RIGHT COLUMN: Profile Specifications Summary (Chuẩn Ảnh 2) -->
            <div class="modal-summary-pane" style="flex: 1; padding: 20px 24px; border-left: 1px solid var(--border-color); background: #fafafa; display: flex; flex-direction: column; justify-content: space-between; overflow-y: auto;">
              
              <!-- Specification List -->
              <div class="spec-list" style="font-size: 12.5px; display: flex; flex-direction: column; gap: 8px;">
                <div class="spec-row"><span class="spec-label">Browser</span><span class="spec-value" id="sum-browser">Chrome - 151</span></div>
                <div class="spec-row"><span class="spec-label">OS</span><span class="spec-value" id="sum-os">Windows</span></div>
                <div class="spec-row"><span class="spec-label">Taskbar</span><span class="spec-value" id="sum-taskbar">-</span></div>
                <div class="spec-row"><span class="spec-label">User agent</span><span class="spec-value" id="sum-ua">Auto</span></div>
                <div class="spec-row"><span class="spec-label">Proxy</span><span class="spec-value" id="sum-proxy">None</span></div>
                <div class="spec-row"><span class="spec-label">Language</span><span class="spec-value" id="sum-lang">Auto</span></div>
                <div class="spec-row"><span class="spec-label">Timezone</span><span class="spec-value" id="sum-tz">Auto</span></div>
                <div class="spec-row"><span class="spec-label">WebRTC</span><span class="spec-value" id="sum-webrtc">BaseOnIp</span></div>
                <div class="spec-row"><span class="spec-label">Geolocation</span><span class="spec-value" id="sum-geo">Prompt</span></div>
                <div class="spec-row"><span class="spec-label">Screen</span><span class="spec-value" id="sum-screen">-1x-1</span></div>
                <div class="spec-row"><span class="spec-label">Canvas</span><span class="spec-value" id="sum-canvas">Noise</span></div>
                <div class="spec-row"><span class="spec-label">Client rect</span><span class="spec-value" id="sum-clientrect">Noise</span></div>
                <div class="spec-row"><span class="spec-label">WebGL image</span><span class="spec-value" id="sum-webgl-img">Noise</span></div>
                <div class="spec-row"><span class="spec-label">WebGL metadata</span><span class="spec-value" id="sum-webgl-meta">Masked</span></div>
                <div class="spec-row"><span class="spec-label">Audio</span><span class="spec-value" id="sum-audio">Noise</span></div>
                <div class="spec-row"><span class="spec-label">Font</span><span class="spec-value" id="sum-font">Masked</span></div>
                <div class="spec-row"><span class="spec-label">Video inputs</span><span class="spec-value" id="sum-video-in">-1</span></div>
                <div class="spec-row"><span class="spec-label">Audio inputs</span><span class="spec-value" id="sum-audio-in">-1</span></div>
                <div class="spec-row"><span class="spec-label">Audio outputs</span><span class="spec-value" id="sum-audio-out">-1</span></div>
                <div class="spec-row"><span class="spec-label">Hardware</span><span class="spec-value" id="sum-hardware">8 cores, 8GB</span></div>
              </div>

              <!-- Green Notification Box (Chuẩn Ảnh 2) -->
              <div class="green-notice-box" style="margin-top: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; font-size: 11.5px; color: #166534; line-height: 1.5;">
                Theo mặc định, chúng tôi đã đề xuất sẵn cho bạn cấu hình phù hợp nhất với thời điểm hiện tại. Bạn có thể tùy chỉnh cấu hình mặc định khi tạo profile tại menu "Cài đặt - Trình Duyệt" hoặc tùy chỉnh ở các Tab bên cạnh
              </div>

            </div>

          </div>

        </div>
      </div>

      <!-- MODAL: + Tạo profile (Hàng loạt theo số lượng - Chuẩn Ảnh 3) -->
      <div class="modal-overlay" id="modal-batch-create">
        <div class="modal-dialog" style="width: 540px; max-width: 95vw;">
          <div class="modal-header" style="padding: 14px 20px;">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <div class="modal-title-badge">+</div>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Tạo profile</span>
            </div>
            <button class="window-btn close" data-close="modal-batch-create" style="font-size: 16px;">✕</button>
          </div>
          <div class="modal-body" style="padding: 18px 22px;">
            <!-- Row 1: Số lượng profile & Tiền tố tên -->
            <div style="display: flex; gap: 14px; margin-bottom: 6px;">
              <div style="width: 140px;">
                <label style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block;">Số lượng profile</label>
                <input type="number" class="form-control" id="batch-create-count" value="1" min="1" max="1000">
              </div>
              <div style="flex: 1;">
                <label style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block;">Tiền tố tên</label>
                <input type="text" class="form-control" id="batch-create-prefix" value="New profile">
              </div>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 18px; line-height: 1.4;">
              Các profile sẽ được tạo theo tiền tố kèm theo số thứ tự phía sau. Ví dụ: tên tố là "Hello", các profile sẽ được tạo: Hello 001, Hello 002...
            </div>

            <!-- Row 2: Trình duyệt & Version -->
            <div style="margin-bottom: 18px;">
              <label style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block;">Trình duyệt</label>
              <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                  <select class="form-control" id="batch-browser-type" style="height: 38px; cursor: pointer;">
                    <option value="chrome" selected>🌐 Chrome</option>
                    <option value="firefox">🦊 Firefox</option>
                    <option value="edge">🌊 Edge</option>
                    <option value="brave">🦁 Brave</option>
                  </select>
                </div>
                <div style="flex: 1.4;">
                  <select class="form-control" id="batch-browser-version" style="height: 38px; cursor: pointer;">
                    <option value="151.0.7922.76" selected>151.0.7922.76</option>
                    <option value="152.0.7977.83">152.0.7977.83</option>
                    <option value="153.0.8010.37">153.0.8010.37</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Row 3: OS (Windows, Mac (Intel), Mac (ARM), Linux, Android) -->
            <div style="margin-bottom: 18px;">
              <label style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block;">OS</label>
              <div class="os-button-group-batch">
                <button type="button" class="os-btn-batch active" data-os="Windows"><span>🪟</span> Windows</button>
                <button type="button" class="os-btn-batch" data-os="Mac (Intel)"><span>🍏</span> Mac (Intel)</button>
                <button type="button" class="os-btn-batch" data-os="Mac (ARM)"><span>🍏</span> Mac (ARM)</button>
                <button type="button" class="os-btn-batch" data-os="Linux"><span>🐧</span> Linux</button>
                <button type="button" class="os-btn-batch" data-os="Android"><span>🤖</span> Android</button>
              </div>
            </div>

            <!-- Row 4: Proxy -->
            <div style="margin-bottom: 10px;">
              <label style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block;">Proxy</label>
              <textarea class="form-control" id="batch-create-proxy" style="height: 150px; font-family: monospace; font-size: 12.5px;"></textarea>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px;">Sử dụng cấu trúc IP:Port hoặc IP:Port:UserName:Password</div>
            </div>
          </div>

          <div class="modal-footer" style="padding: 12px 22px; justify-content: flex-end; gap: 12px; background: transparent; border-top: 1px solid var(--border-color);">
            <button class="btn btn-outline" data-close="modal-batch-create" style="color: #0284c7; border: none; font-weight: 500; font-size: 13px;">Hủy bỏ</button>
            <button class="btn btn-primary" id="btn-submit-batch-create" style="padding: 0 24px; height: 36px; background-color: #0284c7; font-weight: 600; font-size: 13px;">Thêm mới</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Kích hoạt & Đổi Mã Bản Quyền -->
      <div class="modal-overlay" id="modal-license">
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <div class="modal-title">Kích Hoạt Bản Quyền</div>
            <button class="window-btn close" data-close="modal-license" id="btn-close-license-modal">✕</button>
          </div>
          <div class="modal-body">
            <!-- HWID ẩn xử lý tự động trong hệ thống, không hiển thị ra giao diện -->
            <input type="hidden" id="modal-hwid-val">

            <div id="license-info-card" style="background: var(--table-header); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; margin-bottom: 15px;">
              <div style="font-size: 13px; margin-bottom: 4px;">Trạng thái: <strong id="info-status">Chưa kích hoạt</strong></div>
              <div style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 3px;">Thời hạn: <span id="info-days-left">0 ngày</span></div>
              <div style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 3px;">Số máy cho phép: <span id="info-machines">0 máy</span></div>
              <div id="license-current-key-display" style="display: none; margin-top: 6px; font-size: 11.5px; font-family: monospace; color: #0284c7; word-break: break-all; background: rgba(2, 132, 199, 0.08); padding: 5px 8px; border-radius: 4px;"></div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label id="label-license-input" style="font-weight: 600;">Nhập License Key để kích hoạt phần mềm:</label>
              <textarea class="form-control" id="input-license-key" placeholder="Dán mã key kích hoạt của bạn vào đây (Ví dụ: SV-TRIA-eyJp...)" style="height: 70px; font-family: monospace; font-size: 12.5px;"></textarea>
              <small id="license-input-hint" style="color: var(--text-muted); font-size: 11.5px; margin-top: 6px; display: block;">
                Vui lòng nhập License Key hợp lệ do quản trị viên cấp để mở khóa toàn bộ tính năng phần mềm.
              </small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" data-close="modal-license" id="btn-cancel-license-modal">Đóng</button>
            <button class="btn btn-primary" id="btn-submit-activate">Kích Hoạt Ngay</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Thiết lập thư mục lưu trữ Local Storage lần đầu -->
      <div class="modal-overlay" id="modal-storage-setup">
        <div class="modal-dialog" style="max-width: 540px;">
          <div class="modal-header">
            <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
              <span>📁</span> Thiết Lập Thư Mục Lưu Trữ (Local Storage)
            </div>
          </div>
          <div class="modal-body">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 14px; margin-bottom: 16px; font-size: 13px; color: #166534; line-height: 1.5;">
              <strong>Chào mừng bạn đến với SV Browser!</strong><br>
              Vui lòng chọn thư mục trên máy tính của bạn để lưu trữ dữ liệu các profile trình duyệt (Local Storage). Bạn có thể chọn lưu ở ổ đĩa C:, D:, E:... tùy ý.
            </div>

            <div class="form-group" style="margin-bottom: 15px;">
              <label style="font-weight: 600; font-size: 13px; margin-bottom: 6px; display: block;">Đường dẫn thư mục Local Storage:</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" class="form-control" id="input-setup-storage-path" readonly placeholder="Chọn đường dẫn thư mục..." style="flex: 1; font-size: 13px; background: var(--table-header);">
                <button type="button" class="btn btn-outline" id="btn-browse-setup-storage" style="white-space: nowrap; padding: 0 14px;">
                  📁 Chọn thư mục
                </button>
              </div>
              <small style="color: var(--text-muted); font-size: 12px; margin-top: 6px; display: block;">
                Thư mục này sẽ dùng để lưu trữ toàn bộ dữ liệu, cookies và bộ nhớ cache của các profile Chrome.
              </small>
            </div>
          </div>
          <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-primary" id="btn-save-setup-storage" style="padding: 8px 22px; background-color: #0284c7; font-weight: 600;">
              💾 Lưu Đường Dẫn & Bắt Đầu
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: Admin Key Generator -->
      <div class="modal-dialog-wrapper modal-overlay" id="modal-admin-keygen">
        <div class="modal-dialog" style="width: 580px;">
          <div class="modal-header">
            <div class="modal-title">🔑 Admin Key Generator (Tạo Key Bản Quyền)</div>
            <button class="window-btn close" data-close="modal-admin-keygen">✕</button>
          </div>
          <div class="modal-body">
            <div style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 12px;">
              Công cụ tạo License Key độc quyền để bạn cấp cho khách hàng dùng 7 ngày, 1 tháng, vĩnh viễn cho 1 máy, 5 máy hoặc tuỳ chọn.
            </div>

            <div class="form-group">
              <label>Thời hạn bản quyền:</label>
              <select class="form-control" id="keygen-type">
                <option value="trial">Dùng thử 7 ngày (7 Days)</option>
                <option value="monthly">30 Ngày (1 Month)</option>
                <option value="lifetime">Vô hạn / Vĩnh viễn (Lifetime)</option>
                <option value="custom">Tùy chỉnh số ngày...</option>
              </select>
            </div>

            <div class="form-group" id="keygen-custom-days-group" style="display: none;">
              <label>Số ngày sử dụng:</label>
              <input type="number" class="form-control" id="keygen-custom-days" value="14" min="1">
            </div>

            <div class="form-group">
              <label>Giới hạn số lượng máy tính kích hoạt:</label>
              <select class="form-control" id="keygen-max-machines">
                <option value="1">1 Máy</option>
                <option value="5" selected>5 Máy</option>
                <option value="10">10 Máy</option>
                <option value="100">100 Máy</option>
              </select>
            </div>

            <div class="form-group">
              <label>Tên khách hàng / Ghi chú:</label>
              <input type="text" class="form-control" id="keygen-customer" placeholder="Ví dụ: KhachHang_A">
            </div>

            <div class="form-group">
              <label>Khóa theo HWID khách (Tùy chọn - Bỏ trống để khách tự kích hoạt trên máy của họ):</label>
              <input type="text" class="form-control" id="keygen-hwid-lock" placeholder="Dán HWID của khách nếu muốn khóa đúng máy đó">
            </div>

            <button class="btn btn-primary" id="btn-generate-key" style="width: 100%; justify-content: center; height: 38px;">
              TẠO LICENSE KEY NGAY
            </button>

            <div id="keygen-result-container" style="display: none; margin-top: 15px;">
              <div style="font-size: 12.5px; font-weight: 600; color: #10b981;">Đã tạo Key thành công! Sao chép để gửi cho khách:</div>
              <div class="key-result-box" id="keygen-key-output"></div>
              <button class="btn btn-outline" id="btn-copy-generated-key" style="margin-top: 8px; width: 100%; justify-content: center;">
                📋 Sao chép Key vào Clipboard
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" data-close="modal-admin-keygen">Đóng</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Cập nhật profile (Chuẩn Ảnh 2) -->
      <div class="modal-overlay" id="modal-edit-profile">
        <div class="modal-dialog modal-dialog-wide" style="width: 960px; max-width: 95vw; max-height: 90vh;">
          
          <!-- Modal Header -->
          <div class="modal-header" style="padding: 14px 24px;">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <div class="modal-title-badge">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </div>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Cập nhật profile</span>
            </div>
            <button class="window-btn close" data-close="modal-edit-profile" style="font-size: 16px;">✕</button>
          </div>

          <!-- Top Action Bar -->
          <div class="modal-top-bar" style="padding: 14px 24px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; background: #ffffff;">
            <input type="text" class="form-control" id="edit-profile-name" value="" style="width: 240px; height: 36px; font-weight: 500;">
            <select class="form-control" id="edit-profile-group" style="width: 220px; height: 36px; cursor: pointer;">
              <option value="Default group" selected>Default group</option>
            </select>
            <button type="button" class="btn btn-outline" id="btn-edit-random-params" style="height: 36px; padding: 0 16px; gap: 8px; font-weight: 500; font-size: 13px; border-color: #cbd5e1; color: #334155;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
              <span>Tạo thông số ngẫu nhiên</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-submit-update-profile" style="margin-left: auto; height: 36px; padding: 0 26px; font-weight: 600; font-size: 13px; background: #0284c7;">
              Cập nhật
            </button>
          </div>

          <!-- Navigation Tabs Bar -->
          <div class="modal-tabs-header" style="padding: 0 24px; border-bottom: 1px solid var(--border-color); display: flex; gap: 24px; background: #ffffff;">
            <button class="modal-edit-tab-btn active" data-tab="edit-quick">Thao tác nhanh</button>
            <button class="modal-edit-tab-btn" data-tab="edit-connection">Kết nối</button>
            <button class="modal-edit-tab-btn" data-tab="edit-hardware">Hardware</button>
            <button class="modal-edit-tab-btn" data-tab="edit-software">Software</button>
          </div>

          <!-- Modal Body Split: 2 Columns -->
          <div class="modal-body-split" style="display: flex; flex: 1; overflow: hidden; height: 530px;">
            
            <!-- LEFT COLUMN -->
            <div class="modal-form-pane" style="flex: 1.6; padding: 22px 24px; overflow-y: auto;">
              <!-- TAB 1: Quick -->
              <div class="edit-tab-pane" id="pane-edit-quick" style="display: block;">
                <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                  <div style="flex: 1.4;">
                    <label class="field-label">Trình duyệt</label>
                    <div class="browser-select-box" style="position: relative;">
                      <select class="form-control" id="edit-quick-browser-core" style="height: 38px; padding-left: 36px; cursor: pointer;">
                        <option value="chrome|151.0.7922.76" selected>Chrome (151.0.7922.76)</option>
                        <option value="chrome|152.0.7977.83">Chrome (152.0.7977.83)</option>
                        <option value="chrome|153.0.8010.37">Chrome (153.0.8010.37)</option>
                        <option value="firefox|125.0">Firefox (125.0)</option>
                        <option value="edge|124.0">Edge (124.0)</option>
                        <option value="brave|1.65">Brave (1.65)</option>
                      </select>
                      <div style="position: absolute; left: 10px; top: 9px; pointer-events: none;">
                        <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#EA4335" /><circle cx="12" cy="12" r="6" fill="#FBBC05" /><path d="M12 2a10 10 0 0 1 8.66 5H12z" fill="#4285F4" /><circle cx="12" cy="12" r="3.5" fill="#ffffff" /></svg>
                      </div>
                    </div>
                  </div>
                  <div style="flex: 1;">
                    <label class="field-label">Taskbar title</label>
                    <input type="text" class="form-control" id="edit-quick-taskbar-title" placeholder="" style="height: 38px;">
                  </div>
                </div>

                <div style="margin-bottom: 16px;">
                  <label class="field-label">URL khởi động</label>
                  <input type="text" class="form-control" id="edit-quick-start-url" placeholder="" style="height: 38px;">
                </div>

                <div style="margin-bottom: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label class="field-label" style="margin-bottom: 0;">Loại proxy</label>
                    <a href="javascript:void(0)" id="edit-link-choose-proxy-lib" style="font-size: 12.5px; color: #0284c7; text-decoration: none; font-weight: 500;">Chọn từ thư viện proxy</a>
                  </div>
                  <select class="form-control" id="edit-quick-proxy-type" style="height: 38px; cursor: pointer;">
                    <option value="None" selected>None</option>
                    <option value="HTTP">HTTP</option>
                    <option value="Socks5">Socks5</option>
                    <option value="Tinsoft">Tinsoft</option>
                    <option value="TMProxy">TMProxy</option>
                  </select>
                </div>

                <div id="edit-quick-proxy-input-container" style="display: none; margin-bottom: 16px;">
                  <div style="margin-bottom: 6px;">
                    <label class="field-label">Địa chỉ proxy (IP:Port hoặc IP:Port:User:Pass)</label>
                    <input type="text" class="form-control" id="edit-quick-proxy-address" placeholder="192.168.1.1:8080" style="height: 38px; font-family: monospace;">
                  </div>
                </div>

                <div style="margin-bottom: 18px;">
                  <a href="javascript:void(0)" id="edit-link-check-proxy" style="font-size: 13px; color: #0284c7; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">Kiểm tra proxy</a>
                  <span id="edit-check-proxy-result" style="font-size: 12px; margin-left: 10px; font-weight: 500;"></span>
                </div>

                <div style="margin-top: 10px;">
                  <label class="field-label">Cho phép request file tĩnh không qua proxy</label>
                  <p style="font-size: 12px; color: var(--text-muted); line-height: 1.45; margin-bottom: 8px;">
                    Bạn có thể tiết kiệm băng thông hoặc cải thiện tốc độ load trang bằng cách cài đặt các extension file tĩnh không chạy qua proxy. Ví dụ: .css;.png;.jpg;.jpeg ...
                  </p>
                  <input type="text" class="form-control" id="edit-quick-static-files" placeholder="Eg: .css;.png;.jpg" style="height: 38px;">
                </div>
              </div>

              <!-- TAB 2: Connection -->
              <div class="edit-tab-pane" id="pane-edit-connection" style="display: none;">
                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div>
                    <label class="field-label">Loại Proxy kết nối</label>
                    <select class="form-control" id="edit-conn-proxy-type" style="height: 38px;">
                      <option value="None" selected>None (Không dùng Proxy)</option>
                      <option value="HTTP">HTTP</option>
                      <option value="Socks5">Socks5</option>
                      <option value="TMProxy">TMProxy</option>
                      <option value="Tinsoft">Tinsoft</option>
                    </select>
                  </div>
                  <div style="display: flex; gap: 12px;">
                    <div style="flex: 2;">
                      <label class="field-label">Host / IP</label>
                      <input type="text" class="form-control" id="edit-conn-proxy-host" placeholder="127.0.0.1">
                    </div>
                    <div style="flex: 1;">
                      <label class="field-label">Port</label>
                      <input type="text" class="form-control" id="edit-conn-proxy-port" placeholder="8080">
                    </div>
                  </div>
                  <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                      <label class="field-label">Username (Tùy chọn)</label>
                      <input type="text" class="form-control" id="edit-conn-proxy-user" placeholder="User...">
                    </div>
                    <div style="flex: 1;">
                      <label class="field-label">Password (Tùy chọn)</label>
                      <input type="password" class="form-control" id="edit-conn-proxy-pass" placeholder="Password...">
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
                    <button type="button" class="btn btn-primary" id="btn-edit-conn-check-proxy" style="height: 36px; padding: 0 16px; background: #0284c7; font-size: 13px;">
                      Kiểm tra kết nối Proxy
                    </button>
                    <span id="edit-conn-check-status" style="font-size: 12.5px; font-weight: 500;"></span>
                  </div>
                </div>
              </div>

              <!-- TAB 3: Hardware -->
              <div class="edit-tab-pane" id="pane-edit-hardware" style="display: none;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                  <div>
                    <label class="field-label">Canvas</label>
                    <select class="form-control" id="edit-hw-canvas">
                      <option value="Noise" selected>Noise</option>
                      <option value="Off">Off</option>
                      <option value="Block">Block</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Client rect</label>
                    <select class="form-control" id="edit-hw-clientrect">
                      <option value="Noise" selected>Noise</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">WebGL Image</label>
                    <select class="form-control" id="edit-hw-webgl-img">
                      <option value="Noise" selected>Noise</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">WebGL Metadata</label>
                    <select class="form-control" id="edit-hw-webgl-meta">
                      <option value="Masked" selected>Masked</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Audio</label>
                    <select class="form-control" id="edit-hw-audio">
                      <option value="Noise" selected>Noise</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Font</label>
                    <select class="form-control" id="edit-hw-font">
                      <option value="Masked" selected>Masked</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Số CPU (Cores)</label>
                    <select class="form-control" id="edit-hw-cpu">
                      <option value="2">2 Cores</option>
                      <option value="4">4 Cores</option>
                      <option value="6">6 Cores</option>
                      <option value="8" selected>8 Cores</option>
                      <option value="12">12 Cores</option>
                      <option value="16">16 Cores</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Dung lượng RAM</label>
                    <select class="form-control" id="edit-hw-ram">
                      <option value="4GB">4 GB</option>
                      <option value="8GB" selected>8 GB</option>
                      <option value="16GB">16 GB</option>
                      <option value="32GB">32 GB</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Video inputs</label>
                    <input type="text" class="form-control" id="edit-hw-video-in" value="-1">
                  </div>
                  <div>
                    <label class="field-label">Audio inputs/outputs</label>
                    <input type="text" class="form-control" id="edit-hw-audio-in-out" value="-1">
                  </div>
                </div>
              </div>

              <!-- TAB 4: Software -->
              <div class="edit-tab-pane" id="pane-edit-software" style="display: none;">
                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div>
                    <label class="field-label">Hệ điều hành (OS)</label>
                    <div class="os-button-group">
                      <button type="button" class="edit-os-btn active" data-os="Windows"><span>🪟</span> Windows</button>
                      <button type="button" class="edit-os-btn" data-os="Mac (Intel)"><span>🍏</span> Mac (Intel)</button>
                      <button type="button" class="edit-os-btn" data-os="Mac (ARM)"><span>🍏</span> Mac (ARM)</button>
                      <button type="button" class="edit-os-btn" data-os="Linux"><span>🐧</span> Linux</button>
                      <button type="button" class="edit-os-btn" data-os="Android"><span>🤖</span> Android</button>
                    </div>
                  </div>
                  <div>
                    <label class="field-label">User Agent</label>
                    <input type="text" class="form-control" id="edit-sw-user-agent" value="Auto">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                      <label class="field-label">Ngôn ngữ</label>
                      <select class="form-control" id="edit-sw-language">
                        <option value="Auto" selected>Auto (Theo IP Proxy)</option>
                        <option value="vi-VN">vi-VN (Tiếng Việt)</option>
                        <option value="en-US">en-US (English - US)</option>
                      </select>
                    </div>
                    <div>
                      <label class="field-label">Múi giờ (Timezone)</label>
                      <select class="form-control" id="edit-sw-timezone">
                        <option value="Auto" selected>Auto (Theo IP Proxy)</option>
                        <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                        <option value="America/New_York">America/New_York (GMT-5)</option>
                      </select>
                    </div>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                      <label class="field-label">WebRTC</label>
                      <select class="form-control" id="edit-sw-webrtc">
                        <option value="BaseOnIp" selected>BaseOnIp</option>
                        <option value="Disable">Disable</option>
                        <option value="Real">Real</option>
                      </select>
                    </div>
                    <div>
                      <label class="field-label">Geolocation</label>
                      <select class="form-control" id="edit-sw-geo">
                        <option value="Prompt" selected>Prompt</option>
                        <option value="Allow">Allow</option>
                        <option value="Block">Block</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="field-label">Độ phân giải màn hình</label>
                    <select class="form-control" id="edit-sw-screen">
                      <option value="-1x-1" selected>-1x-1 (Mặc định)</option>
                      <option value="1920x1080">1920x1080 (FHD)</option>
                      <option value="1366x768">1366x768 (HD)</option>
                      <option value="2560x1440">2560x1440 (2K)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN: Live Specifications Summary -->
            <div class="modal-summary-pane" style="flex: 1.1; background: #f8fafc; border-left: 1px solid var(--border-color); padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; justify-content: space-between;">
              <div class="spec-list">
                <div class="spec-row"><span class="spec-label">Browser</span><span class="spec-value" id="edit-sum-browser">Chrome - 151</span></div>
                <div class="spec-row"><span class="spec-label">OS</span><span class="spec-value" id="edit-sum-os">Windows</span></div>
                <div class="spec-row"><span class="spec-label">Taskbar</span><span class="spec-value" id="edit-sum-taskbar"></span></div>
                <div class="spec-row"><span class="spec-label">User agent</span><span class="spec-value" id="edit-sum-ua">Auto</span></div>
                <div class="spec-row"><span class="spec-label">Proxy</span><span class="spec-value" id="edit-sum-proxy">None</span></div>
                <div class="spec-row"><span class="spec-label">Static file</span><span class="spec-value" id="edit-sum-static-files"></span></div>
                <div class="spec-row"><span class="spec-label">Language</span><span class="spec-value" id="edit-sum-lang">Auto</span></div>
                <div class="spec-row"><span class="spec-label">Timezone</span><span class="spec-value" id="edit-sum-timezone">Auto</span></div>
                <div class="spec-row"><span class="spec-label">WebRTC</span><span class="spec-value" id="edit-sum-webrtc">BaseOnIp</span></div>
                <div class="spec-row"><span class="spec-label">Geolocation</span><span class="spec-value" id="edit-sum-geo">Prompt</span></div>
                <div class="spec-row"><span class="spec-label">Screen</span><span class="spec-value" id="edit-sum-screen">-1x-1</span></div>
                <div class="spec-row"><span class="spec-label">Canvas</span><span class="spec-value" id="edit-sum-canvas">Noise</span></div>
                <div class="spec-row"><span class="spec-label">Client rect</span><span class="spec-value" id="edit-sum-clientrect">Noise</span></div>
                <div class="spec-row"><span class="spec-label">WebGL image</span><span class="spec-value" id="edit-sum-webgl-img">Noise</span></div>
                <div class="spec-row"><span class="spec-label">WebGL metadata</span><span class="spec-value" id="edit-sum-webgl-meta">Masked</span></div>
                <div class="spec-row"><span class="spec-label">Audio</span><span class="spec-value" id="edit-sum-audio">Noise</span></div>
                <div class="spec-row"><span class="spec-label">Font</span><span class="spec-value" id="edit-sum-font">Masked</span></div>
                <div class="spec-row"><span class="spec-label">Video inputs</span><span class="spec-value" id="edit-sum-video-in">-1</span></div>
                <div class="spec-row"><span class="spec-label">Audio inputs</span><span class="spec-value" id="edit-sum-audio-in">-1</span></div>
                <div class="spec-row"><span class="spec-label">Audio outputs</span><span class="spec-value" id="edit-sum-audio-out">-1</span></div>
                <div class="spec-row"><span class="spec-label">Hardware</span><span class="spec-value" id="edit-sum-hardware">8 cores, 8GB</span></div>
              </div>

              <div class="green-notice-box" style="margin-top: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; font-size: 11.5px; color: #166534; line-height: 1.5;">
                Theo mặc định, chúng tôi đã đề xuất sẵn cho bạn cấu hình phù hợp nhất với thời điểm hiện tại. Bạn có thể tùy chỉnh cấu hình mặc định khi tạo profile tại menu "Cài đặt - Trình Duyệt" hoặc tùy chỉnh ở các Tab bên cạnh
              </div>
            </div>

          </div>

        </div>
      </div>

      <!-- MODAL: Nhân bản (Chuẩn Ảnh 3) -->
      <div class="modal-overlay" id="modal-clone-profile">
        <div class="modal-dialog" style="width: 520px; max-width: 95vw;">
          <div class="modal-header" style="padding: 14px 20px;">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Nhân bản</span>
            </div>
            <button class="window-btn close" data-close="modal-clone-profile" style="font-size: 16px;">✕</button>
          </div>
          <div class="modal-body" style="padding: 18px 22px;">
            <div style="margin-bottom: 16px;">
              <label style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block;">Số lượng profile</label>
              <input type="number" class="form-control" id="clone-profile-count" value="1" min="1" max="1000" style="height: 38px; width: 100%;">
            </div>
            <div>
              <label style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block;">Proxy</label>
              <textarea class="form-control" id="clone-profile-proxies" style="height: 140px; font-family: monospace; font-size: 12.5px; resize: vertical;"></textarea>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 8px; line-height: 1.45;">
                Mỗi dòng tương ứng với một proxy cho profile. Định dạng: IP:Port hoặc socks5://IP:Port (nếu là socks5) (cho phép User:Password). Sử dụng 'null' nếu không sử dụng proxy
              </div>
            </div>
          </div>
          <div class="modal-footer" style="padding: 12px 22px; justify-content: flex-end; gap: 12px; background: transparent; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-outline" data-close="modal-clone-profile" style="border: none; color: #64748b; font-weight: 500; font-size: 13px;">Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-submit-clone-profile" style="padding: 0 26px; height: 36px; background-color: #0284c7; font-weight: 600; font-size: 13px; border-radius: 4px;">OK</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Thay đổi màu sắc (Chuẩn Ảnh 4) -->
      <div class="modal-overlay" id="modal-color-picker">
        <div class="modal-dialog" style="width: 380px; max-width: 95vw;">
          <div class="modal-header" style="padding: 14px 20px;">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                <path d="M2 2l7.586 7.586"></path>
                <circle cx="11" cy="11" r="2"></circle>
              </svg>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Thay đổi màu sắc</span>
            </div>
            <button class="window-btn close" data-close="modal-color-picker" style="font-size: 16px;">✕</button>
          </div>
          <div class="modal-body" style="padding: 18px 20px;">
            <!-- 2D SV Box -->
            <div class="cp-sv-box" id="cp-sv-box">
              <div class="cp-sv-white"></div>
              <div class="cp-sv-black"></div>
              <div class="cp-handle" id="cp-sv-handle" style="left: 100%; top: 69%;"></div>
            </div>

            <!-- Hue Slider -->
            <div style="margin-top: 16px;">
              <div class="cp-slider-track" id="cp-hue-slider" style="background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);">
                <div class="cp-slider-thumb" id="cp-hue-thumb" style="left: 0%;"></div>
              </div>
            </div>

            <!-- Alpha Slider -->
            <div style="margin-top: 12px;">
              <div class="cp-slider-track cp-checkerboard" id="cp-alpha-slider">
                <div id="cp-alpha-gradient" style="position: absolute; inset: 0; border-radius: 6px; background: linear-gradient(to right, transparent, rgb(79, 6, 6));"></div>
                <div class="cp-slider-thumb" id="cp-alpha-thumb" style="left: 100%;"></div>
              </div>
            </div>

            <!-- Inputs & Swatch Row -->
            <div style="margin-top: 16px; display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1.4; display: flex; align-items: center; border: 1px solid var(--border-color); border-radius: 4px; padding: 0 8px; height: 36px; background: var(--bg-card);">
                <span style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-right: 4px;">#</span>
                <input type="text" id="cp-hex-input" value="4F0606FF" maxlength="8" style="border: none; outline: none; background: transparent; width: 100%; font-family: monospace; font-size: 13px; text-transform: uppercase; color: var(--text-main);">
              </div>
              <input type="text" id="cp-opacity-input" value="100%" style="width: 58px; height: 36px; text-align: center; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px; background: var(--bg-card); color: var(--text-main);">
              <select id="cp-format-select" class="form-control" style="width: 75px; height: 36px; font-size: 13px; padding: 0 8px;">
                <option value="hex" selected>Hex</option>
                <option value="rgb">RGB</option>
              </select>
              <div id="cp-swatch-box" style="width: 36px; height: 36px; border-radius: 4px; border: 1px solid var(--border-color); background: #4F0606FF; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);"></div>
            </div>
          </div>
          <div class="modal-footer" style="padding: 12px 20px; justify-content: flex-end; gap: 10px; background: transparent; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn" id="btn-reset-color" style="background: #475569; color: #ffffff; padding: 8px 18px; border: none; border-radius: 4px; font-weight: 500; font-size: 13px; cursor: pointer;">Đặt lại màu sắc</button>
            <button type="button" class="btn btn-primary" id="btn-apply-color" style="background: #0284c7; color: #ffffff; padding: 8px 24px; border: none; border-radius: 4px; font-weight: 600; font-size: 13px; cursor: pointer;">Chọn</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Mở với remote port (Chuẩn Ảnh 2) -->
      <div class="modal-overlay" id="modal-remote-port">
        <div class="modal-dialog" style="width: 440px; max-width: 95vw; border-radius: 8px;">
          <div class="modal-header" style="padding: 14px 20px;">
            <div class="modal-title" style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 30px; height: 30px; border-radius: 6px; background: #e0f2fe; display: flex; align-items: center; justify-content: center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                  <path d="M12 22v-5"></path>
                  <path d="M9 8V2"></path>
                  <path d="M15 2v6"></path>
                  <path d="M18 8v5a6 6 0 0 1-12 0V8z"></path>
                </svg>
              </div>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Mở với remote port</span>
            </div>
            <button class="window-btn close" data-close="modal-remote-port" style="font-size: 16px;">✕</button>
          </div>
          <div class="modal-body" style="padding: 20px 22px;">
            <div style="margin-bottom: 8px;">
              <label style="font-size: 13.5px; font-weight: 600; color: var(--text-main); margin-bottom: 8px; display: block;">Nhập port</label>
              <input type="number" class="form-control" id="remote-port-input" value="59542" min="1024" max="65535" style="height: 38px; width: 100%; font-size: 14px; font-weight: 500;">
            </div>
            <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
              Nhập port hợp lệ ngẫu nhiên trong khoảng 1024 tới 65535
            </div>
          </div>
          <div class="modal-footer" style="padding: 14px 22px; justify-content: flex-end; gap: 12px; background: transparent; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-outline" data-close="modal-remote-port" style="border: none; color: #0284c7; font-weight: 500; font-size: 13.5px; cursor: pointer;">Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-submit-remote-port" style="padding: 0 24px; height: 36px; background-color: #0284c7; font-weight: 600; font-size: 13.5px; border-radius: 4px; cursor: pointer;">OK</button>
          </div>
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- MODAL: TRÌNH QUẢN LÝ CẬP NHẬT (Chuẩn 100% Ảnh GPM của bạn) -->
      <!-- ============================================================= -->
      <div class="modal-overlay" id="modal-update-manager">
        <div class="modal-dialog" style="width: 640px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; background: var(--bg-card, #ffffff); border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.18);">
          
          <!-- Header -->
          <div class="modal-header" style="padding: 14px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; align-items: center; justify-content: space-between; background: var(--bg-card, #ffffff);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #334155;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main, #1e293b);">Trình quản lý cập nhật</span>
            </div>
            <button class="window-btn close" data-close="modal-update-manager" style="font-size: 16px; border: none; background: none; cursor: pointer; color: #64748b;">✕</button>
          </div>

          <!-- Subheader & Server Web Config -->
          <div style="padding: 10px 20px; background: #f8fafc; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center;">
            <a href="https://github.com/Hibbiki/chromium-win64/releases" target="_blank" style="color: #0284c7; font-size: 13px; font-weight: 500; text-decoration: none;">Xem chi tiết các bản phát hành</a>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" id="btn-toggle-server-config" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer; color: #475569; display: flex; align-items: center; gap: 5px;">
                <span>⚙</span> Server Web
              </button>
              <button type="button" id="btn-refresh-update-list" title="Quét & Làm mới" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; width: 28px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #0284c7;">
                🔄
              </button>
            </div>
          </div>

          <!-- Form nhập Server Web URL -->
          <div id="box-server-config" style="display: none; padding: 12px 20px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
            <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 5px;">URL Server Web phân phối Core của bạn:</div>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="input-update-server-url" class="form-control" placeholder="https://your-server.com/api/updates.json" style="flex: 1; height: 32px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 10px;">
              <button type="button" id="btn-save-server-url" style="background: #0284c7; color: white; border: none; border-radius: 4px; padding: 0 14px; font-size: 12px; font-weight: 600; cursor: pointer;">Lưu & Quét</button>
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 5px;">
              Khi có bản mới, server của bạn chỉ cần trả về mảng JSON chứa <code>downloadUrl</code> của file <code>chrome.7z</code>.
            </div>
          </div>

          <!-- Danh sách items -->
          <div id="update-manager-list" style="padding: 14px 20px; overflow-y: auto; max-height: 520px; display: flex; flex-direction: column; gap: 10px; background: var(--bg-card, #ffffff);">
            <div style="text-align: center; color: #64748b; padding: 24px;">Đang tải danh sách...</div>
          </div>

        </div>
      </div>

      <!-- MODAL: Xác nhận xóa Profile (Chuẩn 100% theo Ảnh 2) -->
      <div class="modal-overlay" id="modal-confirm-delete" style="display: none; z-index: 10005;">
        <div class="modal-dialog" style="width: 440px; max-width: 90vw; background: #ffffff; border-radius: 8px; padding: 28px 24px 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); text-align: center;">
          
          <!-- Blue Question Mark Icon -->
          <div style="margin: 0 auto 16px; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#0284c7" stroke-width="2.2" fill="none"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="17" r="1.1" fill="#0284c7"/>
            </svg>
          </div>

          <!-- Question text -->
          <div style="font-size: 15px; font-weight: 500; color: #1e293b; line-height: 1.5; margin-bottom: 16px; padding: 0 10px;" id="confirm-delete-message">
            Xác nhận xóa profile? Mặc định các profile bị xóa sẽ được lưu trữ trong thùng rác
          </div>

          <!-- Checkbox: Xóa vĩnh viễn -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 24px;">
            <input type="checkbox" id="confirm-delete-permanent-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #0284c7;">
            <label for="confirm-delete-permanent-checkbox" style="font-size: 14px; color: #334155; cursor: pointer; user-select: none;">
              Xóa vĩnh viễn
            </label>
          </div>

          <!-- Action buttons: OK and Cancel -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
            <button type="button" class="btn btn-primary" id="btn-confirm-delete-ok" style="min-width: 90px; height: 34px; font-size: 13.5px; font-weight: 600; border-radius: 4px; background: #0284c7; border: none; color: #fff; cursor: pointer;">
              OK
            </button>
            <button type="button" class="btn" id="btn-confirm-delete-cancel" style="min-width: 90px; height: 34px; font-size: 13.5px; font-weight: 500; border-radius: 4px; background: #52525b; border: none; color: #fff; cursor: pointer;">
              Cancel
            </button>
          </div>

        </div>
      </div>

      <!-- MODAL: + Thêm mới Proxy (Chuẩn Ảnh 1) -->
      <div class="modal-overlay" id="modal-add-proxy" style="display: none; z-index: 10002;">
        <div class="modal-dialog" style="width: 540px; max-width: 92vw; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          <div class="modal-header" style="padding: 14px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
            <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px; font-weight: 700; color: var(--text-main);">Thêm mới Proxy</span>
            </div>
            <button class="window-btn close" id="btn-close-add-proxy" style="font-size: 16px; background: none; border: none; cursor: pointer;">✕</button>
          </div>

          <div style="padding: 20px 24px; display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; gap: 12px;">
              <div style="flex: 1;">
                <label style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 6px; display: block;">Loại Proxy</label>
                <select id="add-proxy-type-select" class="form-control" style="width: 100%; height: 34px; font-size: 13px;">
                  <option value="HTTP" selected>HTTP / HTTPS</option>
                  <option value="SOCKS5">SOCKS5</option>
                </select>
              </div>
              <div style="flex: 1;">
                <label style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 6px; display: block;">Tags</label>
                <input type="text" id="add-proxy-tags-input" class="form-control" placeholder="Ví dụ: US, Proxy1..." style="width: 100%; height: 34px; font-size: 13px;">
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 13px; font-weight: 600; color: var(--text-main);">Danh sách Proxy (Mỗi dòng 1 proxy)</label>
                <span style="font-size: 11.5px; color: var(--text-muted);">host:port:user:pass hoặc host:port</span>
              </div>
              <textarea id="add-proxy-text-input" class="form-control" rows="8" placeholder="192.168.1.100:8080:user:pass&#10;147.53.115.163:80&#10;socks5://103.152.220.10:1080" style="width: 100%; font-family: monospace; font-size: 12.5px; padding: 10px; resize: vertical;"></textarea>
            </div>

            <div>
              <label style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 6px; display: block;">Ghi chú</label>
              <input type="text" id="add-proxy-note-input" class="form-control" placeholder="Ghi chú thêm về proxy này..." style="width: 100%; height: 34px; font-size: 13px;">
            </div>
          </div>

          <div class="modal-footer" style="padding: 12px 24px; border-top: 1px solid var(--border-color); background: #f8fafc; display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-outline" id="btn-cancel-add-proxy" style="height: 34px; padding: 0 16px;">Hủy</button>
            <button type="button" class="btn btn-primary" id="btn-submit-add-proxy" style="height: 34px; padding: 0 20px; font-weight: 600; background: #0284c7;">+ Thêm mới</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.loadAvailableCores();
    this.updateSummary();
  }

  async loadAvailableCores() {
    if (!window.api || !window.api.getAvailableCores) return;
    try {
      const cores = await window.api.getAvailableCores();
      if (cores && cores.length > 0) {
        const select = this.container.querySelector('#quick-browser-core');
        if (select) {
          select.innerHTML = '';
          cores.forEach((c, idx) => {
            const opt = document.createElement('option');
            opt.value = `chrome|${c.version}`;
            opt.textContent = `Chrome - ${c.version.split('.')[0]} (${c.version})`;
            if (idx === 0) opt.selected = true;
            select.appendChild(opt);
          });
          this.updateSummary();
        }

        const batchSelect = this.container.querySelector('#batch-browser-version');
        if (batchSelect) {
          batchSelect.innerHTML = '';
          cores.forEach((c, idx) => {
            const opt = document.createElement('option');
            opt.value = c.version;
            opt.textContent = c.version;
            if (idx === 0) opt.selected = true;
            batchSelect.appendChild(opt);
          });
        }

        const editSelect = this.container.querySelector('#edit-quick-browser-core');
        if (editSelect) {
          editSelect.innerHTML = '';
          cores.forEach((c, idx) => {
            const opt = document.createElement('option');
            opt.value = `chrome|${c.version}`;
            opt.textContent = `Chrome - ${c.version.split('.')[0]} (${c.version})`;
            if (idx === 0) opt.selected = true;
            editSelect.appendChild(opt);
          });
        }
      }
    } catch (e) {
      console.error('Lỗi load available cores:', e);
    }
  }

  bindEvents() {
    // Đóng modal
    this.container.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        this.closeModal(modalId);
      });
    });

    // Chuyển Tab trong Modal "+ Tạo profile"
    const tabBtns = this.container.querySelectorAll('.modal-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tabKey = btn.getAttribute('data-tab');
        this.activeTab = tabKey;
        const panes = this.container.querySelectorAll('.tab-pane');
        panes.forEach(p => p.style.display = 'none');
        const targetPane = this.container.querySelector(`#pane-${tabKey}`);
        if (targetPane) targetPane.style.display = 'block';
      });
    });

    // Chọn OS trong Tab Software
    this.container.querySelectorAll('.os-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.os-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedOs = btn.getAttribute('data-os') || 'Windows';
        this.updateSummary();
      });
    });

    // Khi thay đổi loại proxy trong tab Quick
    const quickProxyType = this.container.querySelector('#quick-proxy-type');
    const proxyInputContainer = this.container.querySelector('#quick-proxy-input-container');
    quickProxyType?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (proxyInputContainer) {
        proxyInputContainer.style.display = (val === 'None') ? 'none' : 'block';
      }
      this.updateSummary();
    });

    // Link "Chọn từ thư viện proxy"
    this.container.querySelector('#link-choose-proxy-lib')?.addEventListener('click', () => {
      alert('Thư viện proxy hiện đang lưu trữ proxy mặc định của hệ thống. Bạn có thể nhập proxy theo định dạng IP:Port hoặc Host:Port:User:Pass.');
    });

    // Link "Kiểm tra proxy"
    this.container.querySelector('#link-check-proxy')?.addEventListener('click', async () => {
      await this.testProxyQuick();
    });

    // Nút kiểm tra proxy trong tab Kết nối
    this.container.querySelector('#btn-conn-check-proxy')?.addEventListener('click', async () => {
      await this.testProxyConn();
    });

    // Nút "🔀 Tạo thông số ngẫu nhiên"
    this.container.querySelector('#btn-random-params')?.addEventListener('click', () => {
      this.randomizeParameters();
    });

    // Lắng nghe thay đổi các inputs để cập nhật bảng Summary tức thời
    const listenInputs = [
      '#add-profile-name', '#quick-taskbar-title', '#quick-browser-core',
      '#quick-proxy-type', '#quick-proxy-address', '#hw-canvas', '#hw-clientrect',
      '#hw-webgl-img', '#hw-webgl-meta', '#hw-audio', '#hw-font', '#hw-cpu',
      '#hw-ram', '#hw-video-in', '#hw-audio-in-out', '#sw-language', '#sw-timezone',
      '#sw-webrtc', '#sw-geo', '#sw-screen', '#sw-user-agent'
    ];

    listenInputs.forEach(sel => {
      this.container.querySelector(sel)?.addEventListener('input', () => this.updateSummary());
      this.container.querySelector(sel)?.addEventListener('change', () => this.updateSummary());
    });

    // Submit "+ Tạo profile" (Đơn lẻ - Ảnh 1)
    this.container.querySelector('#btn-submit-create-profile')?.addEventListener('click', async () => {
      await this.handleCreateProfile();
    });

    // Chọn OS trong Modal Tạo Hàng Loạt (Ảnh 3)
    this.container.querySelectorAll('.os-btn-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.os-btn-batch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.batchSelectedOs = btn.getAttribute('data-os') || 'Windows';
      });
    });

    // Submit "+ Tạo profile" (Hàng loạt - Ảnh 3)
    this.container.querySelector('#btn-submit-batch-create')?.addEventListener('click', async () => {
      await this.handleBatchCreateProfile();
    });


    // Kích hoạt / Đổi Mã License Key
    this.container.querySelector('#btn-submit-activate')?.addEventListener('click', async () => {
      const keyInput = this.container.querySelector('#input-license-key');
      const submitBtn = this.container.querySelector('#btn-submit-activate');
      const key = keyInput ? keyInput.value.trim() : '';
      if (!key) {
        alert('Vui lòng dán License Key vào ô nhập!');
        return;
      }

      const origText = submitBtn ? submitBtn.innerText : 'Kích Hoạt';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = '⏳ Đang kích hoạt...';
      }

      try {
        if (window.api && window.api.activateLicense) {
          const res = await window.api.activateLicense(key);
          if (res.valid) {
            alert('🎉 ' + res.message);
            this.currentLicenseStatus = res.license || { isActivated: true, isExpired: false };
            const closeBtn = this.container.querySelector('#btn-close-license-modal');
            const cancelBtn = this.container.querySelector('#btn-cancel-license-modal');
            if (closeBtn) closeBtn.style.display = '';
            if (cancelBtn) cancelBtn.style.display = '';
            this.closeModal('modal-license');
            if (keyInput) keyInput.value = '';
            this.onLicenseActivated();
          } else {
            alert('⚠️ Kích hoạt không thành công: ' + res.message);
          }
        }
      } catch (err) {
        alert('Lỗi kích hoạt: ' + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = origText;
        }
      }
    });

    // Cho phép nhấn Enter trong ô nhập key để kích hoạt luôn
    this.container.querySelector('#input-license-key')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.container.querySelector('#btn-submit-activate')?.click();
      }
    });

    // Thiết lập thư mục lưu trữ Local Storage lần đầu
    this.container.querySelector('#btn-browse-setup-storage')?.addEventListener('click', async () => {
      const input = this.container.querySelector('#input-setup-storage-path');
      const current = input ? input.value : '';
      if (window.api && window.api.selectDirectory) {
        const selected = await window.api.selectDirectory(current);
        if (selected) {
          input.value = selected;
        }
      }
    });

    this.container.querySelector('#btn-save-setup-storage')?.addEventListener('click', async () => {
      const input = this.container.querySelector('#input-setup-storage-path');
      const pathVal = input ? input.value.trim() : '';
      if (!pathVal) {
        alert('Vui lòng chọn thư mục để lưu trữ dữ liệu profile!');
        return;
      }

      if (window.api && window.api.updateSettings) {
        await window.api.updateSettings({
          localStoragePath: pathVal,
          hasConfiguredStoragePath: true
        });
      }

      this.closeModal('modal-storage-setup');
      if (window.showGlobalToast) {
        window.showGlobalToast(`✔ Đã thiết lập thư mục lưu trữ: ${pathVal}`);
      }
      if (this.onStorageConfiguredCallback) {
        this.onStorageConfiguredCallback(pathVal);
      }
    });

    // Keygen options
    const keygenTypeSelect = this.container.querySelector('#keygen-type');
    keygenTypeSelect?.addEventListener('change', (e) => {
      const isCustom = e.target.value === 'custom';
      const customGroup = this.container.querySelector('#keygen-custom-days-group');
      if (customGroup) customGroup.style.display = isCustom ? 'block' : 'none';
    });

    // Tạo Key Admin
    this.container.querySelector('#btn-generate-key')?.addEventListener('click', async () => {
      const type = keygenTypeSelect.value;
      let days = 7;
      if (type === 'monthly') days = 30;
      else if (type === 'lifetime') days = 0;
      else if (type === 'custom') {
        days = parseInt(this.container.querySelector('#keygen-custom-days').value) || 7;
      }

      const maxMachines = parseInt(this.container.querySelector('#keygen-max-machines').value) || 1;
      const customerName = this.container.querySelector('#keygen-customer').value.trim() || 'KhachHang';
      const hwidLock = this.container.querySelector('#keygen-hwid-lock').value.trim();
      const specificHwids = hwidLock ? [hwidLock] : [];

      if (window.api && window.api.generateAdminKey) {
        const res = await window.api.generateAdminKey({
          type,
          durationDays: days,
          maxMachines,
          customerName,
          specificHwids
        });

        if (res && res.key) {
          this.container.querySelector('#keygen-result-container').style.display = 'block';
          this.container.querySelector('#keygen-key-output').innerText = res.key;
        }
      }
    });

    // Copy generated key
    this.container.querySelector('#btn-copy-generated-key')?.addEventListener('click', () => {
      const key = this.container.querySelector('#keygen-key-output').innerText;
      navigator.clipboard.writeText(key);
      alert('Đã sao chép License Key vào Clipboard!');
    });

    // ==========================================
    // BINDINGS FOR MODAL: CẬP NHẬT PROFILE
    // ==========================================
    const editTabBtns = this.container.querySelectorAll('.modal-edit-tab-btn');
    editTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        editTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tabKey = btn.getAttribute('data-tab');
        this.editActiveTab = tabKey;
        const panes = this.container.querySelectorAll('.edit-tab-pane');
        panes.forEach(p => p.style.display = 'none');
        const targetPane = this.container.querySelector(`#pane-${tabKey}`);
        if (targetPane) targetPane.style.display = 'block';
      });
    });

    this.container.querySelectorAll('.edit-os-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.edit-os-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.editSelectedOs = btn.getAttribute('data-os') || 'Windows';
        this.updateEditSummary();
      });
    });

    const editQuickProxyType = this.container.querySelector('#edit-quick-proxy-type');
    const editProxyInputContainer = this.container.querySelector('#edit-quick-proxy-input-container');
    editQuickProxyType?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (editProxyInputContainer) {
        editProxyInputContainer.style.display = (val === 'None') ? 'none' : 'block';
      }
      this.updateEditSummary();
    });

    this.container.querySelector('#edit-link-choose-proxy-lib')?.addEventListener('click', () => {
      alert('Thư viện proxy hiện đang lưu trữ proxy mặc định của hệ thống. Bạn có thể nhập proxy theo định dạng IP:Port hoặc Host:Port:User:Pass.');
    });

    this.container.querySelector('#edit-link-check-proxy')?.addEventListener('click', async () => {
      await this.testProxyEditQuick();
    });

    this.container.querySelector('#btn-edit-conn-check-proxy')?.addEventListener('click', async () => {
      await this.testProxyEditConn();
    });

    this.container.querySelector('#btn-edit-random-params')?.addEventListener('click', () => {
      this.randomizeEditParameters();
    });

    const editListenInputs = [
      '#edit-profile-name', '#edit-quick-taskbar-title', '#edit-quick-browser-core',
      '#edit-quick-proxy-type', '#edit-quick-proxy-address', '#edit-quick-static-files',
      '#edit-hw-canvas', '#edit-hw-clientrect', '#edit-hw-webgl-img', '#edit-hw-webgl-meta',
      '#edit-hw-audio', '#edit-hw-font', '#edit-hw-cpu', '#edit-hw-ram',
      '#edit-hw-video-in', '#edit-hw-audio-in-out', '#edit-sw-language', '#edit-sw-timezone',
      '#edit-sw-webrtc', '#edit-sw-geo', '#edit-sw-screen', '#edit-sw-user-agent'
    ];
    editListenInputs.forEach(sel => {
      this.container.querySelector(sel)?.addEventListener('input', () => this.updateEditSummary());
      this.container.querySelector(sel)?.addEventListener('change', () => this.updateEditSummary());
    });

    this.container.querySelector('#btn-submit-update-profile')?.addEventListener('click', async () => {
      await this.handleUpdateProfile();
    });

    // ==========================================
    // BINDINGS FOR MODAL: NHÂN BẢN
    // ==========================================
    this.container.querySelector('#btn-submit-clone-profile')?.addEventListener('click', async () => {
      await this.handleCloneProfile();
    });

    // ==========================================
    // BINDINGS FOR MODAL: THAY ĐỔI MÀU SẮC
    // ==========================================
    this.bindColorPickerEvents();

    // ==========================================
    // BINDINGS FOR MODAL: MỞ VỚI REMOTE PORT
    // ==========================================
    this.container.querySelector('#btn-submit-remote-port')?.addEventListener('click', async () => {
      await this.handleLaunchRemotePort();
    });
  }

  randomizeParameters() {
    // Tên profile ngẫu nhiên dạng Profile 8397
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const nameInput = this.container.querySelector('#add-profile-name');
    if (nameInput) nameInput.value = `Profile ${randomNum}`;

    // Random Hardware Cores: 4, 6, 8, 12, 16
    const cpuOptions = ['4', '6', '8', '12', '16'];
    const randomCpu = cpuOptions[Math.floor(Math.random() * cpuOptions.length)];
    const cpuSelect = this.container.querySelector('#hw-cpu');
    if (cpuSelect) cpuSelect.value = randomCpu;

    // Random RAM: 4GB, 8GB, 16GB, 32GB
    const ramOptions = ['4GB', '8GB', '16GB', '32GB'];
    const randomRam = ramOptions[Math.floor(Math.random() * ramOptions.length)];
    const ramSelect = this.container.querySelector('#hw-ram');
    if (ramSelect) ramSelect.value = randomRam;

    // Random Screen: -1x-1, 1920x1080, 1366x768, 1440x900
    const screenOptions = ['-1x-1', '1920x1080', '1366x768', '1440x900', '1536x864'];
    const randomScreen = screenOptions[Math.floor(Math.random() * screenOptions.length)];
    const screenSelect = this.container.querySelector('#sw-screen');
    if (screenSelect) screenSelect.value = randomScreen;

    this.updateSummary();
  }

  updateSummary() {
    const coreVal = this.container.querySelector('#quick-browser-core')?.value || 'chrome|151.0.7922.76';
    const [, version] = coreVal.split('|');
    const major = (version || '151').split('.')[0];

    const taskbar = this.container.querySelector('#quick-taskbar-title')?.value.trim() || '';
    const proxyType = this.container.querySelector('#quick-proxy-type')?.value || 'None';
    const proxyAddr = this.container.querySelector('#quick-proxy-address')?.value.trim() || '';

    const lang = this.container.querySelector('#sw-language')?.value || 'Auto';
    const tz = this.container.querySelector('#sw-timezone')?.value || 'Auto';
    const webrtc = this.container.querySelector('#sw-webrtc')?.value || 'BaseOnIp';
    const geo = this.container.querySelector('#sw-geo')?.value || 'Prompt';
    const screen = this.container.querySelector('#sw-screen')?.value || '-1x-1';

    const canvas = this.container.querySelector('#hw-canvas')?.value || 'Noise';
    const clientrect = this.container.querySelector('#hw-clientrect')?.value || 'Noise';
    const webglImg = this.container.querySelector('#hw-webgl-img')?.value || 'Noise';
    const webglMeta = this.container.querySelector('#hw-webgl-meta')?.value || 'Masked';
    const audio = this.container.querySelector('#hw-audio')?.value || 'Noise';
    const font = this.container.querySelector('#hw-font')?.value || 'Masked';
    const videoIn = this.container.querySelector('#hw-video-in')?.value || '-1';
    const audioInOut = this.container.querySelector('#hw-audio-in-out')?.value || '-1';
    const cpu = this.container.querySelector('#hw-cpu')?.value || '8';
    const ram = this.container.querySelector('#hw-ram')?.value || '8GB';

    // Cập nhật DOM cột tóm tắt bên phải (Chuẩn Ảnh 2)
    const setText = (id, text) => {
      const el = this.container.querySelector(id);
      if (el) el.textContent = text;
    };

    setText('#sum-browser', `Chrome - ${major}`);
    setText('#sum-os', this.selectedOs || 'Windows');
    setText('#sum-taskbar', taskbar || '');
    setText('#sum-ua', 'Auto');
    setText('#sum-proxy', proxyType === 'None' ? 'None' : (proxyAddr || proxyType));
    setText('#sum-lang', lang);
    setText('#sum-tz', tz.includes('/') ? tz.split('/')[1] : tz);
    setText('#sum-webrtc', webrtc);
    setText('#sum-geo', geo);
    setText('#sum-screen', screen);
    setText('#sum-canvas', canvas);
    setText('#sum-clientrect', clientrect);
    setText('#sum-webgl-img', webglImg);
    setText('#sum-webgl-meta', webglMeta);
    setText('#sum-audio', audio);
    setText('#sum-font', font);
    setText('#sum-video-in', videoIn);
    setText('#sum-audio-in', audioInOut);
    setText('#sum-audio-out', audioInOut);
    setText('#sum-hardware', `${cpu} cores, ${ram}`);
  }

  async testProxyQuick() {
    const proxyType = this.container.querySelector('#quick-proxy-type')?.value;
    const proxyAddr = this.container.querySelector('#quick-proxy-address')?.value.trim();
    const resEl = this.container.querySelector('#check-proxy-result');

    if (proxyType === 'None' || !proxyAddr) {
      if (resEl) {
        resEl.style.color = '#10b981';
        resEl.textContent = '✓ Không dùng Proxy (Direct Connection)';
      }
      return;
    }

    if (resEl) {
      resEl.style.color = '#0284c7';
      resEl.textContent = 'Đang kiểm tra kết nối...';
    }

    try {
      const check = window.api?.testProxyString ? await window.api.testProxyString(proxyAddr, proxyType) : null;
      if (check && check.live) {
        if (resEl) {
          resEl.style.color = '#10b981';
          resEl.textContent = `✓ Kết nối tốt: IP ${check.ip} (${(check.country || 'US').toUpperCase()})`;
        }
      } else {
        if (resEl) {
          resEl.style.color = '#ef4444';
          resEl.textContent = `✕ Kết nối thất bại: ${check?.error || 'No connection'}`;
        }
      }
    } catch (e) {
      if (resEl) {
        resEl.style.color = '#ef4444';
        resEl.textContent = `✕ Lỗi: ${e.message}`;
      }
    }
  }

  async testProxyConn() {
    const host = this.container.querySelector('#conn-proxy-host')?.value.trim();
    const port = this.container.querySelector('#conn-proxy-port')?.value.trim();
    const user = this.container.querySelector('#conn-proxy-user')?.value?.trim();
    const pass = this.container.querySelector('#conn-proxy-pass')?.value?.trim();
    const pType = this.container.querySelector('#conn-proxy-type')?.value || 'HTTP';
    const resEl = this.container.querySelector('#conn-proxy-result');

    if (!host) {
      alert('Vui lòng nhập Host / IP của Proxy!');
      return;
    }

    if (resEl) {
      resEl.style.color = '#0284c7';
      resEl.textContent = 'Đang kiểm tra...';
    }

    const proxyStr = (user && pass) ? `${host}:${port || 80}:${user}:${pass}` : `${host}:${port || 80}`;
    try {
      const check = window.api?.testProxyString ? await window.api.testProxyString(proxyStr, pType) : null;
      if (check && check.live) {
        if (resEl) {
          resEl.style.color = '#10b981';
          resEl.textContent = `✓ Hoạt động: ${check.ip} (${(check.country || 'US').toUpperCase()})`;
        }
      } else {
        if (resEl) {
          resEl.style.color = '#ef4444';
          resEl.textContent = `✕ Thất bại: ${check?.error || 'No connection'}`;
        }
      }
    } catch (e) {
      if (resEl) {
        resEl.style.color = '#ef4444';
        resEl.textContent = `✕ Lỗi: ${e.message}`;
      }
    }
  }

  async handleCreateProfile() {
    const name = this.container.querySelector('#add-profile-name')?.value.trim() || `Profile ${Math.floor(1000 + Math.random() * 9000)}`;
    const group = this.container.querySelector('#add-profile-group')?.value || 'Default group';
    
    const coreVal = this.container.querySelector('#quick-browser-core')?.value || 'chrome|151.0.7922.76';
    const [browserType, version] = coreVal.split('|');

    const taskbarTitle = this.container.querySelector('#quick-taskbar-title')?.value.trim() || '';
    const startUrl = this.container.querySelector('#quick-start-url')?.value.trim() || '';
    const bypassStaticFiles = this.container.querySelector('#quick-static-files')?.value.trim() || '';

    const proxyType = this.container.querySelector('#quick-proxy-type')?.value || 'None';
    let proxy = 'No Proxy';
    if (proxyType !== 'None') {
      const raw = this.container.querySelector('#quick-proxy-address')?.value.trim();
      if (raw) proxy = raw;
    }

    const cookies = this.container.querySelector('#tab-cookies-input')?.value.trim() || '';

    const hardware = {
      canvas: this.container.querySelector('#hw-canvas')?.value || 'Noise',
      clientrect: this.container.querySelector('#hw-clientrect')?.value || 'Noise',
      webglImg: this.container.querySelector('#hw-webgl-img')?.value || 'Noise',
      webglMeta: this.container.querySelector('#hw-webgl-meta')?.value || 'Masked',
      audio: this.container.querySelector('#hw-audio')?.value || 'Noise',
      font: this.container.querySelector('#hw-font')?.value || 'Masked',
      cpu: this.container.querySelector('#hw-cpu')?.value || '8',
      ram: this.container.querySelector('#hw-ram')?.value || '8GB',
      videoIn: this.container.querySelector('#hw-video-in')?.value || '-1',
      audioInOut: this.container.querySelector('#hw-audio-in-out')?.value || '-1'
    };

    const software = {
      os: this.selectedOs || 'Windows',
      userAgent: this.container.querySelector('#sw-user-agent')?.value.trim() || 'Auto',
      language: this.container.querySelector('#sw-language')?.value || 'Auto',
      timezone: this.container.querySelector('#sw-timezone')?.value || 'Auto',
      webrtc: this.container.querySelector('#sw-webrtc')?.value || 'BaseOnIp',
      geo: this.container.querySelector('#sw-geo')?.value || 'Prompt',
      screen: this.container.querySelector('#sw-screen')?.value || '-1x-1'
    };

    if (window.api && window.api.createProfile) {
      try {
        await window.api.createProfile({
          name,
          group,
          browserType: browserType || 'chrome',
          version: version || '151.0.7922.76',
          taskbarTitle,
          startUrl,
          bypassStaticFiles,
          proxy,
          proxyType,
          os: this.selectedOs || 'Windows',
          cookies,
          hardware,
          software
        });

        this.closeModal('modal-add-profile');
        this.onProfileCreated();
      } catch (err) {
        alert('Lỗi tạo profile: ' + err.message);
      }
    }
  }

  async handleBatchCreateProfile() {
    const count = parseInt(this.container.querySelector('#batch-create-count')?.value) || 1;
    const prefix = this.container.querySelector('#batch-create-prefix')?.value.trim() || 'New profile';
    const browserType = this.container.querySelector('#batch-browser-type')?.value || 'chrome';
    const version = this.container.querySelector('#batch-browser-version')?.value || '151.0.7922.76';
    const os = this.batchSelectedOs || 'Windows';
    const rawProxy = this.container.querySelector('#batch-create-proxy')?.value.trim() || '';
    const proxyLines = rawProxy ? rawProxy.split('\n').map(s => s.trim()).filter(Boolean) : [];

    if (window.api && window.api.batchCreateProfiles) {
      try {
        await window.api.batchCreateProfiles({
          count,
          namePrefix: prefix,
          browserType,
          version,
          os,
          proxyList: proxyLines
        });

        this.closeModal('modal-batch-create');
        const proxyTextarea = this.container.querySelector('#batch-create-proxy');
        if (proxyTextarea) proxyTextarea.value = '';
        this.onProfileCreated();
      } catch (err) {
        alert('Lỗi tạo hàng loạt profile: ' + err.message);
      }
    }
  }

  setHwid(hwid) {
    const input = this.container.querySelector('#modal-hwid-val');
    if (input) input.value = hwid;
  }

  setLicenseInfo(status) {
    this.currentLicenseStatus = status;
    const statusEl = this.container.querySelector('#info-status');
    const daysEl = this.container.querySelector('#info-days-left');
    const machinesEl = this.container.querySelector('#info-machines');
    const cardEl = this.container.querySelector('#license-info-card');
    const btnActivate = this.container.querySelector('#btn-submit-activate');
    const serverBadge = this.container.querySelector('#license-server-badge');
    const currentKeyBox = this.container.querySelector('#license-current-key-display');
    const labelKeyInput = this.container.querySelector('#label-license-input');
    const closeBtn = this.container.querySelector('#btn-close-license-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-license-modal');

    // Kiểm tra xem đã kích hoạt hợp lệ và chưa hết hạn hay chưa
    const isOk = !!(status && status.isActivated && !status.isExpired);
    if (closeBtn) closeBtn.style.display = isOk ? '' : 'none';
    if (cancelBtn) cancelBtn.style.display = isOk ? '' : 'none';

    if (serverBadge) {
      serverBadge.style.display = 'none';
      serverBadge.innerHTML = '';
    }

    if (!statusEl || !daysEl || !machinesEl) return;

    if (status && status.isActivated && !status.isExpired) {
      statusEl.innerHTML = '<span style="color: #10b981; font-weight: 700;">● Đã Kích Hoạt</span>';
      daysEl.innerText = status.daysLeft || 'Không giới hạn';
      machinesEl.innerText = `${status.activeMachinesCount || 1} / ${status.maxMachines || 1} máy`;
      if (btnActivate) btnActivate.innerText = '🔄 Đổi Mã Bản Quyền';
      if (labelKeyInput) labelKeyInput.innerText = 'Nhập hoặc dán mã License Key mới để đổi mã:';
      if (currentKeyBox) {
        currentKeyBox.style.display = 'block';
        currentKeyBox.innerText = `Key hiện tại: ${status.key || 'Đang hoạt động'}`;
      }
      if (cardEl) {
        cardEl.style.background = '#ecfdf5';
        cardEl.style.borderColor = '#a7f3d0';
      }
    } else if (status && status.isExpired) {
      statusEl.innerHTML = '<span style="color: #ef4444; font-weight: 700;">● ĐÃ HẾT HẠN (Vui lòng đổi Key mới)</span>';
      daysEl.innerText = '0 ngày (Đã hết hạn)';
      machinesEl.innerText = `${status.activeMachinesCount || 1} / ${status.maxMachines || 1} máy`;
      if (btnActivate) btnActivate.innerText = '🔄 Kích Hoạt / Đổi Mã Mới';
      if (labelKeyInput) labelKeyInput.innerText = 'Nhập License Key mới để kích hoạt:';
      if (currentKeyBox) currentKeyBox.style.display = 'none';
      if (cardEl) {
        cardEl.style.background = '#fef2f2';
        cardEl.style.borderColor = '#fecaca';
      }
    } else {
      statusEl.innerHTML = '<span style="color: #ef4444; font-weight: 700;">● Chưa Kích Hoạt (Cần nhập Key)</span>';
      daysEl.innerText = '0 ngày';
      machinesEl.innerText = '0 máy';
      if (btnActivate) btnActivate.innerText = 'Kích Hoạt Ngay';
      if (labelKeyInput) labelKeyInput.innerText = 'Nhập License Key kích hoạt:';
      if (currentKeyBox) currentKeyBox.style.display = 'none';
      if (cardEl) {
        cardEl.style.background = '#fef2f2';
        cardEl.style.borderColor = '#fecaca';
      }
    }
  }

  openModal(id, defaultCount = 1) {
    const modal = this.container.querySelector(`#${id}`);
    if (modal) {
      if (id === 'modal-add-profile') {
        const nameInput = this.container.querySelector('#add-profile-name');
        if (nameInput) {
          nameInput.value = `Profile ${Math.floor(1000 + Math.random() * 9000)}`;
        }
        this.updateSummary();
      } else if (id === 'modal-batch-create') {
        const countInput = this.container.querySelector('#batch-create-count');
        if (countInput) countInput.value = defaultCount || 1;
      } else if (id === 'modal-license') {
        const keyInput = this.container.querySelector('#input-license-key');
        if (keyInput) {
          setTimeout(() => {
            keyInput.focus();
            keyInput.select();
          }, 150);
        }
        // Đảm bảo nút đóng bị ẩn nếu chưa kích hoạt
        const isOk = !!(this.currentLicenseStatus && this.currentLicenseStatus.isActivated && !this.currentLicenseStatus.isExpired);
        const closeBtn = this.container.querySelector('#btn-close-license-modal');
        const cancelBtn = this.container.querySelector('#btn-cancel-license-modal');
        if (closeBtn) closeBtn.style.display = isOk ? '' : 'none';
        if (cancelBtn) cancelBtn.style.display = isOk ? '' : 'none';
      }
      modal.classList.add('active');
    }
  }

  closeModal(id) {
    if (id === 'modal-license') {
      // KHÔNG THỂ ĐÓNG BẢNG NẾU CHƯA KÍCH HOẠT HỢP LỆ HOẶC ĐÃ HẾT HẠN
      if (!this.currentLicenseStatus || !this.currentLicenseStatus.isActivated || this.currentLicenseStatus.isExpired) {
        return;
      }
    }
    const modal = this.container.querySelector(`#${id}`);
    if (modal) modal.classList.remove('active');
  }

  // =========================================================================
  // METHODS: CẬP NHẬT PROFILE (Ảnh 2)
  // =========================================================================
  openEditProfile(profile) {
    this.editingProfile = profile;
    if (!profile) return;

    // Chuyển về Tab Thao tác nhanh
    this.editActiveTab = 'edit-quick';
    const editTabBtns = this.container.querySelectorAll('.modal-edit-tab-btn');
    editTabBtns.forEach(b => {
      if (b.getAttribute('data-tab') === 'edit-quick') b.classList.add('active');
      else b.classList.remove('active');
    });
    const panes = this.container.querySelectorAll('.edit-tab-pane');
    panes.forEach(p => p.style.display = 'none');
    const quickPane = this.container.querySelector('#pane-edit-quick');
    if (quickPane) quickPane.style.display = 'block';

    // Top Bar
    const nameEl = this.container.querySelector('#edit-profile-name');
    if (nameEl) nameEl.value = profile.name || '';

    const groupEl = this.container.querySelector('#edit-profile-group');
    if (groupEl) groupEl.value = profile.group || 'Default group';

    // Quick Tab
    const browserCore = `${profile.browserType || 'chrome'}|${profile.version || '151.0.7922.76'}`;
    const coreEl = this.container.querySelector('#edit-quick-browser-core');
    if (coreEl) {
      const exists = Array.from(coreEl.options).some(opt => opt.value === browserCore);
      if (exists) coreEl.value = browserCore;
      else if (coreEl.options.length > 0) coreEl.selectedIndex = 0;
    }

    const taskbarEl = this.container.querySelector('#edit-quick-taskbar-title');
    if (taskbarEl) taskbarEl.value = profile.taskbarTitle || '';

    const startUrlEl = this.container.querySelector('#edit-quick-start-url');
    if (startUrlEl) startUrlEl.value = profile.startUrl || '';

    const staticFilesEl = this.container.querySelector('#edit-quick-static-files');
    if (staticFilesEl) staticFilesEl.value = profile.bypassStaticFiles || '';

    const proxyTypeEl = this.container.querySelector('#edit-quick-proxy-type');
    const proxyInputContainer = this.container.querySelector('#edit-quick-proxy-input-container');
    const proxyAddrEl = this.container.querySelector('#edit-quick-proxy-address');
    const checkProxyRes = this.container.querySelector('#edit-check-proxy-result');
    if (checkProxyRes) checkProxyRes.textContent = '';

    const pType = profile.proxyType || (profile.proxy && profile.proxy !== 'No Proxy' ? 'HTTP' : 'None');
    if (proxyTypeEl) proxyTypeEl.value = pType;
    if (proxyInputContainer) {
      proxyInputContainer.style.display = (pType === 'None') ? 'none' : 'block';
    }
    if (proxyAddrEl) {
      proxyAddrEl.value = (profile.proxy && profile.proxy !== 'No Proxy') ? profile.proxy : '';
    }

    // Connection Tab
    const connTypeEl = this.container.querySelector('#edit-conn-proxy-type');
    const connHostEl = this.container.querySelector('#edit-conn-proxy-host');
    const connPortEl = this.container.querySelector('#edit-conn-proxy-port');
    const connUserEl = this.container.querySelector('#edit-conn-proxy-user');
    const connPassEl = this.container.querySelector('#edit-conn-proxy-pass');
    if (connTypeEl) connTypeEl.value = pType;
    if (profile.proxy && profile.proxy !== 'No Proxy') {
      const parts = profile.proxy.split(':');
      if (connHostEl) connHostEl.value = parts[0] || '';
      if (connPortEl) connPortEl.value = parts[1] || '';
      if (connUserEl) connUserEl.value = parts[2] || '';
      if (connPassEl) connPassEl.value = parts[3] || '';
    } else {
      if (connHostEl) connHostEl.value = '';
      if (connPortEl) connPortEl.value = '';
      if (connUserEl) connUserEl.value = '';
      if (connPassEl) connPassEl.value = '';
    }

    // Hardware
    const hw = profile.hardware || {};
    const setSelect = (id, val) => {
      const el = this.container.querySelector(id);
      if (el && val !== undefined) el.value = val;
    };
    setSelect('#edit-hw-canvas', hw.canvas || 'Noise');
    setSelect('#edit-hw-clientrect', hw.clientrect || 'Noise');
    setSelect('#edit-hw-webgl-img', hw.webglImg || 'Noise');
    setSelect('#edit-hw-webgl-meta', hw.webglMeta || 'Masked');
    setSelect('#edit-hw-audio', hw.audio || 'Noise');
    setSelect('#edit-hw-font', hw.font || 'Masked');
    setSelect('#edit-hw-cpu', hw.cpu || '8');
    setSelect('#edit-hw-ram', hw.ram || '8GB');
    setSelect('#edit-hw-video-in', hw.videoIn || '-1');
    setSelect('#edit-hw-audio-in-out', hw.audioInOut || '-1');

    // Software
    const sw = profile.software || {};
    this.editSelectedOs = sw.os || profile.os || 'Windows';
    this.container.querySelectorAll('.edit-os-btn').forEach(btn => {
      if (btn.getAttribute('data-os') === this.editSelectedOs) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    setSelect('#edit-sw-user-agent', sw.userAgent || profile.userAgent || 'Auto');
    setSelect('#edit-sw-language', sw.language || 'Auto');
    setSelect('#edit-sw-timezone', sw.timezone || 'Auto');
    setSelect('#edit-sw-webrtc', sw.webrtc || 'BaseOnIp');
    setSelect('#edit-sw-geo', sw.geo || 'Prompt');
    setSelect('#edit-sw-screen', sw.screen || '-1x-1');

    this.updateEditSummary();
    this.openModal('modal-edit-profile');
  }

  updateEditSummary() {
    const coreVal = this.container.querySelector('#edit-quick-browser-core')?.value || 'chrome|151.0.7922.76';
    const [, version] = coreVal.split('|');
    const major = (version || '151').split('.')[0];

    const taskbar = this.container.querySelector('#edit-quick-taskbar-title')?.value.trim() || '';
    const proxyType = this.container.querySelector('#edit-quick-proxy-type')?.value || 'None';
    const proxyAddr = this.container.querySelector('#edit-quick-proxy-address')?.value.trim() || '';
    const staticFiles = this.container.querySelector('#edit-quick-static-files')?.value.trim() || '';

    const lang = this.container.querySelector('#edit-sw-language')?.value || 'Auto';
    const tz = this.container.querySelector('#edit-sw-timezone')?.value || 'Auto';
    const webrtc = this.container.querySelector('#edit-sw-webrtc')?.value || 'BaseOnIp';
    const geo = this.container.querySelector('#edit-sw-geo')?.value || 'Prompt';
    const screen = this.container.querySelector('#edit-sw-screen')?.value || '-1x-1';

    const canvas = this.container.querySelector('#edit-hw-canvas')?.value || 'Noise';
    const clientrect = this.container.querySelector('#edit-hw-clientrect')?.value || 'Noise';
    const webglImg = this.container.querySelector('#edit-hw-webgl-img')?.value || 'Noise';
    const webglMeta = this.container.querySelector('#edit-hw-webgl-meta')?.value || 'Masked';
    const audio = this.container.querySelector('#edit-hw-audio')?.value || 'Noise';
    const font = this.container.querySelector('#edit-hw-font')?.value || 'Masked';
    const videoIn = this.container.querySelector('#edit-hw-video-in')?.value || '-1';
    const audioInOut = this.container.querySelector('#edit-hw-audio-in-out')?.value || '-1';
    const cpu = this.container.querySelector('#edit-hw-cpu')?.value || '8';
    const ram = this.container.querySelector('#edit-hw-ram')?.value || '8GB';

    const setText = (id, text) => {
      const el = this.container.querySelector(id);
      if (el) el.textContent = text;
    };

    setText('#edit-sum-browser', `Chrome - ${major}`);
    setText('#edit-sum-os', this.editSelectedOs || 'Windows');
    setText('#edit-sum-taskbar', taskbar || '');
    setText('#edit-sum-ua', 'Auto');
    setText('#edit-sum-proxy', proxyType === 'None' ? 'None' : (proxyAddr || proxyType));
    setText('#edit-sum-static-files', staticFiles || '');
    setText('#edit-sum-lang', lang);
    setText('#edit-sum-timezone', tz.includes('/') ? tz.split('/')[1] : tz);
    setText('#edit-sum-webrtc', webrtc);
    setText('#edit-sum-geo', geo);
    setText('#edit-sum-screen', screen);
    setText('#edit-sum-canvas', canvas);
    setText('#edit-sum-clientrect', clientrect);
    setText('#edit-sum-webgl-img', webglImg);
    setText('#edit-sum-webgl-meta', webglMeta);
    setText('#edit-sum-audio', audio);
    setText('#edit-sum-font', font);
    setText('#edit-sum-video-in', videoIn);
    setText('#edit-sum-audio-in', audioInOut);
    setText('#edit-sum-audio-out', audioInOut);
    setText('#edit-sum-hardware', `${cpu} cores, ${ram}`);
  }

  randomizeEditParameters() {
    const cpuOptions = ['4', '6', '8', '12', '16'];
    const randomCpu = cpuOptions[Math.floor(Math.random() * cpuOptions.length)];
    const cpuSelect = this.container.querySelector('#edit-hw-cpu');
    if (cpuSelect) cpuSelect.value = randomCpu;

    const ramOptions = ['4GB', '8GB', '16GB', '32GB'];
    const randomRam = ramOptions[Math.floor(Math.random() * ramOptions.length)];
    const ramSelect = this.container.querySelector('#edit-hw-ram');
    if (ramSelect) ramSelect.value = randomRam;

    const screenOptions = ['-1x-1', '1920x1080', '1366x768', '1440x900', '1536x864'];
    const randomScreen = screenOptions[Math.floor(Math.random() * screenOptions.length)];
    const screenSelect = this.container.querySelector('#edit-sw-screen');
    if (screenSelect) screenSelect.value = randomScreen;

    this.updateEditSummary();
  }

  async testProxyEditQuick() {
    const proxyType = this.container.querySelector('#edit-quick-proxy-type')?.value;
    const proxyAddr = this.container.querySelector('#edit-quick-proxy-address')?.value.trim();
    const resEl = this.container.querySelector('#edit-check-proxy-result');

    if (proxyType === 'None' || !proxyAddr) {
      if (resEl) {
        resEl.style.color = '#10b981';
        resEl.textContent = '✓ Không dùng Proxy (Direct Connection)';
      }
      return;
    }

    if (resEl) {
      resEl.style.color = '#0284c7';
      resEl.textContent = 'Đang kiểm tra kết nối...';
    }

    try {
      const check = window.api?.testProxyString ? await window.api.testProxyString(proxyAddr, proxyType) : null;
      if (check && check.live) {
        if (resEl) {
          resEl.style.color = '#10b981';
          resEl.textContent = `✓ Kết nối tốt: IP ${check.ip} (${(check.country || 'US').toUpperCase()})`;
        }
      } else {
        if (resEl) {
          resEl.style.color = '#ef4444';
          resEl.textContent = `✕ Kết nối thất bại: ${check?.error || 'No connection'}`;
        }
      }
    } catch (e) {
      if (resEl) {
        resEl.style.color = '#ef4444';
        resEl.textContent = `✕ Lỗi: ${e.message}`;
      }
    }
  }

  async testProxyEditConn() {
    const host = this.container.querySelector('#edit-conn-proxy-host')?.value.trim();
    const port = this.container.querySelector('#edit-conn-proxy-port')?.value.trim();
    const user = this.container.querySelector('#edit-conn-proxy-user')?.value?.trim();
    const pass = this.container.querySelector('#edit-conn-proxy-pass')?.value?.trim();
    const pType = this.container.querySelector('#edit-conn-proxy-type')?.value || 'HTTP';
    const resEl = this.container.querySelector('#edit-conn-check-status');

    if (!host) {
      if (resEl) {
        resEl.style.color = '#ef4444';
        resEl.textContent = '✗ Vui lòng nhập Host/IP';
      }
      return;
    }

    if (resEl) {
      resEl.style.color = '#0284c7';
      resEl.textContent = 'Đang kiểm tra...';
    }

    const proxyStr = (user && pass) ? `${host}:${port || 80}:${user}:${pass}` : `${host}:${port || 80}`;
    try {
      const check = window.api?.testProxyString ? await window.api.testProxyString(proxyStr, pType) : null;
      if (check && check.live) {
        if (resEl) {
          resEl.style.color = '#10b981';
          resEl.textContent = `✓ Hoạt động: ${check.ip} (${(check.country || 'US').toUpperCase()})`;
        }
      } else {
        if (resEl) {
          resEl.style.color = '#ef4444';
          resEl.textContent = `✕ Thất bại: ${check?.error || 'No connection'}`;
        }
      }
    } catch (e) {
      if (resEl) {
        resEl.style.color = '#ef4444';
        resEl.textContent = `✕ Lỗi: ${e.message}`;
      }
    }
  }

  async handleUpdateProfile() {
    if (!this.editingProfile) return;

    const name = this.container.querySelector('#edit-profile-name')?.value.trim() || this.editingProfile.name;
    const group = this.container.querySelector('#edit-profile-group')?.value || 'Default group';
    
    const coreVal = this.container.querySelector('#edit-quick-browser-core')?.value || 'chrome|151.0.7922.76';
    const [browserType, version] = coreVal.split('|');

    const taskbarTitle = this.container.querySelector('#edit-quick-taskbar-title')?.value.trim() || '';
    const startUrl = this.container.querySelector('#edit-quick-start-url')?.value.trim() || '';
    const bypassStaticFiles = this.container.querySelector('#edit-quick-static-files')?.value.trim() || '';

    const proxyType = this.container.querySelector('#edit-quick-proxy-type')?.value || 'None';
    let proxy = 'No Proxy';
    if (proxyType !== 'None') {
      const raw = this.container.querySelector('#edit-quick-proxy-address')?.value.trim();
      if (raw) proxy = raw;
    }

    const hardware = {
      canvas: this.container.querySelector('#edit-hw-canvas')?.value || 'Noise',
      clientrect: this.container.querySelector('#edit-hw-clientrect')?.value || 'Noise',
      webglImg: this.container.querySelector('#edit-hw-webgl-img')?.value || 'Noise',
      webglMeta: this.container.querySelector('#edit-hw-webgl-meta')?.value || 'Masked',
      audio: this.container.querySelector('#edit-hw-audio')?.value || 'Noise',
      font: this.container.querySelector('#edit-hw-font')?.value || 'Masked',
      cpu: this.container.querySelector('#edit-hw-cpu')?.value || '8',
      ram: this.container.querySelector('#edit-hw-ram')?.value || '8GB',
      videoIn: this.container.querySelector('#edit-hw-video-in')?.value || '-1',
      audioInOut: this.container.querySelector('#edit-hw-audio-in-out')?.value || '-1'
    };

    const software = {
      os: this.editSelectedOs || 'Windows',
      userAgent: this.container.querySelector('#edit-sw-user-agent')?.value.trim() || 'Auto',
      language: this.container.querySelector('#edit-sw-language')?.value || 'Auto',
      timezone: this.container.querySelector('#edit-sw-timezone')?.value || 'Auto',
      webrtc: this.container.querySelector('#edit-sw-webrtc')?.value || 'BaseOnIp',
      geo: this.container.querySelector('#edit-sw-geo')?.value || 'Prompt',
      screen: this.container.querySelector('#edit-sw-screen')?.value || '-1x-1'
    };

    if (window.api && window.api.updateProfile) {
      try {
        await window.api.updateProfile(this.editingProfile.id, {
          name,
          group,
          browserType: browserType || 'chrome',
          version: version || '151.0.7922.76',
          taskbarTitle,
          startUrl,
          bypassStaticFiles,
          proxy,
          proxyType,
          os: this.editSelectedOs || 'Windows',
          hardware,
          software
        });

        this.closeModal('modal-edit-profile');
        this.onProfileCreated();
      } catch (err) {
        alert('Lỗi cập nhật profile: ' + err.message);
      }
    }
  }

  // =========================================================================
  // METHODS: NHÂN BẢN PROFILE (Ảnh 3)
  // =========================================================================
  openCloneModal(profile) {
    this.cloningProfile = profile;
    const countInput = this.container.querySelector('#clone-profile-count');
    const proxyTextarea = this.container.querySelector('#clone-profile-proxies');
    if (countInput) countInput.value = 1;
    if (proxyTextarea) proxyTextarea.value = '';
    this.openModal('modal-clone-profile');
  }

  async handleCloneProfile() {
    if (!this.cloningProfile) return;
    const count = parseInt(this.container.querySelector('#clone-profile-count')?.value, 10) || 1;
    const rawProxy = this.container.querySelector('#clone-profile-proxies')?.value.trim() || '';
    const proxyLines = rawProxy ? rawProxy.split('\n').map(s => s.trim()).filter(Boolean) : [];

    if (window.api && window.api.cloneProfile) {
      try {
        await window.api.cloneProfile(this.cloningProfile.id, {
          count,
          proxies: proxyLines
        });
        this.closeModal('modal-clone-profile');
        this.onProfileCreated();
      } catch (err) {
        alert('Lỗi nhân bản profile: ' + err.message);
      }
    }
  }

  // =========================================================================
  // METHODS: THAY ĐỔI MÀU SẮC (Ảnh 4 & 5)
  // =========================================================================
  openColorPicker(profile) {
    this.colorProfile = profile;
    const initialColor = profile.color || '#4F0606FF';
    const parsed = this.parseColorString(initialColor) || { h: 0, s: 0.92, v: 0.31, a: 1 };
    this.cpState = parsed;
    this.updateColorPickerUI();
    this.openModal('modal-color-picker');
  }

  bindColorPickerEvents() {
    const svBox = this.container.querySelector('#cp-sv-box');
    const hueSlider = this.container.querySelector('#cp-hue-slider');
    const alphaSlider = this.container.querySelector('#cp-alpha-slider');
    const hexInput = this.container.querySelector('#cp-hex-input');
    const opacityInput = this.container.querySelector('#cp-opacity-input');
    const btnReset = this.container.querySelector('#btn-reset-color');
    const btnApply = this.container.querySelector('#btn-apply-color');

    let draggingType = null;

    const updateFromMouseSV = (e) => {
      if (!svBox) return;
      const rect = svBox.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      this.cpState.s = Math.max(0, Math.min(1, x / rect.width));
      this.cpState.v = Math.max(0, Math.min(1, 1 - (y / rect.height)));
      this.updateColorPickerUI();
    };

    const updateFromMouseHue = (e) => {
      if (!hueSlider) return;
      const rect = hueSlider.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      this.cpState.h = Math.max(0, Math.min(360, (x / rect.width) * 360));
      this.updateColorPickerUI();
    };

    const updateFromMouseAlpha = (e) => {
      if (!alphaSlider) return;
      const rect = alphaSlider.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      this.cpState.a = Math.max(0, Math.min(1, x / rect.width));
      this.updateColorPickerUI();
    };

    svBox?.addEventListener('mousedown', (e) => {
      draggingType = 'sv';
      updateFromMouseSV(e);
    });

    hueSlider?.addEventListener('mousedown', (e) => {
      draggingType = 'hue';
      updateFromMouseHue(e);
    });

    alphaSlider?.addEventListener('mousedown', (e) => {
      draggingType = 'alpha';
      updateFromMouseAlpha(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (draggingType === 'sv') updateFromMouseSV(e);
      else if (draggingType === 'hue') updateFromMouseHue(e);
      else if (draggingType === 'alpha') updateFromMouseAlpha(e);
    });

    document.addEventListener('mouseup', () => {
      draggingType = null;
    });

    hexInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim().replace(/^#/, '');
      const parsed = this.parseColorString(val);
      if (parsed) {
        this.cpState.h = parsed.h;
        this.cpState.s = parsed.s;
        this.cpState.v = parsed.v;
        this.cpState.a = parsed.a;
        this.updateColorPickerUI({ skipHexInput: true });
      }
    });

    opacityInput?.addEventListener('change', (e) => {
      let val = parseInt(e.target.value.replace('%', ''), 10);
      if (isNaN(val)) val = 100;
      val = Math.max(0, Math.min(100, val));
      this.cpState.a = val / 100;
      this.updateColorPickerUI();
    });

    btnReset?.addEventListener('click', async () => {
      if (this.colorProfile && window.api && window.api.updateProfile) {
        await window.api.updateProfile(this.colorProfile.id, { color: '' });
        this.closeModal('modal-color-picker');
        this.onProfileCreated();
      }
    });

    btnApply?.addEventListener('click', async () => {
      if (this.colorProfile && window.api && window.api.updateProfile) {
        const rgb = this.hsvToRgb(this.cpState.h, this.cpState.s, this.cpState.v);
        const hex = '#' + this.rgbaToHex(rgb.r, rgb.g, rgb.b, this.cpState.a);
        await window.api.updateProfile(this.colorProfile.id, { color: hex });
        this.closeModal('modal-color-picker');
        this.onProfileCreated();
      }
    });
  }

  updateColorPickerUI(options = {}) {
    const { h, s, v, a } = this.cpState;
    const rgb = this.hsvToRgb(h, s, v);
    const hex8 = this.rgbaToHex(rgb.r, rgb.g, rgb.b, a);

    const svBox = this.container.querySelector('#cp-sv-box');
    const svHandle = this.container.querySelector('#cp-sv-handle');
    const hueThumb = this.container.querySelector('#cp-hue-thumb');
    const alphaThumb = this.container.querySelector('#cp-alpha-thumb');
    const alphaGradient = this.container.querySelector('#cp-alpha-gradient');
    const hexInput = this.container.querySelector('#cp-hex-input');
    const opacityInput = this.container.querySelector('#cp-opacity-input');
    const swatchBox = this.container.querySelector('#cp-swatch-box');

    if (svBox) svBox.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
    if (svHandle) {
      svHandle.style.left = `${s * 100}%`;
      svHandle.style.top = `${(1 - v) * 100}%`;
      svHandle.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }
    if (hueThumb) hueThumb.style.left = `${(h / 360) * 100}%`;
    if (alphaThumb) alphaThumb.style.left = `${a * 100}%`;
    if (alphaGradient) {
      alphaGradient.style.background = `linear-gradient(to right, transparent, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}))`;
    }
    if (hexInput && !options.skipHexInput) {
      hexInput.value = hex8;
    }
    if (opacityInput) {
      opacityInput.value = `${Math.round(a * 100)}%`;
    }
    if (swatchBox) {
      swatchBox.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
    }
  }

  hsvToRgb(h, s, v) {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h / 60) % 6;
    const f = (h / 60) - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s, v };
  }

  rgbaToHex(r, g, b, a = 1) {
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
    const alphaHex = toHex(Math.round(a * 255));
    return `${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
  }

  parseColorString(str) {
    if (!str) return null;
    let hex = str.trim().replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('') + 'FF';
    } else if (hex.length === 6) {
      hex = hex + 'FF';
    } else if (hex.length === 8) {
      // already 8 chars
    } else {
      return null;
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = parseInt(hex.substring(6, 8), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;

    const hsv = this.rgbToHsv(r, g, b);
    return { ...hsv, a };
  }

  // =========================================================================
  // METHODS: MỞ VỚI REMOTE PORT (Ảnh 2)
  // =========================================================================
  openRemotePortModal(profile) {
    this.remotePortProfile = profile;
    const input = this.container.querySelector('#remote-port-input');
    if (input) {
      // Sinh port ngẫu nhiên trong khoảng 1024 tới 65535 (chuẩn như ảnh ví dụ: 59542)
      const randomPort = Math.floor(10000 + Math.random() * 55000);
      input.value = randomPort;
    }
    this.openModal('modal-remote-port');
  }

  async handleLaunchRemotePort() {
    if (!this.remotePortProfile) return;
    const input = this.container.querySelector('#remote-port-input');
    const port = parseInt(input?.value, 10) || 59542;

    if (port < 1024 || port > 65535) {
      alert('Port không hợp lệ. Vui lòng nhập port trong khoảng từ 1024 tới 65535!');
      return;
    }

    const p = this.remotePortProfile;
    this.closeModal('modal-remote-port');

    if (window.api && window.api.launchProfile) {
      const res = await window.api.launchProfile(p.id, null, { customPort: port });
      if (res && res.success) {
        console.log(`Profile ${p.name} đang chạy với remote port: ${port}`);
      } else {
        alert('Lỗi khởi chạy profile: ' + (res.message || 'Không xác định'));
      }
    }
  }

  // =========================================================================
  // METHODS: TRÌNH QUẢN LÝ CẬP NHẬT (Chuẩn 100% Ảnh GPM của bạn)
  // =========================================================================
  async openUpdateManager() {
    this.openModal('modal-update-manager');
    this.initUpdateManagerEvents();
    await this.loadUpdateList();
  }

  initUpdateManagerEvents() {
    if (this._updateEventsInited) return;
    this._updateEventsInited = true;

    // Toggle form cấu hình Server Web
    const toggleBtn = this.container.querySelector('#btn-toggle-server-config');
    const configBox = this.container.querySelector('#box-server-config');
    toggleBtn?.addEventListener('click', () => {
      if (configBox) {
        configBox.style.display = configBox.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Nút Lưu & Quét Server Web
    this.container.querySelector('#btn-save-server-url')?.addEventListener('click', () => {
      const url = this.container.querySelector('#input-update-server-url')?.value.trim() || '';
      localStorage.setItem('gpm_update_server_url', url);
      this.loadUpdateList();
    });

    // Nút Refresh danh sách
    this.container.querySelector('#btn-refresh-update-list')?.addEventListener('click', () => {
      this.loadUpdateList();
    });

    // Lắng nghe tiến trình tải từ backend
    if (window.api && window.api.onDownloadProgress) {
      window.api.onDownloadProgress((msg) => {
        if (this._currentDownloadingBtn) {
          const match = msg.match(/(\d+[\d\.]*%|\d+[\d\.]*\s*M|\d+[\d\.]*\s*k)/i);
          if (match) {
            this._currentDownloadingBtn.innerText = `Đang tải ${match[0]}...`;
          } else if (msg.includes('giải nén')) {
            this._currentDownloadingBtn.innerText = `Đang giải nén...`;
          } else if (msg.includes('icon')) {
            this._currentDownloadingBtn.innerText = `Đang đổi icon...`;
          }
        }
      });
    }
  }

  async loadUpdateList() {
    const listEl = this.container.querySelector('#update-manager-list');
    if (!listEl) return;

    listEl.innerHTML = `
      <div style="text-align: center; color: #64748b; padding: 30px;">
        <div style="font-size: 20px; margin-bottom: 6px;">⏳</div>
        <div style="font-size: 13px;">Đang kiểm tra các bản phát hành từ server...</div>
      </div>
    `;

    const savedServerUrl = localStorage.getItem('gpm_update_server_url') || 'https://api-v2.kokenshop.site/api/v1/updates/cores';
    const inputUrl = this.container.querySelector('#input-update-server-url');
    if (inputUrl) inputUrl.value = savedServerUrl;

    try {
      if (!window.api || !window.api.fetchUpdateList) {
        listEl.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">API không khả dụng</div>`;
        return;
      }
      const data = await window.api.fetchUpdateList(savedServerUrl);
      this.renderUpdateItems(data);
    } catch (e) {
      listEl.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Lỗi tải danh sách: ${e.message}</div>`;
    }
  }

  renderUpdateItems(data) {
    const listEl = this.container.querySelector('#update-manager-list');
    if (!listEl) return;

    let html = '';

    // 1. Dòng GPM Login Global
    html += `
      <div class="update-manager-item">
        <div class="update-item-left">
          <div class="update-item-icon" style="background: #e0f2fe; color: #0284c7;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#0284c7"/>
              <path d="M8 17l4-10 4 10M9.5 13h5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <div style="display: flex; align-items: center;">
              <span class="update-item-title">SV Browser</span>
              <span class="update-item-version">⑂ ${data.appVersion || '5.0.8-stable'}</span>
            </div>
            <div class="update-item-desc">Manager application</div>
            <div style="display: flex; align-items: center; margin-top: 5px;">
              <span class="update-item-status-latest" style="margin-top: 0;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#16a34a"><circle cx="12" cy="12" r="10"/></svg>
                Phiên bản mới nhất
              </span>
              <button class="btn-repair-action" onclick="alert('Ứng dụng đang ở phiên bản mới nhất!')">Sửa chữa</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 2. Danh sách các Core
    const cores = (data && data.cores) || [];
    cores.forEach(core => {
      const isFirefox = core.type === 'firefox' || core.name.toLowerCase().includes('firefox');
      const iconBg = isFirefox ? '#450a0a' : '#0f172a';
      const iconSvg = isFirefox ? `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#ea580c"/>
          <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9a9 9 0 0 0-9-9zm4.5 12.5c-.8.8-1.9 1.3-3.1 1.3-2.4 0-4.4-2-4.4-4.4 0-1.4.7-2.7 1.8-3.5-.2.8 0 1.6.4 2.2.4.6 1.1 1 1.8 1 .4 0 .8-.1 1.1-.3-.2-.5-.1-1.1.2-1.5.3-.4.8-.7 1.3-.8-.3.7-.1 1.5.3 2 .4.6 1.1.9 1.8.9.3 0 .7-.1 1-.3-.3.8-.7 1.5-1.2 2.1l-.2.3z" fill="#ffffff"/>
        </svg>
      ` : `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#1e293b"/>
          <circle cx="12" cy="12" r="4.2" fill="#38bdf8"/>
          <path d="M12 2a10 10 0 0 1 8.66 5l-4.33 7.5A5 5 0 0 0 12 7V2z" fill="#ef4444"/>
          <path d="M20.66 7a10 10 0 0 1 0 10H12l4.33-7.5a5 5 0 0 0 4.33-2.5z" fill="#eab308"/>
          <path d="M12 17a5 5 0 0 0-4.33-2.5L3.34 7A10 10 0 0 1 12 22v-5z" fill="#22c55e"/>
        </svg>
      `;

      html += `
        <div class="update-manager-item" data-core-id="${core.id}">
          <div class="update-item-left">
            <div class="update-item-icon" style="background: ${iconBg};">
              ${iconSvg}
            </div>
            <div>
              <div style="display: flex; align-items: center;">
                <span class="update-item-title">${core.name}</span>
                <span class="update-item-version">⑂ ${core.version || '1.0.0'}</span>
              </div>
              <div class="update-item-desc">${core.description || `Antidetect browser based on ${core.name}`}</div>
              ${core.isInstalled ? `
                <div style="display: flex; align-items: center; margin-top: 5px;">
                  <span class="update-item-status-latest" style="margin-top: 0;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#16a34a"><circle cx="12" cy="12" r="10"/></svg>
                    Phiên bản mới nhất
                  </span>
                  <button class="btn-repair-action btn-core-action" data-action="repair" data-url="${core.downloadUrl || ''}" data-name="${core.name}">Sửa chữa</button>
                </div>
              ` : ''}
            </div>
          </div>
          <div>
            ${!core.isInstalled ? `
              <button class="btn-update-action btn-core-action" data-action="download" data-url="${core.downloadUrl || ''}" data-name="${core.name}">
                Cập nhật
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;

    // Gắn sự kiện click cho các nút Cập nhật & Sửa chữa
    listEl.querySelectorAll('.btn-core-action').forEach(btn => {
      btn.addEventListener('click', async () => {
        let downloadUrl = btn.getAttribute('data-url');
        const coreName = btn.getAttribute('data-name');

        if (!downloadUrl) {
          downloadUrl = prompt(`Nhập link tải (downloadUrl của chrome.7z) cho ${coreName}:`, 'https://github.com/Hibbiki/chromium-win64/releases/download/v153.0.8010.37-r1681091/chrome.7z');
          if (!downloadUrl) return;
        }

        this._currentDownloadingBtn = btn;
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Đang tải...';

        try {
          const res = await window.api.downloadCore(downloadUrl, coreName);
          if (res && res.success) {
            btn.innerText = '✓ Hoàn tất!';
            setTimeout(() => {
              this.loadUpdateList();
              this.loadAvailableCores();
            }, 1000);
          } else {
            alert('Tải thất bại: ' + (res.message || 'Lỗi không xác định'));
            btn.disabled = false;
            btn.innerText = originalText;
          }
        } catch (err) {
          alert('Lỗi khi tải Core: ' + err.message);
          btn.disabled = false;
          btn.innerText = originalText;
        } finally {
          this._currentDownloadingBtn = null;
        }
      });
    });
  }

  openConfirmDeleteModal({ count = 1, profileName = '', onConfirm }) {
    const modal = this.container.querySelector('#modal-confirm-delete');
    if (!modal) return;
    const chk = modal.querySelector('#confirm-delete-permanent-checkbox');
    const msg = modal.querySelector('#confirm-delete-message');
    if (chk) chk.checked = false;
    if (msg) {
      if (count > 1) {
        msg.textContent = `Xác nhận xóa ${count} profile? Mặc định các profile bị xóa sẽ được lưu trữ trong thùng rác`;
      } else if (profileName) {
        msg.textContent = `Xác nhận xóa profile "${profileName}"? Mặc định các profile bị xóa sẽ được lưu trữ trong thùng rác`;
      } else {
        msg.textContent = `Xác nhận xóa profile? Mặc định các profile bị xóa sẽ được lưu trữ trong thùng rác`;
      }
    }

    const btnOk = modal.querySelector('#btn-confirm-delete-ok');
    const btnCancel = modal.querySelector('#btn-confirm-delete-cancel');

    const handleClose = () => {
      modal.style.display = 'none';
      modal.classList.remove('active');
    };

    const handleOk = () => {
      const isPermanent = chk ? chk.checked : false;
      handleClose();
      if (typeof onConfirm === 'function') {
        onConfirm({ permanent: isPermanent });
      }
    };

    btnOk.onclick = handleOk;
    btnCancel.onclick = handleClose;
    modal.onclick = (e) => {
      if (e.target === modal) handleClose();
    };

    modal.style.display = 'flex';
    modal.classList.add('active');
  }

  openAddProxyModal(onAdded) {
    const modal = this.container.querySelector('#modal-add-proxy');
    if (!modal) return;

    const textarea = modal.querySelector('#add-proxy-text-input');
    const typeSelect = modal.querySelector('#add-proxy-type-select');
    const tagsInput = modal.querySelector('#add-proxy-tags-input');
    const noteInput = modal.querySelector('#add-proxy-note-input');
    const btnSubmit = modal.querySelector('#btn-submit-add-proxy');
    const btnCancel = modal.querySelector('#btn-cancel-add-proxy');
    const btnClose = modal.querySelector('#btn-close-add-proxy');

    if (textarea) textarea.value = '';
    if (tagsInput) tagsInput.value = '';
    if (noteInput) noteInput.value = '';

    const handleClose = () => {
      modal.style.display = 'none';
      modal.classList.remove('active');
    };

    const handleSubmit = async () => {
      const text = textarea ? textarea.value.trim() : '';
      if (!text) {
        alert('Vui lòng nhập ít nhất 1 dòng proxy!');
        return;
      }
      const type = typeSelect ? typeSelect.value : 'HTTP';
      const tags = tagsInput ? tagsInput.value.split(',').map(s => s.trim()).filter(Boolean) : [];
      const note = noteInput ? noteInput.value.trim() : '';

      try {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Đang thêm...';
        if (window.api && window.api.addMultipleProxies) {
          const res = await window.api.addMultipleProxies(text, type, tags, note);
          handleClose();
          if (window.showGlobalToast) {
            window.showGlobalToast(`✔ Đã thêm thành công ${res.length || 0} proxy!`);
          }
          if (typeof onAdded === 'function') {
            onAdded(res);
          }
        }
      } catch (err) {
        alert('Lỗi thêm proxy: ' + err.message);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = '+ Thêm mới';
      }
    };

    btnSubmit.onclick = handleSubmit;
    btnCancel.onclick = handleClose;
    btnClose.onclick = handleClose;
    modal.onclick = (e) => {
      if (e.target === modal) handleClose();
    };

    modal.style.display = 'flex';
    modal.classList.add('active');
    setTimeout(() => textarea?.focus(), 50);
  }

  openStorageSetupModal(defaultPath, callback) {
    this.onStorageConfiguredCallback = callback;
    const input = this.container?.querySelector('#input-setup-storage-path');
    if (input) {
      input.value = defaultPath || 'D:\\SVBrowserProfiles';
    }
    const modal = this.container?.querySelector('#modal-storage-setup');
    if (modal) {
      modal.classList.add('active');
    }
  }
}

