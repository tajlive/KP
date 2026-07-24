import { getTranslations } from "next-intl/server";

export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

export default async function ReferralPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white mb-4">{t("sidebar.referral")}</h1>
        <p className="text-slate-400">{tCommon("comingSoon")}</p>
      </div>
    </div>
  );
}
