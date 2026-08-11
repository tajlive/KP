#!/usr/bin/env node
/**
 * 🔁 Verify that every secret in .env.local can be encrypted into Honcho
 * and decrypted back to the same value.
 *
 * This script is read-only: it never writes to .env.local.
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { parseEnvFile } from "./lib/env.mjs";
import { encrypt, decrypt } from "./lib/crypto.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const ENV_FILE = resolve(ROOT, ".env.local");

function loadKey() {
  const keyHex = execFileSync(process.execPath, [resolve(__dirname, "vault-key.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  })
    .split("\n")
    .find((line) => /^[0-9a-f]{64}$/i.test(line));

  if (!keyHex) {
    console.error("Vault key not found or invalid.");
    process.exit(1);
  }
  return keyHex;
}

const keyHex = loadKey();
const entries = parseEnvFile(ENV_FILE);
const secrets = entries.filter(
  (e) => e.key && e.key !== "KLARPAKKE_VAULT_KEY" && e.value !== undefined
);

let passed = 0;
let failed = 0;

for (const entry of secrets) {
  const subject = `secret:${entry.key}`;
  try {
    const encrypted = encrypt(entry.value, keyHex, subject);
    const decrypted = decrypt(encrypted, keyHex, subject);
    if (decrypted !== entry.value) {
      console.error(`❌ ${entry.key}: decrypted value does not match original`);
      failed++;
      continue;
    }
    passed++;
  } catch (err) {
    console.error(`❌ ${entry.key}: ${err.message}`);
    failed++;
  }
}

console.log(`\nRound-trip verification: ${passed} passed, ${failed} failed out of ${secrets.length} secrets`);

if (failed > 0) {
  process.exit(1);
}
