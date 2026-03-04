"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { useEffect, useRef } from "react";

interface SocialProofProps {
  language?: "no" | "en";
}

function Counter({
  value,
  suffix = "",
  duration = 2,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const count = useMotionValue(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useMotionValueEvent(count, "change", (latest) => {
    if (ref.current) {
      ref.current.textContent = Math.round(latest).toLocaleString() + suffix;
    }
  });

  useEffect(() => {
    if (isInView) {
      animate(count, value, { duration, ease: "easeOut" });
    }
  }, [isInView, count, value, duration]);

  return <span ref={ref}>0{suffix}</span>;
}

export function SocialProof({ language = "no" }: SocialProofProps) {
  const stats = [
    {
      label: language === "no" ? "Brukere" : "Users",
      value: 1200,
      suffix: "+",
    },
    {
      label: language === "no" ? "Kurstimer" : "Course Hours",
      value: 25,
      suffix: "+",
    },
    {
      label: language === "no" ? "Virtuell kapital" : "Virtual Capital",
      value: 1000000,
      suffix: " kr",
    },
    {
      label: language === "no" ? "Kundetilfredshet" : "Customer Satisfaction",
      value: 98,
      suffix: "%",
    },
  ];

  return (
    <section className="py-24 bg-[#050510] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 sm:gap-16">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center group"
            >
              <div className="text-4xl sm:text-5xl lg:text-7xl font-black text-white mb-4 tracking-tighter group-hover:text-blue-500 transition-colors duration-500">
                <Counter value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-500 uppercase tracking-widest">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SocialProof;
