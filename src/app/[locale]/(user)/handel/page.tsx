import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { getCockpitInitialData } from "@/features/trading-cockpit/server/getCockpitInitialData";
import { CockpitProvider } from "@/features/trading-cockpit/hooks/useCockpit";
import { TradingCockpit } from "@/features/trading-cockpit/components/TradingCockpit";
import { AutopilotDashboard } from "@/features/autopilot/AutopilotDashboard";
import { InstallPrompt } from "@/shared/pwa/InstallPrompt";
import { CockpitQueryProvider } from "@/features/trading-cockpit/components/CockpitQueryProvider";
import { UnifiedTradeTerminal } from "@/features/trading/UnifiedTradeTerminal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 2026-08-10 (QA P2): siden manglet metadata og arvet landing-tittelen.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "navigation" });
  return { title: t("trade") };
}

function CockpitSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
    </div>
  );
}

async function CockpitSection({
  userId,
  locale,
  mode,
  tab,
  installPrompt,
}: {
  userId: string;
  locale: string;
  mode: string | null;
  tab: string | null;
  installPrompt: ReactNode;
}) {
  const initialData = await getCockpitInitialData(userId, mode, tab);
  return (
    <CockpitProvider initialData={initialData} userId={userId} locale={locale}>
      <TradingCockpit installPrompt={installPrompt} />
    </CockpitProvider>
  );
}

export default async function TradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; tab?: string }>;
}) {
  const { locale } = await params;
  const { mode, tab } = await searchParams;

  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/handel`} />;
  }

  return (
    <CockpitQueryProvider>
      <Suspense fallback={<CockpitSkeleton />}>
        <CockpitSection
          userId={user.id}
          locale={locale}
          mode={mode ?? null}
          tab={tab ?? null}
          installPrompt={<InstallPrompt />}
        />
      </Suspense>
      {/* Autopilot er uavhengig av cockpit-data — streamer umiddelbart med egen loading-state */}
      <div className="mt-4">
        <Suspense fallback={null}>
          <AutopilotDashboard userId={user.id} />
        </Suspense>
      </div>

      {/* P0-fiks 2026-08-08: UnifiedTradeTerminal var ubrukt siden /trade ble
          fjernet — brukeren kunne ikke starte manuell handel med lekepenger.
          Gjenoppretter kjøp/selg-terminalen (OrderPanel → /api/paper-trading/execute). */}
      <div className="mt-4">
        <Suspense fallback={null}>
          <UnifiedTradeTerminal />
        </Suspense>
      </div>
    </CockpitQueryProvider>
  );
}
