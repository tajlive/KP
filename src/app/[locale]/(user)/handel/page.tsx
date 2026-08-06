import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { getCockpitInitialData } from "@/features/trading-cockpit/server/getCockpitInitialData";
import { CockpitProvider } from "@/features/trading-cockpit/hooks/useCockpit";
import { TradingCockpit } from "@/features/trading-cockpit/components/TradingCockpit";
import { AutopilotDashboard } from "@/features/autopilot/AutopilotDashboard";
import { InstallPrompt } from "@/shared/pwa/InstallPrompt";
import { CockpitQueryProvider } from "@/features/trading-cockpit/components/CockpitQueryProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const initialData = await getCockpitInitialData(user.id, mode ?? null, tab ?? null);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
        </div>
      }
    >
      <CockpitQueryProvider>
        <CockpitProvider
          initialData={initialData}
          userId={user.id}
          locale={locale}
        >
          <TradingCockpit installPrompt={<InstallPrompt />} />
          <div className="mt-4">
            <AutopilotDashboard userId={user.id} />
          </div>
        </CockpitProvider>
      </CockpitQueryProvider>
    </Suspense>
  );
}
