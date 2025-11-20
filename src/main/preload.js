// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  scanFiles: (path) => ipcRenderer.invoke('files:scan', path),
  getFolderTree: (path) => ipcRenderer.invoke('files:getFolderTree', path),
  getSettings: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('file:rename', oldPath, newPath),
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
  copyFile: (filePath) => ipcRenderer.invoke('file:copy', filePath),
  cutFile: (filePath) => ipcRenderer.invoke('file:cut', filePath),
  pasteFile: (targetDir) => ipcRenderer.invoke('file:paste', targetDir),
  editFile: (filePath) => ipcRenderer.invoke('file:edit', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('file:showInFolder', filePath),
  copyPath: (filePath) => ipcRenderer.invoke('file:copyPath', filePath),
  getFileProperties: (filePath) => ipcRenderer.invoke('file:getProperties', filePath),
  
  // Enhanced features
  rotateImage: (filePath, angle) => ipcRenderer.invoke('file:rotate', filePath, angle),
  flipImage: (filePath, direction) => ipcRenderer.invoke('file:flip', filePath, direction),
  generateThumbnail: (filePath, size) => ipcRenderer.invoke('file:generateThumbnail', filePath, size),
  batchMoveFiles: (files, targetDir) => ipcRenderer.invoke('files:batchMove', files, targetDir),
  batchDeleteFiles: (files) => ipcRenderer.invoke('files:batchDelete', files),
  
  // Listen to events from main process
  onFolderSelected: (callback) => ipcRenderer.on('folder-selected', (event, path) => callback(path)),
  onViewChanged: (callback) => ipcRenderer.on('view-changed', (event, view) => callback(view)),
  onSortChanged: (callback) => ipcRenderer.on('sort-changed', (event, sortBy) => callback(sortBy)),
  onSettingChanged: (callback) => ipcRenderer.on('setting-changed', (event, data) => callback(data)),
  onThumbnailSizeChanged: (callback) => ipcRenderer.on('thumbnail-size-changed', (event, size) => callback(size)),
  onSettingsReset: (callback) => ipcRenderer.on('settings-reset', () => callback())
});