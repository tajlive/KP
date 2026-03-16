"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, Sparkles } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

interface FinalCTASectionProps {
  language?: "no" | "en";
}

export default function FinalCTASection({
  language = "no",
}: FinalCTASectionProps) {
  const router = useRouter();
  const locale = useLocale();

  const handleStartFree = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#2563eb", "#3b82f6", "#60a5fa", "#ffffff"],
    });
    setTimeout(() => {
      router.push(`/${locale}/paper-trading`);
    }, 500);
  };

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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[150px]" />
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
            className="absolute inset-0 bg-linear-to-br from-blue-600/10 to-transparent pointer-events-none"
          />

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(37,99,235,0.4)]"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-4xl sm:text-7xl font-black text-white mb-8 tracking-tighter leading-tight">
              {language === "no"
                ? "Start din trading-reise"
                : "Start your trading journey"}
              <br />
              <span className="text-blue-500">
                {language === "no" ? "i dag" : "today"}
              </span>
            </h2>

            <p className="text-xl sm:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              {language === "no"
                ? "Bli med over 1,200 andre nordmenn som lærer trading på den smarte måten."
                : "Join over 1,200 other Norwegians learning to trade the smart way."}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartFree}
                className="group relative bg-blue-600 hover:bg-blue-500 px-12 py-6 rounded-2xl text-xl font-black text-white transition-all flex items-center gap-3 w-full sm:w-auto justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)]"
              >
                {language === "no" ? "Start gratis nå" : "Start for free now"}
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                <span className="absolute inset-0 rounded-2xl animate-pulse bg-blue-400/20 blur-xl pointer-events-none" />
              </motion.button>

              <button
                onClick={() => router.push(`/${locale}/kurs`)}
                className="px-10 py-6 bg-white/5 backdrop-blur-lg text-white border border-white/10 rounded-2xl font-black text-xl hover:bg-white/10 transition-all"
              >
                {language === "no" ? "Se studieplan" : "See curriculum"}
              </button>
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
              className="mt-16 inline-flex items-center gap-3 px-6 py-3 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-full text-blue-300"
            >
              <Clock className="w-5 h-5" />
              <span className="text-sm font-black uppercase tracking-widest">
                {language === "no"
                  ? "Beta-priser gjelder ut 2026"
                  : "Beta pricing valid through 2026"}
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
