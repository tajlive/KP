/**
 * Cron: Balance Drift Detection
 * Checks that trading_sessions.current_capital_nok stays in sync with
 * user_profiles.paper_balance, wallets.balance, portfolios.current_balance.
 * Alerts via Slack if drift exceeds 0.1% for any user.
 *
 * Secured with CRON_SECRET.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DRIFT_THRESHOLD_PCT = 0.001; // 0.1%
const ABSOLUTE_THRESHOLD_NOK = 10; // Also alert if absolute diff > 10 NOK

interface BalanceDriftResult {
  userId: string;
  sessionCapital: number;
  profileBalance: number | null;
  walletBalance: number | null;
  portfolioBalance: number | null;
  maxDriftPct: number;
  maxDriftAbsolute: number;
  outOfSync: boolean;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient();

    // Fetch all active paper sessions with their associated balances
    const { data: sessions, error: sessionError } = await supabase
      .from("trading_sessions")
      .select("id, user_id, current_capital_nok, current_capital")
      .eq("mode", "paper")
      .eq("status", "active");

    if (sessionError) {
      console.error("[balance-drift-check] Session query failed:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, drifts: [] });
    }

    const userIds = sessions.map((s) => s.user_id);

    // Fetch user_profiles balances
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, paper_balance")
      .in("id", userIds);

    if (profileError) {
      console.error("[balance-drift-check] Profile query failed:", profileError);
    }

    // Fetch wallets balances
    const { data: wallets, error: walletError } = await supabase
      .from("wallets")
      .select("user_id, balance")
      .in("user_id", userIds);

    if (walletError) {
      console.error("[balance-drift-check] Wallet query failed:", walletError);
    }

    // Fetch portfolios balances
    const { data: portfolios, error: portfolioError } = await supabase
      .from("portfolios")
      .select("user_id, current_balance")
      .in("user_id", userIds);

    if (portfolioError) {
      console.error("[balance-drift-check] Portfolio query failed:", portfolioError);
    }

    // Build lookup maps
    const profileMap = new Map(profiles?.map((p) => [p.id, p.paper_balance]) ?? []);
    const walletMap = new Map(wallets?.map((w) => [w.user_id, w.balance]) ?? []);
    const portfolioMap = new Map(portfolios?.map((p) => [p.user_id, p.current_balance]) ?? []);

    const drifts: BalanceDriftResult[] = [];
    const alerts: BalanceDriftResult[] = [];

    for (const session of sessions) {
      const sessionCapital = Number(session.current_capital_nok ?? session.current_capital ?? 0);
      const profileBalance = profileMap.get(session.user_id);
      const walletBalance = walletMap.get(session.user_id);
      const portfolioBalance = portfolioMap.get(session.user_id);

      const values = [
        profileBalance,
        walletBalance,
        portfolioBalance,
      ].filter((v): v is number => v !== null && v !== undefined);

      if (values.length === 0) continue;

      let maxDriftPct = 0;
      let maxDriftAbsolute = 0;

      for (const v of values) {
        const diff = Math.abs(v - sessionCapital);
        const pct = sessionCapital > 0 ? diff / sessionCapital : 0;
        maxDriftPct = Math.max(maxDriftPct, pct);
        maxDriftAbsolute = Math.max(maxDriftAbsolute, diff);
      }

      const outOfSync = maxDriftPct > DRIFT_THRESHOLD_PCT || maxDriftAbsolute > ABSOLUTE_THRESHOLD_NOK;

      const result: BalanceDriftResult = {
        userId: session.user_id,
        sessionCapital,
        profileBalance: profileBalance ?? null,
        walletBalance: walletBalance ?? null,
        portfolioBalance: portfolioBalance ?? null,
        maxDriftPct,
        maxDriftAbsolute,
        outOfSync,
      };

      drifts.push(result);

      if (outOfSync) {
        alerts.push(result);
        console.warn(
          `[balance-drift-check] DRIFT user=${session.user_id} ` +
            `session=${sessionCapital} profile=${profileBalance} wallet=${walletBalance} portfolio=${portfolioBalance} ` +
            `maxDriftPct=${(maxDriftPct * 100).toFixed(2)}% absolute=${maxDriftAbsolute.toFixed(2)}`
        );
      }
    }

    // Send Slack alert if any drifts detected
    if (alerts.length > 0 && process.env.SLACK_WEBHOOK) {
      try {
        await fetch(process.env.SLACK_WEBHOOK, {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({
            text: `🚨 *Balance Drift Alert* — ${alerts.length} user(s) out of sync\n\n${alerts
              .map(
                (a) =>
                  `• ${a.userId.slice(0, 8)}…: drift ${(a.maxDriftPct * 100).toFixed(2)}% ` +
                  `(session: ${a.sessionCapital.toFixed(0)}, profile: ${a.profileBalance?.toFixed(0) ?? "N/A"}, ` +
                  `wallet: ${a.walletBalance?.toFixed(0) ?? "N/A"}, portfolio: ${a.portfolioBalance?.toFixed(0) ?? "N/A"})`
              )
              .join("\n")}`,
          }),
        });
      } catch (e) {
        console.error("[balance-drift-check] Slack alert failed:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: sessions.length,
      driftCount: alerts.length,
      thresholdPct: DRIFT_THRESHOLD_PCT * 100,
      thresholdAbsolute: ABSOLUTE_THRESHOLD_NOK,
      drifts: alerts.length > 0 ? alerts : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[balance-drift-check] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const POST = GET;
