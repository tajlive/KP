"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Brain,
  Coins,
  Globe,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

const FEATURES = [
  { icon: BarChart3, i18nKey: "realData" },
  { icon: Brain, i18nKey: "aiAgents" },
  { icon: Coins, i18nKey: "playMoney" },
  { icon: Globe, i18nKey: "norwegian" },
  { icon: ShieldCheck, i18nKey: "riskFree" },
  { icon: UserCheck, i18nKey: "noKYC" },
];

export default function FeaturesSection() {
  const t = useTranslations("landing.features");
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-12 sm:py-20 bg-kp-bg-primary"
      id="funksjoner"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-heading-sm sm:text-heading font-black text-kp-text-primary mb-4">
            {t("title")}
          </h2>
          <p className="text-body text-kp-text-secondary max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.i18nKey}
                className={`rounded-2xl border border-kp-border bg-kp-bg-card p-6 transition-all duration-500 ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-center size-12 rounded-xl bg-kp-brand/10 mb-4">
                  <Icon className="w-6 h-6 text-kp-brand" />
                </div>
                <h3 className="text-lg font-bold text-kp-text-primary mb-2">
                  {t(`${feature.i18nKey}.title`)}
                </h3>
                <p className="text-sm text-kp-text-secondary leading-relaxed">
                  {t(`${feature.i18nKey}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
