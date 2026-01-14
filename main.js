/* eslint-env node */
/* global require, __dirname, process, console */
/* eslint-disable no-inner-declarations */
// main.js
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const SettingsManager = require('./src/main/settings');
const AppUpdater = require('./src/main/updater');
const ExifHandler = require('./src/main/exif-handler');

// Suppress GPU cache errors for compatibility (GPU enabled for visual effects)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('no-sandbox');

const settings = new SettingsManager();
const exifHandler = new ExifHandler();
let appUpdater;

// Shared helpers
async function scanDirectoryRecursive(directory, allExtensions) {
  const mediaFiles = [];

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subDirFiles = await scanDirectoryRecursive(fullPath, allExtensions);
        mediaFiles.push(...subDirFiles);
      } else if (entry.isFile()) {
        // Check if file is a supported media file
        if (allExtensions.includes(path.extname(entry.name).toLowerCase())) {
          mediaFiles.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${directory}:`, err);
  }

  return mediaFiles;
}

async function buildFolderTree(dirPath, imageExtensions, videoExtensions, isRoot = false) {
  const folder = {
    name: isRoot ? path.basename(dirPath) : path.basename(dirPath),
    path: dirPath,
    children: [],
    imageCount: 0,
    videoCount: 0
  };

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    // Count media files in this directory
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (imageExtensions.includes(ext)) {
          folder.imageCount++;
        } else if (videoExtensions.includes(ext)) {
          folder.videoCount++;
        }
      }
    }

    // Build child folders
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childPath = path.join(dirPath, entry.name);
        const childFolder = await buildFolderTree(childPath, imageExtensions, videoExtensions, false);
        // Only include folders that have files (directly or in subfolders)
        const childTotal = childFolder.imageCount + childFolder.videoCount + (childFolder.totalImageCount || 0) + (childFolder.totalVideoCount || 0);
        if (childTotal > 0) {
          folder.children.push(childFolder);
        }
      }
    }

    // Calculate total counts including subfolders
    folder.totalImageCount = folder.imageCount + folder.children.reduce((sum, child) => sum + (child.totalImageCount || 0), 0);
    folder.totalVideoCount = folder.videoCount + folder.children.reduce((sum, child) => sum + (child.totalVideoCount || 0), 0);

  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);
  }

  return folder;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'src/main/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('src/renderer/index.html');
  
  // Initialize auto-updater
  appUpdater = new AppUpdater(mainWindow);
  
  // Create menu
  createMenu(mainWindow);
}

function createMenu(mainWindow) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({
              properties: ['openDirectory']
            });
            if (!canceled) {
              mainWindow.webContents.send('folder-selected', filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Grid View',
          type: 'radio',
          checked: settings.get('defaultView') === 'grid',
          click: () => {
            settings.set('defaultView', 'grid');
            mainWindow.webContents.send('view-changed', 'grid');
          }
        },
        {
          label: 'List View',
          type: 'radio',
          checked: settings.get('defaultView') === 'list',
          click: () => {
            settings.set('defaultView', 'list');
            mainWindow.webContents.send('view-changed', 'list');
          }
        },
        { type: 'separator' },
        {
          label: 'Sort by Name',
          type: 'radio',
          checked: settings.get('sortBy') === 'name',
          click: () => {
            settings.set('sortBy', 'name');
            mainWindow.webContents.send('sort-changed', 'name');
          }
        },
        {
          label: 'Sort by Date',
          type: 'radio',
          checked: settings.get('sortBy') === 'date',
          click: () => {
            settings.set('sortBy', 'date');
            mainWindow.webContents.send('sort-changed', 'date');
          }
        },
        {
          label: 'Sort by Size',
          type: 'radio',
          checked: settings.get('sortBy') === 'size',
          click: () => {
            settings.set('sortBy', 'size');
            mainWindow.webContents.send('sort-changed', 'size');
          }
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'reload' }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Auto-play Videos',
          type: 'checkbox',
          checked: settings.get('autoPlayVideos'),
          click: (menuItem) => {
            settings.set('autoPlayVideos', menuItem.checked);
            mainWindow.webContents.send('setting-changed', {
              key: 'autoPlayVideos',
              value: menuItem.checked
            });
          }
        },
        {
          label: 'Show File Names',
          type: 'checkbox',
          checked: settings.get('showFileNames'),
          click: (menuItem) => {
            settings.set('showFileNames', menuItem.checked);
            mainWindow.webContents.send('setting-changed', {
              key: 'showFileNames',
              value: menuItem.checked
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Thumbnail Size',
          submenu: [
            {
              label: 'Small',
              type: 'radio',
              checked: settings.get('thumbnailSize') === 'small',
              click: () => {
                settings.set('thumbnailSize', 'small');
                mainWindow.webContents.send('thumbnail-size-changed', 'small');
              }
            },
            {
              label: 'Medium',
              type: 'radio',
              checked: settings.get('thumbnailSize') === 'medium',
              click: () => {
                settings.set('thumbnailSize', 'medium');
                mainWindow.webContents.send('thumbnail-size-changed', 'medium');
              }
            },
            {
              label: 'Large',
              type: 'radio',
              checked: settings.get('thumbnailSize') === 'large',
              click: () => {
                settings.set('thumbnailSize', 'large');
                mainWindow.webContents.send('thumbnail-size-changed', 'large');
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Reset to Defaults',
          click: () => {
            settings.reset();
            mainWindow.webContents.send('settings-reset');
            app.relaunch();
            app.quit();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


// --- IPC HANDLERS (The Bridge) ---

// 1. Handle opening the folder dialog
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

// 2. Handle scanning the files (recursively)
ipcMain.handle('files:scan', async (event, dirPath) => {
  try {
    const userSettings = settings.getAll();
    const allExtensions = [
      ...userSettings.supportedFormats.images,
      ...userSettings.supportedFormats.videos
    ];
    return await scanDirectoryRecursive(dirPath, allExtensions);
  } catch (err) {
    console.error('Error reading directory:', err);
    return [];
  }
});

// 3. Handle getting settings
ipcMain.handle('settings:get', async (event, key) => {
  return key ? settings.get(key) : settings.getAll();
});

// 4. Handle setting a value
ipcMain.handle('settings:set', async (event, key, value) => {
  settings.set(key, value);
  return settings.get(key);
});

// 5. Handle resetting settings
ipcMain.handle('settings:reset', async () => {
  return settings.reset();
});

// 6. Handle file rename
ipcMain.handle('file:rename', async (event, oldPath, newPath) => {
  try {
    await fs.rename(oldPath, newPath);
    return { success: true, newPath };
  } catch (err) {
    console.error('Error renaming file:', err);
    return { success: false, error: err.message };
  }
});

// 7. Handle file delete
ipcMain.handle('file:delete', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (err) {
    console.error('Error deleting file:', err);
    return { success: false, error: err.message };
  }
});

// 8. Handle file operations
ipcMain.handle('file:copy', async (event, filePath) => {
  try {
    const { clipboard, nativeImage } = require('electron');
    const image = nativeImage.createFromPath(filePath);
    if (!image.isEmpty()) {
      clipboard.writeImage(image);
      return { success: true, message: 'Image copied to clipboard' };
    } else {
      // For videos or if image fails, copy file path
      clipboard.writeText(filePath);
      return { success: true, message: 'File path copied to clipboard' };
    }
  } catch (err) {
    console.error('Error copying file:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:cut', async (event, filePath) => {
  try {
    const { clipboard } = require('electron');
    clipboard.writeText(`cut:${filePath}`);
    return { success: true, message: 'File cut to clipboard' };
  } catch (err) {
    console.error('Error cutting file:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:paste', async (event, targetDir) => {
  try {
    const { clipboard } = require('electron');
    const clipText = clipboard.readText();
    
    if (clipText.startsWith('cut:')) {
      const sourcePath = clipText.substring(4);
      const fileName = path.basename(sourcePath);
      const targetPath = path.join(targetDir, fileName);
      
      await fs.rename(sourcePath, targetPath);
      return { success: true, message: 'File moved', path: targetPath };
    }
    
    return { success: false, error: 'No file to paste' };
  } catch (err) {
    console.error('Error pasting file:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:edit', async (event, filePath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    console.error('Error opening file:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:showInFolder', async (event, filePath) => {
  try {
    const { shell } = require('electron');
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    console.error('Error showing file in folder:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:copyPath', async (event, filePath) => {
  try {
    const { clipboard } = require('electron');
    clipboard.writeText(filePath);
    return { success: true, message: 'Path copied to clipboard' };
  } catch (err) {
    console.error('Error copying path:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:getProperties', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      success: true,
      properties: {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory()
      }
    };
  } catch (err) {
    console.error('Error getting file properties:', err);
    return { success: false, error: err.message };
  }
});

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 9. Handle getting folder tree structure
ipcMain.handle('files:getFolderTree', async (event, rootPath) => {
  try {
    const userSettings = settings.getAll();
    const imageExtensions = userSettings.supportedFormats.images;
    const videoExtensions = userSettings.supportedFormats.videos;

    return await buildFolderTree(rootPath, imageExtensions, videoExtensions, true);
  } catch (err) {
    console.error('Error building folder tree:', err);
    return null;
  }
});

// 10. Handle image rotation
ipcMain.handle('file:rotate', async (event, filePath, angle) => {
  try {
    const sharp = require('sharp');
    const buffer = await fs.readFile(filePath);
    const rotated = await sharp(buffer)
      .rotate(angle)
      .toBuffer();
    
    await fs.writeFile(filePath, rotated);
    return { success: true };
  } catch (err) {
    console.error('Error rotating image:', err);
    return { success: false, error: err.message };
  }
});

// 11. Handle image flip
ipcMain.handle('file:flip', async (event, filePath, direction) => {
  try {
    const sharp = require('sharp');
    const buffer = await fs.readFile(filePath);
    let transform = sharp(buffer);
    
    if (direction === 'horizontal') {
      transform = transform.flop();
    } else if (direction === 'vertical') {
      transform = transform.flip();
    }
    
    const flipped = await transform.toBuffer();
    await fs.writeFile(filePath, flipped);
    return { success: true };
  } catch (err) {
    console.error('Error flipping image:', err);
    return { success: false, error: err.message };
  }
});

// 12. Handle thumbnail generation (for caching)
ipcMain.handle('file:generateThumbnail', async (event, filePath, size = 300) => {
  try {
    const sharp = require('sharp');
    const buffer = await fs.readFile(filePath);
    const thumbnail = await sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    // Store in cache directory
    const cacheDir = path.join(app.getPath('userData'), 'thumbnails');
    await fs.mkdir(cacheDir, { recursive: true });
    
    const hash = require('crypto').createHash('md5').update(filePath).digest('hex');
    const cachePath = path.join(cacheDir, `${hash}.jpg`);
    
    await fs.writeFile(cachePath, thumbnail);
    return { success: true, cachePath };
  } catch (err) {
    console.error('Error generating thumbnail:', err);
    return { success: false, error: err.message };
  }
});

// 13. Handle batch file operations
ipcMain.handle('files:batchMove', async (event, files, targetDir) => {
  const results = [];
  for (const file of files) {
    try {
      const fileName = path.basename(file);
      const targetPath = path.join(targetDir, fileName);
      await fs.rename(file, targetPath);
      results.push({ file, success: true });
    } catch (err) {
      results.push({ file, success: false, error: err.message });
    }
  }
  return results;
});

ipcMain.handle('files:batchDelete', async (event, files) => {
  const results = [];
  for (const file of files) {
    try {
      await fs.unlink(file);
      results.push({ file, success: true });
    } catch (err) {
      results.push({ file, success: false, error: err.message });
    }
  }
  return results;
});

// 14. Handle EXIF metadata extraction
ipcMain.handle('file:getMetadata', async (event, filePath) => {
  try {
    return await exifHandler.extractMetadata(filePath);
  } catch (error) {
    console.error('Error getting metadata:', error);
    return { error: error.message };
  }
});

ipcMain.handle('files:getBatchMetadata', async (event, filePaths) => {
  try {
    return await exifHandler.extractBatchMetadata(filePaths);
  } catch (error) {
    console.error('Error getting batch metadata:', error);
    return { error: error.message };
  }
});

// 15. Handle update checks
ipcMain.handle('app:checkForUpdates', async () => {
  if (appUpdater) {
    appUpdater.checkForUpdates();
  }
});

// 16. Handle saving a file (for face swap results)
ipcMain.handle('file:save', async (event, blob, fileName) => {
  try {
    const { dialog } = require('electron');
    
    // Show save dialog
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: fileName,
      filters: [
        { name: 'PNG Image', extensions: ['png'] },
        { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }
      ]
    });
    
    if (canceled || !filePath) {
      return { success: false, error: 'Save canceled' };
    }
    
    // Convert blob to buffer and save
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);
    
    return { success: true, path: filePath };
  } catch (err) {
    console.error('Error saving file:', err);
    return { success: false, error: err.message };
  }
});

// 17. Handle moving files (for bulk operations)
ipcMain.handle('file:move', async (event, sourcePath, targetPath) => {
  try {
    await fs.rename(sourcePath, targetPath);
    return { success: true };
  } catch (err) {
    console.error('Error moving file:', err);
    return { success: false, error: err.message };
  }
});