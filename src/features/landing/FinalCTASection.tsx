"use client";

/**
 * @deprecated Use `src/shared/ui/marketing/CTASection` instead.
 */
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { BRAND, BRAND_COLOR, SURFACE } from "@/lib/design/tokens";

export default function FinalCTASection() {
  const locale = useLocale();
  const t = useTranslations("landing.finalCta");
  const { user } = useAuth();
  const signupHref = hrefWithLocale(locale, "/register");
  const dashboardHref = hrefWithLocale(locale, "/dashboard");

  const guarantees = [
    t("guarantee1"),
    t("guarantee2"),
    t("guarantee3"),
    t("guarantee4"),
  ];

  return (
    <section
      className={`relative py-16 lg:py-20 overflow-x-hidden ${SURFACE.BG}`}
      aria-labelledby="final-cta-heading"
    >
      <div className="absolute inset-0 z-0 opacity-20">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px]"
          style={{ backgroundColor: BRAND_COLOR.DEFAULT }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="isolate bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] relative shadow-2xl"
        >
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3rem]"
            aria-hidden
          >
            <motion.div
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 to-transparent"
              style={{
                background: `linear-gradient(to bottom right, ${BRAND_COLOR.DEFAULT}1A, transparent)`,
              }}
            />
          </div>

          <div className="relative z-10 p-8 sm:p-12 lg:p-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6"
              style={{
                backgroundColor: BRAND_COLOR.DEFAULT,
                boxShadow: `0 0 50px ${BRAND_COLOR.DEFAULT}66`,
              }}
            >
              <Sparkles className="w-10 h-10 text-white" aria-hidden />
            </motion.div>

            <h2
              id="final-cta-heading"
              className="text-3xl sm:text-5xl lg:text-7xl font-black text-white mb-5 tracking-tighter leading-[1.1] break-words"
            >
              {user ? t("loggedInTitleLine1") : t("titleLine1")}
              <br />
              <span
                className={`${BRAND.link} drop-shadow-[0_0_24px_rgba(0,82,255,0.35)]`}
              >
                {user ? t("loggedInTitleAccent") : t("titleAccent")}
              </span>
            </h2>

            <p className="text-lg sm:text-xl md:text-2xl text-slate-200/95 mb-8 max-w-2xl mx-auto leading-relaxed">
              {user ? t("loggedInSubtitle") : t("subtitle")}
            </p>

            <div className="flex justify-center items-center mb-10">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href={user ? dashboardHref : signupHref}
                  className={`group relative ${BRAND.primary} px-10 py-5 sm:px-12 sm:py-6 rounded-2xl text-lg sm:text-xl font-black text-white transition-all flex items-center justify-center w-full sm:w-auto min-h-[3.25rem]`}
                  style={{ boxShadow: `0 0 40px ${BRAND_COLOR.DEFAULT}66` }}
                >
                  <span className="relative z-10 inline-flex items-center gap-3">
                    {user ? t("loggedInCta") : t("cta")}
                    <ArrowRight
                      className="w-6 h-6 shrink-0 group-hover:translate-x-1 transition-transform"
                      aria-hidden
                    />
                  </span>
                  <span
                    className="absolute inset-0 rounded-2xl animate-pulse blur-xl pointer-events-none opacity-20 z-0"
                    style={{ backgroundColor: BRAND_COLOR.DEFAULT }}
                    aria-hidden
                  />
                </Link>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto">
              {guarantees.map((guarantee) => (
                <div
                  key={guarantee}
                  className="flex items-start gap-3 text-slate-200/95 bg-white/[0.06] p-4 rounded-xl border border-white/10"
                >
                  <CheckCircle
                    className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <span className="min-w-0 text-sm sm:text-base font-semibold leading-snug text-left">
                    {guarantee}
                  </span>
                </div>
              ))}
            </div>

            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mt-10 sm:mt-12 max-w-full inline-flex items-center gap-3 px-5 py-3.5 backdrop-blur-sm rounded-full border tabular-nums mx-auto"
              style={{
                backgroundColor: `${BRAND_COLOR.DEFAULT}1A`,
                borderColor: `${BRAND_COLOR.DEFAULT}33`,
                color: BRAND_COLOR.LIGHT,
              }}
            >
              <Clock className="w-5 h-5 shrink-0" aria-hidden />
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-center normal-case">
                {t("pricingNote")}
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
