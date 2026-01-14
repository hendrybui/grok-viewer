// renderer.js - Enhanced with settings support
console.log('Renderer.js loaded successfully');

let currentFiles = [];
let currentSettings = {};
let currentRootPath = null;
let currentFolderPath = null;
let folderTreeData = null;
let selectedFiles = new Set(); // Track selected files for multi-select

// DOM Elements
const pickFolderBtn = document.getElementById('pickFolder');
const sidebar = document.getElementById('sidebar');
const folderTree = document.getElementById('folderTree');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
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
const contextMenu = document.getElementById('contextMenu');

let renameTargetPath = null;
let renameTargetElement = null;
let contextMenuTargetPath = null;

// Check if context menu element exists
if (!contextMenu) {
  console.error('Context menu element not found! Make sure the HTML has an element with id="contextMenu"');
} else {
  console.log('Context menu element found successfully');
}

// Multi-select functions
function toggleFileSelection(filePath, addToSelection = false) {
  if (selectedFiles.has(filePath)) {
    selectedFiles.delete(filePath);
  } else {
    if (!addToSelection) {
      selectedFiles.clear();
    }
    selectedFiles.add(filePath);
  }
  updateSelectionUI();
}

function clearSelection() {
  selectedFiles.clear();
  updateSelectionUI();
}

function selectAllFiles() {
  selectedFiles.clear();
  currentFiles.forEach(file => selectedFiles.add(file));
  updateSelectionUI();
}

function updateSelectionUI() {
  // Update gallery items
  document.querySelectorAll('.gallery-item').forEach(item => {
    const filePath = item.dataset.filePath;
    if (selectedFiles.has(filePath)) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });

  // Update bulk controls visibility
  const bulkControls = document.querySelector('.bulk-controls');
  const selectionCount = document.getElementById('selectionCount');
  
  if (bulkControls && selectionCount) {
    if (selectedFiles.size > 0) {
      bulkControls.style.display = 'flex';
      selectionCount.textContent = `${selectedFiles.size} selected`;
    } else {
      bulkControls.style.display = 'none';
    }
  }
  
  // Dispatch selection changed event for face swap button
  const event = new CustomEvent('selectionChanged');
  document.dispatchEvent(event);
}

// Context Menu Functions
function showContextMenu(x, y, filePath) {
  if (!contextMenu) {
    console.error('Cannot show context menu: element not found');
    return;
  }
  
  contextMenuTargetPath = filePath;
  contextMenu.style.display = 'block';
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  
  // Adjust position if menu goes off screen
  const rect = contextMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
  }
  if (rect.bottom > window.innerHeight) {
    contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
  }
}

function hideContextMenu() {
  if (contextMenu) {
    contextMenu.style.display = 'none';
  }
  contextMenuTargetPath = null;
}

