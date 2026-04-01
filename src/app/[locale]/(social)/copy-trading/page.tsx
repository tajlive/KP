import { requireAuth } from "@/lib/auth-guard";
import CopyTradingDashboard from "@/components/copy-trading/CopyTradingDashboard";

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
  await requireAuth(locale);

  return (
    <div className="min-h-screen bg-slate-950">
      <CopyTradingDashboard />
    </div>
  );
}
