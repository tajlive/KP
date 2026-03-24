#!/usr/bin/env node
/**
 * Starter @modelcontextprotocol/server-github med PAT fra .env.local.
 * Cursor erstatter ofte ikke ${GITHUB_TOKEN} fra .env.local — denne leser fila direkte.
 *
 * Støtter: GITHUB_TOKEN eller GH_PAT (samme verdi; GH_PAT er praktisk hvis du allerede bruker det navnet).
 */
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const env = { ...process.env };

function mergeEnvFromFile(content) {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
        env[key] = value;
      }
    }
  }
}

if (existsSync(envPath)) {
  try {
    mergeEnvFromFile(readFileSync(envPath, "utf8"));
  } catch (e) {
    console.error("[run-github-mcp] Could not read .env.local:", e.message);
  }
}

const pat = env.GITHUB_TOKEN || env.GH_PAT;
if (!pat || pat === "ghp_your_token_here") {
  console.error(
    "[run-github-mcp] Sett GITHUB_TOKEN eller GH_PAT i .env.local (Classic PAT med repo-scope)."
  );
  process.exit(1);
}

env.GITHUB_PERSONAL_ACCESS_TOKEN = pat;

const child = spawn("npx", ["-y", "@modelcontextprotocol/server-github"], {
  env,
  stdio: "inherit",
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
