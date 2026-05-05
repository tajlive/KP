"use client";

import { motion } from "framer-motion";

interface TrustBadgesProps {
  language?: "no" | "en";
}

export function TrustBadges({ language = "no" }: TrustBadgesProps) {
  const partners = [
    { name: "Binance", logo: "B" },
    { name: "TradingView", logo: "TV" },
    { name: "Binance", logo: "B" },
    { name: "ByBit", logo: "BB" },
  ];

  return (
    <section className="py-12 bg-[#050510] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-10">
          {language === "no" ? "Data og integrasjoner fra" : "Data and integrations from"}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 sm:gap-20 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
          {partners.map((p) => (
            <motion.div
              key={p.name}
              whileHover={{ scale: 1.1, opacity: 1 }}
              className="text-white font-black text-2xl tracking-tighter cursor-default"
            >
              {p.name}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustBadges;
