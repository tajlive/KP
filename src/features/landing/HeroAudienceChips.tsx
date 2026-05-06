import { BookOpen, LineChart } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";

/**
 * Basic / experienced entry — scrolls to course preview or live demo (competitor pattern).
 */
export async function HeroAudienceChips() {
  const t = await getTranslations("landing.modernHero");
  const locale = await getLocale();
  const home = hrefWithLocale(locale, "/");

  return (
    <div
      className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-center lg:justify-start"
      role="navigation"
      aria-label={t("audienceAria")}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-blue-200/80 text-center sm:text-left sm:mr-1 sm:self-center">
        {t("audienceLabel")}
      </span>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
        <Link
          href={`${home}#land-kurs`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-white/45 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0041CC]"
        >
          <BookOpen className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          {t("audienceCourses")}
        </Link>
        <Link
          href={`${home}#land-demo`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0052FF]/50 bg-[#0052FF]/25 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0052FF]/20 transition-all duration-200 hover:border-[#0052FF]/70 hover:bg-[#0052FF]/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3d7aff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0041CC]"
        >
          <LineChart className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          {t("audiencePaper")}
        </Link>
      </div>
    </div>
  );
}
