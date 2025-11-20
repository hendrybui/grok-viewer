// Enhanced Features - All New Functionality
// This file contains: Slideshow, Comparison, Bulk Operations, Search, Keyboard Shortcuts, Collections, Image Rotation

// State Management
let slideshowInterval = null;
let slideshowSpeed = 3000;
let slideshowPlaying = false;
let currentSlideshowIndex = 0;
let selectedFiles = new Set();
let comparisonImages = { A: null, B: null };
let collections = {};
let searchQuery = '';
let lastKeyTime = 0;

// Initialize Enhanced Features
function initEnhancedFeatures() {
  setupSearch();
  setupBulkOperations();
  setupSlideshow();
  setupComparison();
  setupKeyboardShortcuts();
  setupCollections();
  setupImageRotation();
}

// ========== SEARCH FUNCTIONALITY ==========
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  
  if (!searchInput) return;
  
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    filterGalleryBySearch();
  });
  
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    filterGalleryBySearch();
  });
}

function filterGalleryBySearch() {
  const items = document.querySelectorAll('.gallery-item');
  items.forEach(item => {
    const media = item.querySelector('.gallery-media');
    if (!media) return;
    
    const fileName = media.src.split('/').pop().split('\\').pop().toLowerCase();
    const matches = !searchQuery || fileName.includes(searchQuery);
    item.style.display = matches ? '' : 'none';
  });
}

// ========== BULK OPERATIONS ==========
function setupBulkOperations() {
  const selectAllBtn = document.getElementById('selectAllBtn');
  const deselectAllBtn = document.getElementById('deselectAllBtn');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  const bulkMoveBtn = document.getElementById('bulkMoveBtn');
  const bulkControls = document.querySelector('.bulk-controls');
  
  if (!selectAllBtn) return;
  
  selectAllBtn.addEventListener('click', selectAllFiles);
  deselectAllBtn.addEventListener('click', deselectAllFiles);
  bulkDeleteBtn.addEventListener('click', bulkDeleteFiles);
  bulkMoveBtn.addEventListener('click', () => showBulkMoveDialog());
  
  // Show bulk controls when selections are made
  document.addEventListener('selectionChanged', () => {
    bulkControls.style.display = selectedFiles.size > 0 ? 'flex' : 'none';
    updateSelectionCount();
  });
}

function enableSelectionMode() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.classList.add('selection-mode');
    
    // Add checkbox if not exists
    if (!item.querySelector('.selection-checkbox')) {
      const checkbox = document.createElement('div');
      checkbox.className = 'selection-checkbox';
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFileSelection(item);
      });
      item.insertBefore(checkbox, item.firstChild);
    }
  });
}

function toggleFileSelection(item) {
  const media = item.querySelector('.gallery-media');
  if (!media) return;
  
  const filePath = media.src.replace('file:///', '').replace('file://', '');
  
  if (selectedFiles.has(filePath)) {
    selectedFiles.delete(filePath);
    item.classList.remove('selected');
  } else {
    selectedFiles.add(filePath);
    item.classList.add('selected');
  }
  
  document.dispatchEvent(new Event('selectionChanged'));
}

function selectAllFiles() {
  enableSelectionMode();
  document.querySelectorAll('.gallery-item').forEach(item => {
    const media = item.querySelector('.gallery-media');
    if (!media || item.style.display === 'none') return;
    
    const filePath = media.src.replace('file:///', '').replace('file://', '');
    selectedFiles.add(filePath);
    item.classList.add('selected');
  });
  document.dispatchEvent(new Event('selectionChanged'));
}

function deselectAllFiles() {
  selectedFiles.clear();
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.classList.remove('selected', 'selection-mode');
  });
  document.dispatchEvent(new Event('selectionChanged'));
}

function updateSelectionCount() {
  const countElem = document.getElementById('selectionCount');
  if (countElem) {
    countElem.textContent = `${selectedFiles.size} selected`;
  }
}

async function bulkDeleteFiles() {
  if (selectedFiles.size === 0) return;
  
  const confirmMsg = `Delete ${selectedFiles.size} file(s)? This cannot be undone.`;
  if (!confirm(confirmMsg)) return;
  
  const filesToDelete = Array.from(selectedFiles);
  let deleted = 0;
  
  for (const file of filesToDelete) {
    try {
      const result = await window.api.deleteFile(file);
      if (result.success) deleted++;
    } catch (err) {
      console.error('Delete error:', err);
    }
  }
  
  showToast(`Deleted ${deleted} of ${filesToDelete.length} files`);
  deselectAllFiles();
  
  // Reload folder
  if (currentRootPath) {
    await loadFolder(currentRootPath, false);
  }
}

