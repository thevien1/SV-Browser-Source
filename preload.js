const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximizeChanged: (callback) => {
    const handler = (event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window-maximize-changed', handler);
    return () => ipcRenderer.removeListener('window-maximize-changed', handler);
  },

  // License controls
  checkLicense: () => ipcRenderer.invoke('license:check'),
  getHWID: () => ipcRenderer.invoke('license:get-hwid'),
  activateLicense: (key) => ipcRenderer.invoke('license:activate', key),
  generateAdminKey: (options) => ipcRenderer.invoke('license:generate-admin-key', options),
  getLicenseHistory: () => ipcRenderer.invoke('license:get-history'),

  // Profile management
  getProfiles: () => ipcRenderer.invoke('profiles:get-all'),
  createProfile: (data) => ipcRenderer.invoke('profiles:create', data),
  batchCreateProfiles: (options) => ipcRenderer.invoke('profiles:batch-create', options),
  updateProfile: (id, data) => ipcRenderer.invoke('profiles:update', id, data),
  reorderProfiles: (orderedIds) => ipcRenderer.invoke('profiles:reorder', orderedIds),
  deleteProfile: (id, options) => ipcRenderer.invoke('profiles:delete', id, options),
  deleteMultipleProfiles: (ids, options) => ipcRenderer.invoke('profiles:delete-multiple', ids, options),
  cloneProfile: (id, options) => ipcRenderer.invoke('profiles:clone', id, options),
  openProfileFolder: (id) => ipcRenderer.invoke('profiles:open-folder', id),
  importCookie: (id, content) => ipcRenderer.invoke('profiles:import-cookie', id, content),
  selectCookieFile: () => ipcRenderer.invoke('dialog:select-cookie-file'),
  checkProxy: (id) => ipcRenderer.invoke('profiles:check-proxy', id),
  testProxyString: (proxyStr, proxyType) => ipcRenderer.invoke('proxy:test-string', proxyStr, proxyType),
  exportProfiles: (profileIds, targetDir, format) => ipcRenderer.invoke('profiles:export', profileIds, targetDir, format),
  onExportProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('profiles:export-progress', handler);
    return () => ipcRenderer.removeListener('profiles:export-progress', handler);
  },
  importProfiles: (options) => ipcRenderer.invoke('profiles:import', options),
  onImportProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('profiles:import-progress', handler);
    return () => ipcRenderer.removeListener('profiles:import-progress', handler);
  },
  exportCookies: (profileIds) => ipcRenderer.invoke('profiles:export-cookies', profileIds),
  randomizeFingerprint: (profileIds) => ipcRenderer.invoke('profiles:randomize-fingerprint', profileIds),
  clearCache: (id) => ipcRenderer.invoke('profiles:clear-cache', id),
  freeDiskSpace: (id) => ipcRenderer.invoke('profiles:free-disk-space', id),
  freeBulkDiskSpace: (ids) => ipcRenderer.invoke('profiles:free-bulk-disk-space', ids),

  // Trash (Thùng rác)
  getTrashProfiles: () => ipcRenderer.invoke('trash:get-all'),
  restoreProfiles: (ids) => ipcRenderer.invoke('trash:restore', ids),
  deleteTrashProfiles: (ids) => ipcRenderer.invoke('trash:delete', ids),
  emptyTrash: () => ipcRenderer.invoke('trash:empty'),

  // Proxy (Quản lý Proxy)
  getProxies: () => ipcRenderer.invoke('proxy:get-all'),
  addProxy: (data) => ipcRenderer.invoke('proxy:add', data),
  addMultipleProxies: (input, defaultType, tags, note) => ipcRenderer.invoke('proxy:add-multiple', input, defaultType, tags, note),
  updateProxy: (id, data) => ipcRenderer.invoke('proxy:update', id, data),
  deleteProxy: (id) => ipcRenderer.invoke('proxy:delete', id),
  deleteMultipleProxies: (ids) => ipcRenderer.invoke('proxy:delete-multiple', ids),
  checkProxyLive: (id) => ipcRenderer.invoke('proxy:check', id),

  // Groups
  getGroups: () => ipcRenderer.invoke('groups:get-all'),
  addGroup: (data) => ipcRenderer.invoke('groups:add', data),
  updateGroup: (id, data) => ipcRenderer.invoke('groups:update', id, data),
  deleteGroup: (id) => ipcRenderer.invoke('groups:delete', id),

  // Tags
  getTags: () => ipcRenderer.invoke('tags:get-all'),
  addTag: (data) => ipcRenderer.invoke('tags:add', data),
  deleteTag: (id) => ipcRenderer.invoke('tags:delete', id),

  // Extensions
  getExtensions: () => ipcRenderer.invoke('extensions:get-all'),
  addExtensionDialog: () => ipcRenderer.invoke('extensions:add-dialog'),
  addExtensionFolderDialog: () => ipcRenderer.invoke('extensions:add-folder-dialog'),
  addExtensionFromUrl: (urlOrId) => ipcRenderer.invoke('extensions:add-url', urlOrId),
  toggleExtension: (folderName, enabled) => ipcRenderer.invoke('extensions:toggle', folderName, enabled),
  deleteExtension: (folderName) => ipcRenderer.invoke('extensions:delete', folderName),
  openExtensionFolder: (folderName) => ipcRenderer.invoke('extensions:open-folder', folderName),

  // Browser launcher
  launchProfile: (profileId, profileIndex, options) => ipcRenderer.invoke('browser:launch', profileId, profileIndex, options),
  closeProfile: (profileId) => ipcRenderer.invoke('browser:close', profileId),

  isProfileRunning: (profileId) => ipcRenderer.invoke('browser:is-running', profileId),
  detectBrowsers: () => ipcRenderer.invoke('browser:detect'),
  getAvailableCores: () => ipcRenderer.invoke('browser:get-cores'),
  downloadCore: (url, name) => ipcRenderer.invoke('driver:download-core', url, name),
  fetchUpdateList: (serverUrl) => ipcRenderer.invoke('driver:get-update-list', serverUrl),
  onDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('driver:download-progress', handler);
    return () => ipcRenderer.removeListener('driver:download-progress', handler);
  },

  // Settings & System Dialogs
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (newSettings) => ipcRenderer.invoke('settings:update', newSettings),
  getAppInstallInfo: () => ipcRenderer.invoke('app:get-install-info'),
  openFolder: (dirPath) => ipcRenderer.invoke('system:open-folder', dirPath),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('dialog:select-directory', defaultPath),
  selectZipFile: () => ipcRenderer.invoke('dialog:select-zip-file'),
  getApiGatewayStatus: () => ipcRenderer.invoke('api-gateway:get-status'),
  restartApiGateway: (port, allowRemote) => ipcRenderer.invoke('api-gateway:restart', port, allowRemote),
  testApiGateway: () => ipcRenderer.invoke('api-gateway:test'),
  openExternal: (url) => ipcRenderer.invoke('api-gateway:open-external', url),

  // Automation & SV Browser Automate Editor
  checkAutomateInstalled: () => ipcRenderer.invoke('automation:check-installed'),
  launchAutomate: () => ipcRenderer.invoke('automation:launch'),
  openAutomateFolder: () => ipcRenderer.invoke('automation:open-folder'),
  setAutomatePath: (dirPath) => ipcRenderer.invoke('automation:set-path', dirPath),

  // Event listeners
  onProfileStatusChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('profile-status-changed', handler);
    return () => ipcRenderer.removeListener('profile-status-changed', handler);
  },
  onProfileIpUpdated: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('profile-ip-updated', handler);
    return () => ipcRenderer.removeListener('profile-ip-updated', handler);
  },
  onLicenseStatusChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('license:status-changed', handler);
    return () => ipcRenderer.removeListener('license:status-changed', handler);
  }
});
