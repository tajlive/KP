import { requireAuth } from "@/lib/auth-guard";
import UnifiedTradingDashboard from "@/components/trading/UnifiedTradingDashboard";

export const dynamic = "force-dynamic";

export default async function LiveTradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale);
  
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3">
        <p className="text-red-400 text-sm text-center">
          🔴 Live Trading Mode — Ekte penger er i bruk. Handel med omhu.
        </p>
      </div>
      <UnifiedTradingDashboard />
    </div>
  );
}
