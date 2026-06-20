#!/usr/bin/env node
/**
 * ⬆️ Sync secrets from a .env file to MemPalace KG.
 *
 * Usage:
 *   node scripts/vault/sync-env-to-mempalace.mjs [--env-path <path>] [--dry-run]
 *
 * Default env file: .env.local
 *
 * Note: --env-path is used instead of --env-file because Node.js 24 treats
 * --env-file as a native runtime flag.
 *
 * The master key KLARPAKKE_VAULT_KEY is never stored in MemPalace.
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { parseEnvFile } from "./lib/env.mjs";
import { encrypt } from "./lib/crypto.mjs";
import { kgBatch, getKGPath } from "./lib/mempalace.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function parseArgs(argv) {
  const args = {
    envFile: resolve(ROOT, ".env.local"),
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--env-path" || arg === "-e") {
      args.envFile = resolve(ROOT, argv[++i]);
    } else if (arg === "--dry-run" || arg === "-d") {
      args.dryRun = true;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));

let keyHex;
try {
  keyHex = execFileSync(process.execPath, [resolve(__dirname, "vault-key.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  })
    .split("\n")
    .find((line) => /^[0-9a-f]{64}$/i.test(line));
} catch (err) {
  console.error("Failed to load vault key:", err.message);
  process.exit(1);
}

if (!keyHex) {
  console.error("Vault key not found or invalid.");
  process.exit(1);
}

const entries = parseEnvFile(args.envFile);
const secrets = entries.filter(
  (e) => e.key && e.key !== "KLARPAKKE_VAULT_KEY" && e.value !== undefined
);

if (secrets.length === 0) {
  console.error(`No syncable secrets found in ${args.envFile}.`);
  process.exit(0);
}

const timestamp = new Date().toISOString();
const facts = [];

for (const entry of secrets) {
  const subject = `secret:${entry.key}`;
  const encryptedJson = encrypt(entry.value, keyHex, subject);

  facts.push(
    { subject, predicate: "encrypted_value", object: encryptedJson, validFrom: timestamp },
    { subject, predicate: "source", object: args.envFile, validFrom: timestamp },
    { subject, predicate: "updated_at", object: timestamp, validFrom: timestamp }
  );
}

if (args.dryRun) {
  console.log(`Dry-run: would sync ${facts.length / 3} secrets to ${getKGPath()}`);
  for (const fact of facts) {
    console.log(JSON.stringify(fact));
  }
  process.exit(0);
}

try {
  const result = kgBatch(facts);
  console.log(`✅ Synced ${result.written / 3} secrets from ${args.envFile} to ${getKGPath()}`);
} catch (err) {
  console.error("❌ Failed to sync secrets to MemPalace:", err.message);
  process.exit(1);
}