function showBulkMoveDialog() {
  if (selectedFiles.size === 0) return;
  
  const modal = document.getElementById('bulkMoveModal');
  const countElem = document.getElementById('bulkMoveCount');
  countElem.textContent = `${selectedFiles.size} file(s) selected`;
  modal.style.display = 'flex';
  
  let targetFolder = null;
  
  document.getElementById('bulkMoveSelect').onclick = async () => {
    targetFolder = await window.api.openDirectory();
    if (targetFolder) {
      document.getElementById('bulkMoveConfirm').disabled = false;
      document.getElementById('bulkMoveSelect').textContent = `Destination: ${targetFolder.substring(0, 40)}...`;
    }
  };
  
  document.getElementById('bulkMoveConfirm').onclick = async () => {
    if (!targetFolder) return;
    await bulkMoveFiles(targetFolder);
    modal.style.display = 'none';
  };
  
  document.getElementById('bulkMoveCancel').onclick = () => {
    modal.style.display = 'none';
  };
}

async function bulkMoveFiles(targetFolder) {
  const path = require('path');
  const filesToMove = Array.from(selectedFiles);
  let moved = 0;
  
  for (const file of filesToMove) {
    try {
      const fileName = file.split('\\').pop().split('/').pop();
      const targetPath = `${targetFolder}\\${fileName}`;
      const result = await window.api.pasteFile(targetFolder);
      if (result.success) moved++;
    } catch (err) {
      console.error('Move error:', err);
    }
  }
  
  showToast(`Moved ${moved} of ${filesToMove.length} files`);
  deselectAllFiles();
  
  if (currentRootPath) {
    await loadFolder(currentRootPath, false);
  }
}

// ========== SLIDESHOW MODE ==========
function setupSlideshow() {
  const slideshowBtn = document.getElementById('slideshowBtn');
  const slideshowModal = document.getElementById('slideshowModal');
  const slideshowContent = document.getElementById('slideshowContent');
  const playPauseBtn = document.getElementById('slideshowPlayPause');
  const prevBtn = document.getElementById('slideshowPrev');
  const nextBtn = document.getElementById('slideshowNext');
  const exitBtn = document.getElementById('slideshowExit');
  const speedUpBtn = document.getElementById('slideshowSpeedUp');
  const speedDownBtn = document.getElementById('slideshowSpeedDown');
  
  if (!slideshowBtn) return;
  
  slideshowBtn.addEventListener('click', startSlideshow);
  exitBtn.addEventListener('click', stopSlideshow);
  playPauseBtn.addEventListener('click', toggleSlideshowPlayPause);
  prevBtn.addEventListener('click', () => navigateSlideshow(-1));
  nextBtn.addEventListener('click', () => navigateSlideshow(1));
  speedUpBtn.addEventListener('click', () => adjustSlideshowSpeed(500));
  speedDownBtn.addEventListener('click', () => adjustSlideshowSpeed(-500));
}

function startSlideshow() {
  if (currentFiles.length === 0) return;
  
  const modal = document.getElementById('slideshowModal');
  modal.style.display = 'flex';
  currentSlideshowIndex = 0;
  slideshowPlaying = true;
  
  showSlideshowImage(0);
  startSlideshowTimer();
}

function stopSlideshow() {
  const modal = document.getElementById('slideshowModal');
  modal.style.display = 'none';
  slideshowPlaying = false;
  clearInterval(slideshowInterval);
}

function toggleSlideshowPlayPause() {
  slideshowPlaying = !slideshowPlaying;
  const btn = document.getElementById('slideshowPlayPause');
  btn.textContent = slideshowPlaying ? '⏸' : '▶';
  
  if (slideshowPlaying) {
    startSlideshowTimer();
  } else {
    clearInterval(slideshowInterval);
  }
}

function startSlideshowTimer() {
  clearInterval(slideshowInterval);
  slideshowInterval = setInterval(() => {
    navigateSlideshow(1);
    updateSlideshowProgress();
  }, slideshowSpeed);
}

