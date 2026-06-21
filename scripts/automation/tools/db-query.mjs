#!/usr/bin/env node
/**
 * 🔧 db:query — run a SQL file or raw query against production Postgres.
 *
 * Usage:
 *   node scripts/automation/tools/db-query.mjs --file supabase/migrations/20260620xxxxxx_fix.sql
 *   node scripts/automation/tools/db-query.mjs "SELECT * FROM pg_tables WHERE schemaname='public' LIMIT 10"
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { withDbClient } from "../lib/db-client.mjs";

const args = process.argv.slice(2);
const fileFlag = args.indexOf("--file");

async function main() {
  let sql;

  if (fileFlag !== -1 && args[fileFlag + 1]) {
    const filePath = resolve(args[fileFlag + 1]);
    sql = readFileSync(filePath, "utf8");
  } else if (args.length === 1) {
    sql = args[0];
  } else {
    console.error("Usage: db-query.mjs --file <path.sql>");
    console.error("       db-query.mjs \"SELECT ...\"");
    process.exit(1);
  }

  try {
    const result = await withDbClient((client) => client.query(sql));
    const output = {
      status: "GO",
      command: result.command,
      rowCount: result.rowCount,
      rows: result.rows,
    };
    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error("[db-query] ERROR:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[db-query] FATAL:", err.message);
  process.exit(1);
});
