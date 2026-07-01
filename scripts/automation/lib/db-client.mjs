#!/usr/bin/env node
/**
 * 🗄️  Reusable Postgres client for automation tasks.
 *
 * Connects via the Supavisor pooler (IPv4-first, SSL relaxed).
 * All secrets are loaded from .env.local by loadEnvLocal().
 */
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { setDefaultResultOrder } from "dns";
import { Client } from "pg";
import { loadEnvLocal } from "../../load-env.mjs";

// Force IPv4 lookups for Supavisor pooler (avoids IPv6 routing issues).
setDefaultResultOrder("ipv4first");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

/**
 * Load environment and return a pg.Client config object.
 * Does not connect.
 */
export function getDbConfig() {
  const env = loadEnvLocal();

  // Prefer a connection string (POSTGRES_URL / DATABASE_URL) because it already
  // points at the IPv4 Supavisor pooler in this project.
  const connectionString = env.POSTGRES_URL || env.DATABASE_URL || env.POSTGRES_CONNECTION_STRING;

  let host = env.POSTGRES_HOST || "aws-1-eu-central-1.pooler.supabase.com";
  let port = Number(env.POSTGRES_PORT || 6543);
  let user = env.POSTGRES_USER || "postgres.pskhryjzkobytnfwucrb";
  let password = env.POSTGRES_PASSWORD;
  let database = env.POSTGRES_DATABASE || env.POSTGRES_DB || "postgres";

  if (connectionString) {
    try {
      const url = new URL(connectionString);
      if (url.hostname) host = url.hostname;
      if (url.port) port = Number(url.port);
      if (url.username) user = decodeURIComponent(url.username);
      if (url.password) password = decodeURIComponent(url.password);
      if (url.pathname && url.pathname.length > 1) database = url.pathname.slice(1);
    } catch (e) {
      console.warn("[db-client] Could not parse POSTGRES_URL, falling back to individual env vars");
    }
  }

  if (!password) {
    throw new Error("POSTGRES_PASSWORD is missing from .env.local");
  }

  return {
    host,
    port,
    user,
    password,
    database,
    family: 4,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    query_timeout: 60000,
  };
}

/**
 * Return a new connected pg.Client.
 * Remember to call client.end().
 */
export async function getDbClient() {
  setDefaultResultOrder("ipv4first");
  const client = new Client(getDbConfig());
  await client.connect();
  return client;
}

/**
 * Run a callback with a connected client, then end the client.
 * Re-throws errors after ending the client.
 */
export async function withDbClient(callback) {
  const client = await getDbClient();
  try {
    return await callback(client);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Convenience: run a single SQL query and return rows.
 */
export async function queryDb(sql, params = []) {
  return withDbClient((client) => client.query(sql, params).then((r) => r.rows));
}

// Direct execution helper for `node scripts/automation/lib/db-client.mjs "SELECT 1"`
if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = process.argv[2] || "SELECT now() as now";
  try {
    const rows = await queryDb(sql);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("[db-client] ERROR:", err.message);
    process.exit(1);
  }
}
