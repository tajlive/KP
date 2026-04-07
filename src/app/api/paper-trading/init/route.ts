import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreatePaperTradingSession } from "@/lib/supabase/paper-trading";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Bruk createClient (samme som health API)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getOrCreatePaperTradingSession(supabase, user.id);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        starting_balance: session.starting_capital_nok,
        current_balance: session.current_capital_nok,
        is_active: session.status === "active",
        created_at: session.started_at,
      },
    });
  } catch (error) {
    console.error("[paper-trading/init] Error:", error);
    return NextResponse.json(
      { error: "Failed to initialize" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getOrCreatePaperTradingSession(supabase, user.id);
    const pnl = session.current_capital_nok - session.starting_capital_nok;
    const pnlPercentage = (pnl / session.starting_capital_nok) * 100;

    return NextResponse.json({
      session: {
        id: session.id,
        starting_balance: session.starting_capital_nok,
        current_balance: session.current_capital_nok,
        is_active: session.status === "active",
        created_at: session.started_at,
        pnl,
        pnlPercentage,
      },
    });
  } catch (error) {
    console.error("[paper-trading/init GET] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
