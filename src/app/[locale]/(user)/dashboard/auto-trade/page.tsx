import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { normalizeTier } from "@/lib/pricing/tiers";
import { Metadata } from "next";
import { BotWizard } from "@/features/auto-trade/BotWizard";
import { RobotThinkingStrip } from "@/features/trading/RobotThinkingStrip";
import Link from "next/link";
import { Bot } from "lucide-react";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNo = locale === "no";
  return {
    title: isNo ? "Auto-handel" : "Auto Trading",
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
  if (!user) return <LoginRequired next={`/${locale}/dashboard/auto-trade`} />;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("tier, paper_balance")
    .eq("id", user.id)
    .single();

  const tier = normalizeTier(profile?.tier);

  // Fetch active paper sessions to show banner if user already has bots running
  const { data: activeSessions } = await supabase
    .from("trading_sessions")
    .select("id, strategy_id, trading_pair, current_capital_nok")
    .eq("user_id", user.id)
    .eq("mode", "paper")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const activeCount = activeSessions?.length ?? 0;

  return (
    <div className="space-y-6">
      <RobotThinkingStrip />

      {activeCount > 0 && (
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-start gap-3">
            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {locale === "no"
                  ? `Du har ${activeCount} aktiv${activeCount === 1 ? " bot" : "e bot-er"}`
                  : `You have ${activeCount} active bot${activeCount === 1 ? "" : "s"}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeSessions?.map((s) => (
                  <Link
                    key={s.id}
                    href={`/${locale}/dashboard/bot/${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700/50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors"
                  >
                    <span className="capitalize">{s.strategy_id}</span>
                    <span className="text-blue-400">·</span>
                    <span>{s.trading_pair?.replace("USDT", "")}</span>
                    <span className="text-blue-400">·</span>
                    <span>
                      {Math.round(s.current_capital_nok ?? 0).toLocaleString("no-NO")} kr
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <BotWizard
        userId={user.id}
        locale={locale}
        tier={tier}
        paperBalance={profile?.paper_balance ?? null}
      />
    </div>
  );
}
