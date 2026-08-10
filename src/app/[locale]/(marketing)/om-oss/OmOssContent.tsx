import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle,
  Flag,
  GraduationCap,
  Landmark,
  Mail,
  MapPin,
  Search,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

/**
 * OmOssContent — Variant C-redesign (mega-plan Oppgave 1.4, 2026-08-10).
 *
 * Ren design-omskriving: ALL tekst gjenbrukes ordrett fra godkjent
 * about.*-namespace (Toms historie godkjent 2026-08-08). Null nye nøkler.
 * Design: mørke kp-tokens, mormor-typografi, samme visuelle språk som
 * ny landing («Beviset») og /kurs.
 */

const values = [
  { icon: GraduationCap, titleKey: "values.education.title", descKey: "values.education.desc", farge: "text-brand-300" },
  { icon: Search, titleKey: "values.transparency.title", descKey: "values.transparency.desc", farge: "text-green-500" },
  { icon: Flag, titleKey: "values.norwegian.title", descKey: "values.norwegian.desc", farge: "text-red-400" },
  { icon: AlertTriangle, titleKey: "values.risk.title", descKey: "values.risk.desc", farge: "text-yellow-500" },
];

export async function OmOssContent({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <div className="bg-kp-bg-primary text-kp-text-primary">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        {/* HERO */}
        <header className="mb-16 text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-badge border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-300">
            <Award className="h-4 w-4" aria-hidden />
            {t("hero.badge")}
          </p>
          <h1 className="text-display-sm font-extrabold tracking-tight text-balance sm:text-display">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-body text-kp-text-secondary">
            {t("hero.subtitle")}
          </p>
        </header>

        {/* HISTORIEN — ordrett fra godkjent tekst */}
        <section className="mb-14">
          <h2 className="mb-6 text-heading-sm font-black sm:text-heading">
            {t("story.title")}
          </h2>
          <div className="space-y-4 text-body text-kp-text-secondary">
            <p>{t("story.p1")}</p>
            <p>{t("story.p2")}</p>
            <p>{t("story.p3")}</p>
          </div>
          <figure className="mt-8 rounded-3xl border-l-4 border-kp-brand bg-kp-bg-secondary p-7">
            <blockquote className="text-lg font-medium italic leading-relaxed text-kp-text-primary">
              «{t("story.quote")}»
            </blockquote>
            <figcaption className="mt-3 text-sm font-semibold text-kp-brand-light">
              — {t("story.quoteAuthor")}
            </figcaption>
          </figure>
        </section>

        {/* MISJON */}
        <section className="mb-14 rounded-3xl bg-kp-bg-secondary p-8">
          <h2 className="mb-4 text-heading-sm font-black sm:text-heading">
            {t("mission.title")}
          </h2>
          <p className="mb-3 text-body text-kp-text-secondary">{t("mission.text")}</p>
          <p className="text-base text-kp-text-muted">{t("mission.values")}</p>
        </section>

        {/* VERDI-FAKTA */}
        <section className="mb-14">
          <h2 className="mb-8 text-center text-heading-sm font-black sm:text-heading">
            {t("values.title")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {values.map((v) => (
              <div
                key={v.titleKey}
                className="rounded-3xl border border-kp-border bg-kp-bg-secondary p-6"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-kp-bg-primary ${v.farge}`}>
                  <v.icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mb-2 text-xl font-bold">{t(v.titleKey)}</h3>
                <p className="text-base text-kp-text-secondary">{t(v.descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ANNERLEDES + RISIKO */}
        <section className="mb-14 rounded-3xl border border-kp-border bg-kp-bg-secondary p-8">
          <h2 className="mb-2 text-heading-sm font-black sm:text-heading">
            {t("different.title")}
          </h2>
          <p className="mb-6 text-body text-kp-text-secondary">
            {t("different.subtitle")}
          </p>
          <ul className="mb-8 space-y-3">
            {[
              "different.paperTrading",
              "different.norwegian",
              "different.education",
              "different.transparency",
              "different.community",
            ].map((key) => (
              <li key={key} className="flex items-start gap-3 text-base text-kp-text-primary">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" aria-hidden />
            <p className="text-sm font-medium text-red-300">{t("risk.warning")}</p>
          </div>
        </section>

        {/* TEAM */}
        <section className="mb-14">
          <h2 className="mb-8 text-heading-sm font-black sm:text-heading">
            {t("team.title")}
          </h2>
          <div className="mb-5 flex items-start gap-5 rounded-3xl border border-kp-border bg-kp-bg-secondary p-7">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-kp-brand text-2xl font-extrabold text-white"
              aria-hidden
            >
              {t("team.tom.initials")}
            </div>
            <div>
              <h3 className="text-2xl font-bold">{t("team.tom.name")}</h3>
              <p className="mb-3 font-semibold text-kp-brand-light">{t("team.tom.role")}</p>
              <p className="text-base text-kp-text-secondary">{t("team.tom.bio")}</p>
            </div>
          </div>
          <div className="rounded-3xl bg-kp-bg-secondary p-6">
            <h4 className="mb-3 text-lg font-bold">{t("team.partners.title")}</h4>
            <ul className="space-y-2 text-base text-kp-text-secondary">
              {["team.partners.supabase", "team.partners.cloudflare", "team.partners.kraken"].map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* KONTAKT */}
        <section className="mb-14">
          <h2 className="mb-2 text-center text-heading-sm font-black sm:text-heading">
            {t("contact.title")}
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-center text-body text-kp-text-secondary">
            {t("contact.subtitle")}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-kp-border bg-kp-bg-secondary p-6 text-center">
              <Mail className="mx-auto mb-3 h-6 w-6 text-kp-brand-light" aria-hidden />
              <h3 className="mb-1 font-bold">{t("contact.email")}</h3>
              <a
                href={`mailto:${t("contact.emailValue")}`}
                className="text-kp-brand-light underline-offset-4 hover:underline"
              >
                {t("contact.emailValue")}
              </a>
            </div>
            <div className="rounded-3xl border border-kp-border bg-kp-bg-secondary p-6 text-center">
              <Landmark className="mx-auto mb-3 h-6 w-6 text-kp-brand-light" aria-hidden />
              <h3 className="mb-1 font-bold">{t("contact.org")}</h3>
              <p className="text-kp-text-secondary">{t("contact.orgNumber")}</p>
              <p className="mt-1 text-xs text-kp-text-muted">{t("contact.orgName")}</p>
            </div>
            <div className="rounded-3xl border border-kp-border bg-kp-bg-secondary p-6 text-center">
              <MapPin className="mx-auto mb-3 h-6 w-6 text-kp-brand-light" aria-hidden />
              <h3 className="mb-1 font-bold">{t("contact.location")}</h3>
              <p className="text-kp-text-secondary">{t("contact.locationValue")}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-3xl border border-kp-border bg-[linear-gradient(135deg,rgba(0,82,255,0.18),rgba(34,197,94,0.12))] p-8 text-center sm:p-10">
          <h2 className="text-heading-sm font-black sm:text-heading">{t("cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-md text-body text-kp-text-secondary">
            {t("cta.subtitle")}
          </p>
          <Link
            href={`/${locale}/register`}
            className="mt-6 inline-flex min-h-[60px] items-center justify-center rounded-2xl bg-green-500 px-10 py-4 text-lg font-extrabold text-[#06280f] shadow-lg shadow-green-500/25 transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02] hover:bg-green-600 active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          >
            <BookOpen className="mr-2 h-5 w-5" aria-hidden />
            {t("cta.button")}
          </Link>
          <p className="mt-4 text-sm text-kp-text-muted">{t("cta.noCard")}</p>
        </div>
      </div>
    </div>
  );
}
