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
  // Start the loop
  setInterval(async () => {
    try {
      await runAutoTradingIteration(supabase);
    } catch (error) {
      console.error("❌ Iteration error:", error);
    }
  }, ITERATION_INTERVAL);

  // Keep alive
  process.on("SIGINT", () => {
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("💥 Fatal runtime error:", err);
  process.exit(1);
});
