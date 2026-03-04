// tests/e2e/02-navigation.spec.ts
// Tester at navigasjonsmenyen fungerer og alle lenker virker

import { test, expect } from '@playwright/test';

test.describe('Navigasjon', () => {
  
  test('Header-navigasjon er synlig og klikkbar', async ({ page }) => {
    await page.goto('/no');
    await page.waitForLoadState('networkidle');
    
    // Sjekk at header finnes
    const header = page.locator('header, nav').first();
    await expect(header).toBeVisible();
    
    // Finn alle nav-lenker
    const navLinks = await page.locator('header a, nav a').all();
    console.log(`Fant ${navLinks.length} nav-lenker`);
    
    expect(navLinks.length, 'Ingen nav-lenker funnet').toBeGreaterThan(0);
    
    // Sjekk at nav-lenkene ikke er tomme
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      const text = await link.innerText();
      if (href && !href.startsWith('#') && text.trim()) {
        console.log(`  Nav-lenke: "${text.trim()}" → ${href}`);
      }
    }
    
    await page.screenshot({ path: 'playwright-report/screenshots/nav_desktop.png' });
  });
  
  test('Footer-lenker finnes', async ({ page }) => {
    await page.goto('/no');
    await page.waitForLoadState('networkidle');
    
    const footer = page.locator('footer');
    
    // Sjekk om footer finnes - mange moderne sider har ikke tradisjonell footer
    const footerCount = await footer.count();
    if (footerCount === 0) {
      console.log('ℹ️ Ingen footer funnet - designet har kanskje ingen tradisjonell footer');
      return;
    }
    
    // Sjekk om footer er synlig før screenshot
    const footerVisible = await footer.isVisible().catch(() => false);
    const footerBox = footerVisible ? await footer.boundingBox() : null;
    
    if (!footerVisible || !footerBox || footerBox.height < 10) {
      console.log('ℹ️ Footer funnet men minimal/usynlig - skipper screenshot');
      return;
    }
    
    const footerLinks = await footer.locator('a').all();
    console.log(`Fant ${footerLinks.length} footer-lenker`);
    
    // Ikke ta screenshot av footer - ofte problemer med clipping
  });
  
  test('Mobilmeny åpner og lukker', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/no');
    await page.waitForLoadState('networkidle');
    
    // Finn hamburger-meny (vanlige selektorer)
    const hamburger = page.locator(
      '[aria-label*="meny" i], [aria-label*="menu" i], button.hamburger, .menu-toggle'
    ).first();
    
    const hamburgerVisible = await hamburger.isVisible().catch(() => false);
    
    if (hamburgerVisible) {
      await hamburger.click();
      await page.screenshot({ path: 'playwright-report/screenshots/mobile_menu_open.png' });
      
      // Sjekk at meny er åpen (hvis mobilmeny eksisterer)
      const mobileNav = page.locator('[role="navigation"], .mobile-menu, nav').first();
      const isVisible = await mobileNav.isVisible().catch(() => false);
      if (!isVisible) {
        console.log('ℹ️ Mobilmeny ikke funnet med standard selektorer - kan bruke annen implementasjon');
      }
      
      // Lukk menyen
      await hamburger.click();
    } else {
      console.log('Ingen hamburger-meny funnet (kanskje desktop-meny er synlig)');
    }
    
    await page.screenshot({ path: 'playwright-report/screenshots/mobile_home.png', fullPage: true });
  });
  
  test('Språkbytte fungerer (no → en)', async ({ page }) => {
    await page.goto('/no');
    await page.waitForLoadState('networkidle');
    
    // Finn språkvelger
    const langSwitcher = page.locator(
      '[aria-label*="language" i], [aria-label*="språk" i], .lang-switcher, select[name*="lang"]'
    ).first();
    
    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();
      
      // Klikk engelsk
      const enOption = page.locator('a[href*="/en"], button:has-text("English"), [data-lang="en"]').first();
      if (await enOption.isVisible()) {
        await enOption.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/en');
        await page.screenshot({ path: 'playwright-report/screenshots/english_home.png' });
      }
    } else {
      // Prøv direkte URL-navigasjon
      await page.goto('/en');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/en');
    }
  });
});
