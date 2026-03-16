import { chromium } from 'playwright';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function fullDeploy() {
  const cookies = JSON.parse(fs.readFileSync('webflow-session.json', 'utf-8'));
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  await context.addCookies(cookies);
  
  const page = await context.newPage();
  
  try {
    console.log('🚀 Starter full Webflow deploy...');
    
    // 1. Gå til dashboard
    await page.goto('https://webflow.com/dashboard/sites');
    await page.waitForTimeout(3000);
    
    // 2. Finn Klarpakke site
    console.log('🔍 Søker etter Klarpakke site...');
    await page.screenshot({ path: 'step1-dashboard.png' });
    
    // Klikk på site (prøv flere selectors)
    const siteSelectors = [
      'a:has-text("klarpakke")',
      '[data-site-card]:has-text("klarpakke")',
      '.site-card:has-text("klarpakke")'
    ];
    
    let clicked = false;
    for (const selector of siteSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        clicked = true;
        break;
      } catch (e) {
        console.log(`Prøver neste selector...`);
      }
    }
    
    if (!clicked) {
      console.log('⚠️ Kunne ikke finne Klarpakke site automatisk');
      console.log('👉 Klikk på Klarpakke site manuelt...');
      await page.waitForTimeout(10000); // Vent 10 sek for manuell klikk
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step2-site-overview.png' });
    
    // 3. Finn Settings knapp
    console.log('⚙️ Åpner Settings...');
    const settingsSelectors = [
      'button:has-text("Settings")',
      'a:has-text("Settings")',
      '[aria-label="Settings"]'
    ];
    
    for (const selector of settingsSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        break;
      } catch (e) {
        console.log(`Prøver neste settings selector...`);
      }
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'step3-settings.png' });
    
    // 4. Naviger til Custom Code
    console.log('📝 Åpner Custom Code...');
    await page.click('text=Custom Code');
    await page.waitForTimeout(2000);
    
    // 5. Oppdater HEAD Code
    console.log('📝 Oppdaterer HEAD code...');
    const headCode = '<!-- Supabase Client -->\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n\n<!-- Configuration -->\n<script>\n  window.KLARPAKKE_CONFIG = {\n    SUPABASE_URL: "' + process.env.SUPABASE_URL + '",\n    SUPABASE_ANON_KEY: "' + process.env.SUPABASE_ANON_KEY + '"\n  };\n</script>';
    
    // Finn HEAD textarea (prøv flere metoder)
    try {
      const headArea = await page.locator('textarea').first();
      await headArea.fill(headCode);
    } catch (e) {
      console.log('⚠️ Kunne ikke finne HEAD textarea automatisk');
    }
    
    // 6. Oppdater FOOTER Code
    console.log('📝 Oppdaterer FOOTER code...');
    const footerCode = '<!-- Klarpakke Site JavaScript -->\n<script src="https://cdn.jsdelivr.net/gh/tajlive/KP@main/web/klarpakke-site.js"></script>';
    
    try {
      const footerArea = await page.locator('textarea').nth(1);
      await footerArea.fill(footerCode);
    } catch (e) {
      console.log('⚠️ Kunne ikke finne FOOTER textarea automatisk');
    }
    
    await page.screenshot({ path: 'step4-custom-code.png' });
    
    // 7. Save
    console.log('💾 Lagrer...');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(3000);
    
    console.log('✅ Custom Code oppdatert!');
    
    await page.screenshot({ path: 'webflow-deployed.png', fullPage: true });
    console.log('📸 Screenshots lagret i step1-4 + webflow-deployed.png');
    
  } catch (error) {
    console.error('❌ Feil:', error.message);
    await page.screenshot({ path: 'webflow-deploy-error.png' });
  } finally {
    // La browseren stå åpen for inspeksjon
    console.log('🔍 Browser forblir åpen - lukk manuelt når ferdig');
    console.log('📸 Sjekk screenshots: step1-dashboard.png, step2-site-overview.png, step3-settings.png, step4-custom-code.png');
  }
}

fullDeploy();
