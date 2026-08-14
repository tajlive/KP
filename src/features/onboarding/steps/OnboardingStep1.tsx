"use client";

import { m } from "framer-motion";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useTranslations } from "next-intl";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

interface OnboardingStep1Props {
  onNext: () => void;
}

export function OnboardingStep1({ onNext }: OnboardingStep1Props) {
  const t = useTranslations("onboarding");
  const { skipToApp, isPriority } = useOnboardingStore();

  const handleNext = () => {
    navigator.vibrate?.(10);
    onNext();
  };

  const handleSkip = () => {
    navigator.vibrate?.(10);
    skipToApp();
  };

  return (
    <m.div
      className="flex h-full flex-col justify-between px-5 py-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col gap-6 pt-8">
        <m.div variants={itemVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb]">
              <span className="text-sm font-bold text-white">K</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              Klarpakke
            </span>
          </div>
          {isPriority && (
            <m.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-500 uppercase tracking-widest shadow-lg shadow-amber-500/5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              VIP Priority Welcome
            </m.div>
          )}
        </m.div>

        <m.div variants={itemVariants} className="flex flex-col gap-3">
          <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight text-white">
            {t("mobile.step1.title")}
          </h1>
          <p className="text-base leading-relaxed text-white/60">
            {t("mobile.step1.description")}
          </p>
        </m.div>

        <m.div
          variants={itemVariants}
          className="flex flex-wrap gap-2"
          aria-label={t("mobile.step1.badgesAriaLabel")}
        >
          {[
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m9 12 2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
              label: t("mobile.step1.badges.secure"),
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M12 6v6l4 2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              label: t("mobile.step1.badges.finanstilsynet"),
            },
            {
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M3 9h18M9 21V9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              label: t("mobile.step1.badges.noHiddenFees"),
            },
          ].map((badge, index) => (
            <m.div
              key={badge.label}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/70"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              {badge.icon}
              {badge.label}
            </m.div>
          ))}
        </m.div>
      </div>

      <m.div
        variants={itemVariants}
        className="flex flex-col gap-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <m.button
          onClick={handleNext}
          className="relative w-full overflow-hidden rounded-2xl bg-[#2563eb] py-4 text-base font-semibold text-white"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <m.span
            className="absolute inset-0 bg-white/20"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.5 }}
          />
          <span className="relative">{t("mobile.step1.cta")}</span>
        </m.button>

        <m.button
          onClick={handleSkip}
          className="w-full py-3 text-sm font-medium text-white/40"
          whileHover={{ color: "rgba(255,255,255,0.6)" }}
          whileTap={{ scale: 0.98 }}
        >
          {t("mobile.step1.skip")}
        </m.button>
      </m.div>
    </m.div>
  );
}
