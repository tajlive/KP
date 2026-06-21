#!/usr/bin/env node
/**
 * check-oauth-prod.mjs
 * Verifies Supabase Auth OAuth configuration in production via Management API.
 * Read-only. Does not modify any configuration.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env.local");

const EXPECTED_SITE_URL = "https://www.klarpakke.no";
const EXPECTED_REDIRECT_URLS = [
  "https://www.klarpakke.no/no/callback",
  "https://www.klarpakke.no/en/callback",
  "https://www.klarpakke.no/th/callback",
  "https://www.klarpakke.no/zh/callback",
];

function loadEnv(path) {
  try {
    const content = readFileSync(path, "utf-8");
    const env = {};
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match) {
        const [, key, value] = match;
        env[key] = value.replace(/^["'](.*)["']$/, "$1");
      }
    }
    return env;
  } catch (err) {
    console.error(`❌ Failed to read ${path}: ${err.message}`);
    process.exit(1);
  }
}

function extractProjectRef(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.hostname.match(/^([a-z0-9]{20,})\.supabase\.co$/i);
    if (!match) {
      console.error(`❌ Could not extract project ref from Supabase URL: ${url}`);
      process.exit(1);
    }
    return match[1];
  } catch (err) {
    console.error(`❌ Invalid Supabase URL: ${url}`);
    process.exit(1);
  }
}

function normalizeUrlList(urls) {
  if (!urls) return [];
  if (Array.isArray(urls)) return urls.map((u) => u.trim()).filter(Boolean);
  if (typeof urls === "string") return urls.split(",").map((u) => u.trim()).filter(Boolean);
  return [];
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log("=".repeat(title.length));
}

function formatSecret(secret) {
  if (!secret) return "(not set)";
  const visible = 4;
  const masked = "*".repeat(Math.max(secret.length - visible, 0));
  return `${masked}${secret.slice(-visible)} (${secret.length} chars)`;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function main() {
  console.log("🔐 Klarpakke OAuth Production Config Check");
  console.log("This script reads Supabase Auth config via the Management API.");

  const env = loadEnv(ENV_PATH);
  const accessToken = env.SUPABASE_ACCESS_TOKEN;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;

  if (!accessToken) {
    console.error("❌ SUPABASE_ACCESS_TOKEN is missing in .env.local");
    console.error("   Add it from https://supabase.com/dashboard/account/tokens");
    process.exit(1);
  }

  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing in .env.local");
    process.exit(1);
  }

  const projectRef = extractProjectRef(supabaseUrl);
  console.log(`\n📡 Supabase project ref: ${projectRef}`);
  console.log(`🔒 Access token: ${accessToken.slice(0, 4)}...${accessToken.slice(-4)} (${accessToken.length} chars)`);

  const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  let response;
  try {
    response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error(`\n❌ Network error calling Management API: ${err.message}`);
    process.exit(1);
  }

  if (response.status === 401 || response.status === 403) {
    console.error(`\n❌ Management API returned ${response.status} ${response.statusText}`);
    console.error("   The access token is invalid or lacks permission for this project.");
    console.error("   1. Verify the token at https://supabase.com/dashboard/account/tokens");
    console.error("   2. Ensure the token has access to the project above.");
    process.exit(1);
  }

  if (!response.ok) {
    const body = await response.text();
    console.error(`\n❌ Management API returned ${response.status} ${response.statusText}`);
    console.error(`   Response: ${body.slice(0, 500)}`);
    process.exit(1);
  }

  const config = await response.json();

  printSection("1. Site URL");
  const siteUrl = config.site_url || "";
  console.log(`   Value: ${siteUrl || "(not set)"}`);
  const siteUrlOk = siteUrl === EXPECTED_SITE_URL;
  console.log(siteUrlOk ? "   ✅ Correct" : `   ❌ Expected: ${EXPECTED_SITE_URL}`);

  printSection("2. Redirect URLs");
  // Supabase Management API exposes redirect URLs as either `redirect_urls` (array)
  // or `uri_allow_list` (comma-separated string) depending on project/config.
  const rawRedirectUrls = config.redirect_urls ?? config.uri_allow_list;
  const redirectUrls = normalizeUrlList(rawRedirectUrls);
  console.log("   Configured URLs:");
  if (redirectUrls.length === 0) {
    console.log("   (none)");
  } else {
    for (const url of redirectUrls) {
      console.log(`   - ${url}`);
    }
  }

  const missing = EXPECTED_REDIRECT_URLS.filter((u) => !redirectUrls.includes(u));
  const unexpected = redirectUrls.filter((u) => !EXPECTED_REDIRECT_URLS.includes(u));

  if (missing.length === 0 && unexpected.length === 0) {
    console.log("   ✅ All expected redirect URLs present and no extras");
  } else {
    console.log("   ❌ Redirect URL mismatch");
    if (missing.length) {
      console.log("   Missing:");
      for (const url of missing) console.log(`     - ${url}`);
    }
    if (unexpected.length) {
      console.log("   Unexpected (consider removing):");
      for (const url of unexpected) console.log(`     - ${url}`);
    }
  }

  printSection("3. Google OAuth Provider Configuration");
  const googleEnabled = config.external_google_enabled === true;
  const googleClientId = config.external_google_client_id || null;
  const googleSecret = config.external_google_secret || null;
  const googleEmailOptional = config.external_google_email_optional ?? null;

  console.log(`   external_google_enabled:       ${config.external_google_enabled} ${googleEnabled ? "✅" : "❌"}`);
  console.log(`   external_google_client_id:     ${googleClientId || "(not set)"} ${isNonEmptyString(googleClientId) ? "✅" : "❌"}`);
  console.log(`   external_google_secret:        ${googleSecret ? `✅ set (${formatSecret(googleSecret)})` : "❌ not set"}`);
  console.log(`   external_google_email_optional: ${googleEmailOptional ?? "(not set)"} (reported only)`);

  const googleOk = googleEnabled && isNonEmptyString(googleClientId) && isNonEmptyString(googleSecret);
  if (!googleOk) {
    console.log("   ❌ Google OAuth provider is not fully configured.");
  } else {
    console.log("   ✅ Google OAuth provider appears fully configured.");
  }

  printSection("4. Additional Checks");
  const hasTrailingSlash = redirectUrls.some((u) => u.endsWith("/") && u !== "/");
  const hasQueryParams = redirectUrls.some((u) => u.includes("?"));
  console.log(`   Trailing slashes: ${hasTrailingSlash ? "❌ Found" : "✅ None"}`);
  console.log(`   Query parameters: ${hasQueryParams ? "❌ Found" : "✅ None"}`);

  printSection("5. Recommendations");
  if (siteUrlOk && missing.length === 0 && unexpected.length === 0 && !hasTrailingSlash && !hasQueryParams && googleOk) {
    console.log("   ✅ Supabase Auth redirect and Google OAuth provider configuration looks correct.");
    console.log("   If login still fails, check:");
    console.log("     - Google Cloud Console → Authorized redirect URIs");
    console.log("     - Google OAuth consent screen publishing status / test users");
    console.log("     - Supabase Auth → External Auth → Google → Client ID/Secret");
  } else {
    console.log("   🛠️  Update Supabase Auth configuration:");
    console.log("     URL Configuration: https://supabase.com/dashboard/project/" + projectRef + "/auth/url-configuration");
    console.log("     Providers:         https://supabase.com/dashboard/project/" + projectRef + "/auth/providers");
    if (!siteUrlOk) {
      console.log(`   - Set Site URL to: ${EXPECTED_SITE_URL}`);
    }
    if (missing.length) {
      console.log("   - Add missing redirect URLs listed above.");
    }
    if (unexpected.length) {
      console.log("   - Remove unexpected redirect URLs listed above.");
    }
    if (hasTrailingSlash || hasQueryParams) {
      console.log("   - Ensure redirect URLs have no trailing slashes or query parameters.");
    }
    if (!googleOk) {
      console.log("   - Enable Google OAuth provider and set a valid Client ID and Secret.");
      console.log("     Secret is never shown in full; verify it is configured in the dashboard.");
    }
  }

  const allOk = siteUrlOk && missing.length === 0 && unexpected.length === 0 && !hasTrailingSlash && !hasQueryParams && googleOk;
  console.log(`\n🏁 Result: ${allOk ? "✅ GO" : "❌ NO-GO"}\n`);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error("\n❌ Unexpected error:", err.message);
  process.exit(1);
});
