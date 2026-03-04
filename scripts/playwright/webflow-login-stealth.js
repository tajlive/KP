import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';

dotenv.config();
chromium.use(StealthPlugin());

async function loginWithStealth() {
  console.log('🥷 Logger inn med stealth mode...');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set real user agent
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  try {
    await page.goto('https://webflow.com/dashboard/login');
    await page.waitForTimeout(2000);
    
    await page.fill('input[name="email"]', process.env.WEBFLOW_EMAIL);
    await page.fill('input[name="password"]', process.env.WEBFLOW_PASSWORD);
    
    // Vent litt før klikk (mer menneske-aktig)
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');
    
    // Vent manuelt på CAPTCHA løsning
    console.log('⏳ Venter 60 sekunder - løs CAPTCHA manuelt hvis den dukker opp...');
    await page.waitForTimeout(60000);
    
    await page.screenshot({ path: 'webflow-after-login.png' });
    console.log('✅ Login fullført!');
    
  } catch (error) {
    console.error('❌ Feil:', error.message);
    await page.screenshot({ path: 'webflow-error.png' });
  } finally {
    await browser.close();
  }
}

loginWithStealth();
