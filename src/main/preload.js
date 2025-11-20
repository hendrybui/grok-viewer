// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  scanFiles: (path) => ipcRenderer.invoke('files:scan', path),
  getSettings: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('file:rename', oldPath, newPath),
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
  
  // Listen to events from main process
  onFolderSelected: (callback) => ipcRenderer.on('folder-selected', (event, path) => callback(path)),
  onViewChanged: (callback) => ipcRenderer.on('view-changed', (event, view) => callback(view)),
  onSortChanged: (callback) => ipcRenderer.on('sort-changed', (event, sortBy) => callback(sortBy)),
  onSettingChanged: (callback) => ipcRenderer.on('setting-changed', (event, data) => callback(data)),
  onThumbnailSizeChanged: (callback) => ipcRenderer.on('thumbnail-size-changed', (event, size) => callback(size)),
  onSettingsReset: (callback) => ipcRenderer.on('settings-reset', () => callback())
});