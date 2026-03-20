import { requireAuth } from "@/lib/auth-guard";
import { normalizeTier } from "@/lib/pricing/tiers";
import { Metadata } from "next";
import { BotWizard } from "@/components/auto-trade/BotWizard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNo = locale === "no";
  return {
    title: isNo ? "Start trading-bot" : "Start trading bot",
    description: isNo
      ? "Sett opp din automatiske trading-strategi."
      : "Set up your automated trading strategy.",
  };
}

export default async function AutoTradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireAuth(locale);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("tier, paper_balance")
    .eq("id", user.id)
    .single();

  const tier = normalizeTier(profile?.tier);

  return <BotWizard userId={user.id} locale={locale} tier={tier} />;
}
