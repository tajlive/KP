import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardContent } from "@/features/dashboard/DashboardContent";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { BRAND } from "@/lib/design/tokens";
import { client } from "@/lib/sanity/client";
import { dashboardContentQuery } from "@/lib/sanity/queries";
import { getUserDashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t("dashboard.title");
  const description = t("dashboard.description");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://www.klarpakke.no/${locale}/dashboard`,
      images: [
        { url: "/og-image.png", width: 1200, height: 630, alt: "Klarpakke" },
      ],
    },
  };
}

async function DashboardErrorFallback({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-kp-danger-bg border border-kp-danger/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-kp-danger mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-kp-danger mb-2">
            {t("error.title")}
          </h2>
          <p className="text-kp-danger mb-4">
            {t("error.unexpectedError")}
          </p>
          <Link
            href={`/${locale}/dashboard`}
            className={`px-4 py-2 ${BRAND.primary} rounded-lg transition-colors inline-block`}
          >
            {t("error.reload")}
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
    if (!user) {
      return <LoginRequired next={`/${locale}/dashboard`} />;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("paper_balance, tier, preferred_trading_mode, onboarding_completed, onboarding_step, display_name, created_at, is_priority")
      .eq("id", user.id)
      .single();

    const preferredTradingMode = profile?.preferred_trading_mode === "live" ? "live" : "paper";

    // Hent dashboard-innhold fra Sanity (fallback til defaults hvis ikke konfigurert)
    let cmsData = null;
    try {
      cmsData = await client.fetch(dashboardContentQuery, { language: locale });
    } catch {
      // Sanity ikke konfigurert — bruk defaults i komponentene
    }

    // Hent metrics server-side for å unngå client-side API-kall
    const metrics = await getUserDashboardMetrics({
      supabaseClient: supabase,
      userId: user.id,
      mode: preferredTradingMode,
      sessionScope: "active_and_completed",
    });

    return (
      <div data-testid="dashboard-page">
        <DashboardContent
          userId={user.id}
          preferredTradingMode={preferredTradingMode}
          onboardingCompleted={profile?.onboarding_completed ?? false}
          userName={profile?.display_name ?? ""}
          signupDays={profile?.created_at ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))) : 1}
          cmsData={cmsData}
          metrics={metrics}
          isPriority={profile?.is_priority ?? false}
        />
      </div>
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return <DashboardErrorFallback locale={locale} />;
  }
}
