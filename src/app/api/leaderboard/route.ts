/**
 * Leaderboard API — ekte, validerte brukere (FACT-AUDIT 2.1/2.2)
 *
 * GET /api/leaderboard?period=weekly
 *
 * Filtrerer eksplisitt bort:
 * 1. Bot-profiler (AI-genererte navn fra seed-data)
 * 2. Ugyldige display_name (injection, HTML, kontrolltegn)
 *
 * Testkontoer er MED (Toms beslutning 2026-08-04 — han bruker dem
 * aktivt til å teste konkurransen; kun seed-botter filtreres).
 *
 * Bygger leaderboard fra paper_accounts (reell balanse),
 * trading_stats (antall handler, win-rate), og user_profiles (navn).
 * Ingen seed-data. Kun ekte brukere med faktiske handler.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Svarteliste — AI-genererte bot-navn (FACT-AUDIT 2.1, BRIEF 3.3)
// ---------------------------------------------------------------------------
const BOT_DISPLAY_NAMES = new Set([
  "Anne Mo",
  "Ingrid Sol",
  "Lars Vik",
  "Kari Aas",
  "Marte Hav",
  "Per Berg",
  "Bjørn Fjell",
  "Trond Dal",
  "Silje Lund",
  "Ola Nordmann",
]);

// ---------------------------------------------------------------------------
// Testbruker-mønstre — anonymiseres, beholder tall (FACT-AUDIT 2.5)
// ---------------------------------------------------------------------------
const TEST_USER_PATTERNS = [
  /^tom\+/, // tom+sim..., tom+verify...
  /^tom$/, // "tom" (lowercase, @klarpakke.no)
  /^Gudrun\s+Myhre$/, // testpersona
  /^Viking[_ ]/, // Viking_NO, Viking Trader...
  /^Direct\s+Test$/, // test.direct@klarpakke.test
  /^Test\s+User$/, // test@klarpakke.com
];

function isTestUser(name: string): boolean {
  return TEST_USER_PATTERNS.some((p) => p.test(name));
}

let testUserCounter = 0;
function anonymizeTestUser(): string {
  testUserCounter++;
  return `Trader ${testUserCounter}`;
}

// Emoji / spesialtegn — skal ikke i display_name
const HAS_EMOJI_OR_SYMBOL =
  /[\u{1F600}-\u{1F9FF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B06}]/u;

// ---------------------------------------------------------------------------
// Valider display_name — ingen HTML, quotes, eller kontrolltegn
// ---------------------------------------------------------------------------
function sanitizeDisplayName(name: string | null | undefined): string | null {
  if (!name || typeof name !== "string") return null;
  let cleaned = name
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[""''«»]/g, "'") // normalize quotes
    .trim();
  // Fjern kontrolltegn
  cleaned = cleaned
    .split("")
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("");
  // Avvis emoji og spesialtegn
  if (HAS_EMOJI_OR_SYMBOL.test(cleaned)) return null;
  // Avvis etter rens hvis fortsatt mistenkelig
  if (!cleaned || cleaned.length < 2 || cleaned.length > 50) return null;
  if (
    cleaned.includes("<") ||
    cleaned.includes(">") ||
    cleaned.includes("{") ||
    cleaned.includes("}")
  )
    return null;
  return cleaned;
}

// ---------------------------------------------------------------------------
// GET /api/leaderboard
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "weekly";

  try {
    const supabase = await createClient();

    const { data: accounts, error: accErr } = await supabase
      .from("paper_accounts")
      .select("user_id, current_balance, initial_balance")
      .gt("current_balance", 0)
      .order("current_balance", { ascending: false })
      .limit(50);

    if (accErr) {
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      const response = NextResponse.json([]);
      response.headers.set(
        "Cache-Control",
        "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      );
      return response;
    }

    const userIds = accounts.map((a) => a.user_id).filter(Boolean);

    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const { data: stats } = await supabase
      .from("trading_stats")
      .select("user_id, total_trades, winning_trades")
      .in("user_id", userIds);

    // ── BALANSER FRA SESSIONS (2026-08-03) ─────────────────────────────────
    // paper_accounts.current_balance er ustabilt (overskrives av sync-prosesser).
    // trading_sessions.current_capital_nok er master for cash per sesjon.
    // MERK: noen brukere har inflated current_capital_nok fra historisk
    // oversell-bug (før trigger-fiks 2026-08-03). Vi begrenser derfor
    // sessions-sum til max 3x initial_balance som sanity-cap, og faller
    // tilbake til paper_accounts ved mistenkelig avvik.
    const { data: sessionSums } = await supabase
      .from("trading_sessions")
      .select("user_id, current_capital_nok")
      .in("user_id", userIds)
      .eq("mode", "paper")
      .in("status", ["active", "paused"]); // 2026-08-10: stoppede = fryst historikk

    const sessionBalanceMap = new Map<string, number>();
    for (const s of sessionSums ?? []) {
      if (!s.user_id) continue;
      sessionBalanceMap.set(
        s.user_id,
        (sessionBalanceMap.get(s.user_id) ?? 0) +
          Number(s.current_capital_nok ?? 0),
      );
    }

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const statsMap = new Map((stats ?? []).map((s) => [s.user_id, s]));

    const DEFAULT_START_BALANCE = 100_000;
    const leaderboard: Array<{
      user_id: string;
      user_display_name: string;
      avatar_url: string | null;
      return_pct: number;
      sharpe_ratio: number;
      win_rate: number;
      total_trades: number;
      rank: number;
      risk_level: string;
      period: string;
    }> = [];

    for (const acc of accounts) {
      const uid = acc.user_id;
      if (!uid || (uid as string).includes("0000-0000")) continue;

      const profile = profileMap.get(uid);
      const rawName = profile?.display_name ?? "";

      // --- FILTRERING ---
      // 1. Bot-navn
      if (BOT_DISPLAY_NAMES.has(rawName)) continue;
      // 1b. Testbruker → anonymiser (beholder tall)
      let safeName: string | null;
      if (isTestUser(rawName)) {
        safeName = anonymizeTestUser();
      } else {
        // 2. Valider/saniter
        safeName = sanitizeDisplayName(rawName);
        if (!safeName) continue;
      }

      // 4. Må ha minst 1 ekte trade for å vises på leaderboard
      const stat = statsMap.get(uid);
      const totalTrades = stat?.total_trades ?? 0;
      if (totalTrades < 1) continue;

      // Prekalkuler win_rate for sanity-sjekk
      const winningTrades = stat?.winning_trades ?? 0;
      const preWinRate =
        totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      // 4b. Sanity-filter: umulige kombinasjoner (FACT-AUDIT)
      // Win rate < 5% med >500% avkastning og >10 trades = matematisk umulig
      if (totalTrades > 10 && preWinRate < 5) continue;

      const balance = Number(acc.current_balance ?? 0);
      // Avkastning må måles mot brukerens FAKTISKE startkapital —
      // hardkodet 100k ga falsk +900% for kontoer med 1M initial (FACT-bug).
      const initial = Number(acc.initial_balance ?? 0);
      const startBalance = initial > 0 ? initial : DEFAULT_START_BALANCE;

      // Pengekontrakt v1.0 (2026-08-12): paper_accounts.current_balance er
      // SSoT (syncPaperAccountBalance summerer kun active+paused siden
      // 2026-08-10). Sessions-sum brukes kun som fallback når SSoT mangler
      // eller er mistenkelig (inflasjon > 3x startkapital).
      const sessionsSum = sessionBalanceMap.get(uid) ?? 0;
      const maxPlausible = startBalance * 3;
      const effectiveBalance =
        balance > 0 && balance <= maxPlausible
          ? balance
          : sessionsSum > 0 && sessionsSum <= maxPlausible
            ? sessionsSum
            : balance;
      const returnPct =
        ((effectiveBalance - startBalance) / startBalance) * 100;

      const winRate =
        totalTrades > 0
          ? Math.round((winningTrades / totalTrades) * 1000) / 10
          : 0;

      leaderboard.push({
        user_id: uid,
        user_display_name: safeName,
        avatar_url: profile?.avatar_url ?? null,
        return_pct: Math.round(returnPct * 100) / 100,
        sharpe_ratio: 0,
        win_rate: winRate,
        total_trades: totalTrades,
        rank: 0,
        risk_level: "moderate",
        period,
      });
    }

    leaderboard.sort((a, b) => b.return_pct - a.return_pct);
    leaderboard.forEach((row, i) => {
      row.rank = i + 1;
    });

    const response = NextResponse.json(leaderboard);
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
    return response;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
