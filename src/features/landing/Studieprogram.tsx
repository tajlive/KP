"use client";

import { motion } from "framer-motion";
import { Card } from "@/shared/ui/card";
import { Check, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export function Studieprogram() {
  const t = useTranslations("studieprogram");
  const locale = useLocale();

  const tiers = [
    {
      key: "student",
      color: "from-gray-500 to-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "#6B7280",
    },
    {
      key: "bachelor",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "#2563EB",
      highlight: true,
    },
    {
      key: "master",
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "#10b981",
    },
    {
      key: "phd",
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "#EA580C",
    },
    {
      key: "professor",
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "#059669",
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <section
      id="studieprogram"
      className="py-16 sm:py-24 bg-slate-50 relative overflow-hidden"
    >
      {/* Bakgrunnsdekorasjon */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-gray-300 to-transparent" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-40 left-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-96 h-96 bg-emerald-400 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Seksjonsoverskrift */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
            <GraduationCap className="w-4 h-4" />
            {t("sectionTitle")}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-gray-600">{t("description")}</p>
        </motion.div>

        {/* Studieprogram grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {tiers.map((tier) => {
            const tierData = {
              name: t(`tiers.${tier.key}.name`),
              price: t(`tiers.${tier.key}.price`),
              period: t(`tiers.${tier.key}.period`),
              description: t(`tiers.${tier.key}.description`),
              badge: t(`tiers.${tier.key}.badge`),
              cta: t(`tiers.${tier.key}.cta`),
              requirement: t(`tiers.${tier.key}.requirement`),
            };

            let features: string[] = [];
            try {
              features =
                (t.raw(`tiers.${tier.key}.features`) as string[]) ?? [];
            } catch {
              features = [];
            }

            return (
              <motion.div key={tier.key} variants={itemVariants}>
                <Card
                  className={`relative h-full flex flex-col p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                    tier.highlight
                      ? "border-2 border-blue-500 shadow-xl scale-105 lg:scale-110"
                      : `border ${tier.borderColor}`
                  } ${tier.bgColor}`}
                >
                  {/* Badge */}
                  {tierData.badge && tierData.badge !== "null" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-linear-to-r ${tier.color}`}
                      >
                        {tierData.badge === "POPULÆR" ||
                        tierData.badge === "POPULAR" ? (
                          <Sparkles className="w-3 h-3" />
                        ) : null}
                        {tierData.badge}
                      </span>
                    </div>
                  )}

                  {/* Tier navn */}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      {tierData.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {tierData.description}
                    </p>
                  </div>

                  {/* Pris */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl sm:text-5xl font-bold text-gray-900">
                        {tierData.price}
                      </span>
                    </div>
                    <span className="text-gray-500">{tierData.period}</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-grow">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check
                          className="w-5 h-5 shrink-0 mt-0.5"
                          style={{ color: tier.textColor }}
                        />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Krav */}
                  {tierData.requirement && tierData.requirement !== "null" && (
                    <div className="mb-4 p-3 bg-white/50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500">
                        {tierData.requirement}
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    href={`/${locale}/signup`}
                    className={`block w-full text-center py-4 px-6 rounded-lg font-semibold transition-all duration-200 ${
                      tier.highlight
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                        : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                    }`}
                  >
                    {tierData.cta}
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-500 mt-12"
        >
          {t("disclaimer")}
        </motion.p>
      </div>
    </section>
  );
}
