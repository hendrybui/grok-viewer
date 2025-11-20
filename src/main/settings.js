// settings.js - Settings management using simple JSON storage
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class SettingsManager {
  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.loadSettings();
  }

  getDefaultSettings() {
    const defaultPath = path.join(__dirname, '../../config/default-settings.json');
    if (fs.existsSync(defaultPath)) {
      return JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
    }
    return {
      theme: 'dark',
      defaultView: 'grid',
      thumbnailSize: 'medium',
      autoPlayVideos: true,
      sortBy: 'name',
      sortOrder: 'asc',
      supportedFormats: {
        images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
        videos: ['.mp4', '.mov', '.webm', '.avi', '.mkv']
      },
      gridColumns: 'auto',
      showFileNames: true,
      slideShowInterval: 3000
    };
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        return { ...this.getDefaultSettings(), ...JSON.parse(data) };
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
    return this.getDefaultSettings();
  }

  saveSettings() {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }

  get(key) {
    return key ? this.settings[key] : undefined;
  }

  set(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }

  getAll() {
    return { ...this.settings };
  }

  reset() {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
    return this.getAll();
  }
}

module.exports = SettingsManager;
