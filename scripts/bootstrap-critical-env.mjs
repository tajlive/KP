#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const envLocalPath = resolve(rootDir, ".env.local");

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

function main() {
  const envLocal = parseEnvFile(envLocalPath);

  const merged = { ...envLocal };

  if (!merged.GITHUB_TOKEN) {
    merged.GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "";
  }

  // Remove empty keys to avoid writing blank assignments.
  for (const key of ["GITHUB_TOKEN"]) {
    if (!merged[key]) delete merged[key];
  }

  writeFileSync(envLocalPath, serializeEnv(merged));

  const status = ["GITHUB_TOKEN"].map(
    (key) => `${key}:${merged[key] ? "set" : "missing"}`
  );
  console.log(`Bootstrapped .env.local -> ${status.join(" ")}`);
}

main();
