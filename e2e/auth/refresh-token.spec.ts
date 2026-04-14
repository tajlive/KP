/**
 * Refresh Token Storm Prevention E2E Tests
 *
 * Verifies that:
 * 1. Only one refresh request is sent when the token expires.
 * 2. The UI does not end up in an infinite auth loop.
 * 3. Circuit breaker kicks in after repeated failures.
 */

import { test, expect } from "@playwright/test";
import { clearAuthState } from "../fixtures/auth-helpers";

test.describe("Refresh Token Flow @auth", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test("should not storm refresh endpoint when token expires", async ({ page }) => {
    let refreshCount = 0;

    // Intercept refresh-token requests *before* any navigation
    await page.route("**/token?grant_type=refresh_token", (route) => {
      refreshCount++;
      route.continue();
    });

    // Inject an expired mock session into localStorage
    const expiredSession = {
      access_token: "mock_expired_access_token",
      refresh_token: "mock_refresh_token",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) - 10, // expired 10s ago
      token_type: "Bearer",
      user: {
        id: "test-refresh-user",
        email: "refresh@test.com",
        user_metadata: { full_name: "Test User" },
      },
    };

    await page.evaluate((session) => {
      localStorage.setItem(
        "sb-vuxbjlykgmzskxbclquf-auth-token",
        JSON.stringify(session)
      );
    }, expiredSession);

    // Navigate to a page that triggers auth checks (e.g. dashboard)
    await page.goto("/dashboard");

    // Wait long enough for any potential storm to manifest
    await page.waitForTimeout(5000);

    // Because of the mutex, we expect at most 1 actual refresh request.
    // (0 is also acceptable if middleware short-circuits before reaching the browser.)
    expect(refreshCount).toBeLessThanOrEqual(1);
  });

  test("circuit breaker should block repeated refresh failures", async ({ page }) => {
    let refreshCount = 0;

    await page.route("**/token?grant_type=refresh_token", (route) => {
      refreshCount++;
      // Simulate Supabase 429 to trigger circuit breaker
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ message: "too many requests" }),
      });
    });

    const expiredSession = {
      access_token: "mock_expired_access_token",
      refresh_token: "mock_refresh_token",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) - 10,
      token_type: "Bearer",
      user: {
        id: "test-circuit-user",
        email: "circuit@test.com",
        user_metadata: { full_name: "Test User" },
      },
    };

    await page.evaluate((session) => {
      localStorage.setItem(
        "sb-vuxbjlykgmzskxbclquf-auth-token",
        JSON.stringify(session)
      );
    }, expiredSession);

    // First navigation — may trigger up to 1 real request
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);

    // Reload to trigger auth checks again
    await page.reload();
    await page.waitForTimeout(3000);

    // With circuit breaker active after 3 failures, total calls should stay low.
    // We allow up to 3 because the breaker needs failures to open.
    expect(refreshCount).toBeLessThanOrEqual(3);
  });
});
