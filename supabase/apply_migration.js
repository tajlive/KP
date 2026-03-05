/* global require, process, console */
const { Client } = require("pg");
const fs = require("fs");
require("dotenv").config({ path: ".env.production" });

async function run() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("POSTGRES_URL not found in .env.production");
    process.exit(1);
  }

  console.log("Connecting to Postgres...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    console.log("Reading migration SQL...");
    const sql = fs.readFileSync(
      "supabase/migrations/20260305011225_create_auto_trading_strategies.sql",
      "utf8",
    );

    console.log("Executing SQL...");
    await client.query(sql);

    console.log("Success! auto_trading_strategies created and seeded.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
