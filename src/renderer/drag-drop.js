// Drag and Drop Support for Grok Viewer

class DragDropHandler {
  constructor() {
    this.setupDragDrop();
  }

  // Helper function to show toast notifications
  showToast(message, isError = false) {
    // Try to use existing showToast function from renderer.js
    if (typeof window.showToast === 'function') {
      window.showToast(message, isError);
    } else {
      // Fallback: create toast element
      const toast = document.createElement('div');
      toast.className = `toast toast-${isError ? 'error' : 'success'}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? '#ff4757' : '#00ff9d'};
        color: ${isError ? 'white' : '#0a0a0a'};
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideUp 0.3s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }

  setupDragDrop() {
    // Make gallery a drop zone
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      gallery.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
      gallery.addEventListener(eventName, this.highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      gallery.addEventListener(eventName, this.unhighlight, false);
    });

    // Handle dropped files
    gallery.addEventListener('drop', this.handleDrop.bind(this), false);

    // Also make entire content area a drop zone
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
      contentArea.addEventListener('drop', this.handleDrop.bind(this), false);
    }
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  highlight() {
    const gallery = document.getElementById('gallery');
    if (gallery) {
      gallery.classList.add('drag-over');
    }
  }

  unhighlight() {
    const gallery = document.getElementById('gallery');
    if (gallery) {
      gallery.classList.remove('drag-over');
    }
  }

  async handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    this.unhighlight();

    if (files.length === 0) return;

    // Check if files are being dropped
    const fileArray = Array.from(files);
    
    // Check if any dropped items are directories (not supported via drag-drop)
    const hasDirectories = fileArray.some(file => file.type === '' && file.name.indexOf('.') === -1);
    
    if (hasDirectories) {
      this.showToast('Please use "Select Folder" button to open directories', true);
      return;
    }

    // Process dropped files
    await this.processDroppedFiles(fileArray);
  }

  async processDroppedFiles(files) {
    this.showToast(`Processing ${files.length} file(s)...`);

    // Get supported formats
    const settings = await window.api.getSettings();
    const supportedExtensions = [
      ...settings.supportedFormats.images,
      ...settings.supportedFormats.videos
    ];

    // Filter for supported media files
    const mediaFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return supportedExtensions.includes(ext);
    });

    if (mediaFiles.length === 0) {
      this.showToast('No supported media files found', true);
      return;
    }

    // Get directory of first file
    const firstFile = mediaFiles[0];
    const dirPath = firstFile.path.substring(0, firstFile.path.lastIndexOf('\\') || firstFile.path.lastIndexOf('/'));

    // Load folder containing the dropped files by triggering the folder-selected event
    // This will be caught by the renderer.js listener
    const event = new CustomEvent('folder-selected', { detail: dirPath });
    window.dispatchEvent(event);

    this.showToast(`Loaded ${mediaFiles.length} media file(s)`);
  }
}

// Initialize drag-drop handler
const dragDropHandler = new DragDropHandler();
window.dragDropHandler = dragDropHandler;
