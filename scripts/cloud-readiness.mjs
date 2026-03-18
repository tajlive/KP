#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const parsed = {};
  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!key) continue;
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
    parsed[key] = value;
  }

  return parsed;
}

const envFromFiles = {
  ...loadEnvFile(resolve(rootDir, ".env.local")),
  ...loadEnvFile(resolve(rootDir, ".env.vercel")),
};

function getEnv(name) {
  return process.env[name] || envFromFiles[name] || "";
}

function mask(value) {
  if (!value) return "(missing)";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}...${value.slice(-2)}`;
}

function parseArg(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

const profile = parseArg("--profile") || "agent";
const environment = parseArg("--environment") || "preview";

const profiles = {
  agent: {
    required: ["LINEAR_API_KEY", "VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    optional: [
      "GITHUB_TOKEN",
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_SERVICE_ROLE_KEY",
      "CLOUDFLARE_API_TOKEN",
      "RESEND_API_KEY",
      "STRIPE_SECRET_KEY",
      "SENTRY_AUTH_TOKEN",
    ],
  },
  deploy: {
    required: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    optional: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"],
  },
  "manual-deploy": {
    required: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    optional: ["SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN"],
  },
};

if (!profiles[profile]) {
  console.error(`Unknown profile: ${profile}`);
  console.error(`Allowed profiles: ${Object.keys(profiles).join(", ")}`);
  process.exit(1);
}

const active = profiles[profile];
const required = [...active.required];

if (profile === "manual-deploy" && environment === "production") {
  required.push("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN");
}

const missing = required.filter((name) => !getEnv(name));

console.log("Cloud readiness");
console.log(`  profile: ${profile}`);
console.log(`  environment: ${environment}`);
console.log("");
console.log("Required variables:");
for (const name of required) {
  const value = getEnv(name);
  const status = value ? "OK " : "MISSING";
  console.log(`  - ${name}: ${status} ${mask(value)}`);
}

if (active.optional.length > 0) {
  console.log("");
  console.log("Optional variables:");
  for (const name of active.optional) {
    const value = getEnv(name);
    const status = value ? "OK " : "MISSING";
    console.log(`  - ${name}: ${status} ${mask(value)}`);
  }
}

if (missing.length > 0) {
  console.error("");
  console.error(`Readiness failed: missing required variables (${missing.join(", ")}).`);
  process.exit(1);
}

console.log("");
console.log("Readiness check passed.");
