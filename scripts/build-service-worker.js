const fs = require('fs');
const path = require('path');

const swSrc = path.join(__dirname, '../sw.js');
const swDest = path.join(__dirname, '../public/sw.js');

// Copy service worker to public directory
fs.copyFileSync(swSrc, swDest);

console.log('✅ Service worker copied to public/sw.js');

// Update version in service worker for cache busting
const swContent = fs.readFileSync(swDest, 'utf8');
const timestamp = new Date().getTime();
const updatedContent = swContent.replace(
  /const CACHE_NAME = ['"][^'"]+['"];/,
  `const CACHE_NAME = 'sprintsync-v${timestamp}';`
);
const updatedStaticCache = updatedContent.replace(
  /const STATIC_CACHE = ['"][^'"]+['"];/,
  `const STATIC_CACHE = 'sprintsync-static-v${timestamp}';`
);
const updatedDynamicCache = updatedStaticCache.replace(
  /const DYNAMIC_CACHE = ['"][^'"]+['"];/,
  `const DYNAMIC_CACHE = 'sprintsync-dynamic-v${timestamp}';`
);

fs.writeFileSync(swDest, updatedDynamicCache);

console.log('✅ Service worker version updated with timestamp:', timestamp);