// Handle context menu actions
if (contextMenu) {
  contextMenu.addEventListener('click', async (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item || item.classList.contains('disabled')) return;
    
    const action = item.dataset.action;
    
    if (!contextMenuTargetPath) return;
    
    // Store the target path before hiding menu (which clears it)
    const targetPath = contextMenuTargetPath;
    hideContextMenu();
    
    try {
      switch (action) {
        case 'copy':
          const copyResult = await window.api.copyFile(targetPath);
          if (copyResult.success) showToast(copyResult.message);
          break;
          
        case 'cut':
          const cutResult = await window.api.cutFile(targetPath);
          if (cutResult.success) showToast(cutResult.message);
          break;
          
        case 'paste':
          const pasteDir = currentFolderPath || currentRootPath;
          const pasteResult = await window.api.pasteFile(pasteDir);
          if (pasteResult.success) {
            showToast(pasteResult.message);
            await loadFolder(currentRootPath, false);
          }
          break;
          
        case 'edit':
          await window.api.editFile(targetPath);
          break;
          
        case 'showInFolder':
          await window.api.showInFolder(targetPath);
          break;
          
        case 'copyPath':
          const pathResult = await window.api.copyPath(targetPath);
          if (pathResult.success) showToast(pathResult.message);
          break;
          
        case 'properties':
          const propsResult = await window.api.getFileProperties(targetPath);
          if (propsResult.success) {
            showFileProperties(propsResult.properties);
          }
          break;
          
        case 'delete':
          if (confirm('Are you sure you want to delete this file?')) {
            const deleteResult = await window.api.deleteFile(targetPath);
            if (deleteResult.success) {
              showToast('File deleted');
              await loadFolder(currentRootPath, false);
            }
          }
          break;
          
        case 'rotate90':
          const rotate90Result = await window.api.rotateImage(targetPath, 90);
          if (rotate90Result.success) {
            showToast('Image rotated 90° CW');
            await loadFolder(currentRootPath, false);
          }
          break;
          
        case 'rotate270':
          const rotate270Result = await window.api.rotateImage(targetPath, 270);
          if (rotate270Result.success) {
            showToast('Image rotated 90° CCW');
            await loadFolder(currentRootPath, false);
          }
          break;
          
        case 'flipH':
          const flipHResult = await window.api.flipImage(targetPath, 'horizontal');
          if (flipHResult.success) {
            showToast('Image flipped horizontally');
            await loadFolder(currentRootPath, false);
          }
          break;
          
        case 'flipV':
          const flipVResult = await window.api.flipImage(targetPath, 'vertical');
          if (flipVResult.success) {
            showToast('Image flipped vertically');
            await loadFolder(currentRootPath, false);
          }
          break;
          
        case 'addToCollection':
          if (window.enhancedFeatures) {
            window.enhancedFeatures.addToCollection(targetPath);
          }
          break;
      }
    } catch (err) {
      showToast('Action failed: ' + err.message, true);
    }
  });
}

// Close context menu when clicking outside
document.addEventListener('click', (e) => {
  if (contextMenu && !contextMenu.contains(e.target)) {
    hideContextMenu();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
  // Ctrl+A to select all files
  if (e.ctrlKey && e.key === 'a' && !e.shiftKey) {
    e.preventDefault();
    selectAllFiles();
    return;
  }
  
  if (!contextMenuTargetPath && currentFiles.length === 0) return;
  
  if (e.ctrlKey && e.key === 'c' && contextMenuTargetPath) {
    e.preventDefault();
    const result = await window.api.copyFile(contextMenuTargetPath);
    if (result.success) showToast(result.message);
  }
  
  if (e.ctrlKey && e.key === 'x' && contextMenuTargetPath) {
    e.preventDefault();
    const result = await window.api.cutFile(contextMenuTargetPath);
    if (result.success) showToast(result.message);
  }
  
  if (e.ctrlKey && e.key === 'v') {
    e.preventDefault();
    const pasteDir = currentFolderPath || currentRootPath;
    const result = await window.api.pasteFile(pasteDir);
    if (result.success) {
      showToast(result.message);
      await loadFolder(currentRootPath, false);
    }
  }
  
  if (e.key === 'Delete' && contextMenuTargetPath) {
    e.preventDefault();
    if (confirm('Are you sure you want to delete this file?')) {
      const result = await window.api.deleteFile(contextMenuTargetPath);
      if (result.success) {
        showToast('File deleted');
        await loadFolder(currentRootPath, false);
      }
    }
  }
  
  // Ctrl+B to toggle sidebar
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault();
    if (sidebar.style.display === 'none') {
      sidebar.style.display = 'flex';
    }
    sidebar.classList.toggle('collapsed');
    toggleSidebarBtn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
    showToast(sidebar.classList.contains('collapsed') ? 'Sidebar hidden' : 'Sidebar shown');
  }
});

function createMetadataItem(label, value) {
  const item = document.createElement('div');
  item.className = 'metadata-item';
  
  const labelSpan = document.createElement('span');
  labelSpan.className = 'metadata-label';
  labelSpan.textContent = label + ':';
  
  const valueSpan = document.createElement('span');
  valueSpan.className = 'metadata-value';
  valueSpan.textContent = value;
  valueSpan.title = value;
  
  item.appendChild(labelSpan);
  item.appendChild(valueSpan);
  
  return item;
}

function showFileProperties(props) {
  const message = `
Name: ${props.name}
Path: ${props.path}
Size: ${props.sizeFormatted}
Created: ${new Date(props.created).toLocaleString()}
Modified: ${new Date(props.modified).toLocaleString()}
  `.trim();
  alert(message);
}

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

