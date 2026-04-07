"use client";

import SpeedOnboarding from "@/features/onboarding/SpeedOnboarding";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

export default function ClientOnboarding() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-3">
            <Zap className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            Kom i gang
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Velg profil og start trading på under 60 sekunder
          </p>
        </div>

        <SpeedOnboarding
          onComplete={() => {
            router.push(`/${locale}/dashboard`);
          }}
        />
      </div>
    </div>
  );
}
