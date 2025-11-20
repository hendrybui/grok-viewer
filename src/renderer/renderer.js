// renderer.js - Enhanced with settings support
let currentFiles = [];
let currentSettings = {};

// DOM Elements
const pickFolderBtn = document.getElementById('pickFolder');
const gallery = document.getElementById('gallery');
const modal = document.getElementById('viewerModal');
const viewerContent = document.getElementById('viewerContent');
const closeBtn = document.querySelector('.close-btn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsBtn = document.querySelector('.close-settings');
const controlsBar = document.getElementById('controlsBar');
const renameModal = document.getElementById('renameModal');
const renameInput = document.getElementById('renameInput');
const renameConfirm = document.getElementById('renameConfirm');
const renameCancel = document.getElementById('renameCancel');

let renameTargetPath = null;
let renameTargetElement = null;

// Initialize settings
async function initSettings() {
  currentSettings = await window.api.getSettings();
  
  // Initialize favorites if not present
  if (!currentSettings.favorites) {
    currentSettings.favorites = [];
  }
  
  // Apply theme color
  applyTheme(currentSettings.themeColor || 'purple');
  
  // Apply settings to UI
  document.getElementById('themeColor').value = currentSettings.themeColor || 'purple';
  document.getElementById('autoPlayVideos').checked = currentSettings.autoPlayVideos;
  document.getElementById('showFileNames').checked = currentSettings.showFileNames;
  document.getElementById('thumbnailSize').value = currentSettings.thumbnailSize;
  document.getElementById('viewerMode').value = currentSettings.viewerMode || 'fit';
  document.getElementById('slideShowInterval').value = currentSettings.slideShowInterval / 1000;
  document.getElementById('sortSelect').value = currentSettings.sortBy;
  document.getElementById('filterSelect').value = currentSettings.filterBy || 'all';
  
  // Apply thumbnail size class
  gallery.className = `gallery thumbnail-${currentSettings.thumbnailSize}`;
}

// Button event listeners
pickFolderBtn.addEventListener('click', async () => {
  const folderPath = await window.api.openDirectory();
  if (folderPath) {
    await loadFolder(folderPath);
  }
});

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.add('show');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.remove('show');
});

// Settings event listeners
document.getElementById('themeColor').addEventListener('change', async (e) => {
  await window.api.setSetting('themeColor', e.target.value);
  currentSettings.themeColor = e.target.value;
  applyTheme(e.target.value);
});

document.getElementById('autoPlayVideos').addEventListener('change', async (e) => {
  await window.api.setSetting('autoPlayVideos', e.target.checked);
  currentSettings.autoPlayVideos = e.target.checked;
});

document.getElementById('showFileNames').addEventListener('change', async (e) => {
  await window.api.setSetting('showFileNames', e.target.checked);
  currentSettings.showFileNames = e.target.checked;
  renderGallery(currentFiles);
});

document.getElementById('thumbnailSize').addEventListener('change', async (e) => {
  await window.api.setSetting('thumbnailSize', e.target.value);
  currentSettings.thumbnailSize = e.target.value;
  gallery.className = `gallery thumbnail-${e.target.value}`;
});

document.getElementById('viewerMode').addEventListener('change', async (e) => {
  await window.api.setSetting('viewerMode', e.target.value);
  currentSettings.viewerMode = e.target.value;
});

document.getElementById('slideShowInterval').addEventListener('change', async (e) => {
  const value = parseInt(e.target.value) * 1000;
  await window.api.setSetting('slideShowInterval', value);
  currentSettings.slideShowInterval = value;
});

document.getElementById('resetSettings').addEventListener('click', async () => {
  await window.api.resetSettings();
  location.reload();
});

// View controls
document.getElementById('gridViewBtn')?.addEventListener('click', async () => {
  await window.api.setSetting('defaultView', 'grid');
  currentSettings.defaultView = 'grid';
  renderGallery(currentFiles);
});

document.getElementById('listViewBtn').addEventListener('click', async () => {
  await window.api.setSetting('defaultView', 'list');
  currentSettings.defaultView = 'list';
  renderGallery(currentFiles);
});

document.getElementById('flexViewBtn').addEventListener('click', async () => {
  await window.api.setSetting('defaultView', 'flex');
  currentSettings.defaultView = 'flex';
  renderGallery(currentFiles);
});

// Sort controls
document.getElementById('sortSelect').addEventListener('change', async (e) => {
  await window.api.setSetting('sortBy', e.target.value);
  currentSettings.sortBy = e.target.value;
  renderGallery(currentFiles);
});

