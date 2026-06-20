#!/usr/bin/env node
/**
 * 🔓 Decrypt a single secret.
 *
 * Usage:
 *   node scripts/vault/decrypt-secret.mjs <name> '<encrypted-json>'
 *
 * The name is used as AAD (associated data) to bind the ciphertext to the
 * secret. The decrypted value is written to stdout.
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { decrypt } from "./lib/crypto.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const [name, encryptedJson] = process.argv.slice(2);

if (!name || !encryptedJson) {
  console.error("Usage: node scripts/vault/decrypt-secret.mjs <name> '<encrypted-json>'");
  process.exit(1);
}

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

try {
  const aad = `secret:${name}`;
  const value = decrypt(encryptedJson, keyHex, aad);
  console.log(value);
} catch (err) {
  console.error("Decryption failed:", err.message);
  process.exit(1);
}
