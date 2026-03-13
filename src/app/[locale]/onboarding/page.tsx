import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

// Fallback UI for når datahenting feiler
function OnboardingErrorFallback({ locale }: { locale: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-red-900/20 border border-red-700/50 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-200 mb-2">
          Kunne ikke laste onboarding
        </h2>
        <p className="text-red-300/80 mb-4">
          Det oppstod en feil ved lasting av din onboarding-status. Vennligst prøv igjen.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/${locale}/onboarding`}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Last inn på nytt
          </Link>
          <Link
            href={`/${locale}/login`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Tilbake til innlogging
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  let locale: string;
  
  try {
    const { locale: l } = await params;
    locale = l;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/${locale}/login?next=/onboarding`);
    }

    // Sjekk onboarding-status
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_step, onboarding_completed")
      .eq("user_id" as any, user.id)
      .single() as any;

    // Hvis fullført → dashboard
    if (profile?.onboarding_completed) {
      redirect(`/${locale}/dashboard`);
    }

    // Redirect til riktig steg basert på onboarding_step
    const step = profile?.onboarding_step || 0;
    const steps = [
      "/onboarding/step1-welcome",
      "/onboarding/step2-experience",
      "/onboarding/step3-trading-mode",
      "/onboarding/step4-binance",
      "/onboarding/step5-complete",
    ];

    redirect(`/${locale}${steps[step] || steps[0]}`);
  } catch (error) {
    console.error('Onboarding page error:', error);
    // Return fallback UI istedenfor å krasje
    // Hvis locale ikke er satt, bruk default
    return <OnboardingErrorFallback locale="no" />;
  }
}
