import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/auth/verify-cron";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { getDailySummaryEmail } from "@/lib/email/templates";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

interface UserForSummary {
  id: string;
  email: string | null;
  full_name: string | null;
}

/** Rullerende vindu så «gårsdagens» handler ikke faller utenfor ved CET/CEST og cron-tidspunkt. */
const SUMMARY_LOOKBACK_HOURS = 40;

function summarizeTrades(rows: { realized_pnl: number | null }[] | null): {
  count: number;
  pnl: number;
  winRatePct: number;
} {
  if (!rows?.length) {
    return { count: 0, pnl: 0, winRatePct: 0 };
  }
  let pnl = 0;
  let wins = 0;
  let losses = 0;
  for (const t of rows) {
    pnl += t.realized_pnl ?? 0;
    const rp = t.realized_pnl;
    if (rp == null) continue;
    if (rp > 0) wins += 1;
    else if (rp < 0) losses += 1;
  }
  const decided = wins + losses;
  const winRatePct =
    decided > 0 ? Math.round((wins / decided) * 100 * 10) / 10 : 0;
  return { count: rows.length, pnl, winRatePct };
}

/**
 * Summer kapital i NOK fra aktive sesjoner. Bruker kun current_capital_nok når satt,
 * så vi ikke viser rå USD/«cent»-tall som $20000000-feilen.
 */
function sumActiveCapitalNok(
  sessions:
    | Pick<
        Database["public"]["Tables"]["trading_sessions"]["Row"],
        "current_capital_nok" | "starting_capital_nok"
      >[]
    | null,
): number {
  if (!sessions?.length) return 0;
  let sum = 0;
  for (const s of sessions) {
    const nok = s.current_capital_nok;
    if (nok != null && Number.isFinite(Number(nok))) {
      sum += Number(nok);
      continue;
    }
    const start = s.starting_capital_nok;
    if (start != null && Number.isFinite(Number(start))) {
      sum += Number(start);
    }
  }
  return sum;
}

export async function GET(req: NextRequest) {
  const authError = verifyCronRequest(req);
  if (authError) return authError;

  try {
    const supabase = createClient() as SupabaseClient<Database>;
    const windowStart = new Date(
      Date.now() - SUMMARY_LOOKBACK_HOURS * 3600 * 1000,
    ).toISOString();

    const reportDate = new Date().toLocaleDateString("no-NO", {
      timeZone: "Europe/Oslo",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const { data: users, error: usersError } = await supabase
      .from("user_profiles")
      .select("id, email, full_name")
      .not("email", "is", null);

    if (usersError) {
      console.error("[Daily Summary] user_profiles:", usersError);
      return NextResponse.json(
        { error: "Failed to list users" },
        { status: 500 },
      );
    }

    if (!users?.length) {
      return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
    }

    let sent = 0;
    let skipped = 0;

    for (const user of users as UserForSummary[]) {
      if (!user.email) continue;
      const userId = user.id;

      // created_at: når raden ble skrevet — mer pålitelig enn executed_at ved kanttilfeller
      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("realized_pnl")
        .eq("user_id", userId)
        .gte("created_at", windowStart);

      if (tradesError) {
        console.error("[Daily Summary] trades query:", userId, tradesError);
        skipped += 1;
        continue;
      }

      const { count: tradesCount, pnl, winRatePct } = summarizeTrades(trades);

      if (tradesCount === 0) {
        skipped += 1;
        continue;
      }

      const { data: sessions, error: sessError } = await supabase
        .from("trading_sessions")
        .select("id, current_capital_nok, starting_capital_nok")
        .eq("user_id", userId)
        .eq("status", "active");

      if (sessError) {
        console.error("[Daily Summary] sessions:", userId, sessError);
        skipped += 1;
        continue;
      }

      const activeSessions = sessions?.length ?? 0;
      const totalCapitalNok = sumActiveCapitalNok(sessions);

      const template = getDailySummaryEmail({
        userName: user.full_name || "Bruker",
        tradesCount,
        pnl,
        winRatePct,
        activeSessions,
        totalCapitalNok,
        date: reportDate,
        periodNote: `Siste ${SUMMARY_LOOKBACK_HOURS} timer (handler filtrert på registreringstidspunkt).`,
      });

      await sendEmail({
        to: user.email,
        ...template,
      });

      sent += 1;
    }
    return NextResponse.json({ ok: true, sent, skipped });
  } catch (error) {
    console.error("[Daily Summary]:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Also support POST for pg_cron triggering
export const POST = GET;
