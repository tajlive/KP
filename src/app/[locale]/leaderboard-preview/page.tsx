"use client";

import Leaderboard from "@/components/leaderboard/Leaderboard";

export default function LeaderboardPreview() {
  return (
    <div className="min-h-screen bg-[#0A0B0D] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">
            PREVIEW: LEADERBOARD
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Vise frem den nye risikojusterte ledertavlen med spring-animasjoner,
            sanntids-sortering og sparklines for papir-traderne.
          </p>
        </div>

        <Leaderboard />
      </div>
    </div>
  );
}
