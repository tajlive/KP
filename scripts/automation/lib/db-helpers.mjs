#!/usr/bin/env node
/**
 * 🔍 Reusable DB inspection helpers for automation tasks.
 */
import { withDbClient } from "./db-client.mjs";

/**
 * List triggers on auth.users with target function and security definer status.
 */
export async function listAuthUserTriggers(client) {
  const sql = `
    SELECT
      t.tgname AS trigger_name,
      n.nspname AS function_schema,
      p.proname AS function_name,
      p.prosecdef AS is_security_definer,
      pg_get_userbyid(p.proowner) AS function_owner
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace cn ON cn.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE cn.nspname = 'auth'
      AND c.relname = 'users'
      AND NOT t.tgisinternal
    ORDER BY t.tgname;
  `;
  const result = await client.query(sql);
  return result.rows;
}

/**
 * Return the full CREATE OR REPLACE FUNCTION source for a function.
 */
export async function getFunctionSource(client, schema, name) {
  const sql = `
    SELECT pg_get_functiondef(p.oid) AS source
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = $1 AND p.proname = $2
  `;
  const result = await client.query(sql, [schema, name]);
  return result.rows[0]?.source || null;
}

/**
 * Check whether a role has a given privilege on a table.
 * privilege examples: INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER.
 */
export async function hasTablePrivilege(client, role, table, privilege) {
  const sql = `SELECT has_table_privilege($1, $2, $3) AS has_privilege`;
  const result = await client.query(sql, [role, table, privilege]);
  return result.rows[0]?.has_privilege === true;
}

/**
 * List columns for a table. Returns array of { column_name, data_type, is_nullable }.
 */
export async function listTableColumns(client, schema, table) {
  const sql = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `;
  const result = await client.query(sql, [schema, table]);
  return result.rows;
}

/**
 * Run a supplied SQL file contents or raw query string.
 */
export async function runSql(client, sql) {
  const result = await client.query(sql);
  return {
    command: result.command,
    rowCount: result.rowCount,
    rows: result.rows,
  };
}

// Direct execution helpers
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  const arg3 = process.argv[5];

  try {
    const out = await withDbClient(async (client) => {
      switch (command) {
        case "list-auth-triggers":
          return await listAuthUserTriggers(client);
        case "function-source":
          if (!arg1 || !arg2) throw new Error("usage: function-source <schema> <name>");
          return await getFunctionSource(client, arg1, arg2);
        case "check-privilege":
          if (!arg1 || !arg2 || !arg3) throw new Error("usage: check-privilege <role> <table> <privilege>");
          return { has_privilege: await hasTablePrivilege(client, arg1, arg2, arg3) };
        case "list-columns":
          if (!arg1 || !arg2) throw new Error("usage: list-columns <schema> <table>");
          return await listTableColumns(client, arg1, arg2);
        default:
          throw new Error(`Unknown command: ${command}. Try list-auth-triggers, function-source, check-privilege, list-columns`);
      }
    });
    console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
  } catch (err) {
    console.error("[db-helpers] ERROR:", err.message);
    process.exit(1);
  }
}
