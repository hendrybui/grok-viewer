#!/usr/bin/env node

/**
 * Test script to verify upgrades are working correctly
 */

console.log('🧪 Running Grok Viewer Upgrade Tests...\n');

// Test 1: Check dependencies
console.log('✅ Test 1: Checking Dependencies');
const packageJson = require('./package.json');
const expectedDeps = {
  'electron': '^39',
  'electron-builder': '^26',
  'sharp': '^0.34',
  'electron-updater': '^6'
};

let depsOk = true;
Object.entries(expectedDeps).forEach(([dep, version]) => {
  const actualVersion = packageJson.devDependencies?.[dep] || packageJson.dependencies?.[dep];
  if (!actualVersion || !actualVersion.startsWith(version)) {
    console.log(`   ❌ ${dep}: expected ${version}, got ${actualVersion || 'missing'}`);
    depsOk = false;
  } else {
    console.log(`   ✓ ${dep}: ${actualVersion}`);
  }
});

// Test 2: Check new files exist
console.log('\n✅ Test 2: Checking New Files');
const fs = require('fs');
const path = require('path');
const newFiles = [
  'src/main/updater.js',
  'src/main/exif-handler.js',
  'src/renderer/exif-viewer.js',
  'assets/exif-viewer.css',
  '.eslintrc.json'
];

let filesOk = true;
newFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  if (exists) {
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   ❌ ${file} - missing`);
    filesOk = false;
  }
});

// Test 3: Check main.js has new imports
console.log('\n✅ Test 3: Checking main.js Integration');
const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const mainChecks = [
  { name: 'AppUpdater import', pattern: /require\('\.\/src\/main\/updater'\)/ },
  { name: 'ExifHandler import', pattern: /require\('\.\/src\/main\/exif-handler'\)/ },
  { name: 'EXIF IPC handler', pattern: /ipcMain\.handle\('file:getMetadata'/ },
  { name: 'Update IPC handler', pattern: /ipcMain\.handle\('app:checkForUpdates'/ }
];

let mainOk = true;
mainChecks.forEach(check => {
  if (check.pattern.test(mainJs)) {
    console.log(`   ✓ ${check.name}`);
  } else {
    console.log(`   ❌ ${check.name} - not found`);
    mainOk = false;
  }
});

// Test 4: Check preload.js has new APIs
console.log('\n✅ Test 4: Checking preload.js APIs');
const preloadJs = fs.readFileSync(path.join(__dirname, 'src/main/preload.js'), 'utf8');
const preloadChecks = [
  { name: 'getFileMetadata API', pattern: /getFileMetadata/ },
  { name: 'getBatchMetadata API', pattern: /getBatchMetadata/ },
  { name: 'checkForUpdates API', pattern: /checkForUpdates/ },
  { name: 'onUpdateStatus listener', pattern: /onUpdateStatus/ }
];

let preloadOk = true;
preloadChecks.forEach(check => {
  if (check.pattern.test(preloadJs)) {
    console.log(`   ✓ ${check.name}`);
  } else {
    console.log(`   ❌ ${check.name} - not found`);
    preloadOk = false;
  }
});

// Test 5: Check HTML has new scripts
console.log('\n✅ Test 5: Checking HTML Integration');
const htmlFile = fs.readFileSync(path.join(__dirname, 'src/renderer/index.html'), 'utf8');
const htmlChecks = [
  { name: 'EXIF viewer CSS', pattern: /exif-viewer\.css/ },
  { name: 'EXIF viewer script', pattern: /exif-viewer\.js/ }
];

let htmlOk = true;
htmlChecks.forEach(check => {
  if (check.pattern.test(htmlFile)) {
    console.log(`   ✓ ${check.name}`);
  } else {
    console.log(`   ❌ ${check.name} - not found`);
    htmlOk = false;
  }
});

// Test 6: Check Sharp can load (basic test)
console.log('\n✅ Test 6: Checking Sharp Installation');
try {
  const sharp = require('sharp');
  console.log(`   ✓ Sharp loaded successfully (version: ${sharp.versions.sharp})`);
} catch (err) {
  console.log(`   ❌ Sharp failed to load: ${err.message}`);
}

// Summary
console.log('\n' + '='.repeat(50));
const allOk = depsOk && filesOk && mainOk && preloadOk && htmlOk;
if (allOk) {
  console.log('✅ All tests passed! Upgrades installed successfully.');
  console.log('\nNext steps:');
  console.log('1. Run: npm start (to test the app)');
  console.log('2. Run: npm run build (to create distribution)');
  console.log('3. Create a GitHub release to enable auto-updates');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the output above.');
  process.exit(1);
}