function navigateSlideshow(direction) {
  currentSlideshowIndex += direction;
  if (currentSlideshowIndex >= currentFiles.length) currentSlideshowIndex = 0;
  if (currentSlideshowIndex < 0) currentSlideshowIndex = currentFiles.length - 1;
  
  showSlideshowImage(currentSlideshowIndex);
}

function showSlideshowImage(index) {
  const content = document.getElementById('slideshowContent');
  const file = currentFiles[index];
  const ext = file.split('.').pop().toLowerCase();
  const isVideo = currentSettings.supportedFormats.videos.some(v => v === `.${ext}`);
  
  content.innerHTML = '';
  
  const media = isVideo ? document.createElement('video') : document.createElement('img');
  media.src = `file://${file}`;
  
  if (isVideo) {
    media.controls = true;
    media.autoplay = true;
    media.loop = true;
  }
  
  content.appendChild(media);
}

function adjustSlideshowSpeed(delta) {
  slideshowSpeed = Math.max(1000, Math.min(10000, slideshowSpeed - delta));
  document.getElementById('slideshowSpeed').textContent = `${slideshowSpeed / 1000}s`;
  
  if (slideshowPlaying) {
    startSlideshowTimer();
  }
}

function updateSlideshowProgress() {
  const progress = document.getElementById('slideshowProgress');
  const percent = ((currentSlideshowIndex + 1) / currentFiles.length) * 100;
  progress.style.width = `${percent}%`;
}

// ========== COMPARISON VIEW ==========
function setupComparison() {
  const compareBtn = document.getElementById('compareViewBtn');
  const comparisonModal = document.getElementById('comparisonModal');
  const closeBtn = document.getElementById('closeComparison');
  
  if (!compareBtn) return;
  
  compareBtn.addEventListener('click', openComparisonView);
  closeBtn.addEventListener('click', closeComparisonView);
  
  document.getElementById('compareImageA').addEventListener('click', () => selectImageForComparison('A'));
  document.getElementById('compareImageB').addEventListener('click', () => selectImageForComparison('B'));
}

function openComparisonView() {
  const modal = document.getElementById('comparisonModal');
  modal.style.display = 'flex';
  comparisonImages = { A: null, B: null };
  document.getElementById('compareImageA').innerHTML = '<p class="placeholder-text">Select first image</p>';
  document.getElementById('compareImageB').innerHTML = '<p class="placeholder-text">Select second image</p>';
}

function closeComparisonView() {
  const modal = document.getElementById('comparisonModal');
  modal.style.display = 'none';
}

async function selectImageForComparison(slot) {
  // Create image selector from current files
  const imageFiles = currentFiles.filter(file => {
    const ext = file.split('.').pop().toLowerCase();
    return currentSettings.supportedFormats.images.some(v => v === `.${ext}`);
  });
  
  if (imageFiles.length === 0) {
    showToast('No images available for comparison');
    return;
  }
  
  // Simple selection - use first available images
  const index = slot === 'A' ? 0 : Math.min(1, imageFiles.length - 1);
  const file = imageFiles[index];
  
  comparisonImages[slot] = file;
  const container = document.getElementById(`compareImage${slot}`);
  container.innerHTML = `<img src="file://${file}" alt="Compare ${slot}">`;
  container.classList.add('has-image');
  
  // Show file info
  const props = await window.api.getFileProperties(file);
  if (props.success) {
    const infoDiv = document.getElementById(`compareInfo${slot}`);
    infoDiv.innerHTML = `
      <div class="info-row"><span class="info-label">Name:</span><span>${props.properties.name}</span></div>
      <div class="info-row"><span class="info-label">Size:</span><span>${props.properties.sizeFormatted}</span></div>
      <div class="info-row"><span class="info-label">Modified:</span><span>${new Date(props.properties.modified).toLocaleDateString()}</span></div>
    `;
  }
}

// ========== KEYBOARD SHORTCUTS ==========
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', handleGlobalKeyboard);
  
  // Show help with ?
  document.addEventListener('keypress', (e) => {
    if (e.key === '?') {
      document.getElementById('keyboardHelp').style.display = 'flex';
    }
  });
}

