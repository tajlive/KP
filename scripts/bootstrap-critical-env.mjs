#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const envLocalPath = resolve(rootDir, ".env.local");
const envMcpPath = resolve(rootDir, ".env.mcp");
const vercelProjectPath = resolve(rootDir, ".vercel", "project.json");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
    env[key] = value;
  }
  return env;
}

function serializeEnv(envObj) {
  const ordered = Object.entries(envObj).sort(([a], [b]) => a.localeCompare(b));
  return `${ordered.map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
}

function readFirstMatch(paths, regex) {
  for (const filePath of paths) {
    const absolutePath = resolve(rootDir, filePath);
    if (!existsSync(absolutePath)) continue;
    const content = readFileSync(absolutePath, "utf8");
    const match = content.match(regex);
    if (match?.[0]) return match[0];
  }
  return "";
}

function readVercelProjectConfig() {
  if (!existsSync(vercelProjectPath)) return {};
  try {
    const data = JSON.parse(readFileSync(vercelProjectPath, "utf8"));
    return {
      VERCEL_ORG_ID: data.orgId || "",
      VERCEL_PROJECT_ID: data.projectId || "",
    };
  } catch {
    return {};
  }
}

function readConfigureVercelConstants() {
  const filePath = resolve(rootDir, "scripts/configure-vercel.ts");
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, "utf8");
  const projectId = content.match(/PROJECT_ID\s*=\s*"([^"]+)"/)?.[1] || "";
  const orgId = content.match(/TEAM_ID\s*=\s*"([^"]+)"/)?.[1] || "";
  return {
    VERCEL_ORG_ID: orgId,
    VERCEL_PROJECT_ID: projectId,
  };
}

function main() {
  const envLocal = parseEnvFile(envLocalPath);
  const envMcp = parseEnvFile(envMcpPath);
  const vercelFromProject = readVercelProjectConfig();
  const vercelFromConstants = readConfigureVercelConstants();

  const linearFromScripts = readFirstMatch(
    ["scripts/update-linear-issues.mjs", "scripts/fix-dns-and-linear.mjs", "scripts/vercel-post-dns.mjs"],
    /lin_api_[A-Za-z0-9]+/
  );
  const vercelTokenFromScripts = readFirstMatch(["scripts/vercel-post-dns.mjs"], /vcp_[A-Za-z0-9]+/);

  const merged = { ...envLocal };

  if (!merged.LINEAR_API_KEY) {
    merged.LINEAR_API_KEY = process.env.LINEAR_API_KEY || linearFromScripts || "";
  }

  if (!merged.VERCEL_TOKEN) {
    merged.VERCEL_TOKEN = process.env.VERCEL_TOKEN || envMcp.VERCEL_TOKEN || vercelTokenFromScripts || "";
  }

  if (!merged.VERCEL_ORG_ID) {
    merged.VERCEL_ORG_ID =
      process.env.VERCEL_ORG_ID || vercelFromProject.VERCEL_ORG_ID || vercelFromConstants.VERCEL_ORG_ID || "";
  }

  if (!merged.VERCEL_PROJECT_ID) {
    merged.VERCEL_PROJECT_ID =
      process.env.VERCEL_PROJECT_ID ||
      vercelFromProject.VERCEL_PROJECT_ID ||
      vercelFromConstants.VERCEL_PROJECT_ID ||
      "";
  }

  if (!merged.GITHUB_TOKEN) {
    merged.GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "";
  }

  // Remove empty keys to avoid writing blank assignments.
  for (const key of ["LINEAR_API_KEY", "VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID", "GITHUB_TOKEN"]) {
    if (!merged[key]) delete merged[key];
  }

  writeFileSync(envLocalPath, serializeEnv(merged));

  const status = ["LINEAR_API_KEY", "VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID", "GITHUB_TOKEN"].map(
    (key) => `${key}:${merged[key] ? "set" : "missing"}`
  );
  console.log(`Bootstrapped .env.local -> ${status.join(" ")}`);
}

main();
