import { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  MarketingPageShell,
  generateMarketingMetadata,
} from "@/shared/ui/marketing";

export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return generateMarketingMetadata({
    locale: (await params).locale,
    namespace: "about",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "/about",
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <MarketingPageShell>
      <main className="min-h-screen bg-[#0A0B0D]">
        {/* Hero */}
        <section className="relative overflow-hidden pt-20 pb-16 px-6">
          <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#3B82F6]/5 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-[#F59E0B]/5 blur-3xl" />
          </div>
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-[#1A1D26] border border-[#2A2D35] text-xs font-semibold text-[#9CA3AF] mb-4">
              {t("hero.badge")}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F9FAFB] tracking-tight leading-tight">
              {t("hero.title")}
            </h1>
            <p className="mt-4 text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
              {t("hero.subtitle")}
            </p>
          </div>
        </section>

        {/* Historien om Tom */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F9FAFB] mb-8 text-center">
              {t("story.title")}
            </h2>
            <div className="space-y-6 text-[#D1D5DB] leading-relaxed">
              <p>{t("story.p1")}</p>
              <p>{t("story.p2")}</p>
              <p>{t("story.p3")}</p>
            </div>

            {/* Quote */}
            <blockquote className="mt-10 border-l-4 border-[#F59E0B] bg-[#1A1D26]/50 rounded-r-xl px-6 py-5">
              <p className="text-lg italic text-[#F9FAFB]">&ldquo;{t("story.quote")}&rdquo;</p>
              <footer className="mt-3 text-sm font-semibold text-[#F59E0B]">
                — {t("story.quoteAuthor")}
              </footer>
            </blockquote>
          </div>
        </section>

        {/* Verdier */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F9FAFB] mb-4 text-center">
              {t("values.title")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 mt-8">
              <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/60 backdrop-blur-sm p-6">
                <h3 className="text-lg font-bold text-[#F9FAFB] mb-2">{t("values.education.title")}</h3>
                <p className="text-sm text-[#9CA3AF]">{t("values.education.desc")}</p>
              </div>
              <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/60 backdrop-blur-sm p-6">
                <h3 className="text-lg font-bold text-[#F9FAFB] mb-2">{t("values.transparency.title")}</h3>
                <p className="text-sm text-[#9CA3AF]">{t("values.transparency.desc")}</p>
              </div>
              <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/60 backdrop-blur-sm p-6">
                <h3 className="text-lg font-bold text-[#F9FAFB] mb-2">{t("values.norwegian.title")}</h3>
                <p className="text-sm text-[#9CA3AF]">{t("values.norwegian.desc")}</p>
              </div>
              <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/60 backdrop-blur-sm p-6">
                <h3 className="text-lg font-bold text-[#F9FAFB] mb-2">{t("values.risk.title")}</h3>
                <p className="text-sm text-[#9CA3AF]">{t("values.risk.desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F9FAFB] mb-4 text-center">
              {t("team.title")}
            </h2>
            <div className="mt-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#3B82F6] flex items-center justify-center text-2xl font-bold text-white mb-4">
                {t("team.tom.initials")}
              </div>
              <h3 className="text-xl font-bold text-[#F9FAFB]">{t("team.tom.name")}</h3>
              <p className="text-sm text-[#F59E0B] font-semibold">{t("team.tom.role")}</p>
              <p className="mt-3 text-sm text-[#9CA3AF] max-w-md">{t("team.tom.bio")}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="rounded-2xl border border-[#2A2D35] bg-gradient-to-br from-[#1A1D26] to-[#15171B] p-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F9FAFB] mb-3">
                {t("cta.title")}
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-6">
                {t("cta.subtitle")}
              </p>
              <Link
                href={`/${locale}/register`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#F59E0B] text-[#0A0B0D] font-bold rounded-xl hover:bg-[#D97706] transition-all no-underline shadow-lg shadow-[#F59E0B]/20"
              >
                {t("cta.button")}
              </Link>
              <p className="mt-3 text-xs text-[#6B7280]">
                {t("cta.noCard")}
              </p>
            </div>
          </div>
        </section>

        {/* Risikoadvarsel */}
        <section className="px-6 pb-10">
          <p className="text-center text-[10px] text-[#6B7280] max-w-xl mx-auto">
            {t("risk.warning")}
          </p>
        </section>
      </main>
    </MarketingPageShell>
  );
}
