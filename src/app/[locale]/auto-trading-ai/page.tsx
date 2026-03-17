import { redirect } from "next/navigation";

export default async function AutoTradingAIRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/auto-trade`);
}
