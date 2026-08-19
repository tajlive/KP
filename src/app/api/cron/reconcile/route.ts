import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  reconcileLiveTrades,
  type ReconciliationTrade,
} from "@/lib/trading/reconciliation";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import type { OrderExecutor } from "@/lib/trading/order-executor";
import { validateCronSecret } from "@/lib/auth/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient();

  // Per-user executor cache so we only build (and decrypt API keys for) each
  // live-trading user once per reconciliation run.
  const executors = new Map<string, OrderExecutor>();

  const result = await reconcileLiveTrades(
    db as SupabaseClient<Database>,
    async (trade: ReconciliationTrade) => {
      const orderId = trade.binance_order_id;
      if (!orderId) {
        return null;
      }

      let executor = executors.get(trade.user_id);
      if (!executor) {
        try {
          executor = await ExecutorFactory.create(db, trade.user_id, "live");
          executors.set(trade.user_id, executor);
        } catch (err) {
          console.error(
            `[Reconcile] Failed to create executor for user ${trade.user_id}:`,
            err,
          );
          return null;
        }
      }

      if (typeof executor.getOrderStatus !== "function") {
        return null;
      }

      const krakenSymbol = trade.trading_pair.replace("/", "");
      return executor.getOrderStatus(krakenSymbol, orderId);
    },
  );

  await db.from("reconciliation_runs").insert({
    trades_checked: result.tradesChecked,
    divergences: result.divergences,
    errors: result.errors,
    details: result.details,
    completed_at: new Date().toISOString(),
  });

  if (result.divergences > 0) {
    console.error(`[Reconcile] Found ${result.divergences} divergences`);
  }

  return NextResponse.json(result);
}

// pg_cron (klarpakke_trigger_cron) kaller cron-ruter med net.http_post (POST).
// Uten aliasen gir POST → 405 og reconciliering kjører aldri.
export const POST = GET;
