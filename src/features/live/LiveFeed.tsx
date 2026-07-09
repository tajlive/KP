"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventType = "trade" | "leaderboard" | "signup" | "signal";

interface LiveEvent {
  id: string;
  type: EventType;
  title: string;
  description: string | null;
  user_display_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Type icons
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<EventType, string> = {
  trade: "🃏",
  leaderboard: "📊",
  signup: "🎉",
  signal: "📡",
};

const TYPE_LABELS: Record<EventType, string> = {
  trade: "Trade",
  leaderboard: "Leaderboard",
  signup: "Ny bruker",
  signal: "Signal",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<EventType | "all">("all");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/live/feed?limit=20");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setEvents(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feil ved lasting");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    pollRef.current = setInterval(fetchEvents, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchEvents]);

  // -----------------------------------------------------------------------
  // Filter
  // -----------------------------------------------------------------------

  const filteredEvents =
    activeFilter === "all"
      ? events
      : events.filter((e) => e.type === activeFilter);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s siden`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min siden`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}t siden`;
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
          <span className="text-lg">⚡</span>
          <h3 className="font-sans text-base font-bold text-[#F9FAFB]">
            LiveFeed
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
          </span>
          <span className="font-sans text-[10px] text-[#6B7280]">SANNTID</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["all", "trade", "leaderboard", "signup", "signal"] as const).map(
          (filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`min-h-[32px] rounded-lg px-2.5 py-1 font-sans text-xs font-medium transition-all active:scale-[0.97] ${
                activeFilter === filter
                  ? "bg-[#3B82F6] text-white"
                  : "bg-[#2A2D35]/50 text-[#9CA3AF] active:bg-[#3A3D45]"
              }`}
            >
              {filter === "all"
                ? "Alle"
                : `${TYPE_ICONS[filter]} ${TYPE_LABELS[filter]}`}
            </button>
          ),
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-[#7F1D1D]/30 px-3 py-2">
          <p className="font-sans text-xs text-[#EF4444]">{error}</p>
          <button
            onClick={fetchEvents}
            className="mt-2 font-sans text-xs text-[#3B82F6] active:text-[#2563EB]"
          >
            Prøv igjen
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="mb-2 text-3xl">📡</span>
          <p className="font-sans text-sm text-[#6B7280]">
            {activeFilter === "all"
              ? "Ingen hendelser ennå"
              : `Ingen ${TYPE_LABELS[activeFilter].toLowerCase()}-hendelser`}
          </p>
          <p className="font-sans text-xs text-[#6B7280]">
            Hendelser vises her i sanntid
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-[#2A2D35] bg-[#15171B]/60 p-3 active:border-[#3A3D45] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span>{TYPE_ICONS[event.type]}</span>
                    <p className="font-sans text-sm font-semibold text-[#F9FAFB] truncate">
                      {event.title}
                    </p>
                  </div>
                  {event.description && (
                    <p className="font-sans text-xs text-[#9CA3AF] leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-sans text-[10px] text-[#6B7280]">
                  {formatTime(event.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
