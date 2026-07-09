"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JokerNotification {
  id: string;
  user_display_name: string;
  title: string;
  description: string;
  trading_pair: string;
  side: string;
  quantity: number;
  price: number;
  executed_at: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JokerPush() {
  const [notifications, setNotifications] = useState<JokerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/jokertrade/notifications?limit=10");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feil ved lasting");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s siden`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min siden`;
    return d.toLocaleString("no-NO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-4 sm:p-6 min-h-[48px]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🃏</span>
          <h3 className="font-sans text-base font-bold text-[#F9FAFB]">
            JokerPush
          </h3>
        </div>
        <span className="rounded-full bg-[#F59E0B]/10 px-2 py-0.5 font-sans text-[10px] font-semibold text-[#F59E0B]">
          LIVE
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-[#7F1D1D]/30 px-3 py-2">
          <p className="font-sans text-xs text-[#EF4444]">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="mb-2 text-3xl">🎭</span>
          <p className="font-sans text-sm text-[#6B7280]">
            Ingen Joker-handler ennå
          </p>
          <p className="font-sans text-xs text-[#6B7280]">
            Aktiver JokerTrade for å få sanntidsvarsler
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="rounded-xl border border-[#2A2D35] bg-[#15171B]/60 p-3 active:border-[#3A3D45] transition-colors"
            >
              {/* Title row */}
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-sans text-sm font-semibold text-[#F9FAFB] leading-tight">
                  {notif.title}
                </p>
                <span className="shrink-0 font-sans text-[10px] text-[#6B7280]">
                  {formatTime(notif.executed_at)}
                </span>
              </div>

              {/* Description */}
              <p className="mb-2 font-sans text-xs text-[#9CA3AF] leading-relaxed">
                {notif.description}
              </p>

              {/* Trade details */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-[#2A2D35]/50 px-2 py-0.5 font-mono text-[10px] text-[#9CA3AF]">
                  {notif.quantity} {notif.trading_pair?.replace("USDT", "")}
                </span>
                <span className="rounded-md bg-[#2A2D35]/50 px-2 py-0.5 font-mono text-[10px] text-[#9CA3AF]">
                  {Number(notif.price).toLocaleString("no-NO")} kr
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 font-sans text-[10px] font-semibold ${
                    notif.side === "buy"
                      ? "bg-[#1E3A5F]/50 text-[#3B82F6]"
                      : "bg-[#7F1D1D]/30 text-[#EF4444]"
                  }`}
                >
                  {notif.side === "buy" ? "KJØP" : "SALG"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
