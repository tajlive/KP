import { chromium } from 'playwright';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function deployWithSession() {
  const cookies = JSON.parse(fs.readFileSync('webflow-session.json', 'utf-8'));
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  await context.addCookies(cookies);
  
  const page = await context.newPage();
  
  try {
    console.log('🚀 Bruker lagret session...');
    await page.goto('https://webflow.com/dashboard');
    await page.waitForTimeout(2000);
    
    console.log('✅ Innlogget med session!');
    
    // Nå kan du gjøre hva du vil
    await page.screenshot({ path: 'webflow-dashboard-loggedin.png' });
    
  } catch (error) {
    console.error('❌ Session utløpt eller feil:', error.message);
    console.log('💡 Kjør: node scripts/playwright/save-webflow-session.js');
  } finally {
    await browser.close();
  }
}

deployWithSession();
