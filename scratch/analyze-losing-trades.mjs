import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(repoRoot, ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const userId = process.argv[2];

if (!url || !key || !userId) {
  console.error("Usage: node analyze-losing-trades.mjs <userId>");
  process.exit(1);
}

const supabase = createClient(url, key);

async function analyze() {
  const { data: trades, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching trades:", error);
    return;
  }

  const closedTrades = trades.filter(t => t.realized_pnl !== null);
  const losingTrades = closedTrades.filter(t => t.realized_pnl < 0);
  const winningTrades = closedTrades.filter(t => t.realized_pnl > 0);

  console.log(`Total trades: ${trades.length}`);
  console.log(`Closed trades: ${closedTrades.length}`);
  console.log(`Wins: ${winningTrades.length}`);
  console.log(`Losses: ${losingTrades.length}`);
  console.log(`Win rate: ${closedTrades.length > 0 ? (winningTrades.length / closedTrades.length * 100).toFixed(2) : 0}%`);

  if (losingTrades.length === 0) {
    console.log("No losing trades found.");
    return;
  }

  // Analyze symbols
  const symbolStats = {};
  losingTrades.forEach(t => {
    symbolStats[t.trading_pair] = (symbolStats[t.trading_pair] || 0) + 1;
  });
  console.log("\nLosing trades by symbol:", symbolStats);

  // Analyze time of day (UTC)
  const hourStats = {};
  losingTrades.forEach(t => {
    const hour = new Date(t.executed_at || t.created_at).getUTCHours();
    hourStats[hour] = (hourStats[hour] || 0) + 1;
  });
  console.log("\nLosing trades by hour (UTC):", hourStats);

  // Analyze PnL distribution
  const pnlStats = losingTrades.map(t => t.realized_pnl);
  const avgLoss = pnlStats.reduce((a, b) => a + b, 0) / pnlStats.length;
  console.log(`\nAverage loss: ${avgLoss.toFixed(2)} NOK`);

  // Look for patterns in strategy signals
  const signals = losingTrades.map(t => t.strategy_signal).filter(Boolean);
  console.log(`\nTrades with signals: ${signals.length}`);
  
  // Sample signals
  if (signals.length > 0) {
    console.log("\nSample losing signal reasons:");
    signals.slice(0, 5).forEach(s => {
      console.log(JSON.stringify(s, null, 2));
    });
  }
}

analyze();
