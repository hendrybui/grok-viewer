// main.js
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const SettingsManager = require('./src/main/settings');

// Suppress GPU cache errors
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');

const settings = new SettingsManager();

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

// 2. Handle scanning the files
ipcMain.handle('files:scan', async (event, dirPath) => {
  try {
    const files = await fs.readdir(dirPath);
    const userSettings = settings.getAll();
    const allExtensions = [
      ...userSettings.supportedFormats.images,
      ...userSettings.supportedFormats.videos
    ];
    
    // Filter for media files and return full paths
    const mediaFiles = files
      .filter(file => allExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => path.join(dirPath, file));
      
    return mediaFiles;
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