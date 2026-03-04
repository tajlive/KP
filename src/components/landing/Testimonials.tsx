"use client";

import { translations } from "@/lib/i18n/translations";
import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

interface TestimonialsProps {
  language?: "no" | "en";
}

export function Testimonials({ language = "no" }: TestimonialsProps) {
  const t = translations[language].testimonials;

  return (
    <section className="py-32 bg-[#050510] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
            {t.title}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {language === "no"
              ? "Se hva andre sier om å lære trading med Klarpakke"
              : "See what others are saying about learning to trade with Klarpakke"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {t.items.map((item, index) => {
            const isEven = index % 2 === 0;
            return (
              <motion.div
                key={index}
                initial={{
                  opacity: 0,
                  x: isEven ? -50 : 50,
                  rotate: isEven ? -2 : 2,
                }}
                whileInView={{
                  opacity: 1,
                  x: 0,
                  rotate: 0,
                }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  type: "spring",
                  stiffness: 50,
                  damping: 20,
                  delay: index * 0.1,
                }}
                whileHover={{ y: -10, rotate: isEven ? 1 : -1 }}
                className="bg-white/[0.03] backdrop-blur-sm p-8 rounded-[2rem] border border-white/10 hover:border-white/20 transition-all duration-500 group"
              >
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <Quote className="w-6 h-6 text-blue-400" />
                  </div>
                </div>

                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-blue-500 text-blue-500"
                    />
                  ))}
                </div>

                <p className="text-lg text-slate-300 mb-8 leading-relaxed font-medium italic">
                  "{item.text}"
                </p>

                <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg">
                    {item.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-white tracking-tight">
                      {item.name}
                    </p>
                    <p className="text-sm text-slate-500 font-medium">
                      {item.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Global ratings highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-12"
        >
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-slate-800 border-2 border-[#050510] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-50" />
                </div>
              ))}
            </div>
            <span className="text-slate-400 font-medium">
              <span className="text-white font-black">1,200+</span>{" "}
              {language === "no" ? "brukere" : "users"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <span className="text-slate-400 font-medium">
              <span className="text-white font-black">4.9/5</span>{" "}
              {language === "no" ? "vurdering" : "rating"}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
