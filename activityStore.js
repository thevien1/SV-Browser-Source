const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

class ActivityStore {
  constructor(dataDir, limit = 10000) {
    this.file = path.join(dataDir, 'profile-history.json');
    this.limit = limit;
    this.sessions = new Map();
    this.rows = [];
    fs.mkdirSync(dataDir, { recursive: true });
    if (fs.existsSync(this.file)) {
      // Preserve a damaged file and report the error rather than replacing it.
      const rows = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (!Array.isArray(rows)) throw Error('Invalid profile history');
      this.rows = rows.slice(-limit);
      let changed = false;
      for (const row of this.rows) if (row.status === 'running') { row.status = 'interrupted'; changed = true; }
      if (changed) this.save();
    }
  }
  save() {
    fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.rows), 'utf8');
    fs.renameSync(this.file + '.tmp', this.file);
  }
  opened(data) {
    if (this.sessions.has(data.profileId)) return;
    const row = { ...data, id: randomUUID(), openedAt: Date.now(), closedAt: null, durationMs: null, status: 'running' };
    this.rows.push(row);
    this.sessions.set(data.profileId, row.id);
    if (this.rows.length > this.limit) this.rows = this.rows.slice(-this.limit);
    this.save();
  }
  closed(profileId, error = '') {
    const id = this.sessions.get(profileId);
    const row = this.rows.find(r => r.id === id);
    this.sessions.delete(profileId);
    if (!row) return;
    row.closedAt = Date.now();
    row.durationMs = Math.max(0, row.closedAt - row.openedAt);
    row.status = error ? 'error' : 'closed';
    if (error) row.error = String(error).slice(0, 500);
    this.save();
  }
  list({ search = '', status = '', from = '', page = 1, pageSize = 50 } = {}) {
    const query = String(search).trim().toLocaleLowerCase();
    const after = from ? Date.parse(from) : 0;
    const rows = this.rows.filter(r => (!status || r.status === status) && (!after || r.openedAt >= after) &&
      (!query || `${r.profileName} ${r.profileId}`.toLocaleLowerCase().includes(query))).slice().reverse();
    const size = Math.min(200, Math.max(1, Number(pageSize) || 50));
    const totalPages = Math.max(1, Math.ceil(rows.length / size));
    const current = Math.min(totalPages, Math.max(1, Number(page) || 1));
    const summary = { total: rows.length, running: 0, closed: 0, error: 0, interrupted: 0 };
    for (const r of rows) summary[r.status]++;
    return { rows: rows.slice((current - 1) * size, current * size), total: rows.length, page: current, totalPages, summary };
  }
}
module.exports = ActivityStore;
