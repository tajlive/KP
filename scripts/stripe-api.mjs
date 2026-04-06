#!/usr/bin/env node
/**
 * Stripe API CLI – test konto og priser med STRIPE_SECRET_KEY fra .env.local.
 * Brukes når MCP ikke er tilgjengelig eller for CI/scripting.
 *
 * MCP: Bruk Stripe MCP (Cursor plugin) eller denne CLI for full tilgang.
 *
 * Eksempel:
 *   node scripts/stripe-api.mjs test
 *   node scripts/stripe-api.mjs prices
 */
import Stripe from "stripe";
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
const secretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

function getStripe() {
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY mangler. Legg den i .env.local eller export STRIPE_SECRET_KEY.");
  }
  return new Stripe(secretKey, { apiVersion: "2023-10-16" });
}

async function test() {
  const stripe = getStripe();
  const balance = await stripe.balance.retrieve();
  console.log("Stripe API OK – balance tilgjengelig, livemode:", balance.livemode);
  return balance;
}

const PRICE_ENV_KEYS = [
  "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY",
  "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL",
  "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY",
  "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL",
  "NEXT_PUBLIC_STRIPE_PRO_PRICE_MONTHLY",
  "NEXT_PUBLIC_STRIPE_PRO_PRICE_ANNUAL",
];

async function prices() {
  const stripe = getStripe();
  const missing = PRICE_ENV_KEYS.filter((k) => !(env[k] || process.env[k]));
  if (missing.length) {
    console.error("Mangler env for priser:", missing.join(", "));
    process.exit(1);
  }
  const ids = PRICE_ENV_KEYS.map((k) => env[k] || process.env[k]);
  const results = [];
  for (const id of ids) {
    const p = await stripe.prices.retrieve(id);
    results.push({ id: p.id, unit_amount: p.unit_amount ? p.unit_amount / 100 : null, currency: p.currency });
  }
  console.log("Stripe priser OK:");
  console.log(JSON.stringify(results, null, 2));
  return results;
}

const [cmd] = process.argv.slice(2);
const commands = {
  test: () => test(),
  prices: () => prices(),
};

async function main() {
  if (!cmd || !commands[cmd]) {
    console.error("Bruk: node scripts/stripe-api.mjs <test|prices>");
    process.exit(1);
  }
  try {
    await commands[cmd]();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

main();
