#!/usr/bin/env node
/**
 * 🔒 Encrypt a single secret.
 *
 * Usage:
 *   npm run vault:encrypt -- <name>
 *
 * The secret value is read securely from stdin (or an interactive prompt if
 * stdin is a TTY) so it is never exposed in shell history or `ps`.
 *
 * For scripted/non-interactive use, pipe the value in:
 *   echo -n "my value" | npm run vault:encrypt -- MY_SECRET
 *
 * The encrypted JSON blob is written to stdout.
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { createInterface } from "readline";
import { encrypt } from "./lib/crypto.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const [name] = process.argv.slice(2);

if (!name) {
  console.error("Usage: npm run vault:encrypt -- <name>");
  console.error("Then type or pipe the secret value.");
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

async function readSecretValue() {
  if (!process.stdin.isTTY) {
    // Non-interactive: read raw value from stdin.
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
  }

  // Interactive: hidden prompt.
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  return new Promise((resolve, reject) => {
    const stdout = process.stdout;
    stdout.write("Enter secret value: ");
    rl.question("", (value) => {
      rl.close();
      stdout.write("\n");
      resolve(value);
    });
    // Hide typed characters.
    rl._writeToOutput = () => {};
  });
}

readSecretValue()
  .then((value) => {
    if (value === undefined || value === "") {
      console.error("Error: secret value cannot be empty.");
      process.exit(1);
    }
    const aad = `secret:${name}`;
    const blob = encrypt(value, keyHex, aad);
    console.log(blob);
    console.error(`🔒 Encrypted secret "${name}" (AAD: ${aad})`);
  })
  .catch((err) => {
    console.error("Error reading secret value:", err.message);
    process.exit(1);
  });
