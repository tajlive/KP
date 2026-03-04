"use client";

import SpeedOnboarding from "@/components/onboarding/SpeedOnboarding";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function ClientOnboarding() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            Kom i gang
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Velg profil og start trading på under 60 sekunder
          </p>
        </div>

        <SpeedOnboarding
          onComplete={() => {
            router.push(`/${locale}/dashboard/auto-trade`);
          }}
        />
      </div>
    </div>
  );
}
