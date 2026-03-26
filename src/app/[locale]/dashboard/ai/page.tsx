import { requireAuth } from "@/lib/auth-guard";
import { localizedPathname } from "@/middleware/locale-path";
import { AiHub } from "@/components/coinbase/AiHub";

export const dynamic = "force-dynamic";

export default async function DashboardAiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale, localizedPathname(locale, "/dashboard/ai"));
  return <AiHub />;
}
