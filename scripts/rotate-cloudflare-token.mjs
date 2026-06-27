#!/usr/bin/env node
/**
 * 🔁 Rotate CLOUDFLARE_API_TOKEN in .env.local and redeploy.
 *
 * Reads a new token from the CLOUDFLARE_API_TOKEN environment variable or from
 * stdin (e.g. `echo "token" | node scripts/rotate-cloudflare-token.mjs`).
 *
 * Reads CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ZONE_ID from .env.local, falling
 * back to the hard-coded zone ID for klarpakke.no if necessary.
 *
 * Verification probes:
 *   - /user/tokens/verify
 *   - /zones/<zone_id>
 *   - /zones/<zone_id>/workers/routes
 *   - /zones/<zone_id>/purge_cache (intentionally invalid body; 400 = OK)
 *   - /accounts/<account_id>/workers/scripts
 *   - /accounts/<account_id>/storage/kv/namespaces
 *
 * If all probes pass, .env.local is updated atomically, secrets are optionally
 * re-encrypted to MemPalace KG, and the app is redeployed + cache purged.
 */

import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");
const BASE = "https://api.cloudflare.com/client/v4";
const FALLBACK_ZONE_ID = "328d7de7e8e48308fd4f9d760da5b18f";

function parseEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function readToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return process.env.CLOUDFLARE_API_TOKEN.trim();
  }
  if (process.stdin.isTTY) {
    process.stderr.write("Enter new CLOUDFLARE_API_TOKEN: ");
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function cfFetch(token, path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function mask(token) {
  if (!token || token.length < 8) return "***";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

async function verifyToken(token, accountId, zoneId) {
  const checks = [
    {
      name: "Token valid (/user/tokens/verify)",
      ...await cfFetch(token, "/user/tokens/verify"),
    },
    {
      name: `Zone read (/zones/${zoneId})`,
      ...await cfFetch(token, `/zones/${zoneId}`),
    },
    {
      name: `Workers routes read (/zones/${zoneId}/workers/routes)`,
      ...await cfFetch(token, `/zones/${zoneId}/workers/routes`),
    },
    {
      name: "Cache purge permission (/zones/<zone>/purge_cache)",
      ...await cfFetch(token, `/zones/${zoneId}/purge_cache`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    },
    {
      name: `Workers scripts (/accounts/${accountId}/workers/scripts)`,
      ...await cfFetch(token, `/accounts/${accountId}/workers/scripts`),
    },
    {
      name: `KV namespaces (/accounts/${accountId}/storage/kv/namespaces)`,
      ...await cfFetch(token, `/accounts/${accountId}/storage/kv/namespaces`),
    },
  ];

  let allPassed = true;
  for (const c of checks) {
    const isPurgeProbe = c.name.includes("purge_cache");
    // An invalid purge body returns 400 when the permission is present;
    // 403 means the permission is missing.
    const pass = isPurgeProbe ? c.status === 400 || c.status === 200 : c.ok;
    if (!pass) allPassed = false;
    const detail =
      c.data?.errors?.[0]?.message || c.data?.message || `HTTP ${c.status}`;
    console.log(`${pass ? "✅" : "❌"} ${c.name}: ${pass ? "OK" : detail}`);
  }
  return allPassed;
}

function updateEnvFile(path, newToken) {
  const content = existsSync(path) ? readFileSync(path, "utf8") : "";
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(eol);
  let found = false;
  const newLines = lines.map((line) => {
    if (/^CLOUDFLARE_API_TOKEN\s*=/.test(line)) {
      found = true;
      return `CLOUDFLARE_API_TOKEN=${newToken}`;
    }
    return line;
  });
  if (!found) {
    newLines.push(`CLOUDFLARE_API_TOKEN=${newToken}`);
  }
  const newContent = newLines.join(eol);
  const tmp = `${path}.tmp.${Date.now()}`;
  writeFileSync(tmp, newContent, "utf8");
  renameSync(tmp, path);
}

function run(cmd, args, extraEnv = {}) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...extraEnv },
  });
  return result.status ?? 1;
}

async function main() {
  console.log("🔁 Cloudflare API token rotation");
  console.log(`   Env file: ${ENV_PATH}`);

  const envFile = parseEnv(ENV_PATH);
  const accountId =
    envFile.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const zoneId =
    envFile.CLOUDFLARE_ZONE_ID ||
    process.env.CLOUDFLARE_ZONE_ID ||
    FALLBACK_ZONE_ID;

  if (!accountId) {
    console.error("❌ CLOUDFLARE_ACCOUNT_ID not found in .env.local or env.");
    process.exit(1);
  }

  const token = await readToken();
  if (!token) {
    console.error("❌ No CLOUDFLARE_API_TOKEN provided.");
    process.exit(1);
  }

  console.log(`   Token: ${mask(token)}`);
  console.log(`   Account: ${accountId}`);
  console.log(`   Zone: ${zoneId}`);

  console.log("\n🔎 Verifying token permissions...");
  const verified = await verifyToken(token, accountId, zoneId);
  if (!verified) {
    console.log("\n🚫 NO-GO: Token verification failed. .env.local was not modified.");
    process.exit(1);
  }

  console.log("\n✏️  Updating .env.local...");
  updateEnvFile(ENV_PATH, token);
  console.log("✅ .env.local updated atomically.");

  const vaultKey =
    envFile.KLARPAKKE_VAULT_KEY || process.env.KLARPAKKE_VAULT_KEY;
  const syncScript = resolve(ROOT, "scripts/vault/sync-env-to-mempalace.mjs");
  if (existsSync(syncScript) && vaultKey) {
    console.log("\n🔐 Re-encrypting .env.local to MemPalace KG...");
    const syncStatus = run(process.execPath, [syncScript]);
    if (syncStatus !== 0) {
      console.log(
        "\n⚠️  MemPalace sync failed, but the token was rotated. " +
          "Run `npm run vault:sync:env` manually after fixing the vault key.",
      );
    }
  } else {
    console.log("\nℹ️  Skipping MemPalace sync (no KLARPAKKE_VAULT_KEY present).");
  }

  console.log("\n🚀 Deploying to Cloudflare Workers...");
  const deployStatus = run("npm", ["run", "cf:deploy"]);
  if (deployStatus !== 0) {
    console.log(
      "\n🚫 NO-GO: Deploy failed. The token was rotated; inspect the output above.",
    );
    process.exit(1);
  }

  console.log("\n🧹 Purging Cloudflare cache...");
  const purgeStatus = run(process.execPath, [
    resolve(ROOT, "scripts/purge-cloudflare-cache.mjs"),
    "https://www.klarpakke.no/",
    "https://www.klarpakke.no/no/marked",
  ]);
  if (purgeStatus !== 0) {
    console.log(
      "\n⚠️  Cache purge failed, but deploy succeeded. Purge manually with:",
    );
    console.log(
      "   node scripts/purge-cloudflare-cache.mjs https://www.klarpakke.no/ https://www.klarpakke.no/no/marked",
    );
  }

  console.log(
    "\n🎉 GO: Cloudflare API token rotated, deployed, and cache purged.",
  );
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err.message);
  process.exit(1);
});
