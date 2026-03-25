#!/usr/bin/env node
/**
 * Sync env vars to Vercel via REST API (non-interactive).
 *
 * Requirements (in .env.local or process env):
 * - VERCEL_TOKEN
 * - VERCEL_PROJECT_ID
 * - VERCEL_ORG_ID (team id) optional (but recommended)
 *
 * Usage:
 *   node scripts/vercel-sync-env.mjs --env-file .env.local --target production --target preview
 *   node scripts/vercel-sync-env.mjs --target production
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BASE = "https://api.vercel.com";

function parseArgs(argv) {
  const args = { targets: [], envFile: ".env.local", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") {
      args.targets.push(String(argv[++i] || ""));
    } else if (a === "--env-file") {
      args.envFile = String(argv[++i] || ".env.local");
    } else if (a === "--dry-run") {
      args.dryRun = true;
    }
  }
  if (args.targets.length === 0) args.targets = ["production"];
  args.targets = Array.from(new Set(args.targets.filter(Boolean)));
  return args;
}

function loadEnvFile(file) {
  const full = resolve(root, file);
  const env = {};
  if (!existsSync(full)) return env;
  const content = readFileSync(full, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
    env[key] = value;
  }
  return env;
}

function looksLikePlaceholder(value) {
  const v = String(value || "").trim();
  if (!v) return true;
  return (
    v === "..." ||
    v.includes("your_") ||
    v.includes("change-me") ||
    v.includes("eyJ...") ||
    v.includes("pk_live_...") ||
    v.includes("sk_live_...") ||
    v.includes("whsec_...") ||
    v.includes("sntry") && v.endsWith("_...") ||
    v.endsWith("...") ||
    v === "placeholder-ci-build"
  );
}

const ALLOWLIST = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EXCHANGE_ENCRYPTION_SECRET",
  "CRON_SECRET",
  "SENTRY_AUTH_TOKEN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

async function api(token, path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Vercel API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || res.statusText;
    throw new Error(`Vercel API HTTP ${res.status}: ${msg}`);
  }
  return data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fileEnv = loadEnvFile(args.envFile);
  const token = fileEnv.VERCEL_TOKEN || process.env.VERCEL_TOKEN;
  const projectId = fileEnv.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
  const teamId = fileEnv.VERCEL_ORG_ID || process.env.VERCEL_ORG_ID;

  if (!token) throw new Error("Missing VERCEL_TOKEN (set in .env.local or env).");
  if (!projectId) throw new Error("Missing VERCEL_PROJECT_ID (set in .env.local or env).");

  const q = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const existing = await api(token, `/v9/projects/${encodeURIComponent(projectId)}/env${q}`);
  const list = existing.envs || [];

  const desired = [];
  for (const key of ALLOWLIST) {
    const val = fileEnv[key] ?? process.env[key];
    if (val === undefined) continue;
    if (looksLikePlaceholder(val)) continue;
    desired.push({ key, value: String(val) });
  }

  if (desired.length === 0) {
    console.log("No usable env vars found (all missing or placeholder).");
    process.exit(0);
  }

  for (const target of args.targets) {
    if (!["production", "preview", "development"].includes(target)) {
      throw new Error(`Invalid --target ${target}. Use production|preview|development.`);
    }
  }

  for (const { key, value } of desired) {
    for (const target of args.targets) {
      const matches = list.filter(
        (e) => e.key === key && Array.isArray(e.target) && e.target.includes(target),
      );

      if (args.dryRun) {
        console.log(`[dry-run] set ${key} -> ${target} (replace ${matches.length} existing)`);
        continue;
      }

      // Delete existing env vars for this key+target (avoid duplicates)
      for (const m of matches) {
        await api(token, `/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(m.id)}${q}`, {
          method: "DELETE",
        });
      }

      await api(token, `/v9/projects/${encodeURIComponent(projectId)}/env${q}`, {
        method: "POST",
        body: JSON.stringify({
          key,
          value,
          type: "encrypted",
          target: [target],
        }),
      });

      console.log(`✅ set ${key} -> ${target}`);
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});

