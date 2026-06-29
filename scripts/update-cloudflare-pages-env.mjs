#!/usr/bin/env node
/**
 * Update Cloudflare Pages environment variables.
 *
 * Usage:
 *   node scripts/update-cloudflare-pages-env.mjs
 *
 * Reads CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from .env.local.
 * Updates NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * for both preview and production environments.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  const env = {};
  if (!existsSync(envPath)) return env;
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const eq = trimmed.indexOf("=");
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
        env[key] = value;
      }
    }
  } catch (_) {}
  return env;
}

const env = loadEnv();
const token = env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const accountId = env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const projectName = env.CLOUDFLARE_PAGES_PROJECT || "klarpakke";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!token) {
  console.error("❌ CLOUDFLARE_API_TOKEN mangler");
  process.exit(1);
}
if (!accountId) {
  console.error("❌ CLOUDFLARE_ACCOUNT_ID mangler");
  process.exit(1);
}
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL eller NEXT_PUBLIC_SUPABASE_ANON_KEY mangler");
  process.exit(1);
}

const BASE = "https://api.cloudflare.com/client/v4";

async function api(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const msg = data?.errors?.[0]?.message || data?.message || res.statusText;
    throw new Error(`Cloudflare API HTTP ${res.status}: ${msg}`);
  }
  return data;
}

async function main() {
  console.log(`🔧 Updating Cloudflare Pages env vars for project: ${projectName}`);
  console.log(`   Account: ${accountId.slice(0, 8)}...`);
  console.log(`   Supabase URL: ${supabaseUrl}`);

  const envVarPayload = {
    type: "plain_text",
    value: undefined, // set per key
  };

  const patchBody = {
    deployment_configs: {
      preview: {
        env_vars: {
          NEXT_PUBLIC_SUPABASE_URL: { type: "plain_text", value: supabaseUrl },
          NEXT_PUBLIC_SUPABASE_ANON_KEY: { type: "plain_text", value: supabaseAnonKey },
        },
      },
      production: {
        env_vars: {
          NEXT_PUBLIC_SUPABASE_URL: { type: "plain_text", value: supabaseUrl },
          NEXT_PUBLIC_SUPABASE_ANON_KEY: { type: "plain_text", value: supabaseAnonKey },
        },
      },
    },
  };

  await api(`/accounts/${accountId}/pages/projects/${projectName}`, {
    method: "PATCH",
    body: JSON.stringify(patchBody),
  });

  console.log("✅ Cloudflare Pages env vars updated.");
  console.log("");
  console.log("Next step: trigger a new deployment for the changes to take effect.");
  console.log(`   npm run cf:deploy   ( Cloudflare Workers, cf-deploy.mjs er arkivert )`);
}

main().catch((err) => {
  console.error("❌ Failed to update Cloudflare Pages env vars:", err.message);
  process.exit(1);
});
