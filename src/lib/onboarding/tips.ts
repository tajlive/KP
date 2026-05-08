import { Wallet, Bot, LucideIcon } from "lucide-react";

export interface UserContext {
  hasTraded: boolean;
  tradeCount: number;
  hasAutoTrade: boolean;
}

export interface OnboardingTip {
  id: string;
  condition: (user: UserContext) => boolean;
  title: string;
  description: string;
  cta: { label: string; href: string };
  icon: LucideIcon;
  priority: number;
}

export const ONBOARDING_TIPS: OnboardingTip[] = [
  {
    id: "first-trade",
    condition: (u) => !u.hasTraded,
    title: "Start med lekepenger",
    description: "Øv risikofritt med 100 000 kr i lekepenger",
    cta: { label: "Prøv nå", href: "/dashboard/paper-trading" },
    icon: Wallet,
    priority: 1,
  },
  {
    id: "try-auto",
    condition: (u) => u.tradeCount >= 3 && !u.hasAutoTrade,
    title: "Prøv auto-trade",
    description: "La AI handle for deg mens du sover",
    cta: { label: "Sett opp", href: "/dashboard/auto-trade" },
    icon: Bot,
    priority: 2,
  },

];

export function getActiveTip(user: UserContext): OnboardingTip | null {
  const applicable = ONBOARDING_TIPS.filter((tip) =>
    tip.condition(user)
  ).sort((a, b) => a.priority - b.priority);
  return applicable[0] || null;
}
