"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function HeroSection() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-700">
      {/* Modern grid pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Modern badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm text-white border border-blue-400/30 rounded-full text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Beta — Bli en av de første norske traderne
            </div>

            {/* H1 - More compelling */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
              Lær Trading
              <br />
              <span className="bg-gradient-to-r from-blue-200 via-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                På Norsk
              </span>
            </h1>

            {/* H2 - Clearer value prop */}
            <p className="text-xl sm:text-2xl text-blue-50 mb-6 leading-relaxed">
              Fra nybegynner til selvstendig trader med strukturert læring og
              risikofri praksis
            </p>

            <p className="text-lg text-blue-100/90 mb-10 max-w-2xl">
              Kurs på norsk • 1M kr paper trading • AI-coach 24/7 • Ingen
              kredittkort påkrevd
            </p>

            {/* Modern CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={() => router.push(`/${locale}/paper-trading`)}
                aria-label="Start gratis paper trading med virtuell kapital"
                className="group px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                Prøv Paper Trading Gratis
                <ArrowRight
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </button>

              <button
                onClick={() => router.push(`/${locale}/kurs`)}
                aria-label="Utforsk våre norske tradingkurs"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-lg border-2 border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                Se Kurs
              </button>
            </div>

            {/* Trust indicators - modernized */}
            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-white/90 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <span>100% norsk</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <span>Ingen binding</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <span>Risikofi praksis</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Modern, honest mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Modern browser mockup */}
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
              {/* Browser chrome */}
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 ml-4 bg-slate-800 rounded px-3 py-1">
                  <span className="text-slate-400 text-xs font-mono">
                    klarpakke.no/paper-trading
                  </span>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">
                      Paper Trading
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      1 000 000 kr
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    ✓ Risikofritt
                  </div>
                </div>

                {/* Mini chart */}
                <div className="bg-white rounded-xl p-4 mb-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      BTC/USDT
                    </span>
                    <span className="text-xs text-slate-500">Siste 24t</span>
                  </div>
                  <svg viewBox="0 0 200 60" className="w-full h-16">
                    <defs>
                      <linearGradient
                        id="chartGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3b82f6"
                          stopOpacity="0.4"
                        />
                        <stop
                          offset="100%"
                          stopColor="#3b82f6"
                          stopOpacity="0.05"
                        />
                      </linearGradient>
                    </defs>
                    {/* Area under line */}
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12 L 200,60 L 0,60 Z"
                      fill="url(#chartGradient)"
                    />
                    {/* Line */}
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Position cards */}
                <div className="space-y-2">
                  <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                        ₿
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          BTC/USDT
                        </div>
                        <div className="text-xs text-slate-500">0.025 BTC</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        +12.4%
                      </div>
                      <div className="text-xs text-slate-500">+18 600 kr</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                        Ξ
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          ETH/USDT
                        </div>
                        <div className="text-xs text-slate-500">0.5 ETH</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-500">
                        -3.2%
                      </div>
                      <div className="text-xs text-slate-500">-4 800 kr</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl">
                1M kr virtuelt 🎯
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modern scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-2">
          <motion.div
            className="w-1.5 h-1.5 bg-white rounded-full"
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
