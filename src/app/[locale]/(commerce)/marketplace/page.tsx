import { requireAuth } from "@/lib/auth-guard";
import MarketplaceClient from "@/components/marketplace/MarketplaceClient";

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
  await requireAuth(locale);

  return (
    <div className="min-h-screen bg-slate-950">
      <MarketplaceClient />
    </div>
  );
}
