const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

class AppUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
  }

  setupAutoUpdater() {
    // Configure updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates on startup (after 3 seconds)
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);

    // Update available
    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version ${info.version} is available!`,
        buttons: ['Download', 'Later'],
        defaultId: 0
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
          this.mainWindow.webContents.send('update-status', 'Downloading update...');
        }
      });
    });

    // Update not available
    autoUpdater.on('update-not-available', () => {
      console.log('App is up to date');
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
      this.mainWindow.webContents.send('update-status', message);
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The application will restart to install.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    // Error handling
    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
    });
  }

  checkForUpdates() {
    autoUpdater.checkForUpdates();
  }
}

module.exports = AppUpdater;
