import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { MarketView } from "@/features/market/MarketView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marked",
  description: "Oversikt over markeder og watchlist",
};

export default async function MarketPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);

  if (!user) {
    return <LoginRequired next={`/${locale}/marked`} />;
  }

  return <MarketView userId={user.id} />;
}
