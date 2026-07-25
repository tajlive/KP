import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_STATUSES = ["active", "paused", "stopped"] as const;
type SessionStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();

    // Sjekk autentisering
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, close_on_stop } = body as {
      status: SessionStatus;
      close_on_stop?: boolean;
    };

    // Valider status
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Ugyldig status. Må være: active, paused, eller stopped" },
        { status: 400 }
      );
    }

    // Verifiser eierskap til trading session
    const { data: session, error: sessionError } = await supabase
      .from("trading_sessions")
      .select(
        "user_id, status, trading_pair, mode, strategy_config, open_position",
      )
      .eq("id", id)
      .single();

    if (sessionError) {
      if (sessionError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Trading session ikke funnet" },
          { status: 404 }
        );
      }
      throw sessionError;
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: "Ingen tilgang til denne trading session" },
        { status: 403 }
      );
    }

    // Oppdater status — arkiver ved stopp for å holde totalene rene
    const updates: {
      status: "active" | "paused" | "crashed" | "stopped";
      updated_at: string;
      archived?: boolean;
      archived_at?: string;
      stopped_at?: string;
      strategy_config?: Record<string, unknown>;
    } = {
      status: status as "active" | "paused" | "crashed" | "stopped",
      updated_at: new Date().toISOString(),
    };
    if (status === "stopped") {
      updates.archived = true;
      updates.archived_at = new Date().toISOString();
      updates.stopped_at = new Date().toISOString();
      // Persistér close_on_stop-valget i strategy_config (default true)
      if (typeof close_on_stop === "boolean") {
        updates.strategy_config = {
          ...((session.strategy_config as Record<string, unknown>) ?? {}),
          close_on_stop,
        };
        session.strategy_config = updates.strategy_config as never;
      }
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from("trading_sessions")
      .update(updates as never)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Close-on-stop (DEFAULT PÅ): stoppes sesjonen med åpen posisjon,
    // selges posisjonen til markedspris og brukeren får en
    // læringsforklaring med resultatet. Uten dette forlates posisjonen
    // og selges ALDRI (orphan). Toggle: strategy_config.close_on_stop.
    let closeOnStop: {
      closed: boolean;
      reason?: string;
      realized_pnl?: number;
      explanation?: string;
    } | null = null;
    if (status === "stopped") {
      try {
        const { closeSessionPositionOnStop } = await import(
          "@/lib/trading/close-on-stop"
        );
        const { BinanceMarketDataProvider } = await import(
          "@/lib/trading/canonical/market-data/binance-provider"
        );
        const { getUsdtToNokRateAsync } = await import(
          "@/lib/trading/currency"
        );
        const { normalizePair } = await import("@/lib/trading/pair");

        const symbol = normalizePair(session.trading_pair);
        const provider = new BinanceMarketDataProvider();
        const klines = await provider.getKlines(symbol, "1h", 1);
        const priceUsdt =
          klines.length > 0 ? klines[klines.length - 1].close : 0;
        const rate = await getUsdtToNokRateAsync(supabase);

        if (priceUsdt > 0) {
          const closeResult = await closeSessionPositionOnStop(
            supabase,
            {
              id,
              user_id: user.id,
              trading_pair: session.trading_pair,
              mode: session.mode,
              strategy_config:
                (session.strategy_config as Record<string, unknown>) ?? {},
              open_position:
                session.open_position as never as Parameters<
                  typeof closeSessionPositionOnStop
                >[1]["open_position"],
            },
            { priceUsdt, rate },
          );
          closeOnStop = {
            closed: closeResult.closed,
            reason: closeResult.reason,
            realized_pnl: closeResult.realizedPnl,
            explanation: closeResult.explanation,
          };
        } else {
          console.error(
            `[CloseOnStop] Ingen pris for ${symbol} — posisjon forblir åpen`,
          );
        }
      } catch (closeErr) {
        // Stopp skal lykkes selv om auto-salg feiler
        console.error(
          "[CloseOnStop] Auto-salg ved stopp feilet:",
          (closeErr as Error).message,
        );
      }
    }

    // Logg handlingen for audit
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: "trading_session_status_changed",
      metadata: {
        session_id: id,
        new_status: status,
        previous_status: session.status,
      },
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
      ...(closeOnStop ? { close_on_stop: closeOnStop } : {}),
    });
  } catch (err) {
    console.error("Error updating trading session status:", err);
    return NextResponse.json(
      { error: "Serverfeil ved oppdatering av status" },
      { status: 500 }
    );
  }
}
