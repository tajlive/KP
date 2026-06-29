import { redirect } from "next/navigation";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardTradePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale } = await params;
  const { mode } = await searchParams;
  const target = mode
    ? `/handel?mode=${encodeURIComponent(mode)}`
    : "/handel";
  redirect(hrefWithLocale(locale, target));
}