document.getElementById('detailViewBtn').addEventListener('click', async () => {
  await window.api.setSetting('defaultView', 'detail');
  currentSettings.defaultView = 'detail';
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

// Toggle sidebar
toggleSidebarBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  toggleSidebarBtn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
  updateFloatingToggle();
});

// Bulk controls event listeners
document.getElementById('selectAllBtn')?.addEventListener('click', selectAllFiles);
document.getElementById('deselectAllBtn')?.addEventListener('click', clearSelection);

document.getElementById('bulkDeleteBtn')?.addEventListener('click', async () => {
  if (selectedFiles.size === 0) return;
  
  const count = selectedFiles.size;
  if (!confirm(`Are you sure you want to delete ${count} file${count > 1 ? 's' : ''}?`)) {
    return;
  }
  
  let deletedCount = 0;
  for (const filePath of selectedFiles) {
    const result = await window.api.deleteFile(filePath);
    if (result && result.success) {
      deletedCount++;
      const index = currentFiles.indexOf(filePath);
      if (index !== -1) {
        currentFiles.splice(index, 1);
      }
      
      // Remove from favorites if present
      const favIndex = currentSettings.favorites.indexOf(filePath);
      if (favIndex > -1) {
        currentSettings.favorites.splice(favIndex, 1);
      }
    }
  }
  
  if (deletedCount > 0) {
    await window.api.setSetting('favorites', currentSettings.favorites);
    showToast(`Deleted ${deletedCount} file${deletedCount > 1 ? 's' : ''}`);
    clearSelection();
    await loadFolder(currentRootPath, false);
  }
});

document.getElementById('bulkMoveBtn')?.addEventListener('click', async () => {
  if (selectedFiles.size === 0) return;
  const destFolder = await window.api.openDirectory();
  if (destFolder) {
    let movedCount = 0;
    for (const filePath of selectedFiles) {
      const fileName = filePath.split('\\').pop().split('/').pop();
      const newPath = destFolder + (destFolder.endsWith('\\') || destFolder.endsWith('/') ? '' : '/') + fileName;
      const result = await window.api.moveFile(filePath, newPath);
      if (result && result.success) {
        movedCount++;
        const index = currentFiles.indexOf(filePath);
        if (index !== -1) {
          currentFiles.splice(index, 1);
        }
      }
    }
    
    if (movedCount > 0) {
      showToast(`Moved ${movedCount} file${movedCount > 1 ? 's' : ''}`);
      clearSelection();
      await loadFolder(currentRootPath, false);
    }
  }
});

// Create floating toggle button for when sidebar is collapsed
const floatingToggle = document.createElement('button');
floatingToggle.id = 'floatingToggle';
floatingToggle.className = 'floating-sidebar-toggle';
floatingToggle.innerHTML = '▶';
floatingToggle.title = 'Show Sidebar (Ctrl+B)';
floatingToggle.style.display = 'none';
floatingToggle.addEventListener('click', () => {
  sidebar.classList.remove('collapsed');
  toggleSidebarBtn.textContent = '◀';
  updateFloatingToggle();
});
document.body.appendChild(floatingToggle);

// Update floating toggle visibility
function updateFloatingToggle() {
  if (sidebar.style.display !== 'none' && sidebar.classList.contains('collapsed')) {
    floatingToggle.style.display = 'flex';
  } else {
    floatingToggle.style.display = 'none';
  }
}

// Initial check
updateFloatingToggle();

// Load folder
async function loadFolder(folderPath, updateTree = true) {
  currentRootPath = folderPath;
  currentFolderPath = folderPath;
  
  // Show sidebar and load folder tree
  sidebar.style.display = 'flex';
  updateFloatingToggle();
  
  if (updateTree) {
    folderTreeData = await window.api.getFolderTree(folderPath);
    renderFolderTree(folderTreeData);
  }
  
  const files = await window.api.scanFiles(folderPath);
  currentFiles = files;
  controlsBar.style.display = files.length > 0 ? 'flex' : 'none';
  renderGallery(files);
}

