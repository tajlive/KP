/**
 * Konsolidert: All trading lives under /paper-trading.
 * Redirect /trade → /paper-trading
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/paper-trading`);
}
