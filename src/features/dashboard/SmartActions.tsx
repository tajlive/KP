"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Bot,
  Shield,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { DashboardCmsData } from "./DashboardContent";

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  Bot,
  Shield,
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

interface SmartActionsProps {
  userState: "newUser" | "noSession" | "paperMode" | "liveMode";
  locale: string;
  cmsData?: DashboardCmsData | null;
}

export function SmartActions({ userState, locale, cmsData }: SmartActionsProps) {
  const actions =
    cmsData?.smartActions?.filter((a) => a.condition === userState) ??
    getDefaultActions(userState, locale);

  if (actions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      {/* Desktop: grid | Mobile: horizontal scroll */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, i) => (
          <ActionCard key={i} action={action} />
        ))}
      </div>
      <div className="flex sm:hidden gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {actions.map((action, i) => (
          <div key={i} className="snap-start shrink-0 w-[85vw] max-w-[320px]">
            <ActionCard action={action} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ActionCard({
  action,
}: {
  action: {
    title: string;
    description?: string;
    ctaText: string;
    ctaLink: string;
    icon?: string;
    color?: string;
  };
}) {
  const color = COLOR_MAP[action.color ?? "blue"] ?? COLOR_MAP.blue;
  const Icon = ICON_MAP[action.icon ?? "TrendingUp"] ?? TrendingUp;

  return (
    <Link href={action.ctaLink} className="group block">
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

function getDefaultActions(
  userState: string,
  locale: string
): Array<{
  condition: string;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  icon: string;
  color: string;
}> {
  const isNo = locale === "no";

  switch (userState) {
    case "newUser":
      return [
        {
          condition: "newUser",
          title: isNo ? "Start Paper Trading" : "Start Paper Trading",
          description: isNo
            ? "Øv deg risikofritt med 100 000 kr i virtuell kapital."
            : "Practice risk-free with 100,000 NOK in virtual capital.",
          ctaText: isNo ? "Kom i gang" : "Get Started",
          ctaLink: `/${locale}/dashboard/trade?mode=paper`,
          icon: "TrendingUp",
          color: "blue",
        },
      ];
    case "noSession":
      return [
        {
          condition: "noSession",
          title: isNo ? "Aktiver en strategi" : "Activate a Strategy",
          description: isNo
            ? "La vår KI handle for deg mens du sover."
            : "Let our AI trade for you while you sleep.",
          ctaText: isNo ? "Utforsk strategier" : "Explore Strategies",
          ctaLink: `/${locale}/dashboard/auto-trade`,
          icon: "Bot",
          color: "purple",
        },
      ];
    case "paperMode":
      return [
        {
          condition: "paperMode",
          title: isNo ? "Gå Live" : "Go Live",
          description: isNo
            ? "Klar for ekte trading? Oppgrader til live-modus."
            : "Ready for real trading? Upgrade to live mode.",
          ctaText: isNo ? "Aktiver Live" : "Activate Live",
          ctaLink: `/${locale}/dashboard/trade?mode=live`,
          icon: "Shield",
          color: "green",
        },
      ];
    case "liveMode":
      return [
        {
          condition: "liveMode",
          title: isNo ? "Optimaliser strategien" : "Optimize Strategy",
          description: isNo
            ? "Se resultater og juster strategien for bedre avkastning."
            : "Review results and tune your strategy for better returns.",
          ctaText: isNo ? "Se resultater" : "View Results",
          ctaLink: `/${locale}/dashboard/resultater`,
          icon: "TrendingUp",
          color: "blue",
        },
      ];
    default:
      return [];
  }
}
