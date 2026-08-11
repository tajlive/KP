#!/usr/bin/env node
/**
 * 🔑 Vault key management.
 *
 * Loads KLARPAKKE_VAULT_KEY from .env.local. If missing, generates a new
 * 256-bit key and appends it to .env.local.
 *
 * Usage:
 *   node scripts/vault/vault-key.mjs
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parseEnvFile, writeEnvFile } from "./lib/env.mjs";
import { generateKey } from "./lib/crypto.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DEFAULT_ENV_PATH = resolve(ROOT, ".env.local");

const envPath = process.env.KLARPAKKE_VAULT_ENV_FILE || DEFAULT_ENV_PATH;

function loadOrCreateKey() {
  const entries = parseEnvFile(envPath);
  const existing = entries.find((e) => e.key === "KLARPAKKE_VAULT_KEY");

  if (existing?.value) {
    return { key: existing.value, source: `loaded from ${envPath}` };
  }

  // Generate a new key and append it to the env file.
  const newKey = generateKey();
  const warningComment =
    "# KLARPAKKE_VAULT_KEY — master key for the local secrets vault. " +
    "Back this up securely; losing it means encrypted Honcho secrets cannot be decrypted.";

  entries.push({ comment: warningComment });
  entries.push({ key: "KLARPAKKE_VAULT_KEY", value: newKey });

  writeEnvFile(envPath, entries);

  return { key: newKey, source: `generated and appended to ${envPath}` };
}

const { key, source } = loadOrCreateKey();

console.log(key);
console.error("🔑 Vault key source:", source);
console.error(
  "⚠️  WARNING: This key is the only way to decrypt secrets stored in Honcho. Back it up securely."
);
