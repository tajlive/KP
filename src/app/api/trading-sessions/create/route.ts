import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createSessionSchema = z.object({
  trading_pair: z.string().min(1, "Trading pair er påkrevd"),
  strategy_id: z.string().optional(),
  starting_capital_nok: z.number().min(1000).max(100000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(request, response);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
    }

    const supabase = createClient();

    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { trading_pair, strategy_id } = parsed.data;
    const capital = parsed.data.starting_capital_nok || 100000;

    const now = new Date().toISOString();

    // Opprett trading session
    const result = await supabase
      .from("trading_sessions")
      .insert({
        user_id: user.id,
        mode: "paper",
        status: "active",
        trading_pair: trading_pair.toUpperCase(),
        strategy_id: strategy_id || "dca",
        current_capital_nok: capital,
        starting_capital_nok: capital,
        total_pnl: 0,
        winning_trades: 0,
        total_trades: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    const session = result.data as { id: string } | null;
    const insertError = result.error;

    if (insertError || !session) {
      console.error("Failed to create trading session:", insertError);
      return NextResponse.json(
        { error: "Kunne ikke opprette trading session" },
        { status: 500 },
      );
    }

    // Logg aktivitet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("activity_logs").insert({
      user_id: user.id,
      action: "paper_trading_session_created",
      details: {
        session_id: session.id,
        trading_pair: trading_pair.toUpperCase(),
        starting_capital_nok: capital,
      },
    });

    return NextResponse.json({
      success: true,
      session_id: session.id,
      session,
    });
  } catch (error) {
    console.error("Unexpected error in create trading session:", error);
    return NextResponse.json({ error: "Uventet feil" }, { status: 500 });
  }
}
