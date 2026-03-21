"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { BRAND, BRAND_COLOR, SURFACE } from "@/lib/design/tokens";

export default function FinalCTASection() {
  const locale = useLocale();
  const t = useTranslations("landing.finalCta");
  const { user } = useAuth();
  const signupHref = hrefWithLocale(locale, "/signup");
  const dashboardHref = hrefWithLocale(locale, "/dashboard");

  const guarantees = [
    t("guarantee1"),
    t("guarantee2"),
    t("guarantee3"),
    t("guarantee4"),
  ];

  return (
    <section
      className={`relative py-32 overflow-hidden ${SURFACE.BG}`}
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
          className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 sm:p-24 relative overflow-hidden shadow-2xl"
        >
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 to-transparent pointer-events-none"
            style={{
              background: `linear-gradient(to bottom right, ${BRAND_COLOR.DEFAULT}1A, transparent)`,
            }}
          />

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-10"
              style={{
                backgroundColor: BRAND_COLOR.DEFAULT,
                boxShadow: `0 0 50px ${BRAND_COLOR.DEFAULT}66`,
              }}
            >
              <Sparkles className="w-10 h-10 text-white" aria-hidden />
            </motion.div>

            <h2
              id="final-cta-heading"
              className="text-4xl sm:text-7xl font-black text-white mb-8 tracking-tighter leading-tight"
            >
              {user ? t("loggedInTitleLine1") : t("titleLine1")}
              <br />
              <span className={BRAND.link}>
                {user ? t("loggedInTitleAccent") : t("titleAccent")}
              </span>
            </h2>

            <p className="text-xl sm:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              {user ? t("loggedInSubtitle") : t("subtitle")}
            </p>

            <div className="flex justify-center items-center mb-16">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href={user ? dashboardHref : signupHref}
                  className={`group relative ${BRAND.primary} px-12 py-6 rounded-2xl text-xl font-black text-white transition-all flex items-center gap-3 w-full sm:w-auto justify-center`}
                  style={{ boxShadow: `0 0 40px ${BRAND_COLOR.DEFAULT}66` }}
                >
                  {user ? t("loggedInCta") : t("cta")}
                  <ArrowRight
                    className="w-6 h-6 group-hover:translate-x-1 transition-transform"
                    aria-hidden
                  />
                  <span
                    className="absolute inset-0 rounded-2xl animate-pulse blur-xl pointer-events-none opacity-20"
                    style={{ backgroundColor: BRAND_COLOR.DEFAULT }}
                  />
                </Link>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {guarantees.map((guarantee) => (
                <div
                  key={guarantee}
                  className="flex items-center gap-3 text-slate-400 bg-white/5 p-4 rounded-xl border border-white/5"
                >
                  <CheckCircle
                    className="w-5 h-5 text-emerald-400 shrink-0"
                    aria-hidden
                  />
                  <span className="text-sm font-bold tracking-tight text-left">
                    {guarantee}
                  </span>
                </div>
              ))}
            </div>

            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mt-16 inline-flex items-center gap-3 px-6 py-3 backdrop-blur-sm rounded-full border tabular-nums"
              style={{
                backgroundColor: `${BRAND_COLOR.DEFAULT}1A`,
                borderColor: `${BRAND_COLOR.DEFAULT}33`,
                color: BRAND_COLOR.LIGHT,
              }}
            >
              <Clock className="w-5 h-5 shrink-0" aria-hidden />
              <span className="text-sm font-black uppercase tracking-widest">
                {t("pricingNote")}
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
