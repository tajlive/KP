import { chromium } from 'playwright';
import { loginToWebflow } from './webflow-login.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateCustomCode() {
  console.log('🚀 Starter Webflow Custom Code oppdatering...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login
    await loginToWebflow(page);
    
    // Gå til Sites
    await page.click('a[href="/dashboard/sites"]');
    await page.waitForTimeout(2000);
    
    // Finn ditt site (du må kanskje justere selector)
    console.log('🔍 Søker etter Klarpakke site...');
    
    // Klikk på første site (eller søk etter "klarpakke")
    const siteCard = await page.locator('text=/klarpakke/i').first();
    await siteCard.click();
    await page.waitForTimeout(2000);
    
    // Gå til Project Settings
    console.log('⚙️ Åpner Project Settings...');
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(1000);
    
    // Gå til Custom Code tab
    await page.click('text=Custom Code');
    await page.waitForTimeout(1000);
    
    // HEAD CODE
    console.log('📝 Oppdaterer HEAD code...');
    const headCode = `<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Configuration -->
<script>
  window.KLARPAKKE_CONFIG = {
    SUPABASE_URL: '${process.env.SUPABASE_URL}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY}'
  };
</script>`;
    
    const headTextarea = await page.locator('textarea').first();
    await headTextarea.fill(headCode);
    
    // FOOTER CODE
    console.log('📝 Oppdaterer FOOTER code...');
    const footerCode = `<!-- Klarpakke Site JavaScript -->
<script src="https://cdn.jsdelivr.net/gh/tajlive/KP@main/web/klarpakke-site.js"></script>`;
    
    const footerTextarea = await page.locator('textarea').nth(1);
    await footerTextarea.fill(footerCode);
    
    // Save
    console.log('💾 Lagrer endringer...');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);
    
    console.log('✅ Custom Code oppdatert!');
    
    // Ta screenshot
    await page.screenshot({ path: 'webflow-custom-code-updated.png' });
    console.log('📸 Screenshot: webflow-custom-code-updated.png');
    
  } catch (error) {
    console.error('❌ Feil:', error.message);
    await page.screenshot({ path: 'webflow-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

// Kjør
updateCustomCode().catch(console.error);
