/**
 * Klarpakke Persistent Bot Worker
 * Designed for 24/7 execution in a standalone environment.
 */
import { runAutoTradingIteration } from "@/lib/auto-trading/binance-executor";
import type { Database } from "@/types/database.types";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const ITERATION_INTERVAL = 30000; // 30 seconds

async function main() {
  console.info("🚀 Klarpakke Persistent Worker Starting...");

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error(
      "❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  console.info("📡 Connected to Supabase. Monitoring active sessions...");

  // Start the loop
  setInterval(async () => {
    try {
      console.info(
        `[${new Date().toISOString()}] Running auto-trading iteration...`,
      );
      await runAutoTradingIteration(supabase);
    } catch (error) {
      console.error("❌ Iteration error:", error);
    }
  }, ITERATION_INTERVAL);

  // Keep alive
  process.on("SIGINT", () => {
    console.info("🛑 SIGINT received. Shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.info("🛑 SIGTERM received. Shutting down gracefully...");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("💥 Fatal runtime error:", err);
  process.exit(1);
});
