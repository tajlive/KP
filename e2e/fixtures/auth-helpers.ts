/**
 * Auth Helper Functions for E2E Testing
 * 
 * Utilities for managing auth state in tests
 */

import { Page, BrowserContext } from "@playwright/test";

/**
 * Clear all auth state (cookies, localStorage, sessionStorage)
 */
export async function clearAuthState(page: Page): Promise<void> {
  // Clear cookies
  await page.context().clearCookies();
  
  // Clear storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Check if user is authenticated by looking for auth indicators
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for session in localStorage (Supabase stores session here)
  const hasSession = await page.evaluate(() => {
    const session = localStorage.getItem("sb-pskhryjzkobytnfwucrb-auth-token");
    return session !== null;
  });
  
  if (hasSession) return true;
  
  // Fallback: check for auth cookie
  const cookies = await page.context().cookies();
  const hasAuthCookie = cookies.some(cookie => 
    cookie.name.includes("sb-") || cookie.name.includes("auth")
  );
  
  return hasAuthCookie;
}

/**
 * Get session data from localStorage
 */
export async function getSession(page: Page): Promise<Record<string, unknown> | null> {
  const session = await page.evaluate(() => {
    const sessionStr = localStorage.getItem("sb-pskhryjzkobytnfwucrb-auth-token");
    if (!sessionStr) return null;
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  });
  
  return session;
}

/**
 * Set mock session in localStorage (for testing authenticated states)
 */
export async function setMockSession(
  page: Page, 
  userId: string = "test-user-123",
  email: string = "test@example.com"
): Promise<void> {
  const mockSession = {
    access_token: `mock_token_${Date.now()}`,
    refresh_token: `mock_refresh_${Date.now()}`,
    expires_in: 3600,
    token_type: "Bearer",
    user: {
      id: userId,
      email: email,
      user_metadata: {
        full_name: "Test User",
      },
    },
  };
  
  await page.evaluate((session) => {
    localStorage.setItem(
      "sb-pskhryjzkobytnfwucrb-auth-token",
      JSON.stringify(session)
    );
  }, mockSession);
}

/**
 * Wait for auth state to be ready
 */
export async function waitForAuthState(
  page: Page, 
  options: { timeout?: number; expectAuthenticated?: boolean } = {}
): Promise<void> {
  const { timeout = 10000, expectAuthenticated = true } = options;
  
  await page.waitForFunction(
    (shouldBeAuth) => {
      const session = localStorage.getItem("sb-pskhryjzkobytnfwucrb-auth-token");
      const isAuth = session !== null;
      return shouldBeAuth ? isAuth : !isAuth;
    },
    expectAuthenticated,
    { timeout }
  );
}

/**
 * Get current URL path
 */
export async function getCurrentPath(page: Page): Promise<string> {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Check if current page is dashboard
 */
export async function isDashboard(page: Page): Promise<boolean> {
  const path = await getCurrentPath(page);
  return path.includes("/dashboard");
}

/**
 * Wait for redirect to complete
 */
export async function waitForRedirect(
  page: Page, 
  expectedPath: string, 
  timeout: number = 10000
): Promise<void> {
  await page.waitForURL(
    (url) => url.pathname.includes(expectedPath),
    { timeout }
  );
}