function handleGlobalKeyboard(e) {
  // Prevent rapid key events
  const now = Date.now();
  if (now - lastKeyTime < 50) return;
  lastKeyTime = now;
  
  // Don't interfere with input fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  // Global shortcuts
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    document.getElementById('searchInput')?.focus();
  }
  
  if (e.ctrlKey && e.key === 'a') {
    e.preventDefault();
    selectAllFiles();
  }
  
  if (e.key === 'F11' || (e.ctrlKey && e.key === 's')) {
    e.preventDefault();
    startSlideshow();
  }
  
  if (e.key === 'Escape') {
    stopSlideshow();
    closeComparisonView();
    document.getElementById('keyboardHelp').style.display = 'none';
  }
  
  // Image rotation
  if (e.key === 'r' || e.key === 'R') {
    const angle = e.shiftKey ? 270 : 90;
    rotateSelectedImages(angle);
  }
  
  // Navigation
  if (e.key === 'ArrowLeft') {
    navigateSlideshow(-1);
  }
  
  if (e.key === 'ArrowRight') {
    navigateSlideshow(1);
  }
  
  if (e.key === ' ' && document.getElementById('slideshowModal').style.display === 'flex') {
    e.preventDefault();
    toggleSlideshowPlayPause();
  }
}

// ========== COLLECTIONS ==========
function setupCollections() {
  // Load collections from settings
  collections = currentSettings.collections || {};
}

function addToCollection(filePath, collectionName = 'default') {
  if (!collections[collectionName]) {
    collections[collectionName] = [];
  }
  
  if (!collections[collectionName].includes(filePath)) {
    collections[collectionName].push(filePath);
    window.api.setSetting('collections', collections);
    showToast(`Added to collection: ${collectionName}`);
  }
}

// ========== IMAGE ROTATION ==========
function setupImageRotation() {
  // Rotation handlers are in context menu
}

async function rotateSelectedImages(angle) {
  if (selectedFiles.size === 0) {
    showToast('No images selected');
    return;
  }
  
  const filesToRotate = Array.from(selectedFiles);
  for (const file of filesToRotate) {
    await rotateImage(file, angle);
  }
  
  showToast(`Rotated ${filesToRotate.length} image(s)`);
}

async function rotateImage(filePath, angle) {
  try {
    const result = await window.api.rotateImage(filePath, angle);
    if (result.success) {
      // Refresh the image in gallery
      const items = document.querySelectorAll('.gallery-item');
      items.forEach(item => {
        const media = item.querySelector('.gallery-media');
        if (media && media.src.includes(filePath)) {
          // Force reload with cache bust
          media.src = `file://${filePath}?t=${Date.now()}`;
          item.classList.add('rotating');
          setTimeout(() => item.classList.remove('rotating'), 300);
        }
      });
    }
  } catch (err) {
    console.error('Rotation error:', err);
  }
}

async function flipImage(filePath, direction) {
  try {
    const result = await window.api.flipImage(filePath, direction);
    if (result.success) {
      const items = document.querySelectorAll('.gallery-item');
      items.forEach(item => {
        const media = item.querySelector('.gallery-media');
        if (media && media.src.includes(filePath)) {
          media.src = `file://${filePath}?t=${Date.now()}`;
        }
      });
    }
  } catch (err) {
    console.error('Flip error:', err);
  }
}

// ========== PERFORMANCE OPTIMIZATIONS ==========

// Lazy Loading with Intersection Observer
function setupLazyLoading() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const item = entry.target;
        const media = item.querySelector('.gallery-media');
        if (media && media.dataset.src) {
          media.src = media.dataset.src;
          delete media.dataset.src;
          item.classList.remove('loading');
        }
        observer.unobserve(item);
      }
    });
  }, {
    rootMargin: '50px'
  });
  
  document.querySelectorAll('.gallery-item').forEach(item => observer.observe(item));
}

// Virtual Scrolling for large galleries
function setupVirtualScrolling() {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;
  
  gallery.addEventListener('scroll', debounce(() => {
    const items = gallery.querySelectorAll('.gallery-item');
    const viewportTop = gallery.scrollTop;
    const viewportBottom = viewportTop + gallery.clientHeight;
    
    items.forEach(item => {
      const rect = item.getBoundingClientRect();
      const itemTop = rect.top + viewportTop;
      const itemBottom = itemTop + rect.height;
      
      const isVisible = itemBottom >= viewportTop - 500 && itemTop <= viewportBottom + 500;
      item.classList.toggle('offscreen', !isVisible);
    });
  }, 100));
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export functions for main renderer
if (typeof window !== 'undefined') {
  window.enhancedFeatures = {
    init: initEnhancedFeatures,
    rotateImage,
    flipImage,
    addToCollection,
    setupLazyLoading,
    setupVirtualScrolling
  };
}
