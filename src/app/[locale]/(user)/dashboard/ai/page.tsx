import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { AiHub } from "@/features/coinbase/AiHub";

export const dynamic = "force-dynamic";

export default async function DashboardAiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/dashboard/ai`} />;
  }
  return <AiHub />;
}
