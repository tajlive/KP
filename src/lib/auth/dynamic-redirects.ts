/**
 * Dynamic Redirect URI Generator for OAuth Providers
 * 
 * Generates all locale-prefixed redirect URIs for Google Cloud Console
 * and other OAuth provider configurations.
 * 
 * Usage:
 *   import { getAllRedirectUris, getGoogleConsoleConfig } from '@/lib/auth/dynamic-redirects';
 *   
 *   // Copy-paste ready for Google Cloud Console
 *   console.log(getGoogleConsoleConfig());
 */

import { getAppUrl } from "./config";

export const SUPPORTED_LOCALES = ["no", "en", "th", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export interface RedirectUriConfig {
  locale: SupportedLocale;
  path: string;
  fullUri: string;
}

export interface GoogleConsoleConfig {
  authorizedJavaScriptOrigins: string[];
  authorizedRedirectUris: string[];
  notes: string[];
}

/**
 * Get the base app URL without trailing slash
 */
function getBaseUrl(): string {
  const url = getAppUrl();
  return url.replace(/\/$/, "");
}

/**
 * Generate all redirect URIs for auth callback
 */
export function getAllRedirectUris(
  path: string = "/callback"
): RedirectUriConfig[] {
  const baseUrl = getBaseUrl();
  
  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    path: `/${locale}${path}`,
    fullUri: `${baseUrl}/${locale}${path}`,
  }));
}

/**
 * Get redirect URIs formatted for Google Cloud Console
 */
export function getGoogleConsoleConfig(): GoogleConsoleConfig {
  const baseUrl = getBaseUrl();
  const origins = new Set<string>();
  
  // Add main origin
  origins.add(baseUrl);
  
  // Add www/non-www variant
  if (baseUrl.includes("www.")) {
    origins.add(baseUrl.replace("www.", ""));
  } else {
    origins.add(baseUrl.replace(/^(https?:\/\/)/, "$1www."));
  }
  
  // Add localhost for development
  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
  }
  
  const redirectUris = getAllRedirectUris("/callback").map(r => r.fullUri);
  
  return {
    authorizedJavaScriptOrigins: Array.from(origins).sort(),
    authorizedRedirectUris: redirectUris,
    notes: [
      "1. Add ALL origins above to 'Authorized JavaScript origins'",
      "2. Add ALL redirect URIs above to 'Authorized redirect URIs'",
      "3. Ensure URIs match exactly (no trailing slashes, correct protocol)",
      "4. OAuth consent screen must be in 'PUBLISHING STATUS: IN PRODUCTION'",
      "5. Third-party cookies must be enabled for accounts.google.com",
    ],
  };
}

/**
 * Get copy-paste ready string for Google Cloud Console
 */
export function getGoogleConsoleCopyPaste(): string {
  const config = getGoogleConsoleConfig();
  
  const lines: string[] = [
    "=== GOOGLE CLOUD CONSOLE OAUTH 2.0 CONFIG ===",
    "",
    "Authorized JavaScript origins:",
    ...config.authorizedJavaScriptOrigins.map(o => `  ${o}`),
    "",
    "Authorized redirect URIs:",
    ...config.authorizedRedirectUris.map(u => `  ${u}`),
    "",
    "NOTES:",
    ...config.notes,
    "",
    "=== SUPABASE AUTH CONFIG ===",
    `Site URL: ${getBaseUrl()}`,
    "Additional Redirect URLs:",
    ...config.authorizedRedirectUris.map(u => `  ${u}`),
  ];
  
  return lines.join("\n");
}

/**
 * Validate that a redirect URI matches expected patterns
 */
export function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    
    // Must use HTTPS in production
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      return false;
    }
    
    // Must have locale prefix
    const localeMatch = url.pathname.match(/^\/(no|en|th|zh)\/callback$/);
    if (!localeMatch) {
      return false;
    }
    
    // Must not have trailing slash
    if (url.pathname.endsWith("/")) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the expected redirect URI for a specific locale
 */
export function getRedirectUriForLocale(locale: SupportedLocale = "no"): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/${locale}/callback`;
}

/**
 * Detect potential redirect URI mismatches
 */
export function detectRedirectMismatch(
  configuredUri: string,
  expectedLocale: SupportedLocale = "no"
): { isMismatch: boolean; reason?: string; suggestion?: string } {
  const expectedUri = getRedirectUriForLocale(expectedLocale);
  
  if (configuredUri === expectedUri) {
    return { isMismatch: false };
  }
  
  // Common mismatches
  if (configuredUri.includes("/callback/") && !expectedUri.includes("/callback/")) {
    return {
      isMismatch: true,
      reason: "Trailing slash in callback path",
      suggestion: `Remove trailing slash: ${expectedUri}`,
    };
  }
  
  if (!configuredUri.includes(`/${expectedLocale}/`) && expectedUri.includes(`/${expectedLocale}/`)) {
    return {
      isMismatch: true,
      reason: `Missing locale prefix /${expectedLocale}/`,
      suggestion: `Add locale prefix: ${expectedUri}`,
    };
  }
  
  if (configuredUri.startsWith("http:") && expectedUri.startsWith("https:")) {
    return {
      isMismatch: true,
      reason: "Using HTTP instead of HTTPS",
      suggestion: `Use HTTPS: ${expectedUri}`,
    };
  }
  
  return {
    isMismatch: true,
    reason: "URI mismatch detected",
    suggestion: `Expected: ${expectedUri}`,
  };
}
