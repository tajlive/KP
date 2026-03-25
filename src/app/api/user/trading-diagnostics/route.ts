import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { tradingDiagnosticsSuccessSchema } from "@/lib/trading/me-trades-api";

export const dynamic = "force-dynamic";

function buildVersion(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    "unknown"
  );
}

export async function GET() {
  const diagnostic_id = randomUUID();

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieEncoding: "raw",
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {
            /* read-only GET */
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false as const, error: "Unauthorized", diagnostic_id },
        { status: 401 },
      );
    }

    const { data: tradeRows, error: tradesErr } = await supabase
      .from("trades")
      .select("id, mode, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (tradesErr) {
      return NextResponse.json(
        {
          ok: false as const,
          error: tradesErr.message || "trades_query_failed",
          diagnostic_id,
        },
        { status: 500 },
      );
    }

    const rows = tradeRows ?? [];
    let paper_trade_count = 0;
    let live_trade_count = 0;
    for (const r of rows) {
      const m = String(r.mode ?? "")
        .trim()
        .toLowerCase();
      if (m === "live") live_trade_count += 1;
      else paper_trade_count += 1;
    }

    const { count: activeSessions, error: sessErr } = await supabase
      .from("trading_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");

    if (sessErr) {
      return NextResponse.json(
        {
          ok: false as const,
          error: sessErr.message || "sessions_query_failed",
          diagnostic_id,
        },
        { status: 500 },
      );
    }

    const body = {
      ok: true as const,
      diagnostic_id,
      build_version: buildVersion(),
      trades_visible_count: rows.length,
      last_trade_created_at: rows[0]?.created_at ?? null,
      paper_trade_count,
      live_trade_count,
      active_sessions_count: activeSessions ?? 0,
    };

    tradingDiagnosticsSuccessSchema.parse(body);

    return NextResponse.json(body, {
      headers: { "X-Diagnostic-Id": diagnostic_id },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false as const,
        error: "internal_error",
        diagnostic_id,
      },
      { status: 500 },
    );
  }
}
