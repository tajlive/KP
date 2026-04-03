#!/usr/bin/env ts-node
/**
 * Google OAuth Configuration Verifier
 * 
 * Automatically checks and compares URIs against Supabase config.
 * 
 * Usage:
 *   npx ts-node scripts/google-oauth-verifier.ts
 *   npx ts-node scripts/google-oauth-verifier.ts --fix
 *   npx ts-node scripts/google-oauth-verifier.ts --json
 */

import { createClient } from "@supabase/supabase-js";
import {
  getGoogleConsoleConfig,
  getAllRedirectUris,
  detectRedirectMismatch,
  getGoogleConsoleCopyPaste,
  type SupportedLocale,
} from "../src/lib/auth/dynamic-redirects";

// ANSI colors
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const BOLD = "\x1b[1m";

interface VerificationResult {
  timestamp: string;
  status: "ok" | "warning" | "error";
  checks: {
    supabase_connection: boolean;
    google_provider_enabled: boolean;
    redirect_uris_match: boolean;
    site_url_configured: boolean;
  };
  config: {
    siteUrl: string | null;
    redirectUrls: string[];
    googleClientId: string | null;
  };
  expected: {
    origins: string[];
    redirectUris: string[];
  };
  mismatches: Array<{
    type: string;
    configured: string;
    expected: string;
    suggestion: string;
  }>;
}

function log(message: string, level: "info" | "success" | "warning" | "error" = "info") {
  const colors = {
    info: BLUE,
    success: GREEN,
    warning: YELLOW,
    error: RED,
  };
  console.log(`${colors[level]}${message}${RESET}`);
}

