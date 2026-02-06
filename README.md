# Grok Viewer

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/b9d63147fe6f4c0693ecf8b0144f78f3)](https://app.codacy.com/gh/hendrybui/grok-viewer?utm_source=github.com&utm_medium=referral&utm_content=hendrybui/grok-viewer&utm_campaign=Badge_Grade)

A modern, feature-rich local media viewer for images and videos built with Electron.

## Features

- 🎨 **Modern Glass-morphism UI** - Beautiful, translucent interface
- 🖼️ **Multi-format Support** - View images (JPG, PNG, GIF, WEBP, BMP, SVG) and videos (MP4, MOV, WEBM, AVI, MKV)
- ⚙️ **Customizable Settings** - Adjust thumbnail size, sort options, and display preferences
- 📊 **Multiple View Modes** - Switch between grid and list views
- 🎬 **Video Preview** - Hover to play videos automatically
- 🔄 **Persistent Settings** - Your preferences are saved between sessions
- 🎯 **Keyboard Shortcuts** - Quick access via Ctrl+O to open folders

## Project Structure

```
grok-viewer/
├── src/
│   ├── main/
│   │   ├── main.js          # Main Electron process
│   │   ├── preload.js       # IPC bridge
│   │   └── settings.js      # Settings manager
│   └── renderer/
│       ├── index.html       # Main HTML
│       └── renderer.js      # Renderer process
├── assets/
│   └── style.css            # Stylesheets
├── config/
│   └── default-settings.json # Default configuration
├── .github/
│   └── copilot-instructions.md # AI agent guidance
└── package.json
```

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

## Building

```bash
npm run build
```

## Settings

Access settings via the gear icon (⚙️) or the Settings menu:

- **Auto-play Videos**: Enable/disable video preview on hover
- **Show File Names**: Display filenames below thumbnails
- **Thumbnail Size**: Choose between small, medium, or large
- **Slideshow Interval**: Set timing for future slideshow feature
- **Sort Options**: Sort by name, date, or size
- **View Mode**: Toggle between grid and list views

## Keyboard Shortcuts

- `Ctrl+O` / `Cmd+O` - Open folder
- `Ctrl+R` / `Cmd+R` - Reload app
- `Ctrl+Shift+I` / `Cmd+Option+I` - Toggle DevTools

## License

MIT
