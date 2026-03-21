import { getTranslations } from "next-intl/server";
import Link from "next/link";

type Props = { locale: string; generatedAt: Date };

function formatGeneratedAt(locale: string, d: Date): string {
  const tag = locale === "no" ? "no-NO" : "en-GB";
  return new Intl.DateTimeFormat(tag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** Diskret strip: ingen plattform-aggregater — verifiserbar byggetid (ISR). */
export async function LandingTransparencyStrip({ locale, generatedAt }: Props) {
  const t = await getTranslations({
    locale,
    namespace: "landing.transparency",
  });
  const time = formatGeneratedAt(locale, generatedAt);

  return (
    <section
      className="border-y border-white/10 bg-slate-950/35 backdrop-blur-sm"
      aria-labelledby="landing-transparency-strip-title"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-8">
        <p
          id="landing-transparency-strip-title"
          className="text-sm leading-relaxed text-blue-100/90"
        >
          {t("strip")}
        </p>
        <div className="flex flex-shrink-0 flex-col gap-1 sm:items-end sm:text-right">
          <p className="text-xs tabular-nums text-blue-200/80">
            {t("updated", { time })}
          </p>
          <p className="text-xs text-blue-300/70">{t("isrNote")}</p>
          <Link
            href="#land-transparens"
            className="text-xs font-semibold text-sky-300 underline-offset-2 hover:text-sky-200 hover:underline"
          >
            {t("learnMore")}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Utdypning — kort FAQ uten tall som ikke kan forklares. */
export async function LandingTransparencySection({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations({
    locale,
    namespace: "landing.transparency",
  });

  return (
    <section
      id="land-transparens"
      className="scroll-mt-24 border-t border-slate-200/80 bg-slate-50/90 py-14"
      aria-labelledby="landing-transparency-section-title"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2
          id="landing-transparency-section-title"
          className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
        >
          {t("sectionTitle")}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          {t("sectionLead")}
        </p>
        <ul className="mt-6 list-disc space-y-3 pl-5 text-sm leading-relaxed text-slate-600">
          <li>{t("point1")}</li>
          <li>{t("point2")}</li>
          <li>{t("point3")}</li>
        </ul>
      </div>
    </section>
  );
}