// Load specific folder from tree
async function loadFolderFromTree(folderPath) {
  currentFolderPath = folderPath;
  const files = await window.api.scanFiles(folderPath);
  currentFiles = files;
  controlsBar.style.display = files.length > 0 ? 'flex' : 'none';
  renderGallery(files);
  
  // Update active state in tree
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.path === folderPath) {
      item.classList.add('active');
    }
  });
}

// Render folder tree
function renderFolderTree(folderData) {
  if (!folderData) {
    folderTree.innerHTML = '<p class="placeholder-text">Error loading folders</p>';
    return;
  }
  
  // Update summary
  const folderSummary = document.getElementById('folderSummary');
  folderSummary.style.display = 'flex';
  document.getElementById('totalImages').textContent = folderData.totalImageCount || 0;
  document.getElementById('totalVideos').textContent = folderData.totalVideoCount || 0;
  document.getElementById('totalFiles').textContent = (folderData.totalImageCount || 0) + (folderData.totalVideoCount || 0);
  
  folderTree.innerHTML = '';
  
  function createFolderElement(folder, isRoot = false) {
    const folderItem = document.createElement('div');
    folderItem.className = `folder-item ${isRoot ? 'root' : ''} ${folder.path === currentFolderPath ? 'active' : ''}`;
    folderItem.dataset.path = folder.path;
    
    const totalImages = folder.totalImageCount || 0;
    const totalVideos = folder.totalVideoCount || 0;
    const hasFiles = totalImages > 0 || totalVideos > 0;
    
    let countsHTML = '';
    if (hasFiles) {
      countsHTML = '<span class="folder-count">';
      if (totalImages > 0) {
        countsHTML += `<span class="count-badge images">🖼️ ${totalImages}</span>`;
      }
      if (totalVideos > 0) {
        countsHTML += `<span class="count-badge videos">🎬 ${totalVideos}</span>`;
      }
      countsHTML += '</span>';
    }
    
    folderItem.innerHTML = `
      <span class="folder-icon">📁</span>
      <span class="folder-name" title="${folder.name}">${folder.name}</span>
      ${countsHTML}
    `;
    
    folderItem.addEventListener('click', (e) => {
      e.stopPropagation();
      loadFolderFromTree(folder.path);
    });
    
    return folderItem;
  }
  
  function renderFolder(folder, container, isRoot = false) {
    const folderElement = createFolderElement(folder, isRoot);
    container.appendChild(folderElement);
    
    if (folder.children && folder.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'folder-children';
      
      folder.children
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(child => renderFolder(child, childrenContainer));
      
      container.appendChild(childrenContainer);
    }
  }
  
  renderFolder(folderData, folderTree, true);
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
    gallery.className = `gallery list-view-mode thumbnail-${currentSettings.thumbnailSize}`;
  } else if (currentSettings.defaultView === 'detail') {
    gallery.className = `gallery detail-view-mode`;
  } else {
    gallery.className = `gallery thumbnail-${currentSettings.thumbnailSize}`;
  }

  sortedFiles.forEach(async (file, index) => {
    const ext = file.split('.').pop().toLowerCase();
    const isVideo = currentSettings.supportedFormats.videos.some(v => v === `.${ext}`);
    const fileName = file.split('\\').pop().split('/').pop();
    
    const item = document.createElement('div');
    let itemClass = '';
    if (currentSettings.defaultView === 'list') itemClass = 'list-view';
    else if (currentSettings.defaultView === 'detail') itemClass = 'detail-view';
    else if (currentSettings.defaultView === 'flex') itemClass = 'flex-view';
    
    item.className = `gallery-item ${itemClass}`;
    item.dataset.filePath = file; // Store file path for selection tracking
    
    const media = isVideo
      ? document.createElement('video')
      : document.createElement('img');
        
    media.src = `file://${file}`;
    media.className = 'gallery-media';
    
    // Track double-click state
    let clickTimeout = null;
    let lastClickTime = 0;
    
    // Click handler for selection (single click)
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - lastClickTime;
      
      // Check if this is a double-click (less than 300ms between clicks)
      if (timeDiff < 300) {
        // Double-click detected - open viewer
        clearTimeout(clickTimeout);
        openViewer(file, isVideo);
      } else {
        // Single click - select/deselect
        clickTimeout = setTimeout(() => {
          const addToSelection = e.ctrlKey || e.metaKey;
          toggleFileSelection(file, addToSelection);
        }, 300);
      }
      
      lastClickTime = currentTime;
    });
    
    // Double-click handler as backup
    item.addEventListener('dblclick', (e) => {
      e.preventDefault();
      clearTimeout(clickTimeout);
      openViewer(file, isVideo);
    });
    
    if (isVideo) {
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.preload = 'metadata';
      
      // Add error handling
      media.addEventListener('error', (e) => {
        console.error('Video preview error:', file, e);
        // Create a fallback placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'video-placeholder';
        placeholder.innerHTML = '🎬<br>Video<br>Click to play';
        placeholder.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); color: white; width: 100%; height: 100%; font-size: 14px; cursor: pointer;';
        placeholder.addEventListener('click', () => openViewer(file, true));
        media.replaceWith(placeholder);
      });
      
      // Load video metadata first
      media.addEventListener('loadedmetadata', () => {
        // Use Intersection Observer for auto-play when visible
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              media.play().catch(e => {
                console.log('Autoplay prevented:', file, e);
                // Show play overlay on autoplay failure
                if (!media.parentElement.querySelector('.play-overlay')) {
                  const overlay = document.createElement('div');
                  overlay.className = 'play-overlay';
                  overlay.innerHTML = '▶';
                  overlay.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 18px; pointer-events: none; z-index: 1;';
                  media.parentElement.appendChild(overlay);
                }
              });
            } else {
              media.pause();
            }
          });
        }, { threshold: 0.5 });
        
        observer.observe(media);
      });
      
      // Also play on hover for immediate interaction
      if (currentSettings.autoPlayVideos) {
        media.addEventListener('mouseenter', () => {
          media.play().catch(e => console.log('Hover play prevented:', e));
          // Remove play overlay on hover
          const overlay = media.parentElement?.querySelector('.play-overlay');
          if (overlay) overlay.remove();
        });
        media.addEventListener('mouseleave', () => {
          // Only pause if not in view
          const rect = media.getBoundingClientRect();
          const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
          if (!inView) media.pause();
        });
      }
    }
    
    // Add right-click context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      console.log('Right-click detected on file:', file);
      contextMenuTargetPath = file;
      showContextMenu(e.clientX, e.clientY, file);
    });
    
    item.appendChild(media);
    
    // List view: Add file info below media
    if (currentSettings.defaultView === 'list') {
      const fileNameContainer = document.createElement('div');
      fileNameContainer.className = 'file-name-container';
      
      const fileNameDiv = document.createElement('div');
      fileNameDiv.className = 'file-name';
      fileNameDiv.textContent = fileName;
      fileNameDiv.title = fileName;
      
      const fileMeta = document.createElement('div');
      fileMeta.className = 'file-meta';
      
      const typeBadge = document.createElement('span');
      typeBadge.className = `file-type-badge ${isVideo ? 'video' : 'image'}`;
      typeBadge.textContent = isVideo ? 'Video' : 'Image';
      
      fileMeta.appendChild(typeBadge);
      
      // Get file size asynchronously
      window.api.getFileProperties(file).then(result => {
        if (result.success && result.properties.sizeFormatted) {
          const sizeSpan = document.createElement('span');
          sizeSpan.textContent = result.properties.sizeFormatted;
          fileMeta.appendChild(sizeSpan);
        }
      });
      
      fileNameContainer.appendChild(fileNameDiv);
      fileNameContainer.appendChild(fileMeta);
      item.appendChild(fileNameContainer);
    }
    
    // Detail view: Add file info section
    if (currentSettings.defaultView === 'detail') {
      const fileInfo = document.createElement('div');
      fileInfo.className = 'file-info';
      
      const fileNameDiv = document.createElement('div');
      fileNameDiv.className = 'file-name';
      fileNameDiv.textContent = fileName;
      fileInfo.appendChild(fileNameDiv);
      
      // Get file metadata asynchronously
      window.api.getFileProperties(file).then(result => {
        if (result.success) {
          const metadata = document.createElement('div');
          metadata.className = 'file-metadata';
          
          const typeItem = createMetadataItem('Type', isVideo ? 'Video' : 'Image');
          const sizeItem = createMetadataItem('Size', result.properties.sizeFormatted);
          const modifiedItem = createMetadataItem('Modified', new Date(result.properties.modified).toLocaleDateString());
          const pathItem = createMetadataItem('Location', file.substring(0, 60) + (file.length > 60 ? '...' : ''));
          
          metadata.appendChild(typeItem);
          metadata.appendChild(sizeItem);
          metadata.appendChild(modifiedItem);
          metadata.appendChild(pathItem);
          
          fileInfo.appendChild(metadata);
        }
      });
      
      // Action buttons for detail view
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'file-actions';
      
      const favBtn = document.createElement('button');
      favBtn.className = 'action-btn fav-btn';
      favBtn.innerHTML = currentSettings.favorites.includes(file) ? '❤️ Favorite' : '♡ Favorite';
      favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(file, favBtn);
      };
      
      const editBtn = document.createElement('button');
      editBtn.className = 'action-btn';
      editBtn.innerHTML = '✏️ Edit';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        window.api.editFile(file);
      };
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn delete-btn';
      deleteBtn.innerHTML = '🗑️ Delete';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteFile(file, item);
      };
      
      actionsDiv.appendChild(favBtn);
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);
      
      fileInfo.appendChild(actionsDiv);
      item.appendChild(fileInfo);
    }
    // Standard view (not list or detail): Show file names if enabled
    else if (currentSettings.showFileNames && currentSettings.defaultView !== 'list') {
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
      
      // Update favorites if file was favorited
      const favIndex = currentSettings.favorites.indexOf(oldPath);
      if (favIndex > -1) {
        currentSettings.favorites[favIndex] = newPath;
        await window.api.setSetting('favorites', currentSettings.favorites);
      }
      
      // Update display if element provided
      if (fileNameElement) {
        const newFileName = newPath.split('\\').pop().split('/').pop();
        fileNameElement.textContent = newFileName;
      }
      
      // Reload gallery to show updated file
      await loadFolder(currentRootPath, false);
      
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


// Open viewer modal
let currentViewerIndex = 0;

function openViewer(file, isVideo) {
  currentViewerIndex = currentFiles.indexOf(file);
  showCurrentMedia();
  modal.style.display = 'flex';
  
  // Add EXIF and Adjustments buttons to viewer
  if (window.exifViewer) {
    window.exifViewer.addToViewer(file);
  }
  if (window.imageAdjustments) {
    window.imageAdjustments.addToViewer();
  }
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
    
    // Create progress bar container
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'video-progress-container';
    
    const currentTimeDisplay = document.createElement('span');
    currentTimeDisplay.className = 'time-display';
    currentTimeDisplay.textContent = '0:00';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'video-progress-bar';
    const progressFilled = document.createElement('div');
    progressFilled.className = 'video-progress-filled';
    progressBar.appendChild(progressFilled);
    
    const durationDisplay = document.createElement('span');
    durationDisplay.className = 'time-display';
    durationDisplay.textContent = '0:00';
    
    // Format time helper
    const formatTime = (seconds) => {
      if (isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Update progress bar
    media.addEventListener('loadedmetadata', () => {
      durationDisplay.textContent = formatTime(media.duration);
    });
    
    media.addEventListener('timeupdate', () => {
      const percent = (media.currentTime / media.duration) * 100 || 0;
      progressFilled.style.width = `${percent}%`;
      currentTimeDisplay.textContent = formatTime(media.currentTime);
    });
    
    // Seek functionality
    progressBar.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      media.currentTime = pos * media.duration;
    });
    
    // Draggable seek
    let isSeeking = false;
    progressBar.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      isSeeking = true;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isSeeking) {
        const rect = progressBar.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        media.currentTime = pos * media.duration;
      }
    });
    
    document.addEventListener('mouseup', () => {
      isSeeking = false;
    });
    
    progressBarContainer.appendChild(currentTimeDisplay);
    progressBarContainer.appendChild(progressBar);
    progressBarContainer.appendChild(durationDisplay);
    
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'video-control-btn play-pause-btn';
    playPauseBtn.innerHTML = '⏸';
    
    // Update play/pause button based on video state
    media.addEventListener('play', () => {
      playPauseBtn.innerHTML = '⏸';
    });
    
    media.addEventListener('pause', () => {
      playPauseBtn.innerHTML = '▶';
    });
    
    playPauseBtn.onclick = (e) => {
      e.stopPropagation();
      if (media.paused) {
        media.play();
      } else {
        media.pause();
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
    
    // Add progress bar first (at top of controls)
    viewerContent.appendChild(progressBarContainer);
    
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
  
  // Add right-click context menu to viewer media
  media.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextMenuTargetPath = file;
    showContextMenu(e.clientX, e.clientY, file);
  });
  
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
    // Get current video element if exists
    const videoElement = viewerContent.querySelector('video');
    
    if (e.key === 'ArrowLeft' && !e.shiftKey) {
      if (videoElement && e.ctrlKey) {
        // Ctrl+Left: Seek backward 10 seconds
        e.preventDefault();
        videoElement.currentTime = Math.max(0, videoElement.currentTime - 10);
      } else {
        // Navigate to previous media
        navigateViewer(-1);
      }
    } else if (e.key === 'ArrowRight' && !e.shiftKey) {
      if (videoElement && e.ctrlKey) {
        // Ctrl+Right: Seek forward 10 seconds
        e.preventDefault();
        videoElement.currentTime = Math.min(videoElement.duration, videoElement.currentTime + 10);
      } else {
        // Navigate to next media
        navigateViewer(1);
      }
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      // Space: Play/pause video
      if (videoElement) {
        e.preventDefault();
        if (videoElement.paused) {
          videoElement.play();
        } else {
          videoElement.pause();
        }
      }
    } else if (e.key === 'ArrowUp' && videoElement) {
      // Arrow Up: Increase volume
      e.preventDefault();
      videoElement.volume = Math.min(1, videoElement.volume + 0.1);
    } else if (e.key === 'ArrowDown' && videoElement) {
      // Arrow Down: Decrease volume
      e.preventDefault();
      videoElement.volume = Math.max(0, videoElement.volume - 0.1);
    } else if (e.key === 'm' || e.key === 'M') {
      // M: Toggle mute
      if (videoElement) {
        e.preventDefault();
        videoElement.muted = !videoElement.muted;
      }
    } else if (e.key === 'Escape') {
      modal.style.display = 'none';
      viewerContent.innerHTML = '';
    }
  }
});

