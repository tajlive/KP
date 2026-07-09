"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderboardChange {
  user_id: string;
  user_display_name: string;
  period: string;
  old_rank: number;
  new_rank: number;
  rank_change: number; // positiv = klatret
  return_pct: number;
  win_rate: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeaderboardChanges() {
  const [changes, setChanges] = useState<LeaderboardChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchChanges = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard/changes?period=weekly");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setChanges(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feil ved lasting");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChanges();
    pollRef.current = setInterval(fetchChanges, 45000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchChanges]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-4 sm:p-6 min-h-[48px]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-sans text-base font-bold text-[#F9FAFB]">
            Social Proof
          </h3>
        </div>
        <span className="rounded-full bg-[#3B82F6]/10 px-2 py-0.5 font-sans text-[10px] font-semibold text-[#3B82F6]">
          UKENT
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-[#7F1D1D]/30 px-3 py-2">
          <p className="font-sans text-xs text-[#EF4444]">{error}</p>
        </div>
      ) : changes.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="mb-2 text-3xl">🏆</span>
          <p className="font-sans text-sm text-[#6B7280]">
            Ingen leaderboard-endringer ennå
          </p>
          <p className="font-sans text-xs text-[#6B7280]">
            Første snapshot tas automatisk
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {changes.map((change, idx) => (
            <div
              key={`${change.user_id}-${change.period}-${idx}`}
              className="rounded-xl border border-[#2A2D35] bg-[#15171B]/60 p-3 active:border-[#3A3D45] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                {/* User info */}
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-semibold text-[#F9FAFB] truncate">
                    {change.rank_change > 0 ? "⬆️" : "⬇️"}{" "}
                    {change.user_display_name}
                  </p>
                  <p className="font-sans text-xs text-[#9CA3AF] mt-0.5">
                    {change.rank_change > 0
                      ? `Klatret fra #${change.old_rank} til #${change.new_rank}`
                      : `Falt fra #${change.old_rank} til #${change.new_rank}`}
                  </p>
                </div>

                {/* Rank change badge */}
                <div
                  className={`shrink-0 rounded-full px-2.5 py-1 font-sans text-xs font-bold ${
                    change.rank_change > 0
                      ? "bg-[#064E3B]/50 text-[#10B981]"
                      : "bg-[#7F1D1D]/30 text-[#EF4444]"
                  }`}
                >
                  {change.rank_change > 0
                    ? `+${change.rank_change}`
                    : change.rank_change}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-md bg-[#2A2D35]/50 px-2 py-0.5 font-mono text-[10px] text-[#10B981]">
                  {change.return_pct.toFixed(1)}%
                </span>
                <span className="rounded-md bg-[#2A2D35]/50 px-2 py-0.5 font-mono text-[10px] text-[#9CA3AF]">
                  {change.win_rate.toFixed(0)}% wins
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
