// Image Adjustments Feature for Grok Viewer

class ImageAdjustments {
  constructor() {
    this.currentBrightness = 100;
    this.currentContrast = 100;
    this.currentSaturation = 100;
    this.createAdjustmentPanel();
    this.setupEventListeners();
  }

  createAdjustmentPanel() {
    const panel = document.createElement('div');
    panel.id = 'adjustmentPanel';
    panel.className = 'adjustment-panel hidden';
    panel.innerHTML = `
      <div class="adjustment-header">
        <h3>🎨 Image Adjustments</h3>
        <button class="adjustment-close" title="Close">✕</button>
      </div>
      <div class="adjustment-content">
        <div class="adjustment-group">
          <label>
            <span class="adjustment-icon">☀️</span>
            Brightness
            <span class="adjustment-value" id="brightnessValue">100%</span>
          </label>
          <input type="range" id="brightnessSlider" min="0" max="200" value="100" class="adjustment-slider">
        </div>
        <div class="adjustment-group">
          <label>
            <span class="adjustment-icon">◐</span>
            Contrast
            <span class="adjustment-value" id="contrastValue">100%</span>
          </label>
          <input type="range" id="contrastSlider" min="0" max="200" value="100" class="adjustment-slider">
        </div>
        <div class="adjustment-group">
          <label>
            <span class="adjustment-icon">🎨</span>
            Saturation
            <span class="adjustment-value" id="saturationValue">100%</span>
          </label>
          <input type="range" id="saturationSlider" min="0" max="200" value="100" class="adjustment-slider">
        </div>
        <div class="adjustment-actions">
          <button class="adjustment-btn" id="resetAdjustments">↺ Reset</button>
          <button class="adjustment-btn" id="applyAdjustments">✓ Apply to View</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    this.panel = panel;
  }

  setupEventListeners() {
    const closeBtn = this.panel.querySelector('.adjustment-close');
    closeBtn.addEventListener('click', () => this.hide());

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.panel.classList.contains('hidden')) {
        this.hide();
      }
    });

    // Sliders
    const brightnessSlider = this.panel.querySelector('#brightnessSlider');
    const contrastSlider = this.panel.querySelector('#contrastSlider');
    const saturationSlider = this.panel.querySelector('#saturationSlider');

    brightnessSlider.addEventListener('input', (e) => {
      this.currentBrightness = e.target.value;
      this.panel.querySelector('#brightnessValue').textContent = `${e.target.value}%`;
      this.applyAdjustmentsToViewer();
    });

    contrastSlider.addEventListener('input', (e) => {
      this.currentContrast = e.target.value;
      this.panel.querySelector('#contrastValue').textContent = `${e.target.value}%`;
      this.applyAdjustmentsToViewer();
    });

    saturationSlider.addEventListener('input', (e) => {
      this.currentSaturation = e.target.value;
      this.panel.querySelector('#saturationValue').textContent = `${e.target.value}%`;
      this.applyAdjustmentsToViewer();
    });

    // Reset button
    this.panel.querySelector('#resetAdjustments').addEventListener('click', () => {
      this.currentBrightness = 100;
      this.currentContrast = 100;
      this.currentSaturation = 100;
      brightnessSlider.value = 100;
      contrastSlider.value = 100;
      saturationSlider.value = 100;
      this.panel.querySelector('#brightnessValue').textContent = '100%';
      this.panel.querySelector('#contrastValue').textContent = '100%';
      this.panel.querySelector('#saturationValue').textContent = '100%';
      this.applyAdjustmentsToViewer();
    });

    // Apply button
    this.panel.querySelector('#applyAdjustments').addEventListener('click', () => {
      this.applyToFile();
    });

    // Add keyboard shortcut 'A' for Adjustments
    document.addEventListener('keydown', (e) => {
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
        const viewer = document.getElementById('viewerModal');
        if (viewer && viewer.style.display === 'flex') {
          this.show();
        }
      }
    });
  }

  show() {
    this.panel.classList.remove('hidden');
  }

  hide() {
    this.panel.classList.add('hidden');
  }

  applyAdjustmentsToViewer() {
    const viewer = document.getElementById('viewerModal');
    if (!viewer) return;

    const media = viewer.querySelector('img, video');
    if (!media) return;

    media.style.filter = `brightness(${this.currentBrightness}%) contrast(${this.currentContrast}%) saturate(${this.currentSaturation}%)`;
  }

  applyToFile() {
    // For now, just show a message that adjustments are applied to view
    // To persist changes, user would need to use Edit with Default App
    if (typeof window.showToast === 'function') {
      window.showToast('Adjustments applied to view (use Edit with Default App to save changes)');
    }
  }

  // Add adjustments button to viewer
  addToViewer() {
    const viewer = document.getElementById('viewerModal');
    if (!viewer) return;

    // Add adjustments button if not exists
    let adjustBtn = viewer.querySelector('.adjustment-btn-trigger');
    if (!adjustBtn) {
      adjustBtn = document.createElement('button');
      adjustBtn.className = 'adjustment-btn-trigger';
      adjustBtn.innerHTML = '🎨 Adjust';
      adjustBtn.title = 'Image Adjustments (A)';
      
      const viewerContent = document.getElementById('viewerContent') || viewer;
      viewerContent.appendChild(adjustBtn);
      
      adjustBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.show();
      });
    }
  }
}

// Initialize
const imageAdjustments = new ImageAdjustments();
window.imageAdjustments = imageAdjustments;
