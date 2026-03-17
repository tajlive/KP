import { requireAuth } from "@/lib/auth-guard";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PortfolioDashboard from "@/components/dashboard/PortfolioDashboard";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { BRAND } from "@/lib/design/tokens";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const isNo = locale === "no";
  const title = isNo ? "Dashboard" : "Dashboard";
  const description = isNo
    ? "Din portefølje, live priser og trading-oversikt."
    : "Your portfolio, live prices and trading overview.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://www.klarpakke.no/${locale}/dashboard`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" }],
    },
  };
}

function DashboardErrorFallback({ locale }: { locale: string }) {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Kunne ikke laste dashboard
          </h2>
          <p className="text-red-600 mb-4">
            Det oppstod en feil. Vennligst prøv igjen.
          </p>
          <Link
            href={`/${locale}/dashboard`}
            className={`px-4 py-2 ${BRAND.primary} rounded-lg transition-colors inline-block`}
          >
            Last inn på nytt
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  try {
    const { supabase, user } = await requireAuth(locale);

    const [profileRes, tradesRes, sessionRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("paper_balance, tier, trial_ends_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("trades")
        .select("id, trading_pair, side, quantity, price, total_value, status, mode, created_at")
        .eq("user_id", user.id)
        .eq("mode", "paper")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("trading_sessions")
        .select("id, mode, status, strategy_id, current_capital_nok, starting_capital_nok, total_pnl, total_trades, created_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .eq("mode", "paper")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return (
      <PortfolioDashboard
        userId={user.id}
        locale={locale}
        paperBalance={profileRes.data?.paper_balance ?? 100000}
        tier={profileRes.data?.tier ?? "student"}
        trialEndsAt={profileRes.data?.trial_ends_at ?? null}
        trades={tradesRes.data ?? []}
        activeSession={sessionRes.data}
      />
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return <DashboardErrorFallback locale={locale} />;
  }
}
