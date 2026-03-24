#!/usr/bin/env node
/**
 * Starter offisiell @supabase/mcp-server-supabase med PAT fra .env.local.
 * Cursor erstatter ikke alltid ${SUPABASE_ACCESS_TOKEN} fra .env.local — denne wrapperen
 * injiserer token slik at list_migrations, apply_migration, get_advisors, osv. fungerer.
 *
 * Krever: SUPABASE_ACCESS_TOKEN i .env.local (https://supabase.com/dashboard/account/tokens)
 * Valgfritt: SUPABASE_PROJECT_REF (default hentes fra NEXT_PUBLIC_SUPABASE_URL eller vuxbjlykgmzskxbclquf)
 */
import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const env = { ...process.env };

function parseEnvFile(content) {
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
    parseEnvFile(readFileSync(envPath, "utf8"));
  } catch (e) {
    console.error("[run-official-supabase-mcp] Could not read .env.local:", e.message);
  }
}

if (!env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN === "sbp_your_supabase_token_here") {
  console.error(
    "[run-official-supabase-mcp] SUPABASE_ACCESS_TOKEN mangler eller er placeholder. Legg PAT i .env.local (npm run env:sync:supabase fyller også URL/nøkler)."
  );
  process.exit(1);
}

let projectRef = env.SUPABASE_PROJECT_REF?.trim();
if (!projectRef && env.NEXT_PUBLIC_SUPABASE_URL) {
  const m = env.NEXT_PUBLIC_SUPABASE_URL.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (m) projectRef = m[1];
}
if (!projectRef) {
  projectRef = "vuxbjlykgmzskxbclquf";
}

const child = spawn(
  "npx",
  ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", env.SUPABASE_ACCESS_TOKEN, "--project-ref", projectRef],
  {
    env,
    stdio: "inherit",
    cwd: root,
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
