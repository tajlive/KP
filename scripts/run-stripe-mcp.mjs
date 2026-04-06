#!/usr/bin/env node
/**
 * Stripe MCP wrapper — laster STRIPE_SECRET_KEY fra .env.production eller .env.local
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Last env fra .env.local først
const env = loadEnvLocal();

// Sjekk om STRIPE_SECRET_KEY finnes i .env.production hvis ikke i .env.local
if (!env.STRIPE_SECRET_KEY) {
  const prodEnvPath = resolve(root, ".env.production");
  if (fs.existsSync(prodEnvPath)) {
    const prodContent = fs.readFileSync(prodEnvPath, "utf8");
    const match = prodContent.match(/^STRIPE_SECRET_KEY=(.+)$/m);
    if (match) {
      env.STRIPE_SECRET_KEY = match[1].trim();
    }
  }
}

// Sjekk .env.production.local også
if (!env.STRIPE_SECRET_KEY) {
  const prodLocalPath = resolve(root, ".env.production.local");
  if (fs.existsSync(prodLocalPath)) {
    const prodLocalContent = fs.readFileSync(prodLocalPath, "utf8");
    const match = prodLocalContent.match(/^STRIPE_SECRET_KEY=(.+)$/m);
    if (match) {
      env.STRIPE_SECRET_KEY = match[1].trim();
    }
  }
}

if (!env.STRIPE_SECRET_KEY) {
  console.error("[run-stripe-mcp] STRIPE_SECRET_KEY mangler i .env.local, .env.production eller .env.production.local");
  process.exit(1);
}

const child = spawn(
  "npx",
  ["-y", "@stripe/mcp@latest"],
  { 
    env: { 
      ...env, 
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY
    }, 
    stdio: "inherit", 
    cwd: root 
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
