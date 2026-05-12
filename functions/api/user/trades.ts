export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { createServerClient } from "@/lib/supabase/server";
import { randomUUID } from "node:crypto";
import {
  type MeTradeRow,
  meTradeRowSchema,
  meTradesSuccessSchema,
} from "@/lib/trading/me-trades-api";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 200;

async function GETHandler(request: Request, env: Env)(request: NextRequest) {
  const diagnostic_id = randomUUID();

  try {
    const supabase = await createServerClient();

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

    const limitParam = new URL(request.url).searchParams.get("limit");
    let limit = DEFAULT_LIMIT;
    if (limitParam != null) {
      const n = Number.parseInt(limitParam, 10);
      if (Number.isFinite(n)) {
        limit = Math.min(MAX_LIMIT, Math.max(1, n));
      }
    }

    const { data, error } = await supabase
      .from("trades")
      .select(
        "id, trading_pair, side, quantity, price, total_value, realized_pnl, mode, status, created_at, executed_at, strategy_signal",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        {
          ok: false as const,
          error: error.message || "trades_query_failed",
          diagnostic_id,
        },
        { status: 500 },
      );
    }

    const rawRows = data ?? [];
    const trades: MeTradeRow[] = [];
    for (const row of rawRows) {
      const parsed = meTradeRowSchema.safeParse(row);
      if (parsed.success) {
        trades.push(parsed.data);
      }
    }

    const body = { ok: true as const, diagnostic_id, trades, limit };
    meTradesSuccessSchema.parse(body);

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


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'GET') {
      return GETHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
