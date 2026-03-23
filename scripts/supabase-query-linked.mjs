#!/usr/bin/env node
/**
 * Kjør én eller flere SQL-filer mot linket Supabase-prosjekt via Management API.
 * Leser SUPABASE_ACCESS_TOKEN fra .env.local (dotenv).
 *
 * Bruk: node scripts/supabase-query-linked.mjs <sql> [sql ...]
 * Eks:  npm run db:apply:trading-core
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

config({ path: path.join(root, ".env.local") });

const files = process.argv.slice(2).filter(Boolean);
if (files.length === 0) {
  console.error(
    "Usage: node scripts/supabase-query-linked.mjs <sql-file> [more.sql ...]",
  );
  process.exit(1);
}

for (const fileArg of files) {
  const sqlPath = path.resolve(root, fileArg);
  const r = spawnSync(
    "npx",
    ["supabase", "db", "query", "--linked", "-f", sqlPath, "--agent=no"],
    { stdio: "inherit", cwd: root, env: process.env },
  );
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

process.exit(0);
