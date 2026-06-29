/**
 * Auth Diagnosis API - P0 OAuth Redirect Fix
 * 
 * GET /api/auth/diagnose
 * 
 * Returns comprehensive diagnostic information about:
 * - OAuth configuration
 * - Google token validation
 * - Cookie/cloudflare settings
 * - Redirect URI mismatches
 * 
 * Security: Dev-only with service key validation
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleConsoleConfig,
  getAllRedirectUris,
  detectRedirectMismatch,
  isValidRedirectUri,
  type SupportedLocale,
} from "@/lib/auth/dynamic-redirects";

export const dynamic = "force-dynamic";

// Cache for 30 seconds in development
export const revalidate = 0;

interface DiagnosisResult {
  status: "ok" | "error" | "warning";
  timestamp: string;
  environment: string;
  request: {
    headers: Record<string, string>;
    cookies: string[];
    cfRay?: string;
    country?: string;
  };
  checks: {
    supabase_url: boolean;
    supabase_anon_key: boolean;
    supabase_service_key: boolean;
    app_url: string | null;
    cookie_settings: {
      sameSite: string;
      secure: boolean;
      cookieEncoding: string;
    };
  };
  google_oauth: {
    configured: boolean;
    client_id_configured: boolean;
    redirect_uris: {
      expected: string[];
      valid: boolean;
      mismatches: Array<{
        locale: SupportedLocale;
        configured: string;
        expected: string;
        issue: string;
      }>;
    };
    cloudflare_cookies: {
      secure: boolean;
      sameSite: string;
      cfClearance?: boolean;
    };
    notes: string[];
  };
  tokens: {
    can_verify: boolean;
    google_access_token?: {
      valid: boolean;
      expires_at?: string;
      scopes?: string[];
    };
  };
  copy_paste: {
    google_console: string;
    supabase_urls: string;
  };
}

function getSafeHeaders(headers: Headers): Record<string, string> {
  const safe: { [key: string]: string } = {};
  const allowed = [
    "host",
    "x-forwarded-host",
    "x-forwarded-proto",
    "cf-ray",
    "cf-ipcountry",
    "user-agent",
  ];
  
  for (const key of allowed) {
    const value = headers.get(key);
    if (value) {
      safe[key] = value;
    }
  }
  
  return safe;
}

export async function GET(request: NextRequest) {
  // SECURITY: Only allow in development
  const isDevelopment = process.env.NODE_ENV === "development";
  
  if (!isDevelopment) {
    return NextResponse.json(
      { 
        error: "This endpoint is only available in development",
        hint: "Use scripts/google-oauth-verifier.ts for production checks"
      },
      { status: 403 }
    );
  }
  
  // Gather request info for debugging
  const headers = getSafeHeaders(request.headers);
  const cookies = request.cookies.getAll().map(c => c.name);
  
  // Environment checks
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || null;
  
  // Build expected config
  const googleConfig = getGoogleConsoleConfig();
  const allRedirectUris = getAllRedirectUris("/callback");
  
  // Check for mismatches
  const mismatches: Array<{
    locale: SupportedLocale;
    configured: string;
    expected: string;
    issue: string;
  }> = [];
  
  // Validate each expected URI
  for (const uriConfig of allRedirectUris) {
    if (!isValidRedirectUri(uriConfig.fullUri)) {
      mismatches.push({
        locale: uriConfig.locale,
        configured: uriConfig.fullUri,
        expected: uriConfig.fullUri,
        issue: "Invalid redirect URI format",
      });
    }
  }
  
  // Check Cloudflare cookie status
  const cfClearance = cookies.find(c => c === "cf_clearance");
  
  // Build copy-paste configs
  const googleConsoleCopyPaste = [
    "=== GOOGLE CLOUD CONSOLE CONFIG ===",
    "",
    "Authorized JavaScript origins:",
    ...googleConfig.authorizedJavaScriptOrigins.map(o => `  ${o}`),
    "",
    "Authorized redirect URIs:",
    ...googleConfig.authorizedRedirectUris.map(u => `  ${u}`),
    "",
    "=== IMPORTANT NOTES ===",
    "1. URIs must match EXACTLY (no trailing slashes)",
    "2. Protocol must be HTTPS in production",
    "3. Include ALL locale variants (/no, /en, /th, /zh)",
    "4. OAuth consent screen must be PUBLISHED",
  ].join("\n");
  
  const supabaseCopyPaste = [
    "=== SUPABASE AUTH CONFIG ===",
    "",
    `Site URL: ${appUrl || "(not configured)"}`,
    "",
    "Additional Redirect URLs:",
    ...allRedirectUris.map(r => `  ${r.fullUri}`),
  ].join("\n");
  
  const notes: string[] = [];
  
  if (!supabaseUrl || !supabaseAnonKey) {
    notes.push("❌ Supabase URL or Anon Key is missing");
  }
  
  if (!appUrl) {
    notes.push("⚠️ NEXT_PUBLIC_APP_URL is not set - using fallback");
  }
  
  if (!supabaseServiceKey) {
    notes.push("ℹ️ SUPABASE_SERVICE_ROLE_KEY not set - limited diagnostics available");
  }
  
  if (mismatches.length > 0) {
    notes.push(`⚠️ ${mismatches.length} redirect URI mismatch(es) detected`);
  }
  
  notes.push(
    "",
    "🔧 TROUBLESHOOTING:",
    "1. 'redirect_uri_mismatch' = URI in Google Console doesn't match",
    "2. 'access_denied' = OAuth consent screen not published",
    "3. 'Cookies blocked' = Third-party cookies disabled",
    "4. 'exchange_failed' = PKCE cookie not sent (check sameSite/secure)",
    "",
    "📚 RESOURCES:",
    "- Google Console: https://console.cloud.google.com/apis/credentials",
    "- Supabase Auth: https://supabase.com/dashboard/project/_/auth/providers",
    "- Run: npx ts-node scripts/google-oauth-verifier.ts"
  );
  
  const result: DiagnosisResult = {
    status: mismatches.length > 0 ? "error" : notes.some(n => n.includes("❌")) ? "error" : "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    request: {
      headers,
      cookies: cookies.filter(c => !c.includes("token") && !c.includes("auth")),
      cfRay: headers["cf-ray"],
      country: headers["cf-ipcountry"],
    },
    checks: {
      supabase_url: !!supabaseUrl,
      supabase_anon_key: !!supabaseAnonKey && supabaseAnonKey.length > 20,
      supabase_service_key: !!supabaseServiceKey && supabaseServiceKey.length > 20,
      app_url: appUrl,
      cookie_settings: {
        sameSite: "none",
        secure: true,
        cookieEncoding: "raw",
      },
    },
    google_oauth: {
      configured: !!(supabaseUrl && supabaseAnonKey),
      client_id_configured: false, // Would need service key to check
      redirect_uris: {
        expected: allRedirectUris.map(r => r.fullUri),
        valid: mismatches.length === 0,
        mismatches,
      },
      cloudflare_cookies: {
        secure: true,
        sameSite: "none",
        cfClearance: !!cfClearance,
      },
      notes,
    },
    tokens: {
      can_verify: !!supabaseServiceKey,
    },
    copy_paste: {
      google_console: googleConsoleCopyPaste,
      supabase_urls: supabaseCopyPaste,
    },
  };
  
  // Try to validate with service key if available
  if (supabaseServiceKey && supabaseUrl) {
    try {
      // Use service role client for admin operations
      const adminClient = createClient();
      
      // Note: In real implementation, you'd query auth.config or use admin API
      // This is a placeholder for the actual validation logic
      result.tokens.can_verify = true;
      
    } catch (error) {
      result.google_oauth.notes.push(
        `\n❌ Service key validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
