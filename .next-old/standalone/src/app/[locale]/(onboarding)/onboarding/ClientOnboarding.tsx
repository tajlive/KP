"use client";

import SpeedOnboarding from "@/features/onboarding/SpeedOnboarding";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

export default function ClientOnboarding() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-linear-to-b from-kp-bg-primary to-kp-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-kp-brand-subtle border border-kp-border-brand mb-3">
            <Zap className="w-8 h-8 text-kp-brand" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-kp-text-primary">
            Kom i gang
          </h1>
          <p className="text-kp-text-secondary mt-2">
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
