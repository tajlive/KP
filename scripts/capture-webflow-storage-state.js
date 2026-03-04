#!/usr/bin/env node

/**
 * Capture Webflow auth session (Playwright storageState)
 * 
 * FIXED: Uses Firefox instead of Chrome to avoid macOS crashes
 * 
 * Goal: run once locally (headed), login manually (Google/SSO/2FA), then save storageState.json.
 *
 * Usage:
 *   node scripts/capture-webflow-storage-state.js
 *
 * Output:
 *   - .auth/webflow-storage-state.json
 *   - Prints base64 you can paste into GitHub Secret: WEBFLOW_STORAGE_STATE_B64
 */

const { firefox } = require('playwright');  // CHANGED: Firefox instead of Chromium
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LOGIN_URL = process.env.WEBFLOW_LOGIN_URL || 'https://webflow.com/dashboard/login';
const OUT_DIR = path.join(process.cwd(), '.auth');
const OUT_PATH = path.join(OUT_DIR, 'webflow-storage-state.json');

const MAX_RETRIES = 2;

// Progress animation
function showProgress(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r${frames[i]} ${message}`);
    i = (i + 1) % frames.length;
  }, 100);
  return () => {
    clearInterval(interval);
    process.stdout.write('\r');
  };
}

async function captureSession(retryCount = 0) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('\n🔐 Klarpakke Webflow Authentication Capture');
  console.log('━'.repeat(60));
  console.log('🦊 Using Firefox (stable on macOS)');
  
  if (retryCount > 0) {
    console.log(`\n🔄 Retry attempt ${retryCount}/${MAX_RETRIES}`);
  }

  let browser;
  let context;
  let page;
  
  try {
    console.log('\n📂 Launching Firefox...');
    
    browser = await firefox.launch({ 
      headless: false,
      firefoxUserPrefs: {
        'dom.webdriver.enabled': false,
        'useAutomationExtension': false
      }
    });
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🎯 INSTRUCTIONS - Please follow these steps:         ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  1. Firefox will open with Webflow login page          ║');
    console.log('║  2. Log in using EMAIL + PASSWORD (NOT Google SSO!)    ║');
    console.log('║  3. After login, STAY on the dashboard page            ║');
    console.log('║  4. DO NOT close the browser - script will auto-save   ║');
    console.log('║  5. Wait for "✅ Session saved" message                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Visual progress while waiting
    const stopProgress = showProgress('Waiting for you to log in (use email + password)...');
    
    try {
      // Wait for dashboard URL with longer timeout
      await page.waitForURL('**/dashboard/**', { timeout: 420000 }); // 7 minutes
      stopProgress();
      
      console.log('\n✅ Login detected! Waiting for page to stabilize...');
      await page.waitForTimeout(5000); // Give it extra time
      
    } catch (timeoutError) {
      stopProgress();
      
      // Check if we're actually on dashboard despite timeout
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard')) {
        console.log('\n✅ Found dashboard URL, proceeding...');
      } else {
        throw new Error(`Timeout waiting for login. Current URL: ${currentUrl}`);
      }
    }

    console.log('\n💾 Saving session...');

    // Save storageState
    const storageState = await context.storageState();
    fs.writeFileSync(OUT_PATH, JSON.stringify(storageState, null, 2), 'utf8');

    const raw = fs.readFileSync(OUT_PATH, 'utf8');
    
    // Compress with gzip
    const compressed = zlib.gzipSync(raw);
    const b64 = compressed.toString('base64');
    
    const originalSize = Buffer.byteLength(raw, 'utf8');
    const compressedSize = compressed.length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log('\n✅ Session saved successfully!');
    console.log('━'.repeat(60));
    console.log(`📁 File: ${OUT_PATH}`);
    console.log(`📊 Original: ${(originalSize / 1024).toFixed(1)} KB`);
    console.log(`📦 Compressed: ${(compressedSize / 1024).toFixed(1)} KB (${compressionRatio}% smaller)`);
    
    if (compressedSize > 65535) {
      console.warn('\n⚠️  Compressed size > 64 KB - GitHub might reject!');
      console.warn('   Run: node scripts/clean-storage-state.js (if it exists)\n');
    }
    
    console.log('\n📋 COPY THIS TO GITHUB SECRET: WEBFLOW_STORAGE_STATE_B64');
    console.log('─'.repeat(80));
    console.log(b64);
    console.log('─'.repeat(80));
    
    // Offer to set GitHub secret automatically
    console.log('\n💡 TIP: Set secret automatically with:');
    console.log('   gh secret set WEBFLOW_STORAGE_STATE_B64 -b"' + b64 + '"');
    
    console.log('\n✨ Done! Closing browser in 3 seconds...\n');
    
    await page.waitForTimeout(3000);
    await browser.close();
    
    return true;

  } catch (err) {
    console.error('\n❌ Error:', err?.message || err);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Browser already closed
      }
    }
    
    // Retry if browser was closed prematurely
    if (err.message && err.message.includes('closed') && retryCount < MAX_RETRIES) {
      console.log('\n⚠️  Browser was closed too early. Please keep it open until "Session saved"!');
      console.log('\n🔄 Retrying in 3 seconds...');
      await new Promise(r => setTimeout(r, 3000));
      return captureSession(retryCount + 1);
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('  1. Use EMAIL + PASSWORD login (not Google SSO)');
    console.error('  2. Wait on dashboard page after login');
    console.error('  3. DO NOT close browser - wait for "Session saved"');
    console.error('  4. Check if Webflow is accessible in your browser\n');
    
    return false;
  }
}

async function main() {
  const success = await captureSession();
  process.exit(success ? 0 : 1);
}

main();
