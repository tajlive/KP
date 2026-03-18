import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(request, response);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      );
    }

    const supabase = createClient();

    // Parse body
    const body = await request.json();
    const { trading_pair, strategy_id, starting_capital_nok } = body;

    // Validering
    if (!trading_pair || typeof trading_pair !== "string") {
      return NextResponse.json(
        { error: "Trading pair er påkrevd" },
        { status: 400 }
      );
    }

    const capital = starting_capital_nok || 100000;
    if (capital < 1000 || capital > 100000) {
      return NextResponse.json(
        { error: "Startkapital må være mellom 1 000 og 100 000 kr" },
        { status: 400 }
      );
    }

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
        { status: 500 }
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
    return NextResponse.json(
      { error: "Uventet feil" },
      { status: 500 }
    );
  }
}
