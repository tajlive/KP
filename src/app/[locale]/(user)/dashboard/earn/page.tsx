import { requireAuth } from "@/lib/auth-guard";
import { localizedPathname } from "@/middleware/locale-path";
import { EarnHub } from "@/components/coinbase/EarnHub";

export const dynamic = "force-dynamic";

export default async function DashboardEarnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale, localizedPathname(locale, "/dashboard/earn"));
  return <EarnHub />;
}
