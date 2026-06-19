import { redirect } from "next/navigation";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

/**
 * Canonical redirect: all trading routes converge on /handel.
 */
export default async function LiveTradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/handel?mode=live`);
}
