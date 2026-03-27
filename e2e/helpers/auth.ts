/**
 * Authentication Helpers for E2E Tests
 * 
 * Helper functions for:
 * - loginAsTestUser(page, userType)
 * - logout(page)
 * - ensureAuthenticated(page)
 */

import type { Page } from "@playwright/test";
import {
  getPrimaryTestUser,
  getTestUser,
  type UserTier,
  type UserType,
} from "../fixtures/test-users";

export interface LoginOptions {
  redirectUrl?: string;
  timeout?: number;
}

/**
 * Login as a test user
 * 
 * @param page - Playwright page object
 * @param userType - Type of user to login as
 * @param options - Optional login options
 * 
 * @example
 * ```typescript
 * // Login as primary test user
 * await loginAsTestUser(page, 'primary');
 * 
 * // Login as specific tier
 * await loginAsTestUser(page, 'tier', { tier: 'master' });
 * 
 * // Login with custom redirect
 * await loginAsTestUser(page, 'primary', { redirectUrl: '/dashboard/trading' });
 * ```
 */
export async function loginAsTestUser(
  page: Page,
  userType: "primary" | UserType,
  options: { tier?: UserTier; variant?: string } & LoginOptions = {}
): Promise<void> {
  const { tier, variant, redirectUrl, timeout = 30000 } = options;

  // Get user credentials
  let user;
  if (userType === "primary") {
    user = getPrimaryTestUser();
  } else if (userType === "tier" && tier) {
    user = getTestUser("tier", tier);
  } else if (userType === "trading" && variant) {
    user = getTestUser("trading", variant as "withSession" | "withoutSession" | "withTradeHistory");
  } else if (userType === "notifications" && variant) {
    user = getTestUser("notifications", variant as "withSubscription" | "withoutSubscription");
  } else {
    user = getPrimaryTestUser();
  }

  if (!user) {
    throw new Error(`Could not find test user for type: ${userType}`);
  }

  // Build login URL with optional redirect
  let loginUrl = "/no/innlogging";
  if (redirectUrl) {
    loginUrl += `?next=${encodeURIComponent(redirectUrl)}`;
  }

  // Navigate to login
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

  // Check if already logged in
  const currentUrl = page.url();
  if (currentUrl.includes("/dashboard") || currentUrl.includes("/konto")) {
    console.log("Already logged in");
    return;
  }

  // Fill in login form
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  // Wait for form to be ready
  await emailInput.waitFor({ state: "visible", timeout });

  // Clear any existing values
  await emailInput.fill("");
  await passwordInput.fill("");

  // Fill in credentials
  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);

  // Submit form
  await submitButton.click();

  // Wait for navigation
  await page.waitForURL(/dashboard|konto/, { timeout: timeout * 2 });
}

/**
 * Login with specific credentials
 * 
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 * @param options - Optional login options
 */
export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
  options: LoginOptions = {}
): Promise<void> {
  const { redirectUrl, timeout = 30000 } = options;

  let loginUrl = "/no/innlogging";
  if (redirectUrl) {
    loginUrl += `?next=${encodeURIComponent(redirectUrl)}`;
  }

  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await emailInput.waitFor({ state: "visible", timeout });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  await page.waitForURL(/dashboard|konto/, { timeout: timeout * 2 });
}

/**
 * Logout the current user
 * 
 * @param page - Playwright page object
 * @param options - Optional logout options
 */
export async function logout(
  page: Page,
  options: { timeout?: number; verifyRedirect?: boolean } = {}
): Promise<void> {
  const { timeout = 10000, verifyRedirect = true } = options;

  // Try to find and click logout button
  const logoutButton = page
    .locator(
      'button:has-text("Logg ut"), button:has-text("Logout"), [data-testid="logout-button"], a:has-text("Logg ut"), a:has-text("Logout")'
    )
    .first();

  if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutButton.click();
  } else {
    // If no logout button found, clear cookies and storage
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("/no", { waitUntil: "domcontentloaded" });
  }

  if (verifyRedirect) {
    // Wait for redirect to login or landing page
    await page
      .waitForURL(/innlogging|login|\/no/, { timeout })
      .catch(() => {
        console.log("Logout redirect not detected, may already be logged out");
      });
  }
}

/**
 * Ensure user is authenticated
 * If not authenticated, will login as primary test user
 * 
 * @param page - Playwright page object
 * @param options - Optional options
 */
export async function ensureAuthenticated(
  page: Page,
  options: { userType?: UserType; timeout?: number } = {}
): Promise<void> {
  const { userType = "primary", timeout = 10000 } = options;

  // Check if already authenticated
  await page.goto("/no/dashboard", { waitUntil: "domcontentloaded" });

  const currentUrl = page.url();
  const isAuthenticated =
    currentUrl.includes("/dashboard") || currentUrl.includes("/konto");

  if (!isAuthenticated) {
    console.log("User not authenticated, logging in...");
    await loginAsTestUser(page, userType);
  } else {
    console.log("User already authenticated");
  }
}

/**
 * Check if user is authenticated
 * 
 * @param page - Playwright page object
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  await page.goto("/no/dashboard", { waitUntil: "domcontentloaded" });
  const currentUrl = page.url();
  return currentUrl.includes("/dashboard") || currentUrl.includes("/konto");
}

/**
 * Get auth state for reuse in tests
 * 
 * @param page - Playwright page object
 * @returns Storage state object for reuse
 */
export async function getAuthState(page: Page): Promise<{
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}> {
  return await page.context().storageState();
}

/**
 * Setup auth state before tests
 * Use in test setup or global setup
 * 
 * @param page - Playwright page object
 * @param userType - Type of user to setup
 */
export async function setupAuthState(
  page: Page,
  userType: UserType = "primary"
): Promise<void> {
  await loginAsTestUser(page, userType);
  
  // Additional setup can be done here
  // e.g., accept cookies, dismiss modals, etc.
}

/**
 * Clear all auth data
 * 
 * @param page - Playwright page object
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((cookie) => {
      const [name] = cookie.split("=");
      document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    });
  });
}
