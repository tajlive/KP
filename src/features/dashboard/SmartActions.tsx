"use client";

import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Bot,
  Shield,
  ArrowRight,
  Copy,
  Zap,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { DashboardCmsData } from "./DashboardContent";
import type { UserState } from "@/hooks/useUserState";

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  Bot,
  Shield,
  Copy,
  Zap,
  BookOpen,
};

const COLOR_MAP: Record<
  string,
  { bg: string; border: string; icon: string; text: string }
> = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30 hover:border-blue-500/50",
    icon: "text-blue-400",
    text: "text-blue-400",
  },
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30 hover:border-emerald-500/50",
    icon: "text-emerald-400",
    text: "text-emerald-400",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30 hover:border-purple-500/50",
    icon: "text-purple-400",
    text: "text-purple-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30 hover:border-amber-500/50",
    icon: "text-amber-400",
    text: "text-amber-400",
  },
};

/** Map old + new userState values to a canonical action key. */
function canonicalUserState(
  state: "newUser" | "noSession" | "paperMode" | "liveMode" | UserState
): "newUser" | "noSession" | "paperMode" | "liveMode" {
  switch (state) {
    case "NyBruker":
    case "newUser":
      return "newUser";
    case "Onboarded":
    case "noSession":
      return "noSession";
    case "AktivTrader":
    case "paperMode":
      return "paperMode";
    case "PowerUser":
    case "liveMode":
      return "liveMode";
    default:
      return "newUser";
  }
}

interface SmartActionsProps {
  userState: "newUser" | "noSession" | "paperMode" | "liveMode" | UserState;
  cmsData?: DashboardCmsData | null;
  /** Compact 3-column grid (used by AdaptiveDashboard). Default: responsive grid/scroll. */
  compact?: boolean;
}

export function SmartActions({ userState, cmsData, compact = false }: SmartActionsProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.smartActions");
  const canonical = canonicalUserState(userState);

  const actions =
    cmsData?.smartActions?.filter((a) => a.condition === canonical) ??
    getDefaultActions(canonical, t);

  if (actions.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      {compact ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map((action, i) => (
            <CompactActionCard key={i} action={action} index={i} locale={locale} />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop: grid | Mobile: horizontal scroll */}
          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {actions.map((action, i) => (
              <ActionCard key={i} action={action} locale={locale} />
            ))}
          </div>
          <div className="flex sm:hidden gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
            {actions.map((action, i) => (
              <div key={i} className="snap-start shrink-0 w-[85vw] max-w-[320px]">
                <ActionCard action={action} locale={locale} />
              </div>
            ))}
          </div>
        </>
      )}
    </m.div>
  );
}

function ActionCard({
  action,
  locale,
}: {
  action: {
    title: string;
    description?: string;
    ctaText: string;
    ctaLink: string;
    icon?: string;
    color?: string;
  };
  locale: string;
}) {
  const color = COLOR_MAP[action.color ?? "blue"] ?? COLOR_MAP.blue;
  const Icon = ICON_MAP[action.icon ?? "TrendingUp"] ?? TrendingUp;

  return (
    <Link href={`/${locale}${action.ctaLink}`} className="group block">
      <div
        className={`relative overflow-hidden rounded-2xl border ${color.border} ${color.bg} p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg h-full`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-base">{action.title}</h4>
            {action.description && (
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                {action.description}
              </p>
            )}
            <div
              className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${color.text} group-hover:gap-2.5 transition-all`}
            >
              {action.ctaText}
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${color.bg} shrink-0`}>
            <Icon className={`w-5 h-5 ${color.icon}`} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function CompactActionCard({
  action,
  index,
  locale,
}: {
  action: {
    title: string;
    description?: string;
    ctaText: string;
    ctaLink: string;
    icon?: string;
    color?: string;
  };
  index: number;
  locale: string;
}) {
  const color = COLOR_MAP[action.color ?? "blue"] ?? COLOR_MAP.blue;
  const Icon = ICON_MAP[action.icon ?? "TrendingUp"] ?? TrendingUp;

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <Link href={`/${locale}${action.ctaLink}`} className="group block h-full">
        <div
          className={`relative h-full rounded-2xl border ${color.border} ${color.bg} bg-gradient-to-br p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white text-sm">{action.title}</h4>
              {action.description && (
                <p className="text-xs text-white/60 mt-1 line-clamp-2">{action.description}</p>
              )}
              <div className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-white/80 group-hover:gap-1.5 transition-all">
                {action.ctaText}
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 shrink-0">
              <Icon className="w-4 h-4 text-white/70" />
            </div>
          </div>
        </div>
      </Link>
    </m.div>
  );
}

function getDefaultActions(
  userState: string,
  t: (key: string) => string
): Array<{
  condition: string;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  icon: string;
  color: string;
}> {
  switch (userState) {
    case "newUser":
      return [
        {
          condition: "newUser",
          title: t("newUser.title"),
          description: t("newUser.description"),
          ctaText: t("newUser.cta"),
          ctaLink: "/handel?mode=paper",
          icon: "TrendingUp",
          color: "blue",
        },
      ];
    case "noSession":
      return [
        {
          condition: "noSession",
          title: t("noSession.title"),
          description: t("noSession.description"),
          ctaText: t("noSession.cta"),
          ctaLink: "/dashboard/auto-trade",
          icon: "Bot",
          color: "purple",
        },
      ];
    case "paperMode":
      return [
        {
          condition: "paperMode",
          title: t("paperMode.title"),
          description: t("paperMode.description"),
          ctaText: t("paperMode.cta"),
          // P0 kundevendt (2026-08-12): live er ikke åpent i beta —
          // lekepenger-CTA, aldri live-start.
          ctaLink: "/handel?mode=paper",
          icon: "Shield",
          color: "green",
        },
      ];
    case "liveMode":
      return [
        {
          condition: "liveMode",
          title: t("liveMode.title"),
          description: t("liveMode.description"),
          ctaText: t("liveMode.cta"),
          ctaLink: "/dashboard/resultater",
          icon: "TrendingUp",
          color: "blue",
        },
      ];
    default:
      return [];
  }
}
