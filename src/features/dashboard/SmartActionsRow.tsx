"use client";

import { motion } from "framer-motion";
import { TrendingUp, Shield, Copy, Zap, BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import type { UserState } from "@/hooks/useUserState";

interface ActionTile {
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

function getActions(state: UserState, isNo: boolean): ActionTile[] {
  switch (state) {
    case "NyBruker":
      return [
        {
          title: isNo ? "Start Paper Trading" : "Start Paper Trading",
          description: isNo
            ? "Øv deg risikofritt med 100 000 kr virtuell kapital."
            : "Practice risk-free with 100,000 NOK virtual capital.",
          cta: isNo ? "Kom i gang" : "Get started",
          href: "/dashboard/trade?mode=paper",
          icon: TrendingUp,
          color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
        },
        {
          title: isNo ? "Lær grunnleggende" : "Learn the basics",
          description: isNo
            ? "Gjennomgå onboarding for å forstå trading-konsepter."
            : "Complete onboarding to understand trading concepts.",
          cta: isNo ? "Start læring" : "Start learning",
          href: "/dashboard/learn",
          icon: BookOpen,
          color: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400",
        },
        {
          title: isNo ? "Se demo-data" : "View demo data",
          description: isNo
            ? "Se hvordan et aktivt dashbord ser ut før du starter."
            : "See what an active dashboard looks like before you start.",
          cta: isNo ? "Vis demo" : "Show demo",
          href: "#demo",
          icon: Zap,
          color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400",
        },
      ];
    case "Onboarded":
      return [
        {
          title: isNo ? "Gå Live" : "Go Live",
          description: isNo
            ? "Klar for ekte trading? Test strategien din med ekte kapital."
            : "Ready for real trading? Test your strategy with real capital.",
          cta: isNo ? "Aktiver Live" : "Activate Live",
          href: "/dashboard/trade?mode=live",
          icon: Shield,
          color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400",
        },
        {
          title: isNo ? "Copy Trading" : "Copy Trading",
          description: isNo
            ? "Kopier topp-tradere automatisk mens du lærer."
            : "Copy top traders automatically while you learn.",
          cta: isNo ? "Finn tradere" : "Find traders",
          href: "/dashboard/copy-trading",
          icon: Copy,
          color: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400",
        },
        {
          title: isNo ? "Optimaliser strategi" : "Optimize strategy",
          description: isNo
            ? "Se resultater og juster for bedre avkastning."
            : "Review results and tune for better returns.",
          cta: isNo ? "Se resultater" : "View results",
          href: "/dashboard/resultater",
          icon: TrendingUp,
          color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
        },
      ];
    case "AktivTrader":
      return [
        {
          title: isNo ? "Øk risiko?" : "Increase risk?",
          description: isNo
            ? "Du har god win rate. Vurder gradvis økning av posisjonsstørrelse."
            : "You have a good win rate. Consider gradually increasing position size.",
          cta: isNo ? "Se risiko" : "View risk",
          href: "/dashboard/risk",
          icon: Shield,
          color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400",
        },
        {
          title: isNo ? "Copy Trading" : "Copy Trading",
          description: isNo
            ? "Diversifiser med automatisert copying av erfarne tradere."
            : "Diversify with automated copying of experienced traders.",
          cta: isNo ? "Utforsk" : "Explore",
          href: "/dashboard/copy-trading",
          icon: Copy,
          color: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400",
        },
        {
          title: isNo ? "AI-analyse" : "AI Analysis",
          description: isNo
            ? "Få personlig innsikt basert på dine siste 30 trades."
            : "Get personalized insights based on your last 30 trades.",
          cta: isNo ? "Kjør analyse" : "Run analysis",
          href: "/dashboard/ai",
          icon: Zap,
          color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400",
        },
      ];
    case "PowerUser":
      return [
        {
          title: isNo ? "Kelly-kalkulator" : "Kelly Calculator",
          description: isNo
            ? "Optimaliser posisjonsstørrelse basert på din historikk."
            : "Optimize position size based on your history.",
          cta: isNo ? "Beregn" : "Calculate",
          href: "/dashboard/kelly",
          icon: Zap,
          color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
        },
        {
          title: isNo ? "Leaderboard" : "Leaderboard",
          description: isNo
            ? "Sammenlign deg med andre tradere på plattformen."
            : "Compare yourself with other traders on the platform.",
          cta: isNo ? "Se rangering" : "View ranking",
          href: "/dashboard/leaderboard",
          icon: TrendingUp,
          color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400",
        },
        {
          title: isNo ? "AI-chat" : "AI Chat",
          description: isNo
            ? "Spør om strategi, markedet, eller få trade-analyse."
            : "Ask about strategy, the market, or get trade analysis.",
          cta: isNo ? "Start chat" : "Start chat",
          href: "/dashboard/ai-chat",
          icon: Copy,
          color: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400",
        },
      ];
    default:
      return [];
  }
}

interface SmartActionsRowProps {
  userState: UserState;
}

export function SmartActionsRow({ userState }: SmartActionsRowProps) {
  const locale = useLocale();
  const isNo = locale === "no";
  const actions = getActions(userState, isNo);

  if (actions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
    >
      {actions.map((action, i) => (
        <ActionTileCard key={i} action={action} index={i} />
      ))}
    </motion.div>
  );
}

function ActionTileCard({ action, index }: { action: ActionTile; index: number }) {
  const locale = useLocale();
  const Icon = action.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <Link href={`/${locale}${action.href}`} className="group block h-full">
        <div
          className={`relative h-full rounded-2xl border bg-gradient-to-br ${action.color} p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white text-sm">{action.title}</h4>
              <p className="text-xs text-white/60 mt-1 line-clamp-2">{action.description}</p>
              <div className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-white/80 group-hover:gap-1.5 transition-all">
                {action.cta}
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 shrink-0">
              <Icon className="w-4 h-4 text-white/70" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
