"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { TrustBoxCarousel } from "@/components/trustpilot/TrustBoxCarousel";
import { Star, ExternalLink } from "lucide-react";
import Link from "next/link";

interface TrustpilotSectionProps {
  className?: string;
}

export function TrustpilotSection({ className = "" }: TrustpilotSectionProps) {
  const t = useTranslations("trustpilot");

  return (
    <section className={`py-20 md:py-28 bg-[#050510] relative overflow-hidden ${className}`}>
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full mb-6">
            <Star className="w-4 h-4 text-green-500 fill-green-500" />
            <span className="text-sm font-medium text-green-400">
              {t("section.badge")}
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4">
            {t("section.title")}
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            {t("section.subtitle")}
          </p>
        </motion.div>

        {/* TrustBox Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <TrustBoxCarousel maxReviews={5} />
        </motion.div>

        {/* CTA Link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 text-center"
        >
          <Link
            href="https://www.trustpilot.com/review/klarpakke.no"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <span>{t("section.cta")}</span>
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
