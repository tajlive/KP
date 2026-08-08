import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Crown,
  GraduationCap,
  Heart,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  MarketingPageShell,
  generateMarketingMetadata,
} from "@/shared/ui/marketing";

export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateMarketingMetadata({
    locale,
    namespace: "founder",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "/founder",
  });
}

const FACTS_ICONS = [ShieldCheck, CheckCircle2, Heart, Sparkles];

export default async function FounderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "founder" });

  return (
    <MarketingPageShell className="bg-[#0A0B0D]">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-14 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
            <Crown className="h-4 w-4" />
            {t("hero.badge")}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#F9FAFB] sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#9CA3AF]">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/${locale}/register`}
              className="rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-semibold text-[#0A0B0D] transition hover:bg-emerald-400"
            >
              {t("hero.cta")}
            </Link>
            <a
              href="#historien"
              className="rounded-xl border border-[#1E2530] px-8 py-3.5 text-base font-semibold text-[#F9FAFB] transition hover:border-[#2A3442] hover:bg-[#11151C]"
            >
              {t("hero.ctaSecondary")}
            </a>
          </div>
        </div>
      </section>

      {/* ─── Ikke et lotteri ─── */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#1E2530] bg-[#0F1319] p-8">
          <h2 className="text-2xl font-bold text-[#F9FAFB]">
            {t("notLottery.title")}
          </h2>
          <p className="mt-3 leading-relaxed text-[#9CA3AF]">
            {t("notLottery.body")}
          </p>
        </div>
      </section>

      {/* ─── Hvorfor gratis ─── */}
      <section id="historien" className="px-6 pb-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-[#F9FAFB]">
            {t("whyFree.title")}
          </h2>
          <p className="mt-3 text-lg font-medium text-emerald-400">
            {t("whyFree.body")}
          </p>
          <p className="mt-3 leading-relaxed text-[#9CA3AF]">
            {t("whyFree.founders")}
          </p>
        </div>
      </section>

      {/* ─── Hvem er jeg ─── */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-[#F9FAFB]">{t("whoAmI.title")}</h2>
          <p className="mt-3 leading-relaxed text-[#9CA3AF]">{t("whoAmI.body")}</p>
          <p className="mt-3 leading-relaxed text-[#9CA3AF]">{t("whoAmI.team")}</p>
        </div>
      </section>

      {/* ─── Hva er Klarpakke ─── */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-[#F9FAFB]">{t("whatIs.title")}</h2>
          <p className="mt-3 leading-relaxed text-[#9CA3AF]">{t("whatIs.body")}</p>
          <p className="mt-3 leading-relaxed text-[#9CA3AF]">{t("whatIs.simple")}</p>
          <p className="mt-3 leading-relaxed text-[#9CA3AF]">{t("whatIs.ai")}</p>
        </div>
      </section>

      {/* ─── Fakta før fine ord ─── */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#1E2530] bg-[#0F1319] p-8">
          <h2 className="text-2xl font-bold text-[#F9FAFB]">{t("facts.title")}</h2>
          <p className="mt-3 leading-relaxed text-[#9CA3AF]">{t("facts.body")}</p>
          <ul className="mt-5 space-y-3">
            {t.raw("facts.items").map(
              (item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-[#D1D5DB]">
                  {(() => {
                    const Icon = FACTS_ICONS[i % FACTS_ICONS.length];
                    return <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />;
                  })()}
                  <span>{item}</span>
                </li>
              ),
            )}
          </ul>
          <p className="mt-5 font-medium text-[#F9FAFB]">{t("facts.closing")}</p>
        </div>
      </section>

      {/* ─── Norge først ─── */}
      <section className="px-6 pb-12">
        <div className="mx-auto flex max-w-3xl items-start gap-4">
          <Rocket className="mt-1 h-6 w-6 shrink-0 text-emerald-400" />
          <div>
            <h2 className="text-2xl font-bold text-[#F9FAFB]">
              {t("norwayFirst.title")}
            </h2>
            <p className="mt-3 leading-relaxed text-[#9CA3AF]">
              {t("norwayFirst.body")}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Hva du får som founder ─── */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-[#F9FAFB]">
              {t("benefits.title")}
            </h2>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {t.raw("benefits.items").map((item: string, i: number) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-[#1E2530] bg-[#0F1319] p-4 text-[#D1D5DB]"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 font-medium text-emerald-300">
            {t("benefits.noKrypto")}
          </p>
        </div>
      </section>

      {/* ─── Ærlig advarsel ─── */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-amber-400" />
            <h2 className="text-2xl font-bold text-[#F9FAFB]">
              {t("warning.title")}
            </h2>
          </div>
          <p className="mt-3 leading-relaxed text-[#D1D5DB]">{t("warning.body")}</p>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-6 pb-24 pt-4 text-center">
        <div className="mx-auto max-w-2xl">
          <Users className="mx-auto h-10 w-10 text-emerald-400" />
          <h2 className="mt-4 text-3xl font-extrabold text-[#F9FAFB]">
            {t("cta.title")}
          </h2>
          <p className="mt-3 text-lg text-[#9CA3AF]">{t("cta.body")}</p>
          <Link
            href={`/${locale}/register`}
            className="mt-8 inline-block rounded-xl bg-emerald-500 px-10 py-4 text-lg font-semibold text-[#0A0B0D] transition hover:bg-emerald-400"
          >
            {t("cta.button")}
          </Link>
          <p className="mt-4 text-sm text-[#6B7280]">{t("cta.sub")}</p>
        </div>
      </section>
    </MarketingPageShell>
  );
}