document.getElementById('filterSelect').addEventListener('change', async (e) => {
  await window.api.setSetting('filterBy', e.target.value);
  currentSettings.filterBy = e.target.value;
  renderGallery(currentFiles);
});

document.getElementById('sortOrderBtn').addEventListener('click', async () => {
  const newOrder = currentSettings.sortOrder === 'asc' ? 'desc' : 'asc';
  await window.api.setSetting('sortOrder', newOrder);
  currentSettings.sortOrder = newOrder;
  document.getElementById('sortOrderBtn').textContent = newOrder === 'asc' ? '↕' : '↕';
  renderGallery(currentFiles);
});

// Load folder
async function loadFolder(folderPath) {
  const files = await window.api.scanFiles(folderPath);
  currentFiles = files;
  controlsBar.style.display = files.length > 0 ? 'flex' : 'none';
  renderGallery(files);
}

// Sort files
function sortFiles(files) {
  const sorted = [...files];
  const { sortBy, sortOrder } = currentSettings;
  
  sorted.sort((a, b) => {
    let compareA, compareB;
    
    if (sortBy === 'name') {
      compareA = a.toLowerCase();
      compareB = b.toLowerCase();
    } else if (sortBy === 'favorites') {
      const aFav = currentSettings.favorites.includes(a);
      const bFav = currentSettings.favorites.includes(b);
      if (aFav !== bFav) return bFav ? 1 : -1;
      compareA = a.toLowerCase();
      compareB = b.toLowerCase();
    } else if (sortBy === 'date') {
      // Would need file stats - simplified for now
      compareA = a;
      compareB = b;
    } else if (sortBy === 'size') {
      // Would need file stats - simplified for now
      compareA = a;
      compareB = b;
    }
    
    const result = compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
    return sortOrder === 'asc' ? result : -result;
  });
  
  return sorted;
}

// Render gallery
function renderGallery(files) {
  gallery.innerHTML = '';
  
  if (files.length === 0) {
    gallery.innerHTML = '<p class="placeholder-text">No media files found in this folder.</p>';
    return;
  }

  // Filter files by type
  let filteredFiles = files;
  const filterBy = currentSettings.filterBy || 'all';
  
  if (filterBy === 'images') {
    filteredFiles = files.filter(file => {
      const ext = file.split('.').pop().toLowerCase();
      return currentSettings.supportedFormats.images.some(v => v === `.${ext}`);
    });
  } else if (filterBy === 'videos') {
    filteredFiles = files.filter(file => {
      const ext = file.split('.').pop().toLowerCase();
      return currentSettings.supportedFormats.videos.some(v => v === `.${ext}`);
    });
  }
  
  if (filteredFiles.length === 0) {
    gallery.innerHTML = '<p class="placeholder-text">No matching media files found.</p>';
    return;
  }

  const sortedFiles = sortFiles(filteredFiles);
  
  // Apply view mode class
  if (currentSettings.defaultView === 'flex') {
    gallery.className = `gallery gallery-flex thumbnail-${currentSettings.thumbnailSize}`;
  } else if (currentSettings.defaultView === 'list') {
    gallery.className = `gallery thumbnail-${currentSettings.thumbnailSize}`;
  } else {
    gallery.className = `gallery thumbnail-${currentSettings.thumbnailSize}`;
  }

  sortedFiles.forEach(file => {
    const ext = file.split('.').pop().toLowerCase();
    const isVideo = currentSettings.supportedFormats.videos.some(v => v === `.${ext}`);
    
    const item = document.createElement('div');
    const itemClass = currentSettings.defaultView === 'list' ? 'list-view' : 
                      currentSettings.defaultView === 'flex' ? 'flex-view' : '';
    item.className = `gallery-item ${itemClass}`;
    
    const media = isVideo 
      ? document.createElement('video') 
      : document.createElement('img');
      
    media.src = `file://${file}`;
    media.className = 'gallery-media';
    
    if (isVideo) {
      media.muted = true;
      media.loop = true;
      media.autoplay = true;
      media.playsInline = true;
      
      // Use Intersection Observer for auto-play when visible
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            media.play().catch(e => console.log('Autoplay prevented:', e));
          } else {
            media.pause();
          }
        });
      }, { threshold: 0.5 });
      
      observer.observe(media);
      
      // Also play on hover for immediate interaction
      if (currentSettings.autoPlayVideos) {
        media.addEventListener('mouseenter', () => media.play());
        media.addEventListener('mouseleave', () => {
          // Only pause if not in view
          const rect = media.getBoundingClientRect();
          const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
          if (!inView) media.pause();
        });
      }
    }
    
    media.addEventListener('click', () => openViewer(file, isVideo));
    
    item.appendChild(media);
    
    if (currentSettings.showFileNames) {
      const fileNameContainer = document.createElement('div');
      fileNameContainer.className = 'file-name-container';
      
      const fileName = document.createElement('div');
      fileName.className = 'file-name';
      fileName.textContent = file.split('\\').pop().split('/').pop();
      
      const actionButtons = document.createElement('div');
      actionButtons.className = 'action-buttons';
      
      const favBtn = document.createElement('button');
      favBtn.className = 'action-btn fav-btn';
      favBtn.innerHTML = currentSettings.favorites.includes(file) ? '❤️' : '♡';
      favBtn.title = 'Toggle favorite';
      favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(file, favBtn);
      };
      
      const renameBtn = document.createElement('button');
      renameBtn.className = 'action-btn rename-btn';
      renameBtn.textContent = '✏️';
      renameBtn.title = 'Rename file';
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        showRenameDialog(file, fileName);
      };
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn delete-btn';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Delete file';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteFile(file, item);
      };
      
      actionButtons.appendChild(favBtn);
      actionButtons.appendChild(renameBtn);
      actionButtons.appendChild(deleteBtn);
      
      fileNameContainer.appendChild(fileName);
      fileNameContainer.appendChild(actionButtons);
      item.appendChild(fileNameContainer);
    }
    
    gallery.appendChild(item);
  });
}

