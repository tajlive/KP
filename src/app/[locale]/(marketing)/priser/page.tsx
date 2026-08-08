import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Priser page — i18n-aware (2026-08-03).
 * Server component med getTranslations for korrekt /en-rendring.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.pricing" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}

const PLAN_SLUGS = ["student", "bachelor", "master", "phd", "professor"] as const;
const FEATURE_COUNT: Record<(typeof PLAN_SLUGS)[number], number> = {
  student: 4,
  bachelor: 4,
  master: 4,
  phd: 4,
  professor: 4,
};

export default async function PriserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.pricingGrid" });

  return (
    <div className="min-h-screen bg-[#0A0B0D]" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#F9FAFB] mb-4 tracking-tight">
          {t("title")}
        </h1>
        <p className="text-lg text-[#9CA3AF] max-w-xl mx-auto leading-relaxed">
          {t("subtitle")}
        </p>
      </section>

      {/* Founder-loven (2026-08-08): de 100 første får gratis for livet */}
      <section className="px-6 pb-10">
        <a
          href={`/${locale}/founder`}
          className="mx-auto flex max-w-4xl flex-col items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-center transition hover:border-emerald-500/50 hover:bg-emerald-500/15 sm:flex-row sm:justify-between sm:text-left"
        >
          <div>
            <p className="text-lg font-bold text-emerald-300">
              {t("founderBanner.title")}
            </p>
            <p className="text-sm text-[#9CA3AF]">
              {t("founderBanner.subtitle")}
            </p>
          </div>
          <span className="shrink-0 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#0A0B0D]">
            {t("founderBanner.cta")}
          </span>
        </a>
      </section>

      {/* Pricing grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PLAN_SLUGS.map((slug) => {
            const price = t(`plans.${slug}.price`);
            const popular = t(`plans.${slug}.popular`) === "true";
            const isFree = price === "0";
            return (
              <div
                key={slug}
                className={`relative flex flex-col rounded-2xl p-6 backdrop-blur-xl transition-all duration-200 hover-lift ${
                  popular
                    ? "bg-[#1A1D26]/90 border-2 border-[#F59E0B] shadow-lg shadow-amber-500/10"
                    : "bg-[#1A1D26]/70 border border-[#2A2D35] hover:border-[#3A3D45]"
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F59E0B] text-[#0A0B0D] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                    {t("mostPopular")}
                  </span>
                )}
                <h3 className="text-xl font-bold text-[#F9FAFB] mb-3">
                  {t(`plans.${slug}.name`)}
                </h3>
                <div className="mb-4">
                  {isFree ? (
                    <span className="text-3xl font-extrabold text-[#F9FAFB]">{t("free")}</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-[#F9FAFB]">{price}</span>
                      <span className="text-sm text-[#6B7280] ml-1"> {t("perMonth")}</span>
                    </>
                  )}
                </div>
                <ul className="list-none p-0 m-0 flex-1 space-y-2 mb-6">
                  {Array.from({ length: FEATURE_COUNT[slug] }, (_, i) => (
                    <li key={i} className="text-sm text-[#9CA3AF] flex items-center gap-2">
                      <span className="text-[#10B981] font-bold shrink-0">✓</span>
                      <span>{t(`plans.${slug}.features.${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`/${locale}/register?plan=${slug}`}
                  className={`block text-center py-3 rounded-xl text-sm font-semibold no-underline transition-all duration-200 ${
                    popular
                      ? "bg-[#F59E0B] text-[#0A0B0D] hover:bg-[#FBBF24]"
                      : "bg-[#2A2D35] text-[#F9FAFB] hover:bg-[#3A3D45]"
                  }`}
                >
                  {isFree ? t("startFree") : t("choosePlan")}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footnote */}
      <section className="text-center px-6 pb-20">
        <p className="text-sm text-[#6B7280]">{t("footnote")}</p>
      </section>
    </div>
  );
}
