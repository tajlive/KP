"use client";

import { useState, useEffect } from "react";
import { X, Rocket, TrendingUp } from "lucide-react";

interface Announcement {
  id: string;
  type: "info" | "success" | "warning";
  icon?: React.ReactNode;
  title: string;
  message: string;
  dismissible?: boolean;
  expiresAt?: Date;
}

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "trading-overhaul-2026-05",
    type: "success",
    icon: <Rocket className="h-4 w-4" />,
    title: "🚀 AI Trading 2.0 er live!",
    message:
      "Multi-timeframe filtrering, dynamisk posisjonsstørrelse og unike strategier per bot er nå aktivert.",
    dismissible: true,
    expiresAt: new Date("2026-06-05T00:00:00Z"),
  },
  {
    id: "trading-monitor-2026-05",
    type: "info",
    icon: <TrendingUp className="h-4 w-4" />,
    title: "📊 48-timers overvåkning aktiv",
    message:
      "Vi overvåker alle strategier i sanntid. Sjekk dine metrikker under Trading → Strategier.",
    dismissible: true,
    expiresAt: new Date("2026-05-12T00:00:00Z"),
  },
];

export function AnnouncementBanner({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: (id: string) => void;
}) {
  const bgColors = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-3 border ${bgColors[announcement.type]} rounded-lg`}
    >
      {announcement.icon && (
        <span className="flex-shrink-0">{announcement.icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{announcement.title}</p>
        <p className="text-sm opacity-90">{announcement.message}</p>
      </div>
      {announcement.dismissible && (
        <button
          onClick={() => onDismiss(announcement.id)}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function AnnouncementsContainer() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load dismissed IDs from localStorage
    try {
      const raw = localStorage.getItem("klarpakke-dismissed-announcements");
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    const active = DEFAULT_ANNOUNCEMENTS.filter(
      (a) =>
        !dismissed.has(a.id) && (!a.expiresAt || a.expiresAt > now)
    );
    setAnnouncements(active);
  }, [dismissed]);

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem(
        "klarpakke-dismissed-announcements",
        JSON.stringify([...next])
      );
    } catch {
      // ignore
    }
  };

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      {announcements.map((a) => (
        <AnnouncementBanner
          key={a.id}
          announcement={a}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
