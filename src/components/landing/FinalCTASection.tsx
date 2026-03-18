"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, Sparkles } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { BRAND, BRAND_COLOR } from "@/lib/design/tokens";

interface FinalCTASectionProps {
  language?: "no" | "en";
}

export default function FinalCTASection({
  language = "no",
}: FinalCTASectionProps) {
  const locale = useLocale();

  const guarantees =
    language === "no"
      ? [
          "Ingen binding — avslutt når som helst",
          "Ingen kredittkort nødvendig for å prøve",
          "Risikofri lekepenger",
          "Alt innhold tilgjengelig umiddelbart",
        ]
      : [
          "No commitment — cancel anytime",
          "No credit card required to try",
          "Risk-free paper trading",
          "All content available immediately",
        ];

  return (
    <section className="relative py-32 overflow-hidden bg-[#050510]">
      {/* Background decoration */}
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
          {/* Pulsing internal glow */}
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
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-4xl sm:text-7xl font-black text-white mb-8 tracking-tighter leading-tight">
              {language === "no"
                ? "Start din trading-reise"
                : "Start your trading journey"}
              <br />
              <span className={BRAND.link}>
                {language === "no" ? "i dag" : "today"}
              </span>
            </h2>

            <p className="text-xl sm:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              {language === "no"
                ? "Bli med over 1,200 andre nordmenn som lærer trading på den smarte måten."
                : "Join over 1,200 other Norwegians learning to trade the smart way."}
            </p>

            <div className="flex justify-center items-center mb-16">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href={`/${locale}/signup`}
                  className={`group relative ${BRAND.primary} px-12 py-6 rounded-2xl text-xl font-black text-white transition-all flex items-center gap-3 w-full sm:w-auto justify-center`}
                  style={{ boxShadow: `0 0 40px ${BRAND_COLOR.DEFAULT}66` }}
                >
                  {language === "no" ? "Start gratis nå" : "Start for free now"}
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  <span
                    className="absolute inset-0 rounded-2xl animate-pulse blur-xl pointer-events-none opacity-20"
                    style={{ backgroundColor: BRAND_COLOR.DEFAULT }}
                  />
                </Link>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {guarantees.map((guarantee, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 text-slate-400 bg-white/5 p-4 rounded-xl border border-white/5"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-sm font-bold tracking-tight">
                    {guarantee}
                  </span>
                </div>
              ))}
            </div>

            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mt-16 inline-flex items-center gap-3 px-6 py-3 backdrop-blur-sm rounded-full border"
              style={{
                backgroundColor: `${BRAND_COLOR.DEFAULT}1A`,
                borderColor: `${BRAND_COLOR.DEFAULT}33`,
                color: BRAND_COLOR.LIGHT,
              }}
            >
              <Clock className="w-5 h-5" />
              <span className="text-sm font-black uppercase tracking-widest">
                {language === "no"
                  ? "Student gratis · Bachelor fra 249 kr/mnd"
                  : "Student free · Bachelor from 249 NOK/mo"}
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
