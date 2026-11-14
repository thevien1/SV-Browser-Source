const OFFLINE_GRACE_MS = 60_000;
function serverDecision(response) {
  const body = response.data || {};
  const data = { ...body, ...(body.data && typeof body.data === 'object' ? body.data : {}) };
  const license = data.license || {};
  const statuses = [data.status, data.licenseStatus, data.code, data.error?.code, license.status].filter(v => typeof v === 'string')
    .map(v => v.trim().toUpperCase().replace(/[ -]/g, '_'));
  const denied = statuses.some(s => /^(?:KEY_|LICENSE_)?(?:SUSPENDED|PAUSED|BLOCKED|REVOKED|BANNED|DISABLED|INACTIVE|DEACTIVATED|EXPIRED|DELETED|INVALID|NOT_FOUND)$/.test(s)) ||
    data.isBlocked === true || data.isSuspended === true || data.isActive === false ||
    license.isBlocked === true || license.isSuspended === true || license.isActive === false ||
    ((data.valid === false || [401, 403].includes(response.status)) && (!response.status || response.status < 500));
  if (denied) return { valid: false, data, message: data.message || license.message || 'Key đã bị tạm khóa, thu hồi hoặc không còn hợp lệ trên máy chủ.' };
  if (response.ok && data.valid === true) return { valid: true, data };
  return { valid: null, data };
}
module.exports = { serverDecision, OFFLINE_GRACE_MS };
