import { LoginRequired } from "@/shared/ui/LoginRequired";
import { requireAuth } from "@/lib/auth-guard";
import MarketplaceClient from "@/features/marketplace/MarketplaceClient";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Strategi Marked | Klarpakke",
  description: "Kjøp og selg verifiserte tradingstrategier",
};

export default async function MarketplacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/marketplace`} />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <MarketplaceClient />
    </div>
  );
}
