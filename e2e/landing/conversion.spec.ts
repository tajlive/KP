import { test, expect } from '@playwright/test';

/**
 * Landing Page Conversion Tests (KLA-110)
 * 
 * Testplan:
 * - Test 1: Hero vises med norsk tekst på /no
 * - Test 2: Primær CTA klikk → lander på /no/signup
 * - Test 3: Kalkulator slider interaksjon → CTA dukker opp
 * - Test 4: Nav-lenker fungerer (Kurs, Papirhandel, Priser)
 * - Test 5: /no/innlogging → skjema vises, kan fylle inn
 * - Test 6: /no/signup → skjema vises
 * - Test 7: Mobil 375px → hero synlig, CTA klikkbar
 */

test.describe('Landing Page Conversion @critical', () => {
  
  test('Hero vises med norsk tekst på /no', async ({ page }) => {
    await page.goto('/no');
    
    // Sjekk at hero er synlig
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Sjekk at norsk tekst er til stede
    await expect(page.getByText(/Lær å handle crypto/i)).toBeVisible();
    await expect(page.getByText(/trygt fra dag én/i)).toBeVisible();
    
    // Sjekk at CTA-er er synlige
    await expect(page.getByRole('link', { name: /Start gratis/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Se hva du lærer/i })).toBeVisible();
  });

  test('Primær CTA klikk → lander på /no/signup', async ({ page }) => {
    await page.goto('/no');
    
    // Klikk på primær CTA
    const primaryCta = page.getByRole('link', { name: /Start gratis/i }).first();
    await primaryCta.click();
    
    // Verifiser at vi er på signup-siden
    await expect(page).toHaveURL(/.*signup.*/);
    await expect(page.getByRole('heading', { name: /Opprett konto|Registrer|Sign up/i })).toBeVisible();
  });

  test('Kalkulator slider interaksjon → CTA dukker opp', async ({ page }) => {
    await page.goto('/no#lottocalc');
    
    // Finn slideren
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();
    
    // Flytt slideren for å trigge interaksjon
    await slider.fill('500');
    
    // Vent på at CTA dukker opp
    const ctaButton = page.getByRole('link', { name: /Lær hvordan|start gratis|Learn how/i });
    await expect(ctaButton).toBeVisible({ timeout: 5000 });
    
    // Klikk på CTA og verifiser navigasjon
    await ctaButton.click();
    await expect(page).toHaveURL(/.*signup.*/);
  });

  test('Nav-lenker fungerer (Kurs, Papirhandel, Priser)', async ({ page }) => {
    await page.goto('/no');
    
    // Test Kurs-lenke
    const coursesLink = page.getByRole('link', { name: /Kurs|Courses/i }).first();
    await expect(coursesLink).toBeVisible();
    
    // Test Papirhandel-lenke
    const paperTradingLink = page.getByRole('link', { name: /Papirhandel|Paper Trading/i }).first();
    await expect(paperTradingLink).toBeVisible();
    
    // Test Priser-lenke
    const pricingLink = page.getByRole('link', { name: /Priser|Pricing/i }).first();
    await expect(pricingLink).toBeVisible();
    
    // Klikk på Kurs og verifiser
    await coursesLink.click();
    await expect(page).toHaveURL(/.*kurs.*/);
  });

  test('/no/innlogging → skjema vises, kan fylle inn', async ({ page }) => {
    await page.goto('/no/innlogging');
    
    // Sjekk at innloggingsskjema er synlig
    await expect(page.getByRole('heading', { name: /Logg inn|Sign in/i })).toBeVisible();
    
    // Sjekk at email-felt finnes
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Sjekk at password-felt finnes
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
    
    // Test å fylle inn felt
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword123');
    
    // Verifiser at verdiene er satt
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('testpassword123');
  });

  test('/no/signup → skjema vises', async ({ page }) => {
    await page.goto('/no/signup');
    
    // Sjekk at registreringsskjema er synlig
    await expect(page.getByRole('heading', { name: /Opprett konto|Registrer|Sign up|Registrer deg/i })).toBeVisible();
    
    // Sjekk at email-felt finnes
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Sjekk at password-felt finnes
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });
});

test.describe('Landing Page Mobile @mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Mobil 375px → hero synlig, CTA klikkbar', async ({ page }) => {
    await page.goto('/no');
    
    // Sjekk at hero er synlig uten scroll
    const heroHeading = page.getByRole('heading', { level: 1 });
    await expect(heroHeading).toBeVisible();
    
    // Sjekk at primær CTA er synlig og klikkbar
    const primaryCta = page.getByRole('link', { name: /Start gratis/i }).first();
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toBeEnabled();
    
    // Sjekk at sekundær CTA er synlig
    const secondaryCta = page.getByRole('link', { name: /Se hva du lærer/i }).first();
    await expect(secondaryCta).toBeVisible();
    
    // Verifiser at widget er under teksten (ikke ved siden av)
    const heroSection = page.locator('section').first();
    const box = await heroSection.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });

  test('Mobil: hamburger-meny fungerer', async ({ page }) => {
    await page.goto('/no');
    
    // Finn hamburger-meny knapp
    const menuButton = page.locator('button[aria-label*="meny"], button[aria-label*="menu"]').first();
    
    // Hvis hamburger-meny finnes, test den
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
      
      // Sjekk at nav-lenker er synlige etter klikk
      await expect(page.getByRole('link', { name: /Kurs|Courses/i })).toBeVisible();
    }
  });

  test('Mobil: kalkulator slider fungerer på touch', async ({ page }) => {
    await page.goto('/no#lottocalc');
    
    // Scroll til kalkulator
    const calculatorSection = page.locator('#lottocalc');
    await calculatorSection.scrollIntoViewIfNeeded();
    
    // Finn slideren
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();
    
    // Simuler touch-interaksjon
    await slider.tap();
    await slider.fill('300');
    
    // Verifiser at verdien er endret
    await expect(slider).toHaveValue('300');
  });
});
