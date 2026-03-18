import { redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title: locale === "no" ? "Trading - Klarpakke" : "Trading - Klarpakke",
    description:
      locale === "no"
        ? "Ditt personlige trading med lekepenger og live trading"
        : "Your personal trading with paper and live trading",
  };
}

/**
 * Én trading-side (alt 1): All trading lives under /paper-trading.
 * Redirect so old links and bookmarks still work.
 */
export default async function DashboardTradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/paper-trading`);
}
