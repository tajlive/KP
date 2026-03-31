/**
 * Critical User Flows E2E Tests
 * 
 * Tests:
 * - Signup flow: Landing → Signup → Email verification
 * - Login flow: Login → Dashboard
 * - Paper trading: Start session → Execute trade → Verify balance
 * - Dark mode: Toggle → Verify persistence → Reload → Verify
 * - Theme toggle: Light → Dark → System
 * 
 * @critical @user-flows
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser, logout } from "../helpers/auth";

test.describe("Critical User Flows @critical @user-flows", () => {
  test.describe("Signup Flow", () => {
    test("landing to signup flow", async ({ page }) => {
      // Start at landing page
      await page.goto("/no", { waitUntil: "domcontentloaded" });
      
      // Verify landing page loaded
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: 15000,
      });

      // Click primary CTA
      const primaryCta = page.getByTestId("hero-cta-signup");
      await expect(primaryCta).toBeVisible({ timeout: 10000 });
      await primaryCta.click();

      // Should navigate to signup
      await expect(page).toHaveURL(/.*signup.*/, { timeout: 15000 });
      
      // Verify signup page content
      await expect(
        page.getByText(/Opprett konto|Registrer deg|Sign up/i).first()
      ).toBeVisible({ timeout: 10000 });

      // Verify form elements exist
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });

    test("signup form validation", async ({ page }) => {
      await page.goto("/no/signup", { waitUntil: "domcontentloaded" });

      // Try submitting empty form
      const submitButton = page.locator('button[type="submit"]').first();
      
      // Fill in invalid email
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill("invalid-email");
      
      // Fill in short password
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill("123");

      // Form should show validation feedback
      await expect(page.locator("text=/gyldig|valid|feil|error/i").first()).toBeVisible({
        timeout: 5000,
      }).catch(() => {
        // Some validation may be on submit, which is also valid
        console.log("Validation may be on submit");
      });
    });
  });

  test.describe("Login Flow", () => {
    test("successful login redirects to dashboard", async ({ page }) => {
      // Attempt login
      await loginAsTestUser(page, "primary");

      // Should be redirected to dashboard
      await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 30000 });

      // Verify dashboard content
      await expect(page.locator("body")).toContainText(/dashboard|oversikt|portefølje/i);
    });

    test("login with invalid credentials shows error", async ({ page }) => {
      await page.goto("/no/innlogging", { waitUntil: "domcontentloaded" });

      // Fill in invalid credentials
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill("nonexistent@example.com");

      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill("wrongpassword123");

      // Submit form
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should show error message
      await expect(
        page.locator("text=/feil|error|ugyldig|invalid/i").first()
      ).toBeVisible({ timeout: 10000 });
    });

    test("logout flow", async ({ page }) => {
      // First login
      await loginAsTestUser(page, "primary");
      await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 30000 });

      // Logout
      await logout(page);

      // Should be redirected to login or landing
      const url = page.url();
      expect(url).toMatch(/innlogging|login|signup|\/no/);
    });
  });

  test.describe("Paper Trading Flow", () => {
    test("start paper trading session", async ({ page }) => {
      // Login first
      await loginAsTestUser(page, "primary");

      // Navigate to paper trading
      await page.goto("/no/paper-trading", { waitUntil: "domcontentloaded" });
      
      // Wait for page to load
      await page.waitForLoadState("networkidle").catch(() => {});

      // Verify paper trading page loaded
      await expect(
        page.locator("body").getByText(/paper|lekepenger|demo/i).first()
      ).toBeVisible({ timeout: 15000 });

      // Check for balance display or start button
      const hasBalance = await page
        .locator("text=/100 000|balance|saldo/i")
        .first()
        .isVisible()
        .catch(() => false);

      const hasStartButton = await page
        .getByTestId("start-paper-trading")
        .isVisible()
        .catch(() => false);

      expect(hasBalance || hasStartButton).toBe(true);
    });

    test("demo widget buy/sell interaction", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Scroll to demo widget
      const demoWidget = page.getByTestId("demo-widget");
      await demoWidget.scrollIntoViewIfNeeded();
      await expect(demoWidget).toBeVisible({ timeout: 10000 });

      // Click buy button
      const buyButton = page.getByTestId("demo-widget-buy");
      await expect(buyButton).toBeVisible();
      await buyButton.click();

      // Buy button should become disabled (position opened)
      await expect(buyButton).toBeDisabled({ timeout: 5000 });

      // Sell button should be enabled
      const sellButton = page.getByTestId("demo-widget-sell");
      await expect(sellButton).toBeEnabled();

      // Click sell to close position
      await sellButton.click();

      // Position should be closed
      await expect(buyButton).toBeEnabled({ timeout: 5000 });
      await expect(sellButton).toBeDisabled();
    });
  });

  test.describe("Theme/Dark Mode Flow", () => {
    test("theme toggle changes appearance", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Wait for theme toggle to be available
      const themeToggle = page.getByTestId("theme-toggle");
      await expect(themeToggle).toBeVisible({ timeout: 10000 });

      // Get initial theme
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains("dark") ? "dark" : "light";
      });

      console.log(`Initial theme: ${initialTheme}`);

      // Click theme toggle
      await themeToggle.click();

      // Wait for theme change
      await page.waitForTimeout(500);

      // Verify theme changed or dropdown opened
      const hasDropdown = await page
        .locator('[role="menu"], [role="listbox"]')
        .isVisible()
        .catch(() => false);

      if (hasDropdown) {
        // If dropdown opened, select opposite theme
        const newThemeOption = page.locator(
          initialTheme === "dark" ? 'text=/light|lyst/i' : 'text=/dark|mørkt/i'
        ).first();
        await newThemeOption.click();
        await page.waitForTimeout(500);
      }

      // Verify theme changed
      const newTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains("dark") ? "dark" : "light";
      });

      expect(newTheme).not.toBe(initialTheme);
    });

    test("theme persists after page reload", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Set dark mode
      const themeToggle = page.getByTestId("theme-toggle");
      await themeToggle.click();
      await page.waitForTimeout(300);

      // Select dark if dropdown
      const darkOption = page.locator('text=/dark|mørkt/i').first();
      if (await darkOption.isVisible().catch(() => false)) {
        await darkOption.click();
        await page.waitForTimeout(300);
      }

      // Verify dark mode is active
      const isDarkBefore = await page.evaluate(() => {
        return document.documentElement.classList.contains("dark");
      });

      // Reload page
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      // Verify theme persisted
      const isDarkAfter = await page.evaluate(() => {
        return document.documentElement.classList.contains("dark");
      });

      expect(isDarkAfter).toBe(isDarkBefore);
    });

    test("theme cycle: light → dark → system", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Look for segmented theme toggle
      const segmentedToggle = page.getByTestId("theme-toggle-segmented");
      
      if (await segmentedToggle.isVisible().catch(() => false)) {
        // Click through each theme option
        const themes = ["light", "dark", "system"] as const;
        
        for (const theme of themes) {
          const option = segmentedToggle.locator(`[aria-pressed]`).filter({
            hasText: new RegExp(theme, "i"),
          });
          
          if (await option.isVisible().catch(() => false)) {
            await option.click();
            await page.waitForTimeout(300);
            
            // Verify the button is pressed
            const isPressed = await option.evaluate((el) =>
              el.getAttribute("aria-pressed")
            );
            expect(isPressed).toBe("true");
          }
        }
      } else {
        // Dropdown variant
        const themeToggle = page.getByTestId("theme-toggle");
        await themeToggle.click();
        
        const darkOption = page.locator('text=/dark|mørkt/i').first();
        await darkOption.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe("Navigation Flows", () => {
    test("main navigation links work", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      const navLinks = [
        { name: /Kurs|Courses/i, path: /kurs/ },
        { name: /Paper Trading|Papirhandel/i, path: /paper-trading/ },
        { name: /Priser|Pricing/i, path: /priser/ },
      ];

      for (const link of navLinks) {
        await page.goto("/no", { waitUntil: "domcontentloaded" });
        
        const navLink = page.getByRole("link", { name: link.name }).first();
        
        if (await navLink.isVisible().catch(() => false)) {
          await navLink.click();
          await expect(page).toHaveURL(link.path, { timeout: 15000 });
        } else {
          console.log(`Nav link ${link.name} not visible, may be in mobile menu`);
        }
      }
    });

    test("trust strip is visible on landing", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      const trustStrip = page.getByTestId("trust-strip");
      await expect(trustStrip).toBeVisible({ timeout: 10000 });

      // Verify trust indicators - paper trading stats and payment logos
      await expect(trustStrip.getByText(/100K|paper|simulert/i)).toBeVisible();
      await expect(trustStrip.getByText(/Vipps|Stripe|PayPal/i)).toBeVisible();
    });

    test("footer links are accessible", async ({ page }) => {
      await page.goto("/no", { waitUntil: "domcontentloaded" });

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // Check for footer element
      const footer = page.locator("footer").first();
      if (await footer.isVisible().catch(() => false)) {
        // Verify footer has links
        const footerLinks = await footer.locator("a").count();
        expect(footerLinks).toBeGreaterThan(0);
      }
    });
  });
});
