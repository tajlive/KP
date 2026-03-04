#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read
/**
 * SQL Runner Tool for Klarpakke MCP
 * Kjør SQL direkte mot Supabase database
 */

import { parse } from "https://deno.land/std@0.177.0/flags/mod.ts";

interface SqlResult {
  success: boolean;
  output?: string;
  error?: string;
  command?: string;
}

async function runSql(query: string, isFile = false): Promise<SqlResult> {
  const databaseUrl = Deno.env.get("DATABASE_URL");
  
  if (!databaseUrl) {
    return {
      success: false,
      error: "DATABASE_URL not found in environment"
    };
  }

  try {
    const command = new Deno.Command("psql", {
      args: [
        databaseUrl,
        isFile ? "-f" : "-c",
        query,
        "--quiet",
        "-v",
        "ON_ERROR_STOP=1"
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();
    const output = new TextDecoder().decode(stdout);
    const error = new TextDecoder().decode(stderr);

    if (code !== 0) {
      return {
        success: false,
        error: error || "Unknown error"
      };
    }

    return {
      success: true,
      output: output.trim(),
      command: isFile ? "file" : "query"
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

// CLI interface
if (import.meta.main) {
  const flags = parse(Deno.args, {
    string: ["file", "query", "check-table"],
    boolean: ["list-tables", "check-connection"],
    alias: {
      f: "file",
      q: "query",
      t: "check-table",
      l: "list-tables",
      c: "check-connection",
    },
  });

  // Check connection
  if (flags["check-connection"]) {
    const result = await runSql("SELECT version();");
    console.log(JSON.stringify(result, null, 2));
    Deno.exit(result.success ? 0 : 1);
  }

  // List tables
  if (flags["list-tables"]) {
    const result = await runSql("\\dt");
    console.log(result.output || result.error);
    Deno.exit(result.success ? 0 : 1);
  }

  // Check specific table
  if (flags["check-table"]) {
    const result = await runSql(`\\dt ${flags["check-table"]}`);
    console.log(result.output || result.error);
    Deno.exit(result.success ? 0 : 1);
  }

  // Run SQL file
  if (flags.file) {
    console.log(`Running SQL file: ${flags.file}`);
    const result = await runSql(flags.file, true);
    console.log(result.output || result.error);
    Deno.exit(result.success ? 0 : 1);
  }

  // Run SQL query
  if (flags.query) {
    console.log(`Running SQL query: ${flags.query}`);
    const result = await runSql(flags.query);
    console.log(result.output || result.error);
    Deno.exit(result.success ? 0 : 1);
  }

  // Show usage
  console.log(`
Klarpakke SQL Runner

Usage:
  deno run --allow-env --allow-net --allow-read sql-runner.ts [options]

Options:
  -c, --check-connection     Test database connection
  -l, --list-tables          List all tables
  -t, --check-table <name>   Check if table exists
  -f, --file <path>          Run SQL file
  -q, --query <sql>          Run SQL query

Examples:
  deno run sql-runner.ts --check-connection
  deno run sql-runner.ts --list-tables
  deno run sql-runner.ts --check-table live_trades
  deno run sql-runner.ts --file ./migrations/my-migration.sql
  deno run sql-runner.ts --query "SELECT * FROM profiles LIMIT 5"
`);
}

export { runSql };
