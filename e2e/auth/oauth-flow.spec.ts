import { test, expect } from "@playwright/test";
import { 
  generateMockToken, 
  simulateOAuthCallback,
  simulateOAuthError 
} from "../fixtures/oauth-mock";
import { 
  clearAuthState, 
  isAuthenticated, 
  getSession,
  isDashboard,
  waitForRedirect
} from "../fixtures/auth-helpers";

/**
 * OAuth Flow E2E Tests
 * 
 * Tests authentication flows for Google and Microsoft OAuth
 * without hitting real OAuth providers (uses mocks)
 */

test.describe("OAuth Authentication Flow @auth @smoke", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state before each test
    await clearAuthState(page);
  });

  test("Google OAuth login redirects to dashboard", async ({ page, baseURL }) => {
    // Navigate to login page
    await page.goto("/login");
    
    // Verify login page is loaded
    await expect(page.getByTestId("login-page")).toBeVisible();
    
    // Verify Google login button is present
    const googleButton = page.getByTestId("google-login-button");
    await expect(googleButton).toBeVisible();
    
    // Generate mock token and simulate OAuth callback
    const mockToken = generateMockToken("google");
    await simulateOAuthCallback(page, mockToken, baseURL || "http://localhost:3000");
    
    // Wait for redirect to dashboard
    await waitForRedirect(page, "/dashboard", 15000);
    
    // Verify we're on dashboard
    expect(await isDashboard(page)).toBe(true);
    
    // Verify auth state is set
    expect(await isAuthenticated(page)).toBe(true);
    
    // Verify session contains expected data
    const session = await getSession(page);
    expect(session).not.toBeNull();
    expect(session?.user?.email).toBeDefined();
  });

  test("Microsoft OAuth login redirects to dashboard", async ({ page, baseURL }) => {
    // Navigate to login page
    await page.goto("/login");
    
    // Verify Microsoft login button is present
    const microsoftButton = page.getByTestId("microsoft-login-button");
    await expect(microsoftButton).toBeVisible();
    
    // Generate mock token and simulate OAuth callback
    const mockToken = generateMockToken("microsoft");
    await simulateOAuthCallback(page, mockToken, baseURL || "http://localhost:3000");
    
    // Wait for redirect to dashboard
    await waitForRedirect(page, "/dashboard", 15000);
    
    // Verify we're on dashboard
    expect(await isDashboard(page)).toBe(true);
    expect(await isAuthenticated(page)).toBe(true);
  });

  test("Session persists after page reload", async ({ page, baseURL }) => {
    // First login
    const mockToken = generateMockToken("google");
    await simulateOAuthCallback(page, mockToken, baseURL || "http://localhost:3000");
    await waitForRedirect(page, "/dashboard", 15000);
    
    // Verify logged in
    expect(await isAuthenticated(page)).toBe(true);
    
    // Reload page
    await page.reload();
    
    // Wait for dashboard to load after reload
    await expect(page.getByTestId("dashboard-page")).toBeVisible({ timeout: 10000 });
    
    // Verify still authenticated
    expect(await isAuthenticated(page)).toBe(true);
    expect(await isDashboard(page)).toBe(true);
  });

  test("OAuth error shows error message", async ({ page, baseURL }) => {
    // Navigate to login page
    await page.goto("/login");
    
    // Simulate OAuth error
    await simulateOAuthError(
      page, 
      "access_denied", 
      "User denied access",
      baseURL || "http://localhost:3000"
    );
    
    // Verify error message is shown
    await expect(page.getByTestId("auth-error")).toBeVisible({ timeout: 10000 });
    
    // Verify user is not authenticated
    expect(await isAuthenticated(page)).toBe(false);
    
    // Verify retry/login button is available
    await expect(page.getByTestId("retry-login-button")).toBeVisible();
  });

  test("Logout clears auth state", async ({ page, baseURL }) => {
    // First login
    const mockToken = generateMockToken("google");
    await simulateOAuthCallback(page, mockToken, baseURL || "http://localhost:3000");
    await waitForRedirect(page, "/dashboard", 15000);
    
    // Verify logged in
    expect(await isAuthenticated(page)).toBe(true);
    
    // Click logout button
    const logoutButton = page.getByTestId("logout-button");
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();
    
    // Wait for redirect to login or home
    await page.waitForURL(
      (url) => url.pathname === "/login" || url.pathname === "/",
      { timeout: 10000 }
    );
    
    // Verify not authenticated after logout
    expect(await isAuthenticated(page)).toBe(false);
  });

  test("Already authenticated user is redirected from login", async ({ page, baseURL }) => {
    // First login
    const mockToken = generateMockToken("google");
    await simulateOAuthCallback(page, mockToken, baseURL || "http://localhost:3000");
    await waitForRedirect(page, "/dashboard", 15000);
    
    // Try to go to login page while authenticated
    await page.goto("/login");
    
    // Should be redirected to dashboard
    await waitForRedirect(page, "/dashboard", 10000);
    expect(await isDashboard(page)).toBe(true);
  });
});

test.describe("OAuth Callback Page @auth", () => {
  test("callback page shows loading state", async ({ page, baseURL }) => {
    // Navigate directly to callback with token
    const mockToken = generateMockToken("google");
    const callbackUrl = new URL("/no/callback", baseURL || "http://localhost:3000");
    callbackUrl.hash = `#access_token=${mockToken.access_token}`;
    
    await page.goto(callbackUrl.toString());
    
    // Verify loading state is shown
    await expect(page.getByTestId("auth-callback-loading")).toBeVisible();
  });

  test("callback without token shows error", async ({ page, baseURL }) => {
    // Navigate to callback without token
    await page.goto(`${baseURL || "http://localhost:3000"}/no/callback`);
    
    // Verify error is shown
    await expect(page.getByTestId("auth-error")).toBeVisible({ timeout: 10000 });
  });
});