// Show rename dialog
function showRenameDialog(filePath, fileNameElement) {
  const currentName = filePath.split('\\').pop().split('/').pop();
  const nameWithoutExt = currentName.substring(0, currentName.lastIndexOf('.'));
  
  renameTargetPath = filePath;
  renameTargetElement = fileNameElement;
  renameInput.value = nameWithoutExt;
  renameModal.style.display = 'flex';
  
  // Focus and select the input
  setTimeout(() => {
    renameInput.focus();
    renameInput.select();
  }, 100);
}

// Rename file
async function renameFile(oldPath, newPath, fileNameElement) {
  try {
    const result = await window.api.renameFile(oldPath, newPath);
    
    if (result && result.success) {
      // Update currentFiles array
      const index = currentFiles.indexOf(oldPath);
      if (index !== -1) {
        currentFiles[index] = newPath;
      }
      
      // Update display
      fileNameElement.textContent = newPath.split('\\').pop().split('/').pop();
      
      // Show success feedback
      showToast('File renamed successfully!');
    } else {
      showToast('Failed to rename file: ' + (result?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Rename error:', error);
    showToast('Failed to rename file: ' + error.message, 'error');
  }
}

// Toggle favorite
async function toggleFavorite(filePath, favBtn) {
  const favorites = currentSettings.favorites || [];
  const index = favorites.indexOf(filePath);
  
  if (index > -1) {
    favorites.splice(index, 1);
    favBtn.innerHTML = '♡';
  } else {
    favorites.push(filePath);
    favBtn.innerHTML = '❤️';
  }
  
  await window.api.setSetting('favorites', favorites);
  currentSettings.favorites = favorites;
  
  // Re-sort if sorting by favorites
  if (currentSettings.sortBy === 'favorites') {
    renderGallery(currentFiles);
  }
}

// Delete file
async function deleteFile(filePath, itemElement) {
  if (!confirm(`Are you sure you want to delete "${filePath.split('\\').pop().split('/').pop()}"?`)) {
    return;
  }
  
  try {
    const result = await window.api.deleteFile(filePath);
    
    if (result && result.success) {
      // Remove from currentFiles array
      const index = currentFiles.indexOf(filePath);
      if (index !== -1) {
        currentFiles.splice(index, 1);
      }
      
      // Remove from favorites if present
      const favIndex = currentSettings.favorites.indexOf(filePath);
      if (favIndex > -1) {
        currentSettings.favorites.splice(favIndex, 1);
        await window.api.setSetting('favorites', currentSettings.favorites);
      }
      
      // Remove element with animation
      itemElement.style.opacity = '0';
      itemElement.style.transform = 'scale(0.8)';
      setTimeout(() => {
        itemElement.remove();
        if (currentFiles.length === 0) {
          gallery.innerHTML = '<p class="placeholder-text">No media files found in this folder.</p>';
        }
      }, 300);
      
      showToast('File deleted successfully!');
    } else {
      showToast('Failed to delete file: ' + (result?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Delete error:', error);
    showToast('Failed to delete file: ' + error.message, 'error');
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Open viewer modal
let currentViewerIndex = 0;

function openViewer(file, isVideo) {
  currentViewerIndex = currentFiles.indexOf(file);
  showCurrentMedia();
  modal.style.display = 'flex';
}

function showCurrentMedia() {
  viewerContent.innerHTML = '';
  
  const file = currentFiles[currentViewerIndex];
  const ext = file.split('.').pop().toLowerCase();
  const isVideo = currentSettings.supportedFormats.videos.some(v => v === `.${ext}`);
  
  const media = isVideo 
    ? document.createElement('video') 
    : document.createElement('img');
    
  media.src = `file://${file}`;
  media.className = `modal-media viewer-mode-${currentSettings.viewerMode || 'fit'}`;
  
  if (isVideo) {
    media.controls = false;
    media.autoplay = true;
    media.loop = currentSettings.videoLoop !== false;
    
    // Create custom video controls
    const videoControls = document.createElement('div');
    videoControls.className = 'video-controls';
    
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'video-control-btn play-pause-btn';
    playPauseBtn.innerHTML = '⏸';
    playPauseBtn.onclick = (e) => {
      e.stopPropagation();
      if (media.paused) {
        media.play();
        playPauseBtn.innerHTML = '⏸';
      } else {
        media.pause();
        playPauseBtn.innerHTML = '▶';
      }
    };
    
    const loopBtn = document.createElement('button');
    loopBtn.className = 'video-control-btn loop-btn';
    loopBtn.innerHTML = media.loop ? '🔁' : '↻';
    loopBtn.title = 'Toggle repeat';
    loopBtn.onclick = (e) => {
      e.stopPropagation();
      media.loop = !media.loop;
      loopBtn.innerHTML = media.loop ? '🔁' : '↻';
    };
    
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'video-control-btn fullscreen-btn';
    fullscreenBtn.innerHTML = '⛶';
    fullscreenBtn.title = 'Fullscreen';
    fullscreenBtn.onclick = (e) => {
      e.stopPropagation();
      if (media.requestFullscreen) {
        media.requestFullscreen();
      } else if (media.webkitRequestFullscreen) {
        media.webkitRequestFullscreen();
      }
    };
    
    const enlargeBtn = document.createElement('button');
    enlargeBtn.className = 'video-control-btn enlarge-btn';
    enlargeBtn.innerHTML = '⤢';
    enlargeBtn.title = 'Toggle size';
    let isEnlarged = false;
    enlargeBtn.onclick = (e) => {
      e.stopPropagation();
      if (isEnlarged) {
        media.style.maxWidth = '100%';
        media.style.maxHeight = '100%';
        media.style.width = 'auto';
        media.style.height = 'auto';
        enlargeBtn.innerHTML = '⤢';
      } else {
        media.style.maxWidth = 'none';
        media.style.maxHeight = 'none';
        media.style.width = '100%';
        media.style.height = '100%';
        enlargeBtn.innerHTML = '⤡';
      }
      isEnlarged = !isEnlarged;
    };
    
    const volumeBtn = document.createElement('button');
    volumeBtn.className = 'video-control-btn volume-btn';
    volumeBtn.innerHTML = '🔊';
    volumeBtn.title = 'Volume';
    volumeBtn.onclick = (e) => {
      e.stopPropagation();
      const slider = volumeBtn.nextElementSibling;
      slider.style.display = slider.style.display === 'flex' ? 'none' : 'flex';
    };
    
    const volumeSlider = document.createElement('div');
    volumeSlider.className = 'volume-slider';
    volumeSlider.style.display = 'none';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '100';
    slider.oninput = (e) => {
      media.volume = e.target.value / 100;
      volumeBtn.innerHTML = e.target.value == 0 ? '🔇' : e.target.value < 50 ? '🔉' : '🔊';
    };
    volumeSlider.appendChild(slider);
    
    const screenshotBtn = document.createElement('button');
    screenshotBtn.className = 'video-control-btn screenshot-btn';
    screenshotBtn.innerHTML = '📷';
    screenshotBtn.title = 'Screenshot';
    screenshotBtn.onclick = async (e) => {
      e.stopPropagation();
      const canvas = document.createElement('canvas');
      canvas.width = media.videoWidth;
      canvas.height = media.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}.png`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Screenshot saved!');
      });
    };
    
    videoControls.appendChild(playPauseBtn);
    videoControls.appendChild(loopBtn);
    videoControls.appendChild(volumeBtn);
    videoControls.appendChild(volumeSlider);
    videoControls.appendChild(screenshotBtn);
    videoControls.appendChild(fullscreenBtn);
    videoControls.appendChild(enlargeBtn);
    
    viewerContent.appendChild(videoControls);
  }
  
  // Navigation arrows
  if (currentFiles.length > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-arrow nav-arrow-left';
    prevBtn.innerHTML = '‹';
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      navigateViewer(-1);
    };
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-arrow nav-arrow-right';
    nextBtn.innerHTML = '›';
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      navigateViewer(1);
    };
    
    viewerContent.appendChild(prevBtn);
    viewerContent.appendChild(nextBtn);
  }
  
  // Counter
  const counter = document.createElement('div');
  counter.className = 'viewer-counter';
  counter.textContent = `${currentViewerIndex + 1} / ${currentFiles.length}`;
  viewerContent.appendChild(counter);
  
  viewerContent.appendChild(media);
}

function navigateViewer(direction) {
  currentViewerIndex += direction;
  
  if (currentViewerIndex < 0) {
    currentViewerIndex = currentFiles.length - 1;
  } else if (currentViewerIndex >= currentFiles.length) {
    currentViewerIndex = 0;
  }
  
  showCurrentMedia();
}

// Close modal
closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  viewerContent.innerHTML = '';
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
    viewerContent.innerHTML = '';
  }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (modal.style.display === 'flex') {
    if (e.key === 'ArrowLeft') {
      navigateViewer(-1);
    } else if (e.key === 'ArrowRight') {
      navigateViewer(1);
    } else if (e.key === 'Escape') {
      modal.style.display = 'none';
      viewerContent.innerHTML = '';
    }
  }
});

// Rename modal handlers
renameConfirm.addEventListener('click', () => {
  const newName = renameInput.value.trim();
  if (!newName || !renameTargetPath) return;
  
  const currentName = renameTargetPath.split('\\').pop().split('/').pop();
  const nameWithoutExt = currentName.substring(0, currentName.lastIndexOf('.'));
  const ext = currentName.substring(currentName.lastIndexOf('.'));
  
  if (newName !== nameWithoutExt) {
    const directory = renameTargetPath.substring(0, renameTargetPath.lastIndexOf('\\') || renameTargetPath.lastIndexOf('/'));
    const newPath = `${directory}${directory.includes('\\') ? '\\' : '/'}${newName}${ext}`;
    
    renameFile(renameTargetPath, newPath, renameTargetElement);
  }
  
  renameModal.style.display = 'none';
});

renameCancel.addEventListener('click', () => {
  renameModal.style.display = 'none';
});

renameModal.addEventListener('click', (e) => {
  if (e.target === renameModal) {
    renameModal.style.display = 'none';
  }
});

renameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    renameConfirm.click();
  } else if (e.key === 'Escape') {
    renameModal.style.display = 'none';
  }
});

// Listen to menu-triggered events
window.api.onFolderSelected((path) => loadFolder(path));
window.api.onViewChanged((view) => {
  currentSettings.defaultView = view;
  renderGallery(currentFiles);
});
window.api.onSortChanged((sortBy) => {
  currentSettings.sortBy = sortBy;
  renderGallery(currentFiles);
});
window.api.onSettingChanged((data) => {
  currentSettings[data.key] = data.value;
  if (data.key === 'showFileNames') {
    renderGallery(currentFiles);
  }
});
window.api.onThumbnailSizeChanged((size) => {
  currentSettings.thumbnailSize = size;
  gallery.className = `gallery thumbnail-${size}`;
});

// Apply theme
function applyTheme(color) {
  const themes = {
    purple: { primary: '#667eea', secondary: '#764ba2' },
    blue: { primary: '#4299e1', secondary: '#3182ce' },
    pink: { primary: '#ec4899', secondary: '#db2777' },
    green: { primary: '#10b981', secondary: '#059669' },
    orange: { primary: '#f59e0b', secondary: '#d97706' },
    red: { primary: '#ef4444', secondary: '#dc2626' }
  };
  
  const theme = themes[color] || themes.purple;
  document.documentElement.style.setProperty('--theme-primary', theme.primary);
  document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
}

// Initialize on load
initSettings();
