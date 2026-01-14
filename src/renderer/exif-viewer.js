/* eslint-env browser */
/* global window, document, navigator, setTimeout */
// EXIF Metadata Viewer Component
class ExifViewer {
  constructor() {
    this.currentMetadata = null;
    this.createExifPanel();
    this.setupEventListeners();
  }

  createExifPanel() {
    const panel = document.createElement('div');
    panel.id = 'exifPanel';
    panel.className = 'exif-panel hidden';
    panel.innerHTML = `
      <div class="exif-header">
        <h3>📊 Image Metadata</h3>
        <button class="exif-close" title="Close">✕</button>
      </div>
      <div class="exif-content">
        <div class="exif-loading">Loading metadata...</div>
      </div>
    `;
    document.body.appendChild(panel);
    this.panel = panel;
  }

  setupEventListeners() {
    const closeBtn = this.panel.querySelector('.exif-close');
    closeBtn.addEventListener('click', () => this.hide());

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.panel.classList.contains('hidden')) {
        this.hide();
      }
    });

    // Add keyboard shortcut 'I' for Info/EXIF
    document.addEventListener('keydown', (e) => {
      if (e.key === 'i' && !e.ctrlKey && !e.metaKey) {
        const viewer = document.getElementById('viewerModal');
        if (viewer && !viewer.classList.contains('hidden')) {
          const currentImage = viewer.querySelector('img');
          if (currentImage && currentImage.dataset.path) {
            this.show(currentImage.dataset.path);
          }
        }
      }
    });
  }

  async show(filePath) {
    this.panel.classList.remove('hidden');
    const content = this.panel.querySelector('.exif-content');
    content.innerHTML = '<div class="exif-loading">Loading metadata...</div>';

    try {
      const metadata = await window.api.getFileMetadata(filePath);
      this.currentMetadata = metadata;
      this.renderMetadata(metadata);
    } catch (error) {
      content.innerHTML = `<div class="exif-error">Error loading metadata: ${error.message}</div>`;
    }
  }

  hide() {
    this.panel.classList.add('hidden');
    this.currentMetadata = null;
  }

  renderMetadata(data) {
    const content = this.panel.querySelector('.exif-content');
    
    const sections = [
      {
        title: '📁 File Information',
        items: [
          { label: 'File Name', value: data.fileName },
          { label: 'File Size', value: data.fileSize },
          { label: 'Created', value: new Date(data.created).toLocaleString() },
          { label: 'Modified', value: new Date(data.modified).toLocaleString() }
        ]
      },
      {
        title: '🖼️ Image Properties',
        items: [
          { label: 'Dimensions', value: `${data.width} × ${data.height}` },
          { label: 'Megapixels', value: `${data.megapixels} MP` },
          { label: 'Aspect Ratio', value: data.aspectRatio },
          { label: 'Format', value: data.format?.toUpperCase() },
          { label: 'Color Space', value: data.space },
          { label: 'Channels', value: data.channels },
          { label: 'Bit Depth', value: data.depth },
          { label: 'Alpha Channel', value: data.hasAlpha ? 'Yes' : 'No' },
          { label: 'DPI', value: data.density || 'N/A' },
          { label: 'Color Profile', value: data.colorProfile }
        ]
      }
    ];

    let html = '';
    sections.forEach(section => {
      html += `<div class="exif-section">`;
      html += `<h4>${section.title}</h4>`;
      html += `<table class="exif-table">`;
      section.items.forEach(item => {
        if (item.value !== undefined && item.value !== null) {
          html += `
            <tr>
              <td class="exif-label">${item.label}</td>
              <td class="exif-value">${item.value}</td>
            </tr>
          `;
        }
      });
      html += `</table></div>`;
    });

    // Add copy button
    html += `
      <div class="exif-actions">
        <button class="exif-copy-btn">📋 Copy All Metadata</button>
      </div>
    `;

    content.innerHTML = html;

    // Setup copy button
    const copyBtn = content.querySelector('.exif-copy-btn');
    copyBtn.addEventListener('click', () => this.copyMetadata());
  }

  copyMetadata() {
    if (!this.currentMetadata) return;

    const text = `
File: ${this.currentMetadata.fileName}
Size: ${this.currentMetadata.fileSize}
Dimensions: ${this.currentMetadata.width} × ${this.currentMetadata.height}
Megapixels: ${this.currentMetadata.megapixels} MP
Aspect Ratio: ${this.currentMetadata.aspectRatio}
Format: ${this.currentMetadata.format?.toUpperCase()}
Color Space: ${this.currentMetadata.space}
Channels: ${this.currentMetadata.channels}
Bit Depth: ${this.currentMetadata.depth}
DPI: ${this.currentMetadata.density || 'N/A'}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      const btn = this.panel.querySelector('.exif-copy-btn');
      const originalText = btn.textContent;
      btn.textContent = '✅ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    });
  }

  // Show EXIF in modal viewer
  addToViewer(imagePath) {
    const viewer = document.getElementById('viewerModal');
    if (!viewer) return;

    // Add info button if not exists
    let infoBtn = viewer.querySelector('.exif-info-btn');
    if (!infoBtn) {
      infoBtn = document.createElement('button');
      infoBtn.className = 'exif-info-btn';
      infoBtn.innerHTML = 'ℹ️ Info';
      infoBtn.title = 'View EXIF metadata (I)';
      
      const viewerContent = viewer.querySelector('.viewer-content') || viewer;
      viewerContent.appendChild(infoBtn);
      
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.show(imagePath);
      });
    }
  }
}

// Initialize
const exifViewer = new ExifViewer();
window.exifViewer = exifViewer;
