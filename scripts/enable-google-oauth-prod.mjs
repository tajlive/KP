#!/usr/bin/env node
/**
 * Enable Google OAuth provider in production Supabase Auth.
 *
 * Usage:
 *   node scripts/enable-google-oauth-prod.mjs --client-id GOOGLE_CLIENT_ID --secret GOOGLE_CLIENT_SECRET
 *
 * This script is idempotent — running it twice with the same credentials
 * produces the same result.
 */

import { readFileSync } from "fs";

function loadEnv(path = ".env.local") {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch (err) {
    // ignore
  }
}

loadEnv();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!token || !url) {
  console.error("❌ Missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL in environment");
  process.exit(1);
}

const ref = url.replace(/^https:\/\//, "").replace(/\.supabase\.co.*$/, "");

function parseArgs() {
  const args = process.argv.slice(2);
  let clientId = null;
  let secret = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--client-id" || args[i] === "-c") {
      clientId = args[i + 1];
      i++;
    } else if (args[i] === "--secret" || args[i] === "-s") {
      secret = args[i + 1];
      i++;
    }
  }

  return { clientId, secret };
}

const { clientId, secret } = parseArgs();

if (!clientId || !secret) {
  console.error("❌ Usage: node scripts/enable-google-oauth-prod.mjs --client-id <ID> --secret <SECRET>");
  process.exit(1);
}

async function patchAuthConfig(payload) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase API ${response.status}: ${text}`);
  }

  return response.json();
}

async function main() {
  console.log("🔧 Enabling Google OAuth provider in production Supabase Auth...");
  console.log(`   Project ref: ${ref}`);
  console.log(`   Client ID: ${clientId.slice(0, 8)}...${clientId.slice(-4)}`);

  await patchAuthConfig({
    external_google_enabled: true,
    external_google_client_id: clientId,
    external_google_secret: secret,
    external_google_skip_nonce_check: false,
  });

  console.log("✅ Google OAuth provider enabled successfully.");
  console.log("");
  console.log("Next steps:");
  console.log("1. Verify with: node scripts/check-oauth-prod.mjs");
  console.log("2. Test Google login on https://www.klarpakke.no/no/login");
}

main().catch((err) => {
  console.error("❌ Failed to enable Google OAuth:", err.message);
  process.exit(1);
});
