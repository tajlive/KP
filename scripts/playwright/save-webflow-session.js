import { chromium } from 'playwright';
import fs from 'fs';

async function saveSession() {
  console.log('🔐 Åpner browser - logg inn manuelt...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://webflow.com/dashboard/login');
  
  console.log('👉 Logg inn manuelt i browseren...');
  console.log('⏳ Venter i 5 minutter...');
  
  // Vent 5 minutter for manuell login
  await page.waitForTimeout(5 * 60 * 1000);
  
  // Lagre session
  const cookies = await context.cookies();
  fs.writeFileSync('webflow-session.json', JSON.stringify(cookies, null, 2));
  
  console.log('✅ Session lagret til webflow-session.json');
  console.log('💾 Nå kan automation bruke denne sessionen!');
  
  await browser.close();
}

saveSession();
