import { createServerClient } from "@/lib/supabase/server";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaperTradingPageClient } from "@/components/paper-trading/PaperTradingPageClient";
import type { ComponentProps } from "react";
import { AlertCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { SURFACE, BRAND } from "@/lib/design/tokens";
import { PaperTradingList } from "@/components/paper-trading/PaperTradingList";

type PaperTradingListSession = ComponentProps<
  typeof PaperTradingList
>["sessions"][number];

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "paperTrading" });

  return {
    title: t("title"),
    description: t("subtitle", { amount: "100 000" }),
  };
}

/** Fallback når datahenting feiler — tekster fra next-intl */
function PaperTradingErrorFallback({
  locale,
  title,
  body,
  retry,
  dashboard,
}: {
  locale: string;
  title: string;
  body: string;
  retry: string;
  dashboard: string;
}) {
  const paperPath = hrefWithLocale(locale, "/paper-trading");
  const dashboardPath = hrefWithLocale(locale, "/dashboard");
  return (
    <div className={`min-h-screen ${SURFACE.BG_LIGHT} dark:bg-slate-950 p-6`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-xl p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            {title}
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-6">{body}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href={paperPath}
              className={`inline-flex items-center justify-center px-5 py-2.5 ${BRAND.primary} rounded-lg font-medium transition-colors`}
            >
              {retry}
            </Link>
            <Link
              href={dashboardPath}
              className="inline-flex items-center justify-center px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              {dashboard}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Offentlig teaser for uinnloggede — /paper-trading er ubeskyttet */
function PaperTradingPublicTeaser({
  locale,
  title,
  subtitle,
  loginLabel,
  signupLabel,
}: {
  locale: string;
  title: string;
  subtitle: string;
  loginLabel: string;
  signupLabel: string;
}) {
  const paperPath = hrefWithLocale(locale, "/paper-trading");
  const loginHref = `${hrefWithLocale(locale, "/innlogging")}?next=${encodeURIComponent(paperPath)}`;
  const signupHref = `${hrefWithLocale(locale, "/signup")}?redirect=${encodeURIComponent(paperPath)}`;

  return (
    <div
      className={`min-h-screen ${SURFACE.BG_LIGHT} dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-12`}
    >
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 dark:bg-emerald-400/20 flex items-center justify-center mx-auto">
          <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">{subtitle}</p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link
            href={loginHref}
            className={`inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white ${BRAND.primary} transition-opacity hover:opacity-90`}
          >
            {loginLabel}
          </Link>
          <Link
            href={signupHref}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {signupLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function PaperTradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const sessionListMode =
    sp?.mode === "live" ? ("live" as const) : ("paper" as const);
  const t = await getTranslations({ locale, namespace: "paperTrading" });
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PaperTradingPublicTeaser
        locale={locale}
        title={t("publicTeaser.title")}
        subtitle={t("publicTeaser.subtitle")}
        loginLabel={t("publicTeaser.login")}
        signupLabel={t("publicTeaser.signup")}
      />
    );
  }

  try {
    const { data: sessions, error } = await supabase
      .from("trading_sessions")
      .select(
        "id, mode, status, trading_pair, strategy_id, current_capital_nok, starting_capital_nok, total_pnl, winning_trades, total_trades, created_at",
      )
      .eq("user_id", user.id)
      .eq("mode", sessionListMode)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch trading sessions:", error);
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("paper_balance, real_balance")
      .eq("id", user.id)
      .single();

    const balance =
      sessionListMode === "live"
        ? (profile?.real_balance ?? 0)
        : (profile?.paper_balance ?? 100_000);
    const contextBannerText = t("contextBanner");

    return (
      <PaperTradingPageClient
        sessions={(sessions ?? []) as PaperTradingListSession[]}
        balance={balance}
        locale={locale}
        userId={user.id}
        listMode={sessionListMode}
        contextBannerText={contextBannerText}
      />
    );
  } catch (error) {
    console.error("Paper trading page error:", error);
    return (
      <PaperTradingErrorFallback
        locale={locale}
        title={t("fetchErrorPage.title")}
        body={t("fetchErrorPage.body")}
        retry={t("fetchErrorPage.retry")}
        dashboard={t("fetchErrorPage.dashboard")}
      />
    );
  }
}
