import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import CopyTradingDashboard from "@/features/copy-trading/CopyTradingDashboard";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kopier Trading | Klarpakke",
  description: "Følg og kopier suksessfulle kryptotradere",
};

export default async function CopyTradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/copy-trading`} />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <CopyTradingDashboard />
    </div>
  );
}