// Rename modal handlers
renameConfirm.addEventListener('click', async () => {
  const newName = renameInput.value.trim();
  if (!newName || !renameTargetPath) return;
  
  const currentName = renameTargetPath.split('\\').pop().split('/').pop();
  const nameWithoutExt = currentName.substring(0, currentName.lastIndexOf('.'));
  const ext = currentName.substring(currentName.lastIndexOf('.'));
  
  if (newName !== nameWithoutExt) {
    // Determine path separator
    const separator = renameTargetPath.includes('\\') ? '\\' : '/';
    const lastSepIndex = renameTargetPath.lastIndexOf(separator);
    const directory = renameTargetPath.substring(0, lastSepIndex);
    const newPath = `${directory}${separator}${newName}${ext}`;
    
    console.log('Renaming:', renameTargetPath, 'to', newPath);
    await renameFile(renameTargetPath, newPath, renameTargetElement);
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

// Initialize enhanced features when available
if (window.enhancedFeatures) {
  window.addEventListener('load', () => {
    window.enhancedFeatures.init();
    window.enhancedFeatures.setupLazyLoading();
    window.enhancedFeatures.setupVirtualScrolling();
  });
}

// Expose currentFiles and currentViewerIndex globally for other modules
window.currentFiles = currentFiles;
window.currentViewerIndex = currentViewerIndex;

// Listen for folder-selected event from drag-drop
window.addEventListener('folder-selected', (e) => {
  if (e.detail && typeof loadFolder === 'function') {
    loadFolder(e.detail);
  }
});
