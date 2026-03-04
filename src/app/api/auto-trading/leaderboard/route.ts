import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe") || "month";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  // For nå returnerer vi mock-data for å fikse 404
  // Dette bør senere kobles til databasen
  const leaderboard = [
    {
      id: "1",
      name: "Trader_Alpha",
      totalReturn: 45.2,
      riskAdjustedScore: 9.2,
      drawdown: 5.4,
      strategy: "Trend",
    },
    {
      id: "2",
      name: "Safe_Bet",
      totalReturn: 12.5,
      riskAdjustedScore: 8.8,
      drawdown: 2.1,
      strategy: "DCA",
    },
    {
      id: "3",
      name: "Moon_Seeker",
      totalReturn: 124.5,
      riskAdjustedScore: 7.5,
      drawdown: 42.1,
      strategy: "Grid",
    },
    {
      id: "4",
      name: "Stable_Hand",
      totalReturn: 18.2,
      riskAdjustedScore: 8.4,
      drawdown: 4.2,
      strategy: "DCA",
    },
    {
      id: "5",
      name: "Trend_Follower",
      totalReturn: 35.8,
      riskAdjustedScore: 8.1,
      drawdown: 12.5,
      strategy: "Trend",
    },
  ].slice(0, limit);

  return NextResponse.json({
    leaderboard,
    timeframe,
    updatedAt: new Date().toISOString(),
  });
}
