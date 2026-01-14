# 🚀 Quick Reference - New Features

## Keyboard Shortcuts (NEW)

| Key | Action | Where |
|-----|--------|-------|
| `I` | Show EXIF metadata panel | Image viewer |
| `Esc` | Close EXIF panel | Anywhere |

## EXIF Metadata Viewer

### Usage
1. **Open any image** in the viewer
2. **Press `I`** or click the **"ℹ️ Info"** button
3. **View metadata** in the slide-out panel
4. **Click "Copy All Metadata"** to copy to clipboard

### What You'll See
- **File Information**: Name, size, created/modified dates
- **Image Properties**: Dimensions, megapixels, aspect ratio
- **Technical Details**: Format, color space, channels, bit depth, DPI
- **Color Profile**: Whether an ICC profile is embedded

### API Usage (Developers)
```javascript
// Get metadata for single file
const metadata = await window.api.getFileMetadata(filePath);

// Get metadata for multiple files
const metadataArray = await window.api.getBatchMetadata([path1, path2, path3]);
```

## Auto-Update System

### How It Works
- Checks for updates **3 seconds after app launch**
- Downloads updates **in background**
- **Notifies you** when update is ready
- **Auto-installs** on next app quit (configurable)

### For Users
- Just click **"Download"** when notified
- Or click **"Later"** to skip
- App will prompt to restart when ready

### For Developers
```javascript
// Manual update check
await window.api.checkForUpdates();

// Listen for update status
window.api.onUpdateStatus((status) => {
  console.log('Update status:', status);
});
```

### Publishing Updates
1. **Build the app**: `npm run build`
2. **Create GitHub release** with tag (e.g., `v1.0.1`)
3. **Upload** the built executables from `dist/`
4. **electron-updater** auto-detects new versions

## npm Scripts

```bash
# Start the app
npm start

# Build for distribution
npm run build

# Test upgrades (verify installation)
npm test

# Lint code
npm run lint
```

## Dependencies Updated

| Package | Old | New | What's New |
|---------|-----|-----|------------|
| electron | 33.0.0 | **39.2.7** | Latest security patches, performance improvements |
| electron-builder | 24.9.1 | **26.4.0** | Better build performance, bug fixes |
| sharp | 0.33.5 | **0.34.5** | Security patches, EXIF improvements |
| electron-updater | N/A | **6.7.3** | Auto-update capability ⭐ NEW |

## New Files Created

```
src/main/
  ├── updater.js           # Auto-update manager
  └── exif-handler.js      # EXIF metadata extraction

src/renderer/
  └── exif-viewer.js       # EXIF UI component

assets/
  └── exif-viewer.css      # EXIF panel styling

.eslintrc.json             # ESLint configuration
test-upgrades.js           # Upgrade verification test
UPGRADE_SUMMARY.md         # Detailed upgrade notes
```

## IPC API Reference

### New Main Process Handlers
```javascript
// EXIF metadata
ipcMain.handle('file:getMetadata', async (event, filePath) => {...})
ipcMain.handle('files:getBatchMetadata', async (event, filePaths) => {...})

// Updates
ipcMain.handle('app:checkForUpdates', async () => {...})
```

### New Renderer APIs
```javascript
window.api = {
  // ... existing APIs ...
  
  // EXIF metadata
  getFileMetadata: (filePath) => Promise<MetadataObject>,
  getBatchMetadata: (filePaths) => Promise<MetadataObject[]>,
  
  // Updates
  checkForUpdates: () => Promise<void>,
  onUpdateStatus: (callback) => void
}
```

## Testing the Upgrades

Run the test suite:
```bash
npm test
```

This verifies:
- ✅ Dependencies are correct versions
- ✅ All new files exist
- ✅ main.js has new imports and handlers
- ✅ preload.js exposes new APIs
- ✅ HTML includes new scripts
- ✅ Sharp loads successfully

## Troubleshooting

### EXIF Panel Not Showing
- Make sure you're pressing `I` while viewing an image
- Check browser console for errors
- Verify `exif-viewer.js` loaded: `window.exifViewer` should exist

### Auto-Update Not Working
- Updates only work with **published GitHub releases**
- Check `package.json` has correct repo info
- Verify build is signed (for production)
- Check console for update errors

### Sharp Installation Issues
```bash
# Rebuild Sharp for your platform
npm rebuild sharp

# Or reinstall
npm uninstall sharp
npm install sharp@0.34.5
```

## Next Recommended Upgrades

1. **TypeScript** - Add type safety
2. **RAW Image Support** - .cr2, .nef, .arw files
3. **HEIC Support** - Modern iPhone photos
4. **Unit Tests** - Jest or Vitest
5. **Recent Folders** - Quick access menu

## Security

All packages scanned with Trivy - **0 vulnerabilities found** ✅

---

**Need help?** Check [UPGRADE_SUMMARY.md](UPGRADE_SUMMARY.md) for detailed notes.
