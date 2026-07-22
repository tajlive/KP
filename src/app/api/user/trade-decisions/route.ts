import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false as const, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    let limit = DEFAULT_LIMIT;
    if (limitParam != null) {
      const n = Number.parseInt(limitParam, 10);
      if (Number.isFinite(n)) {
        limit = Math.min(MAX_LIMIT, Math.max(1, n));
      }
    }

    const { data, error } = await supabase
      .from("trade_decisions")
      .select(
        "id, decision_type, trading_mode, symbol, side, requested_quantity, requested_price, rejection_reason, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false as const, error: error.message || "trade_decisions_query_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true as const,
      decisions: data ?? [],
      limit,
    });
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "internal_error" },
      { status: 500 },
    );
  }
}
