# Copilot Instructions — grok-viewer

Concise, actionable guidance for AI coding agents working in this Electron media viewer project.

## Architecture Overview
- **Stack:** Electron app with renderer process (`renderer.js`) → IPC bridge (`preload.js`) → main process (`main.js`)
- **Primary flow:** User clicks "Select Folder" → `window.api.openDirectory()` → `window.api.scanFiles(dirPath)` → renderer displays thumbnails → click opens modal viewer
- **Media handling:** Uses `file://` protocol with absolute paths; supports `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.mp4`, `.mov`, `.webm`

## Key Files
- `main.js` — IPC handlers: `dialog:openDirectory` returns selected folder path, `files:scan` returns array of absolute file paths for media files
- `preload.js` — Exposes `window.api.openDirectory()` and `window.api.scanFiles(path)` (both async via `ipcRenderer.invoke`)
- `renderer.js` — Gallery + modal UI; sets `media.src = \`file://${file}\``; clears `viewerContent.innerHTML` on modal close to stop playback
- `package.json` — Scripts: `npm start` (launch app), `npm run build` (package with electron-builder)

## Critical Rules (Do Not Change Without Reviewing All Three Files)
- **`window.api` is the integration boundary** — preserve method names and signatures; update `preload.js` + `main.js` + `renderer.js` together
- **Always use `file://` protocol** — renderer expects absolute filesystem paths; keep prefix when setting `src` attributes
- **Modal teardown pattern** — `viewerContent.innerHTML = ''` stops media playback; preserve or explicitly pause/remove elements

## UI Conventions
- Gallery: class `gallery-item` (container), `gallery-media` (img/video element)
- Modal: id `viewerModal`, close button `.close-btn`, content container `viewerContent`
- Hover preview: `mouseenter` → `media.play()`, `mouseleave` → `media.pause()`

## Safe Development Patterns
- **Adding FS features:** Update `main.js` IPC handler → update `preload.js` bridge → update `renderer.js` caller
- **Before changing `file://` to blobs:** Search repo for all `file://` usage and confirm `files:scan` output format
- **Unit testing:** Mock `window.api` in test harness:
```js
window.api = {
  openDirectory: async () => 'C:/test/path',
  scanFiles: async (p) => ['C:/test/path/img.jpg', 'C:/test/path/vid.mp4']
};
```

## Quick Start
```bat
npm install
npm start
```

Build distributable:
```bat
npm run build
```
