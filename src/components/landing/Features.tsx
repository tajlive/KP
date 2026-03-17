"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  BookOpen,
  Bot,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

interface FeaturesProps {
  language?: "no" | "en";
}

export default function Features({ language = "no" }: FeaturesProps) {
  const shouldReduceMotion = useReducedMotion();

  const features = [
    {
      icon: BookOpen,
      title:
        language === "no"
          ? "25+ timer strukturert kurs"
          : "25+ hours structured course",
      description:
        language === "no"
          ? "Fra grunnleggende til avansert teknisk analyse. Videoleksjoner du kan se på repeat når det passer deg."
          : "From basics to advanced technical analysis. Video lessons you can watch whenever it suits you.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Bot,
      title:
        language === "no"
          ? "Læringsassistent på norsk"
          : "Learning assistant in Norwegian",
      description:
        language === "no"
          ? "Spør hva som helst om trading, markedsanalyse eller strategier. Få svar med en gang — på norsk."
          : "Ask anything about trading, market analysis, or strategies. Get answers immediately.",
      gradient: "from-emerald-500 to-pink-500",
    },
    {
      icon: TrendingUp,
      title:
        language === "no"
          ? "Lekepenger med ekte markedsdata"
          : "Paper trading with real market data",
      description:
        language === "no"
          ? "100 000 kroner lekepenger. Tren på ekte Bitcoin- og Ethereum-priser uten å risikere egne penger."
          : "100,000 NOK virtual capital. Practice with real Bitcoin and Ethereum prices without risking your own money.",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Target,
      title:
        language === "no" ? "Praktiske strategier" : "Practical strategies",
      description:
        language === "no"
          ? "Lær RSI, MACD, Bollinger Bands og stop-loss satt-up. Kun det som faktisk brukes."
          : "Learn RSI, MACD, Bollinger Bands and stop-loss setups. Only what is actually used.",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Shield,
      title: language === "no" ? "Risikofri læring" : "Risk-free learning",
      description:
        language === "no"
          ? "Test strategier uten frykt. Ingen ekte penger på spill før du er klar for live trading."
          : "Test strategies without fear. No real money at stake until you are ready for live trading.",
      gradient: "from-indigo-500 to-blue-500",
    },
    {
      icon: Award,
      title:
        language === "no" ? "Offisielt sertifikat" : "Official certificate",
      description:
        language === "no"
          ? "Fullfør kursene og få et sertifikat som beviser din kompetanse i kryptohandel."
          : "Complete the courses and get a certificate that proves your competence in crypto trading.",
      gradient: "from-rose-500 to-red-500",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section className="py-32 bg-[#050510] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-full text-sm font-bold mb-6 border border-blue-500/20"
          >
            <Sparkles className="w-4 h-4" />
            {language === "no" ? "Alt du trenger" : "Everything you need"}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
          >
            {language === "no"
              ? "En komplett læringsplattform"
              : "A complete learning platform"}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-400 max-w-3xl mx-auto"
          >
            {language === "no"
              ? "Fra teori til praksis. Ingen broker-tvang, ingen skjulte kostnader. Bare ren læring."
              : "From theory to practice. No broker pressure, no hidden costs. Just pure learning."}
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={shouldReduceMotion ? {} : { y: -8, scale: 1.02 }}
                className="group relative bg-white/[0.03] backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300 overflow-hidden will-change-transform"
              >
                <div
                  className={`absolute inset-0 bg-linear-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                <div className="relative">
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-2xl bg-linear-to-br ${feature.gradient} flex items-center justify-center mb-8 shadow-2xl group-hover:rotate-6 transition-transform duration-500`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-black text-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-2xl font-bold shadow-xl hover:bg-white/10 transition-all duration-300 cursor-default">
            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            {language === "no"
              ? "Alt tilgjengelig fra dag én"
              : "Everything available from day one"}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
