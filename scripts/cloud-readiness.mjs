#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync } from "node:fs";
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

/** Samme fil-rekke som Next / Playwright / create-test-users.js (senere fil overstyrer). */
const envFromFiles = {
  ...loadEnvFile(resolve(rootDir, ".env")),
  ...loadEnvFile(resolve(rootDir, ".env.local")),
  ...loadEnvFile(resolve(rootDir, ".env.development.local")),
  ...loadEnvFile(resolve(rootDir, ".env.production.local")),
  ...loadEnvFile(resolve(rootDir, ".env.vercel")),
};

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

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const profile = parseArg("--profile") || "agent";
const environment = parseArg("--environment") || "preview";
const exportGithubEnv = hasFlag("--export-github-env");
const autoResolveVercel = !hasFlag("--no-auto-resolve-vercel");

const resolvedVars = {};
const resolveNotes = [];

function setResolvedVar(name, value, source) {
  if (!value) return;
  if (!resolvedVars[name]) {
    resolvedVars[name] = value;
    resolveNotes.push(`${name} resolved from ${source}`);
  }
}

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

function getEnv(name) {
  return resolvedVars[name] || process.env[name] || envFromFiles[name] || "";
}

function readLocalVercelProjectConfig() {
  const vercelProjectPath = resolve(rootDir, ".vercel", "project.json");
  if (!existsSync(vercelProjectPath)) return {};

  try {
    const content = JSON.parse(readFileSync(vercelProjectPath, "utf8"));
    return {
      orgId: content.orgId || "",
      projectId: content.projectId || "",
    };
  } catch {
    return {};
  }
}

async function fetchVercel(path, token) {
  const response = await fetch(`https://api.vercel.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function resolveVercelContext() {
  const token = getEnv("VERCEL_TOKEN");
  if (!token) return;

  const localConfig = readLocalVercelProjectConfig();
  if (!getEnv("VERCEL_PROJECT_ID") && localConfig.projectId) {
    setResolvedVar("VERCEL_PROJECT_ID", localConfig.projectId, ".vercel/project.json");
  }
  if (!getEnv("VERCEL_ORG_ID") && localConfig.orgId) {
    setResolvedVar("VERCEL_ORG_ID", localConfig.orgId, ".vercel/project.json");
  }

  const projectId = getEnv("VERCEL_PROJECT_ID");
  if (!getEnv("VERCEL_ORG_ID") && projectId) {
    const project = await fetchVercel(`/v9/projects/${encodeURIComponent(projectId)}`, token);
    const orgIdFromProject = project?.accountId || project?.teamId || project?.orgId || "";
    if (orgIdFromProject) {
      setResolvedVar("VERCEL_ORG_ID", orgIdFromProject, "Vercel project lookup");
    }
  }

  if (!getEnv("VERCEL_ORG_ID")) {
    const user = await fetchVercel("/v2/user", token);
    const personalOrgId = user?.user?.id || "";
    if (personalOrgId) {
      setResolvedVar("VERCEL_ORG_ID", personalOrgId, "Vercel user lookup");
    }
  }
}

function exportResolvedToGithubEnv() {
  if (!exportGithubEnv || !process.env.GITHUB_ENV) return;
  const lines = Object.entries(resolvedVars).map(([key, value]) => `${key}=${value}`);
  if (lines.length === 0) return;
  appendFileSync(process.env.GITHUB_ENV, `${lines.join("\n")}\n`);
}

async function main() {
  const active = profiles[profile];
  const required = [...active.required];

  if (profile === "manual-deploy" && environment === "production") {
    required.push("SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN");
  }

  if (autoResolveVercel && required.some((name) => name.startsWith("VERCEL_"))) {
    await resolveVercelContext();
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

  if (resolveNotes.length > 0) {
    console.log("");
    console.log("Resolution notes:");
    for (const note of resolveNotes) {
      console.log(`  - ${note}`);
    }
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

  exportResolvedToGithubEnv();

  const e2eUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const e2eSr = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  console.log("");
  console.log("E2E provision (optional — Admin API / Playwright setup):");
  console.log(
    `  - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL: ${e2eUrl ? `OK ${mask(e2eUrl)}` : "MISSING → npm run test:e2e:check-env"}`,
  );
  console.log(
    `  - SUPABASE_SERVICE_ROLE_KEY: ${e2eSr ? `OK ${mask(e2eSr)}` : "MISSING → Dashboard → API → service_role"}`,
  );

  console.log("");
  console.log("Readiness check passed.");
}

main().catch((error) => {
  console.error(`Readiness failed with error: ${error?.message || String(error)}`);
  process.exit(1);
});
