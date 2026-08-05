"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, Lock, Landmark } from "lucide-react";

export function OnboardingTrustBar() {
  const t = useTranslations("onboarding.trustBar");

  const items = [
    { icon: ShieldCheck, label: t("paperMoney") },
    { icon: Lock, label: t("noRealMoney") },
    { icon: Landmark, label: t("learnRiskFree") },
  ];

  return (
    <div className="bg-kp-bg-secondary border-b border-kp-border py-3">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {items.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 text-xs text-kp-text-secondary"
            >
              <Icon className="w-3.5 h-3.5 text-kp-success" />
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
