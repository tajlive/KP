import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Én trading-side (alt 1): All trading lives under /paper-trading.
 * Redirect to single trading page with mode=live for tydelig UX.
 */
export default async function LiveTradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/paper-trading?mode=live`);
}
