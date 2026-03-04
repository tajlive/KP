import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

export async function loginToWebflow(page) {
  console.log('🔐 Logger inn på Webflow...');
  
  await page.goto('https://webflow.com/dashboard/login');
  
  // Fyll inn email
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', process.env.WEBFLOW_EMAIL);
  
  // Fyll inn passord
  await page.fill('input[name="password"]', process.env.WEBFLOW_PASSWORD);
  
  // Klikk login
  await page.click('button[type="submit"]');
  
  // Vent på redirect til dashboard
  await page.waitForURL('**/dashboard/**', { timeout: 30000 });
  
  console.log('✅ Innlogget på Webflow!');
  
  return page;
}

// Test login hvis kjørt direkte
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
      await loginToWebflow(page);
      console.log('✅ Login test vellykket!');
      await page.screenshot({ path: 'webflow-dashboard.png' });
      console.log('📸 Screenshot lagret: webflow-dashboard.png');
    } catch (error) {
      console.error('❌ Login feilet:', error.message);
      await page.screenshot({ path: 'webflow-error.png' });
    } finally {
      await browser.close();
    }
  })();
}
