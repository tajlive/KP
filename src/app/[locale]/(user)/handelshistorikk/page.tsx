import { redirect } from "next/navigation";

export const runtime = 'nodejs';

export default async function OldHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/historikk`);
}
