#!/usr/bin/env node
/**
 * fix-oauth-prod.mjs
 * Automatically fixes Supabase Auth URL configuration in production.
 * Updates site_url and redirect URL allow list for the Klarpakke project.
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

async function main() {
  console.log("🔧 Klarpakke OAuth Production Config Fix");
  console.log("This script updates Supabase Auth URL configuration via the Management API.\n");

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
  const uriAllowList = EXPECTED_REDIRECT_URLS.join(",");

  console.log(`📡 Supabase project ref: ${projectRef}`);
  console.log(`🌐 Site URL:              ${EXPECTED_SITE_URL}`);
  console.log(`↩️  Redirect URLs:         ${EXPECTED_REDIRECT_URLS.join(", ")}`);
  console.log(`🔒 Access token:          ${accessToken.slice(0, 4)}...${accessToken.slice(-4)} (${accessToken.length} chars)\n`);

  const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  const payload = {
    site_url: EXPECTED_SITE_URL,
    uri_allow_list: uriAllowList,
  };

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`\n❌ Network error calling Management API: ${err.message}`);
    console.error("   Check your internet connection and DNS resolution.");
    process.exit(1);
  }

  if (response.status === 401 || response.status === 403) {
    console.error(`\n❌ Management API returned ${response.status} ${response.statusText}`);
    console.error("   The access token is invalid or lacks permission for this project.");
    console.error("   1. Verify the token at https://supabase.com/dashboard/account/tokens");
    console.error("   2. Ensure the token has access to the project above.");
    process.exit(1);
  }

  if (response.status >= 400 && response.status < 500) {
    const body = await response.text();
    console.error(`\n❌ Management API returned ${response.status} ${response.statusText}`);
    console.error(`   Response: ${body.slice(0, 800)}`);
    console.error("   The request was rejected. Do not retry without inspecting the payload.");
    process.exit(1);
  }

  if (!response.ok) {
    const body = await response.text();
    console.error(`\n❌ Management API returned ${response.status} ${response.statusText}`);
    console.error(`   Response: ${body.slice(0, 800)}`);
    process.exit(1);
  }

  let result;
  const responseText = await response.text();
  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    result = { raw: responseText };
  }

  console.log("\n✅ Supabase Auth URL configuration updated successfully.");
  console.log("\nApplied changes:");
  console.log(`  site_url:      ${EXPECTED_SITE_URL}`);
  console.log(`  uri_allow_list: ${uriAllowList}`);

  if (result.site_url || result.uri_allow_list || result.redirect_urls) {
    console.log("\nServer response summary:");
    if (result.site_url) console.log(`  site_url:       ${result.site_url}`);
    if (result.uri_allow_list) console.log(`  uri_allow_list: ${result.uri_allow_list}`);
    if (result.redirect_urls) {
      const urls = Array.isArray(result.redirect_urls)
        ? result.redirect_urls.join(", ")
        : result.redirect_urls;
      console.log(`  redirect_urls:  ${urls}`);
    }
  }

  console.log("\n🏁 Result: ✅ GO");
  console.log("\nNext step: run `node scripts/check-oauth-prod.mjs` to verify.\n");
}

main().catch((err) => {
  console.error("\n❌ Unexpected error:", err.message);
  process.exit(1);
});
