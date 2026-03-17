"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRef } from "react";

interface HeroProps {
  language?: "no" | "en";
}

export function Hero({ language }: HeroProps) {
  const locale = useLocale();
  const t = useTranslations("hero");
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const titleWords = t("title").split(" ");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 20,
      },
    },
  };

  return (
    <section
      ref={containerRef}
      className="relative bg-[#050510] overflow-hidden min-h-screen flex items-center pt-20"
    >
      {/* 1. Background: Animated Gradient Mesh */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#050510]" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[130px] rounded-full mix-blend-screen"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/20 blur-[130px] rounded-full mix-blend-screen"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div style={{ y: y1, opacity }} className="text-left">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md text-blue-300 text-sm font-bold mb-8 border border-white/10"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t("badge")}</span>
          </motion.div>

          {/* Hovedtittel: Word-by-word reveal */}
          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-5xl sm:text-6xl lg:text-8xl font-black text-white mb-8 leading-[1.05] tracking-tighter"
          >
            {titleWords.map((word, i) => (
              <motion.span
                key={i}
                variants={wordVariants}
                className="inline-block mr-[0.2em] will-change-transform"
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* Undertittel */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="text-2xl sm:text-3xl font-medium text-slate-400 mb-10 max-w-xl"
          >
            {t("description")}
          </motion.p>

          {/* CTA knapper: Scale spring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring" as const,
              stiffness: 300,
              damping: 25,
              delay: 1.2,
            }}
            className="flex flex-col sm:flex-row gap-5 items-center will-change-transform"
          >
            <Link
              href={`/${locale}/beta/apply`}
              className="group bg-blue-600 hover:bg-blue-500 px-10 py-5 rounded-2xl text-lg font-black text-white transition-all flex items-center gap-3 w-full sm:w-auto justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)]"
            >
              {t("ctaPrimary")}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Right: Paper Trading Preview Card (Parallax) */}
        <motion.div
          initial={{ opacity: 0, x: 100, rotateY: -20 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          className="relative perspective-1000 hidden lg:block"
        >
          <motion.div
            style={{ y: useTransform(scrollYProgress, [0, 1], [0, 150]) }}
            className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-transparent pointer-events-none" />

            <div className="flex justify-between items-center mb-10">
              <div>
                <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">
                  Lekepenger
                </p>
                <h3 className="text-4xl font-black text-white">100,000 kr</h3>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                <TrendingUp className="text-blue-400 w-8 h-8" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="h-32 w-full bg-slate-800/50 rounded-2xl overflow-hidden relative">
                <div className="absolute inset-0 flex items-end">
                  <div className="w-full h-1/2 bg-blue-500/20 blur-2xl" />
                </div>
                <svg
                  viewBox="0 0 400 100"
                  className="absolute inset-0 w-full h-full p-4"
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: 1.5 }}
                    d="M0 80 Q 50 20 100 60 T 200 30 T 300 70 T 400 10"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    Dagens profitt
                  </p>
                  <p className="text-xl font-black text-emerald-400">
                    +12,450 kr
                  </p>
                </div>
                <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    Aktive trades
                  </p>
                  <p className="text-xl font-black text-white">4</p>
                </div>
              </div>
            </div>

            {/* UI Badge Overlay */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-6 top-1/2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-sm shadow-xl z-20Rotate-12 border-2 border-slate-900"
            >
              +24.5% i dag 🚀
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        style={{ opacity }}
        className="absolute bottom-10 left-1/2 -track-x-1/2"
      >
        <div className="w-7 h-12 border-2 border-white/20 rounded-full flex justify-center p-2 backdrop-blur-sm">
          <motion.div
            animate={{ y: [0, 16, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-1.5 h-1.5 bg-blue-500 rounded-full"
          />
        </div>
      </motion.div>
    </section>
  );
}

function TrendingUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
