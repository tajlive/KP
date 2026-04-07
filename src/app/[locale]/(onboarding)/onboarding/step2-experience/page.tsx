"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * DEPRECATED: Step 2 er nå slått sammen med Step 1.
 * Redirecter til ny step1-welcome som inneholder både velkomst og erfaring.
 */
export default function OnboardingStep2Deprecated() {
  const router = useRouter();

  useEffect(() => {
    // Redirect til ny step1 som har slått sammen velkomst + erfaring
    router.replace("/onboarding/step1-welcome");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}
