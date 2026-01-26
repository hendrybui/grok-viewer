#!/usr/bin/env node

/**
 * Test script to verify Grok Vision integration
 */

console.log('🧪 Testing Grok Vision Integration...\n');

// Test 1: Check Grok Vision module exists
console.log('✅ Test 1: Checking Grok Vision Module');
try {
  const GrokVision = require('./src/main/grok-vision');
  console.log('   ✓ Grok Vision module loaded successfully');
} catch (err) {
  console.log(`   ❌ Failed to load Grok Vision: ${err.message}`);
  process.exit(1);
}

// Test 2: Check main.js has Grok Vision imports
console.log('\n✅ Test 2: Checking main.js Grok Vision Integration');
const fs = require('fs');
const mainJs = fs.readFileSync('./main.js', 'utf8');
const mainChecks = [
  { name: 'GrokVision import', pattern: /require\('\.\/src\/main\/grok-vision'\)/ },
  { name: 'grokVision variable', pattern: /let grokVision;/ },
  { name: 'grokVision initialization', pattern: /grokVision = new GrokVision\(\)/ },
  { name: 'grok:analyzeImage handler', pattern: /ipcMain\.handle\('grok:analyzeImage'/ },
  { name: 'grok:batchAnalyze handler', pattern: /ipcMain\.handle\('grok:batchAnalyze'/ },
  { name: 'grok:compareImages handler', pattern: /ipcMain\.handle\('grok:compareImages'/ },
  { name: 'grok:generateSmartThumbnail handler', pattern: /ipcMain\.handle\('grok:generateSmartThumbnail'/ },
  { name: 'grok:categorizeImages handler', pattern: /ipcMain\.handle\('grok:categorizeImages'/ },
  { name: 'grok:clearCache handler', pattern: /ipcMain\.handle\('grok:clearCache'/ },
  { name: 'grok:getCacheStats handler', pattern: /ipcMain\.handle\('grok:getCacheStats'/ }
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

// Test 3: Check preload.js has Grok Vision APIs
console.log('\n✅ Test 3: Checking preload.js Grok Vision APIs');
const preloadJs = fs.readFileSync('./src/main/preload.js', 'utf8');
const preloadChecks = [
  { name: 'analyzeImage API', pattern: /analyzeImage:/ },
  { name: 'batchAnalyze API', pattern: /batchAnalyze:/ },
  { name: 'compareImages API', pattern: /compareImages:/ },
  { name: 'generateSmartThumbnail API', pattern: /generateSmartThumbnail:/ },
  { name: 'categorizeImages API', pattern: /categorizeImages:/ },
  { name: 'clearGrokCache API', pattern: /clearGrokCache:/ },
  { name: 'getGrokCacheStats API', pattern: /getGrokCacheStats:/ }
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

// Test 4: Check Grok Vision class methods
console.log('\n✅ Test 4: Checking Grok Vision Class Methods');
const GrokVision = require('./src/main/grok-vision');
const grokVision = new GrokVision();
const methods = [
  'analyzeImage',
  'batchAnalyze',
  'compareImages',
  'generateSmartThumbnail',
  'categorizeImages',
  'clearCache',
  'getCacheStats'
];

let methodsOk = true;
methods.forEach(method => {
  if (typeof grokVision[method] === 'function') {
    console.log(`   ✓ ${method} method exists`);
  } else {
    console.log(`   ❌ ${method} method not found`);
    methodsOk = false;
  }
});

// Test 5: Check cache functionality
console.log('\n✅ Test 5: Checking Grok Vision Cache Functionality');
try {
  const stats = grokVision.getCacheStats();
  console.log(`   ✓ Cache stats retrieved: ${JSON.stringify(stats)}`);
  grokVision.clearCache();
  console.log(`   ✓ Cache cleared successfully`);
} catch (err) {
  console.log(`   ❌ Cache functionality error: ${err.message}`);
  methodsOk = false;
}

// Summary
console.log('\n' + '='.repeat(50));
const allOk = mainOk && preloadOk && methodsOk;
if (allOk) {
  console.log('✅ All Grok Vision tests passed! Integration successful.');
  console.log('\nGrok Vision Features Available:');
  console.log('• Image analysis (quality, brightness, contrast)');
  console.log('• Batch image analysis');
  console.log('• Image comparison');
  console.log('• Smart thumbnail generation');
  console.log('• Image categorization');
  console.log('• Cache management');
  console.log('\nNext steps:');
  console.log('1. Run: npm start (to test the app with Grok Vision)');
  console.log('2. Run: npm run build (to create distribution)');
  process.exit(0);
} else {
  console.log('❌ Some Grok Vision tests failed. Please review the output above.');
  process.exit(1);
}
