import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, Crown, GraduationCap, Sparkles } from "lucide-react";
import { TIERS, type TierSlug } from "@/lib/pricing/tiers";

export type BillingPeriod = "monthly" | "annual";
export { type TierSlug };

export const PRISER_PLAN_ORDER: TierSlug[] = [
  "student",
  "bachelor",
  "master",
  "phd",
  "professor",
];

export const PRISER_TIER_ICONS: Record<TierSlug, LucideIcon> = {
  student: Sparkles,
  bachelor: BookOpen,
  master: GraduationCap,
  phd: Award,
  professor: Crown,
};

const ANNUAL_PRICE: Partial<Record<TierSlug, number>> = {
  bachelor: 2490,
  master: 4990,
  phd: 9990,
  professor: 19990,
};

const ANNUAL_MONTHLY_EQUIVALENT: Partial<Record<TierSlug, number>> = {
  bachelor: 207,
  master: 416,
  phd: 832,
  professor: 1666,
};

export interface PriserPlan {
  key: TierSlug;
  icon: LucideIcon;
  popular: boolean;
  price: string;
  annualMonthlyEq: string;
  periodNo: string;
  periodEn: string;
  badgeNo: string | null;
  badgeEn: string | null;
  savePercent: number | null;
  isAnnual: boolean;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("no-NO").format(n);
}

export function getPriserPlans(period: BillingPeriod = "monthly"): PriserPlan[] {
  return PRISER_PLAN_ORDER.map((key) => {
    const tier = TIERS[key];
    const isFree = key === "student";
    const isAnnual = period === "annual" && !isFree;
    const annualPrice = isFree ? 0 : (ANNUAL_PRICE[key] ?? tier.priceNOK * 12);
    const monthlyEq = isFree ? 0 : (ANNUAL_MONTHLY_EQUIVALENT[key] ?? Math.round(annualPrice / 12));
    const monthlyPrice = isFree ? 0 : tier.priceNOK;
    const savePercent = isAnnual ? Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100) : null;

    return {
      key,
      icon: PRISER_TIER_ICONS[key],
      popular: tier.popular,
      price: isAnnual ? String(annualPrice) : String(monthlyPrice),
      annualMonthlyEq: isAnnual ? String(monthlyEq) : "",
      periodNo: isAnnual ? "/år" : "/måned",
      periodEn: isAnnual ? "/year" : "/month",
      badgeNo: isFree ? "Gratis for alltid" : isAnnual ? `Spar ${savePercent}%` : null,
      badgeEn: isFree ? "Free forever" : isAnnual ? `Save ${savePercent}%` : null,
      savePercent,
      isAnnual,
    };
  });
}
