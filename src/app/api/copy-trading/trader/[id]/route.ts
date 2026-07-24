import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/copy-trading/trader/[id] — offentlig trader-profil + strategier.
 *
 * KLA-auth: Browser-supabase er alltid anon (httpOnly auth-cookie), så
 * CreatorProfileClient fikk 0 rader på alle oppslag. Denne ruten gjør
 * hele 3-stegs-oppslaget server-side (leaderboard_bots → trader_profiles
 * → user_profiles), henter offentlige strategier, og sjekker follow-status
 * for innlogget bruker (valgfri auth — 401 gir isFollowing=false).
 *
 * Tabeller/kolonner verifisert mot information_schema 2026-07-24.
 * Kun offentlige rader eksponeres (is_public/is_active-filtre).
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: traderId } = await params;
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();

    // Valgfri auth for follow-status
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Steg 1: leaderboard_bots
    const { data: botData } = await supabase
      .from("leaderboard_bots")
      .select("*")
      .eq("id", traderId)
      .maybeSingle();

    let profile: Record<string, unknown> | null = null;
    let canonicalUserId: string | null = null;

    if (botData) {
      profile = {
        id: botData.id,
        userId: botData.user_id,
        displayName: botData.display_name,
        bio: null,
        avatarUrl: botData.avatar_url,
        isPublic: true,
        performanceFeePct: botData.performance_fee_pct || 0,
        followerCount: botData.follower_count || 0,
        verified: false,
        allTimeRoi: botData.pnl_all_time || 0,
        winRate: botData.win_rate || 0,
        sharpeRatio: botData.sharpe_ratio || 0,
        totalTrades: 0,
        isKlarpakkePaperDemo: true,
      };
      canonicalUserId = botData.user_id;
    } else {
      // Steg 2: trader_profiles (id, deretter user_id)
      const { data: tpById } = await supabase
        .from("trader_profiles")
        .select("*")
        .eq("id", traderId)
        .maybeSingle();
      const profileData =
        tpById ??
        (
          await supabase
            .from("trader_profiles")
            .select("*")
            .eq("user_id", traderId)
            .maybeSingle()
        ).data;

      if (profileData) {
        profile = {
          id: profileData.id,
          userId: profileData.user_id,
          displayName: profileData.display_name,
          bio: profileData.bio,
          avatarUrl: profileData.avatar_url,
          isPublic: profileData.is_public ?? false,
          performanceFeePct: profileData.performance_fee_pct || 0,
          followerCount: profileData.follower_count || 0,
          verified: profileData.verified || false,
          allTimeRoi: profileData.all_time_roi || 0,
          winRate: profileData.win_rate || 0,
          sharpeRatio: profileData.sharpe_ratio || 0,
          totalTrades: profileData.total_trades || 0,
        };
        canonicalUserId = profileData.user_id;
      } else {
        // Steg 3: user_profiles (id, deretter user_id)
        const upRow =
          (
            await supabase
              .from("user_profiles")
              .select("id, user_id, display_name")
              .eq("id", traderId)
              .maybeSingle()
          ).data ??
          (
            await supabase
              .from("user_profiles")
              .select("id, user_id, display_name")
              .eq("user_id", traderId)
              .maybeSingle()
          ).data;

        if (upRow?.user_id) {
          profile = {
            id: upRow.id,
            userId: upRow.user_id,
            displayName: upRow.display_name || "Anonym Trader",
            bio: null,
            avatarUrl: null,
            isPublic: true,
            performanceFeePct: 0,
            followerCount: 0,
            verified: false,
            allTimeRoi: 0,
            winRate: 0,
            sharpeRatio: 0,
            totalTrades: 0,
          };
          canonicalUserId = upRow.user_id;
        }
      }
    }

    if (!profile || !canonicalUserId) {
      return NextResponse.json(
        { ok: false, error: "Trader ikke funnet" },
        { status: 404 },
      );
    }

    // Offentlige strategier: user_strategies → fallback trading_sessions
    let strategies: Record<string, unknown>[] = [];
    const { data: userStrategies } = await supabase
      .from("user_strategies")
      .select(
        "id, strategy_type, mode, total_pnl, total_trades, subscriber_count, is_public, is_active",
      )
      .eq("user_id", canonicalUserId)
      .eq("is_public", true)
      .eq("is_active", true);

    if (userStrategies && userStrategies.length > 0) {
      strategies = userStrategies.map((s) => ({
        id: s.id,
        strategyType: s.strategy_type,
        tradingPair: "",
        mode: s.mode,
        totalPnl: s.total_pnl || 0,
        winRate: 0,
        totalTrades: s.total_trades || 0,
        subscriberCount: s.subscriber_count || 0,
        isPublic: s.is_public ?? true,
      }));
    } else {
      const { data: sessions } = await supabase
        .from("trading_sessions")
        .select(
          "id, strategy_id, trading_pair, mode, total_pnl, total_trades, winning_trades, losing_trades",
        )
        .eq("user_id", canonicalUserId)
        .eq("status", "active");

      strategies = (sessions ?? []).map((s) => ({
        id: s.id,
        strategyType: s.strategy_id,
        tradingPair: s.trading_pair,
        mode: s.mode,
        totalPnl: s.total_pnl || 0,
        winRate:
          s.winning_trades + s.losing_trades > 0
            ? ((s.winning_trades || 0) / (s.winning_trades + s.losing_trades)) *
              100
            : 0,
        totalTrades: s.total_trades || 0,
        subscriberCount: 0,
        isPublic: true,
      }));
    }

    // Follow-status (kun for innlogget bruker)
    let isFollowing = false;
    if (user) {
      const { data: follow } = await supabase
        .from("copy_trading_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("leader_id", canonicalUserId)
        .eq("is_active", true)
        .maybeSingle();
      isFollowing = !!follow;
    }

    return NextResponse.json({
      ok: true,
      profile,
      canonicalUserId,
      strategies,
      isFollowing,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
