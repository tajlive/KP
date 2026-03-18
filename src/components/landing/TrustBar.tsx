import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ShieldCheck, GraduationCap, TrendingUp, Trophy } from "lucide-react";
import { BRAND } from "@/lib/design/tokens";

export async function TrustBar({ locale = "no" }: { locale?: string }) {
  const t = await getTranslations("trustBar");
  let userCount = 0;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const supabase = await createClient();
      const { count } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true });
      userCount = count ?? 0;
    } catch {
      userCount = 0;
    }
  }

  const showUserCount = userCount >= 50;

  return (
    <section className="py-8 bg-slate-900/30 border-y border-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        {/* Trust text med brukerantall */}
        <div className="text-center mb-6">
          <p className="text-slate-300 font-medium">
            {showUserCount
              ? t("withCount", { count: userCount.toLocaleString("nb-NO") })
              : t("fallback")}
          </p>
        </div>

        {/* Trust icons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
            </div>
            <span className="text-slate-400 text-sm">{t("trust1")}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-teal-400" />
            </div>
            <span className="text-slate-400 text-sm">{t("trust2")}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-400" />
            </div>
            <span className="text-slate-400 text-sm">{t("trust3")}</span>
          </div>
        </div>

        {/* KLT-teaser + CTA */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-amber-200/90 text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" aria-hidden />
            {t("kltTeaser")}
          </p>
          <Link
            href={`/${locale}/paper-trading`}
            className={`text-sm font-semibold ${BRAND.link}`}
          >
            {t("cta")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
