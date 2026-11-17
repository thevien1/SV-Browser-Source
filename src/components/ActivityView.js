const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${{
  history: '<path d="M3 11a9 9 0 1 1 3 7M3 4v7h7"/><path d="M12 7v5l3 2"/>',
  play: '<path d="m9 5 11 7-11 7z"/>', check: '<path d="m5 12 4 4L19 6"/>',
  alert: '<path d="m12 3 10 18H2z"/><path d="M12 9v4m0 4h.01"/>',
  refresh: '<path d="M20 7V3l-4 4a8 8 0 1 0 3 10M20 3h-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'
}[name] || ''}</svg>`;

export class ActivityView {
  constructor(container) { this.container = container; this.page = 1; this.request = 0; }
  hide() { clearInterval(this.timer); clearTimeout(this.debounce); this.request++; this.active = null; }
  async show() {
    this.hide();
    const active = this.active = {};
    this.container.style.display = 'flex';
    this.container.scrollTop = 0;
    this.container.innerHTML = `<section class="activity-page">
      <header class="activity-hero"><div class="activity-hero-icon">${icon('history', 30)}</div><div><span class="page-eyebrow">WORKSPACE INSIGHTS</span><h1>Nhật ký hoạt động</h1><p>Mỗi lần mở profile, một dấu mốc được lưu lại.</p></div><button class="activity-refresh" id="history-refresh">${icon('refresh', 16)} Làm mới</button></header>
      <div class="activity-stats" id="history-stats"></div>
      <div class="activity-panel"><div class="activity-panel-heading"><div><h2>Lịch sử mở profile</h2><p>Lưu trên máy này, kể cả sau khi khởi động lại ứng dụng.</p></div><span class="activity-live"><i></i> Tự làm mới 30 giây</span></div>
      <div class="activity-filters"><label class="activity-search">${icon('search', 18)}<input id="history-search" placeholder="Tìm tên hoặc ID profile…" aria-label="Tìm profile"></label><select id="history-status" aria-label="Trạng thái"><option value="">Tất cả trạng thái</option value="running">Đang chạy</option><option value="closed">Đã đóng</option><option value="error">Lỗi</option><option value="interrupted">Chưa ghi nhận đóng</option></select><select id="history-period" aria-label="Khoảng thời gian"><option value="">Toàn bộ thời gian</option><option value="1">24 giờ qua</option><option value="7">7 ngày qua</option><option value="30">30 ngày qua</option></select></div>
      <div class="activity-table-wrap"><table class="activity-table"><thead><tr><th>Profile</th><th>Mở lúc</th><th>Thời lượng</th><th>Trình duyệt</th><th>Nguồn</th><th>Trạng thái</th></tr></thead><tbody id="history-rows"></tbody></table><div id="history-empty" class="activity-empty" hidden></div></div>
      <footer class="activity-pagination"><span id="history-count"></span><div><button id="history-prev" aria-label="Trang trước">←</button><span id="history-page"></span><button id="history-next" aria-label="Trang sau">→</button></div></footer></div>
      <p class="activity-footnote">Lịch sử được ghi từ phiên bản này. Các lần mở trước đó không được tạo lại. Tối đa 10.000 phiên gần nhất.</p></section>`;
    this.container.querySelector('#history-refresh').onclick = () => this.load();
    this.container.querySelector('#history-search').oninput = () => { clearTimeout(this.debounce); this.debounce = setTimeout(() => { this.page = 1; this.load(); }, 200); };
    for (const id of ['history-status', 'history-period']) this.container.querySelector('#' + id).onchange = () => { this.page = 1; this.load(); };
    this.container.querySelector('#history-prev').onclick = () => { if (this.page > 1) { this.page--; this.load(); } };
    this.container.querySelector('#history-next').onclick = () => { this.page++; this.load(); };
    await this.load();
    if (this.active === active) this.timer = setInterval(() => this.load(), 30000);
  }
  async load() {
    const token = ++this.request;
    const $ = selector => this.container.querySelector(selector);
    if (!$('#history-rows')) return;
    try {
      const days = Number($('#history-period').value);
      const data = await window.api.getProfileHistory({ search: $('#history-search').value, status: $('#history-status').value,
        from: days ? new Date(Date.now() - days * 86400000).toISOString() : '', page: this.page });
      if (token !== this.request) return;
      this.page = data.page;
      const labels = { running: 'Đang chạy', closed: 'Đã đóng', error: 'Lỗi', interrupted: 'Chưa ghi nhận đóng' };
      $('#history-stats').innerHTML = [['Tổng phiên', data.summary.total, 'history', 'indigo'], ['Đang chạy', data.summary.running, 'play', 'emerald'], ['Đã đóng', data.summary.closed, 'check', 'blue'], ['Cần chú ý', data.summary.error + data.summary.interrupted, 'alert', 'amber']].map(([label, count, glyph, color]) => `<div class="activity-stat"><span class="activity-stat-icon ${color}">${icon(glyph, 22)}</span><div><span>${label}</span><strong>${count}</strong></div></div>`).join('');
      $('#history-rows').innerHTML = data.rows.map(row => {
        const elapsed = row.status === 'running' ? Date.now() - row.openedAt : row.durationMs;
        const seconds = Math.floor(Math.max(0, elapsed || 0) / 1000);
        const duration = elapsed == null ? '—' : seconds >= 3600 ? `${Math.floor(seconds / 3600)}g ${Math.floor(seconds % 3600 / 60)}p` : seconds >= 60 ? `${Math.floor(seconds / 60)}p ${seconds % 60}s` : `${seconds}s`;
        return `<tr><td><div class="history-profile"><span class="history-avatar">${escape((row.profileName || 'P').slice(0, 1).toUpperCase())}</span><div><strong>${escape(row.profileName || row.profileId)}</strong><small>${escape(row.profileId)}</small></div></div></td><td>${escape(new Date(row.openedAt).toLocaleString('vi-VN'))}${row.closedAt ? `<small class="history-version">Đóng: ${escape(new Date(row.closedAt).toLocaleTimeString('vi-VN'))}</small>` : ''}</td><td>${duration}</td><td><span class="history-browser">${escape(row.browser || 'chrome')}</span><small class="history-version">${escape(row.version || '')}</small></td><td>${row.source === 'api' ? 'API / Automation' : 'Ứng dụng'}${row.headless ? '<small class="history-version">Headless</small>' : ''}</td><td><span class="history-status ${escape(row.status)}">${labels[row.status] || escape(row.status)}</span></td></tr>`;
      }).join('');
      $('#history-empty').hidden = Boolean(data.rows.length);
      $('#history-empty').innerHTML = `${icon('history', 38)}<h3>${data.total ? 'Không có kết quả phù hợp' : 'Chưa có phiên nào trong khoảng lọc'}</h3><p>Mở một profile để bắt đầu ghi lịch sử, hoặc thay đổi bộ lọc.</p>`;
      $('#history-count').textContent = `${data.total} phiên phù hợp`;
      $('#history-page').textContent = `${data.page} / ${data.totalPages}`;
      $('#history-prev').disabled = data.page <= 1;
      $('#history-next').disabled = data.page >= data.totalPages;
    } catch {
      if (token !== this.request) return;
      $('#history-empty').hidden = false;
      $('#history-empty').textContent = 'Không tải được lịch sử. Bấm Làm mới để thử lại.';
    }
  }
}
