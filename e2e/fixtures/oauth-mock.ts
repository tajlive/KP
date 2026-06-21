/**
 * OAuth Mock Helpers for E2E Testing
 * 
 * Mocks Google and Microsoft OAuth flows without hitting real APIs
 */

import { Page } from "@playwright/test";

export interface MockOAuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  provider: "google" | "microsoft";
}

/**
 * Generate a mock OAuth token
 */
export function generateMockToken(provider: "google" | "microsoft"): MockOAuthToken {
  return {
    access_token: `mock_${provider}_token_${Date.now()}`,
    refresh_token: `mock_${provider}_refresh_${Date.now()}`,
    expires_in: 3600,
    token_type: "Bearer",
    provider,
  };
}

/**
 * Mock Google OAuth popup and callback
 * 
 * Usage:
 * await mockGoogleOAuth(page, mockToken);
 */
export async function mockGoogleOAuth(
  page: Page,
  mockToken?: MockOAuthToken
): Promise<MockOAuthToken> {
  const token = mockToken || generateMockToken("google");

  // Intercept the OAuth popup window
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    // Click Google login button - this will be handled in the test
  ]).catch(() => [null]); // If no popup, we'll handle via URL

  if (popup) {
    // Simulate successful OAuth in popup
    await popup.evaluate((t) => {
      // Simulate callback URL with token
      const callbackUrl = new URL(window.location.href);
      callbackUrl.hash = `#access_token=${t.access_token}&refresh_token=${t.refresh_token}&expires_in=${t.expires_in}&token_type=${t.token_type}&provider=${t.provider}`;
      window.location.href = callbackUrl.toString();
    }, token);
  }

  return token;
}

/**
 * Mock Microsoft OAuth popup and callback
 */
export async function mockMicrosoftOAuth(
  page: Page,
  mockToken?: MockOAuthToken
): Promise<MockOAuthToken> {
  const token = mockToken || generateMockToken("microsoft");
  
  // Similar to Google OAuth mock
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
  ]).catch(() => [null]);

  if (popup) {
    await popup.evaluate((t) => {
      const callbackUrl = new URL(window.location.href);
      callbackUrl.hash = `#access_token=${t.access_token}&refresh_token=${t.refresh_token}&expires_in=${t.expires_in}&token_type=${t.token_type}&provider=${t.provider}`;
      window.location.href = callbackUrl.toString();
    }, token);
  }

  return token;
}

/**
 * Simulate OAuth callback directly via URL
 * This bypasses the popup and directly navigates to callback URL
 */
export async function simulateOAuthCallback(
  page: Page,
  token: MockOAuthToken,
  baseUrl: string
): Promise<void> {
  const callbackUrl = new URL("/no/callback", baseUrl);
  callbackUrl.hash = `#access_token=${token.access_token}&refresh_token=${token.refresh_token}&expires_in=${token.expires_in}&token_type=${token.token_type}`;
  
  await page.goto(callbackUrl.toString());
}

/**
 * Mock OAuth error response
 */
export async function simulateOAuthError(
  page: Page,
  error: string,
  errorDescription: string,
  baseUrl: string
): Promise<void> {
  const callbackUrl = new URL("/no/callback", baseUrl);
  callbackUrl.searchParams.set("error", error);
  callbackUrl.searchParams.set("error_description", errorDescription);
  
  await page.goto(callbackUrl.toString());
}

/**
 * Mock Supabase session response
 */
export function mockSupabaseSession(token: MockOAuthToken) {
  return {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_in: token.expires_in,
    token_type: token.token_type,
    user: {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      user_metadata: {
        provider: token.provider,
        full_name: "Test User",
      },
    },
  };
}
