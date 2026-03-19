"use client";

import { PulseEvent } from "@/types/pulse";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export interface PulseEventFeedProps {
  events: PulseEvent[];
}

export function PulseEventFeed({ events }: PulseEventFeedProps) {
  const t = useTranslations("dashboard.pulse");
  const locale = useLocale();

  const getEventIcon = (type: PulseEvent["type"]) => {
    switch (type) {
      case "buy":
        return <ShoppingCart className="w-4 h-4 text-green-400" />;
      case "sell":
        return <DollarSign className="w-4 h-4 text-red-400" />;
      case "stop-loss":
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      default:
        return <ArrowUpRight className="w-4 h-4 text-blue-400" />;
    }
  };

  if (events.length === 0) {
    return (
      <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 text-center">
        <p className="text-slate-500 text-sm">{t("noEvents")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold text-lg px-2 flex items-center gap-2">
        {t("eventFeedTitle")}
        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 uppercase">
          Live
        </span>
      </h3>

      <div className="grid grid-cols-1 gap-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="group bg-slate-900/60 p-4 rounded-2xl border border-white/5 hover:bg-slate-900/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors">
                {getEventIcon(event.type)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-sm tracking-tight">
                    {event.type.toUpperCase()} {event.symbol}
                  </span>
                  <span className="text-slate-500 text-[10px] font-medium">
                    {new Date((event.time as number) * 1000).toLocaleTimeString(
                      "nb-NO",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed max-w-md">
                  {event.explanation}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-between sm:justify-end">
              <div className="text-right">
                <p className="text-white font-bold text-sm">
                  {event.amount.toFixed(4)}
                </p>
                <p className="text-slate-500 text-[10px]">
                  @{event.price.toLocaleString("nb-NO")} kr
                </p>
              </div>

              {event.courseModuleSlug && (
                <Link
                  href={`/${locale}/kurs/${event.courseModuleSlug}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-bold transition-colors border border-blue-500/10"
                >
                  <BookOpen className="w-3 h-3" />
                  LÆR HVORFOR
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
