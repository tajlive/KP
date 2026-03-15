"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import InteractiveOnboardingWizard from "./InteractiveOnboardingWizard";

interface OnboardingClientProps {
  userId: string;
}

export default function OnboardingClient({ userId }: OnboardingClientProps) {
  const router = useRouter();
  const { locale } = useParams();
  const t = useTranslations("onboarding");
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    // Redirect to dashboard after completion
    router.push(`/${locale}/dashboard`);
  }, [router, locale]);

  // Show a transition screen if complete
  if (isComplete) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">{t("complete.title")}</h2>
          <p className="text-slate-400">{t("complete.redirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <InteractiveOnboardingWizard
      userId={userId}
      onComplete={handleComplete}
    />
  );
}
