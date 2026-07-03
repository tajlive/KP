import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ExecutorFactory } from "@/lib/trading/executor-factory";
import { validateCronSecret } from "@/lib/auth/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_USER_ID = "f91a1f43-71a4-4640-9c56-06fe95b2760d";

/**
 * Admin-only diagnostic route for the live Binance proxy.
 *
 * Requires CRON_SECRET via Authorization: Bearer <secret>.
 *
 * Verifies that the Supabase Edge Function `binance-proxy` can successfully
 * call Binance signed endpoints on behalf of a Bachelor+ test user.
 *
 * GET /api/admin/test-binance-proxy
 */
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient();

  try {
    const executor = await ExecutorFactory.create(db, TEST_USER_ID, "live");
    const balance = await executor.getBalance();

    return NextResponse.json({
      ok: true,
      userId: TEST_USER_ID,
      balance,
      mode: "live",
      proxyUsed: process.env.BINANCE_PROXY_ENABLED !== "0",
    });
  } catch (error) {
    console.error("[test-binance-proxy] Failed:", error);
    return NextResponse.json(
      {
        ok: false,
        userId: TEST_USER_ID,
        error: error instanceof Error ? error.message : String(error),
        proxyUsed: process.env.BINANCE_PROXY_ENABLED !== "0",
      },
      { status: 502 },
    );
  }
}
