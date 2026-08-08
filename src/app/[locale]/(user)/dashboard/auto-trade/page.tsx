import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { AutoStrategyPanel } from "@/features/trading/AutoStrategyPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function PanelSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
    </div>
  );
}

export default async function AutoTradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/dashboard/auto-trade`} />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Suspense fallback={<PanelSkeleton />}>
        <AutoStrategyPanel />
      </Suspense>
    </main>
  );
}