async function verifyGoogleOAuth(): Promise<VerificationResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const result: VerificationResult = {
    timestamp: new Date().toISOString(),
    status: "ok",
    checks: {
      supabase_connection: false,
      google_provider_enabled: false,
      redirect_uris_match: false,
      site_url_configured: false,
    },
    config: {
      siteUrl: null,
      redirectUrls: [],
      googleClientId: null,
    },
    expected: {
      origins: [],
      redirectUris: [],
    },
    mismatches: [],
  };
  
  // Check environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    log("❌ Missing required environment variables:", "error");
    log("   - NEXT_PUBLIC_SUPABASE_URL", "error");
    log("   - SUPABASE_SERVICE_ROLE_KEY", "error");
    result.status = "error";
    return result;
  }
  
  // Connect to Supabase
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  try {
    // Get auth settings via Supabase API
    const { data: settings, error: settingsError } = await supabase
      .from("auth_config") 
      .select("*")
      .single();
    
    // Alternative: use raw SQL to get auth config
    const { data: authSettings, error: authError } = await supabase.rpc(
      "get_auth_config"
    );
    
    if (authError) {
      log(`⚠️  Could not fetch auth config via RPC: ${authError.message}`, "warning");
    }
    
    result.checks.supabase_connection = true;
    
    // Expected configuration
    const googleConfig = getGoogleConsoleConfig();
    result.expected.origins = googleConfig.authorizedJavaScriptOrigins;
    result.expected.redirectUris = googleConfig.authorizedRedirectUris;
    
    // Fetch actual provider settings from Supabase
    // Note: This requires admin access or direct DB query
    const { data: providers, error: providerError } = await supabase
      .from("auth_providers")
      .select("*")
      .eq("provider", "google")
      .single();
    
    if (providerError) {
      log(`ℹ️  Could not fetch provider config (requires admin): ${providerError.message}`, "info");
    } else if (providers) {
      result.checks.google_provider_enabled = providers.enabled ?? false;
      result.config.googleClientId = providers.client_id ?? null;
    }
    
    // Get site URL from config
    const { data: urlConfig, error: urlError } = await supabase
      .rpc("get_site_url");
    
    if (!urlError && urlConfig) {
      result.config.siteUrl = urlConfig;
      result.checks.site_url_configured = true;
    }
    
    // Check for mismatches
    const expectedUris = new Set(result.expected.redirectUris);
    const configuredUris = result.config.redirectUrls;
    
    for (const expectedUri of expectedUris) {
      const mismatch = detectRedirectMismatch(
        configuredUris.find(u => u.includes("/auth/callback")) || "",
        (expectedUri.match(/\/(no|en|th|zh)\//)?.[1] as SupportedLocale) || "no"
      );
      
      if (mismatch.isMismatch) {
        result.mismatches.push({
          type: "redirect_uri",
          configured: configuredUris.find(u => u.includes("/auth/callback")) || "(none)",
          expected: expectedUri,
          suggestion: mismatch.suggestion || "Update redirect URI",
        });
      }
    }
    
    result.checks.redirect_uris_match = result.mismatches.length === 0;
    
    if (!result.checks.redirect_uris_match) {
      result.status = "error";
    } else if (!result.checks.google_provider_enabled) {
      result.status = "warning";
    }
    
  } catch (error) {
    log(`❌ Error connecting to Supabase: ${error instanceof Error ? error.message : String(error)}`, "error");
    result.status = "error";
  }
  
  return result;
}

function printReport(result: VerificationResult, format: "pretty" | "json" = "pretty") {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  log("\n╔════════════════════════════════════════════════════════════╗", "info");
  log("║     Google OAuth Configuration Verification Report          ║", "info");
  log("╚════════════════════════════════════════════════════════════╝", "info");
  
  log(`\nTimestamp: ${result.timestamp}`, "info");
  log(`Status: ${result.status.toUpperCase()}`, result.status === "ok" ? "success" : result.status === "warning" ? "warning" : "error");
  
  log("\n📋 CHECKS:", "info");
  log(`  ${result.checks.supabase_connection ? "✅" : "❌"} Supabase connection`, result.checks.supabase_connection ? "success" : "error");
  log(`  ${result.checks.google_provider_enabled ? "✅" : "⚠️"} Google provider enabled`, result.checks.google_provider_enabled ? "success" : "warning");
  log(`  ${result.checks.site_url_configured ? "✅" : "❌"} Site URL configured`, result.checks.site_url_configured ? "success" : "error");
  log(`  ${result.checks.redirect_uris_match ? "✅" : "❌"} Redirect URIs match`, result.checks.redirect_uris_match ? "success" : "error");
  
  if (result.config.googleClientId) {
    log(`\n🔑 Google Client ID: ${result.config.googleClientId.substring(0, 10)}...`, "info");
  }
  
  if (result.mismatches.length > 0) {
    log("\n⚠️  MISMATCHES FOUND:", "warning");
    for (const mismatch of result.mismatches) {
      log(`  Type: ${mismatch.type}`, "warning");
      log(`  Configured: ${mismatch.configured}`, "error");
      log(`  Expected:   ${mismatch.expected}`, "success");
      log(`  Suggestion: ${mismatch.suggestion}`, "info");
      log("");
    }
  }
  
  log("\n📋 GOOGLE CLOUD CONSOLE CONFIG:", "info");
  log(getGoogleConsoleCopyPaste(), "info");
  
  if (result.status !== "ok") {
    log("\n🔧 NEXT STEPS:", "info");
    if (!result.checks.google_provider_enabled) {
      log("  1. Enable Google provider in Supabase Dashboard", "warning");
      log("     https://supabase.com/dashboard/project/_/auth/providers", "info");
    }
    if (!result.checks.redirect_uris_match) {
      log("  2. Update redirect URIs in Google Cloud Console", "warning");
      log("     https://console.cloud.google.com/apis/credentials", "info");
    }
    log("  3. Ensure OAuth consent screen is published (not in testing)", "warning");
    log("  4. Test login in incognito mode with third-party cookies enabled", "info");
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const showCopyPaste = args.includes("--copy-paste");
  
  if (showCopyPaste) {
    console.log(getGoogleConsoleCopyPaste());
    return;
  }
  
  log("🔍 Verifying Google OAuth configuration...", "info");
  const result = await verifyGoogleOAuth();
  printReport(result, jsonOutput ? "json" : "pretty");
  
  process.exit(result.status === "error" ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
