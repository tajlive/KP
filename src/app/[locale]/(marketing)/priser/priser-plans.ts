import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, Crown, GraduationCap, Sparkles } from "lucide-react";
import { TIERS, type TierSlug } from "@/lib/pricing/tiers";

/** Rekkefølge på /priser — én kilde for pris (TIERS.priceNOK). */
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

export function getPriserPlans() {
  return PRISER_PLAN_ORDER.map((key) => ({
    key,
    icon: PRISER_TIER_ICONS[key],
    popular: TIERS[key].popular,
    price: String(TIERS[key].priceNOK),
    periodNo: "/måned",
    periodEn: "/month",
    badgeNo: key === "student" ? "Gratis for alltid" : null,
    badgeEn: key === "student" ? "Free forever" : null,
  }));
}
