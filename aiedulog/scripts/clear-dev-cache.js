#!/usr/bin/env node

/**
 * Development Cache Management Script
 * Comprehensive solution for Next.js static asset caching issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const nextDir = path.join(projectRoot, '.next');

console.log('🧹 Starting comprehensive cache cleanup...\n');

/**
 * Kill any running Next.js processes
 */
function killNextProcesses() {
  try {
    console.log('1️⃣ Killing existing Next.js processes...');
    execSync('lsof -ti:3000 | xargs kill -9 2>/dev/null || true', { stdio: 'inherit' });
    execSync('lsof -ti:3001 | xargs kill -9 2>/dev/null || true', { stdio: 'inherit' });
    console.log('   ✅ Next.js processes terminated\n');
  } catch (error) {
    console.log('   ✅ No Next.js processes to kill\n');
  }
}

/**
 * Remove all cache directories and files
 */
function clearCaches() {
  console.log('2️⃣ Clearing all cache directories...');
  
  const cachePaths = [
    path.join(nextDir),
    path.join(projectRoot, 'node_modules', '.cache'),
    path.join(projectRoot, '.swc'),
    path.join(projectRoot, '.next-cache'),
    path.join(projectRoot, 'coverage'),
  ];

  cachePaths.forEach(cachePath => {
    if (fs.existsSync(cachePath)) {
      try {
        execSync(`rm -rf "${cachePath}"`, { stdio: 'inherit' });
        console.log(`   🗑️  Removed: ${path.basename(cachePath)}`);
      } catch (error) {
        console.log(`   ⚠️  Could not remove: ${path.basename(cachePath)}`);
      }
    }
  });
  
  console.log('   ✅ Cache directories cleared\n');
}

/**
 * Clear browser cache instructions
 */
function displayBrowserCacheInstructions() {
  console.log('3️⃣ Browser Cache Clearing Required:');
  console.log('   📋 Chrome/Edge: Ctrl+Shift+Delete → Clear all time → Include cached images/files');
  console.log('   📋 Firefox: Ctrl+Shift+Delete → Clear all time → Include cache');
  console.log('   📋 Safari: Develop → Empty Caches (or Cmd+Option+E)');
  console.log('   📋 Or use: Developer Tools → Network tab → Disable cache checkbox\n');
}

/**
 * Regenerate package lock to ensure dependencies are fresh
 */
function refreshDependencies() {
  console.log('4️⃣ Refreshing dependencies...');
  try {
    // Don't actually reinstall, just ensure npm cache is clear
    execSync('npm cache clean --force 2>/dev/null || true', { stdio: 'inherit' });
    console.log('   ✅ npm cache cleared\n');
  } catch (error) {
    console.log('   ⚠️  npm cache clean failed, continuing...\n');
  }
}

/**
 * Create fresh build environment
 */
function prepareFreshBuild() {
  console.log('5️⃣ Preparing fresh build environment...');
  
  // Create fresh .next directory structure
  const nextSubDirs = ['static', 'server', 'cache'];
  
  if (!fs.existsSync(nextDir)) {
    fs.mkdirSync(nextDir, { recursive: true });
  }
  
  nextSubDirs.forEach(subDir => {
    const dirPath = path.join(nextDir, subDir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  console.log('   ✅ Fresh build environment prepared\n');
}

/**
 * Display post-cleanup instructions
 */
function displayPostCleanupInstructions() {
  console.log('🚀 Cache cleanup complete!\n');
  console.log('Next steps:');
  console.log('1. Clear your browser cache (see instructions above)');
  console.log('2. Run: npm run dev');
  console.log('3. Wait for build to complete before opening browser');
  console.log('4. Hard refresh (Ctrl+F5 or Cmd+Shift+R) when accessing the site\n');
  
  console.log('🎯 Expected results:');
  console.log('• No 404 errors for static assets');
  console.log('• Proper MIME types for JS/CSS files');
  console.log('• Consistent asset hashes between manifest and files');
  console.log('• Admin dashboard fully functional\n');
}

/**
 * Main execution
 */
function main() {
  try {
    killNextProcesses();
    clearCaches();
    displayBrowserCacheInstructions();
    refreshDependencies();
    prepareFreshBuild();
    displayPostCleanupInstructions();
  } catch (error) {
    console.error('❌ Error during cache cleanup:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };