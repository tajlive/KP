import { requireAuth } from "@/lib/auth-guard";
import UnifiedTradingDashboard from "@/components/trading/UnifiedTradingDashboard";

export const dynamic = "force-dynamic";

export default async function PaperTradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale);
  
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3">
        <p className="text-blue-400 text-sm text-center">
          📄 Paper Trading Mode — Øv med virtuell kapital risikofritt
        </p>
      </div>
      <UnifiedTradingDashboard />
    </div>
  );
}
