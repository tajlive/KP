import { NextRequest, NextResponse } from "next/server";
import { fetchBinanceLeaderboard, calculateTraderRiskScore } from "@/lib/copy-trading/binance-leaders";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/binance-leaders
 * 
 * Henter topp 10 Binance futures tradere med live data
 * Inkluderer risiko-score og brukerens følgings-status
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const response = NextResponse.next();
    const supabase = createServerClient(request, response);
    const { data: { user } } = await supabase.auth.getUser();

    // Hent leaders fra Binance (ALLTID live data)
    const leaders = await fetchBinanceLeaderboard("ROI", 20);

    if (leaders.length === 0) {
      return NextResponse.json(
        { error: "Kunne ikke hente leaderbord fra Binance" },
        { status: 503 }
      );
    }

    // Beregn risiko-score for hver trader
    const leadersWithRisk = leaders.map(trader => {
      const risk = calculateTraderRiskScore(trader);
      return {
        ...trader,
        riskScore: risk.score,
        riskLevel: risk.level,
        riskWarnings: risk.warnings,
      };
    });

    // Sjekk hvem brukeren følger (hvis logget inn)
    let followingUids: string[] = [];
    if (user) {
      const { data: follows } = await supabase
        .from("copy_trading_follows")
        .select("leader_id")
        .eq("follower_id", user.id)
        .eq("is_active", true);

      followingUids = follows?.map(f => f.leader_id) || [];
    }

    // Marker hvem brukeren følger
    const leadersWithFollowing = leadersWithRisk.map(trader => ({
      ...trader,
      isFollowing: followingUids.includes(trader.encryptedUid),
    }));

    return NextResponse.json({
      leaders: leadersWithFollowing,
      lastUpdated: new Date().toISOString(),
      dataSource: "Binance Futures API (live)",
    });

  } catch (error) {
    console.error("[Binance Leaders API] Error:", error);
    return NextResponse.json(
      { error: "Intern feil ved henting av leaderbord" },
      { status: 500 }
    );
  }
}
