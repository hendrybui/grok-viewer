// face-swap.js - FaceFusion integration for face swapping
console.log('Face Swap module loaded');

// FaceFusion API configuration
const FACEFUSION_CONFIG = {
  // Default to localhost or configurable endpoint
  apiUrl: 'http://localhost:7860', // FaceFusion default port
  timeout: 30000 // 30 seconds timeout
};

// Helper function to show toast notifications
function showToast(message, isError = false) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.className = `toast ${isError ? 'toast-error' : ''} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Face Swap Module
window.faceSwap = {
  selectedSourceImage: null,
  selectedTargetImage: null,

  // Initialize face swap functionality
  init() {
    console.log('Initializing Face Swap module');
    this.addFaceSwapControls();
    this.addContextMenuOption();
  },

  // Add face swap controls to bulk controls
  addFaceSwapControls() {
    const bulkControls = document.querySelector('.bulk-controls');
    if (!bulkControls) return;

    // Check if face swap button already exists
    if (document.getElementById('faceSwapBtn')) return;

    const faceSwapBtn = document.createElement('button');
    faceSwapBtn.id = 'faceSwapBtn';
    faceSwapBtn.className = 'control-btn face-swap-btn';
    faceSwapBtn.title = 'Swap Faces (requires 2 images selected)';
    faceSwapBtn.innerHTML = '🔄 Swap Faces';
    faceSwapBtn.disabled = true;

    // Insert after bulk move button
    const bulkMoveBtn = document.getElementById('bulkMoveBtn');
    if (bulkMoveBtn) {
      bulkMoveBtn.parentNode.insertBefore(faceSwapBtn, bulkMoveBtn.nextSibling);
    } else {
      bulkControls.appendChild(faceSwapBtn);
    }

    faceSwapBtn.addEventListener('click', () => this.handleFaceSwap());

    // Update button state based on selection
    document.addEventListener('selectionChanged', () => this.updateFaceSwapButton());
  },

  // Update face swap button state
  updateFaceSwapButton() {
    const faceSwapBtn = document.getElementById('faceSwapBtn');
    if (!faceSwapBtn) return;

    const selectedCount = window.selectedFiles ? window.selectedFiles.size : 0;
    faceSwapBtn.disabled = selectedCount !== 2;
    
    if (selectedCount === 2) {
      faceSwapBtn.title = 'Swap faces between selected images';
      faceSwapBtn.style.opacity = '1';
    } else {
      faceSwapBtn.title = `Swap faces (requires 2 images selected, currently ${selectedCount})`;
      faceSwapBtn.style.opacity = '0.5';
    }
  },

  // Handle face swap operation
  async handleFaceSwap() {
    if (!window.selectedFiles || window.selectedFiles.size !== 2) {
      showToast('Please select exactly 2 images for face swap', true);
      return;
    }

    const selectedImages = Array.from(window.selectedFiles);
    const sourceImage = selectedImages[0];
    const targetImage = selectedImages[1];

    // Show confirmation dialog
    const confirmed = confirm(
      `Swap faces between:\n\n` +
      `Source: ${this.getFileName(sourceImage)}\n` +
      `Target: ${this.getFileName(targetImage)}\n\n` +
      `This will modify the target image. Continue?`
    );

    if (!confirmed) return;

    try {
      showToast('Starting face swap...', false);
      
      // Read images as base64
      const sourceBase64 = await this.imageToBase64(sourceImage);
      const targetBase64 = await this.imageToBase64(targetImage);

      // Call FaceFusion API
      const result = await this.callFaceFusionAPI(sourceBase64, targetBase64);

      if (result.success) {
        // Save the result
        await this.saveFaceSwapResult(result.image, targetImage);
        showToast('Face swap completed successfully!', false);
      } else {
        showToast(`Face swap failed: ${result.error}`, true);
      }
    } catch (error) {
      console.error('Face swap error:', error);
      showToast(`Face swap error: ${error.message}`, true);
    }
  },

  // Convert image file to base64
  async imageToBase64(filePath) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        resolve(base64);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = `file://${filePath}`;
    });
  },

  // Call FaceFusion API
  async callFaceFusionAPI(sourceBase64, targetBase64) {
    try {
      const response = await fetch(`${FACEFUSION_CONFIG.apiUrl}/v1/face-swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_image: sourceBase64,
          target_image: targetBase64,
          output_format: 'png'
        }),
        signal: AbortSignal.timeout(FACEFUSION_CONFIG.timeout)
      });

      if (!response.ok) {
        throw new Error(`FaceFusion API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        return { success: false, error: data.error };
      }

      return { 
        success: true, 
        image: data.image || data.output_image 
      };
    } catch (error) {
      if (error.name === 'TimeoutError') {
        return { success: false, error: 'Request timed out. FaceFusion server may be busy.' };
      }
      
      // Check if FaceFusion is running
      if (error.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'FaceFusion server not running. Please start FaceFusion first.' 
        };
      }
      
      return { success: false, error: error.message };
    }
  },

  // Save face swap result
  async saveFaceSwapResult(base64Image, originalPath) {
    try {
      // Convert base64 to blob
      const response = await fetch(`data:image/png;base64,${base64Image}`);
      const blob = await response.blob();
      
      // Create filename
      const originalName = this.getFileName(originalPath);
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const newFileName = `${nameWithoutExt}_faceswap_${timestamp}.png`;
      
      // Save file using Electron API
      const result = await window.api.saveFile(blob, newFileName);
      
      if (result.success) {
        console.log('Face swap saved to:', result.path);
        return result.path;
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  },

  // Add face swap option to context menu
  addContextMenuOption() {
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu) return;

    // Check if option already exists
    if (document.querySelector('[data-action="faceSwap"]')) return;

    const divider = document.createElement('div');
    divider.className = 'context-menu-divider';

    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.dataset.action = 'faceSwap';
    menuItem.innerHTML = `
      <span class="context-icon">🔄</span>
      <span>Swap Faces...</span>
      <span class="context-shortcut">Select 2 images</span>
    `;

    // Insert before delete divider
    const deleteDivider = contextMenu.querySelector('.context-menu-item.danger');
    if (deleteDivider) {
      contextMenu.insertBefore(divider, deleteDivider);
      contextMenu.insertBefore(menuItem, deleteDivider);
    } else {
      contextMenu.appendChild(divider);
      contextMenu.appendChild(menuItem);
    }
  },

  // Get filename from path
  getFileName(filePath) {
    return filePath.split('\\').pop().split('/').pop();
  },

  // Check if FaceFusion is available
  async checkFaceFusionAvailability() {
    try {
      const response = await fetch(`${FACEFUSION_CONFIG.apiUrl}/v1/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.log('FaceFusion not available:', error.message);
      return false;
    }
  }
};

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  if (window.faceSwap) {
    window.faceSwap.init();
  }
});

// Also initialize when window loads (for dynamic loading)
window.addEventListener('load', () => {
  if (window.faceSwap) {
    window.faceSwap.init();
  }
});
