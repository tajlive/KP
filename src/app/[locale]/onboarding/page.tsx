import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileOnboarding } from "@/lib/supabase/helpers";
import { getTranslations } from "next-intl/server";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

// Fallback UI for når datahenting feiler (brukervennlig med oversatt tekst)
function OnboardingErrorFallback({
  locale,
  title,
  message,
  retry,
  backToLogin,
}: {
  locale: string;
  title: string;
  message: string;
  retry: string;
  backToLogin: string;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-red-900/20 border border-red-700/50 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-200 mb-2">{title}</h2>
        <p className="text-red-300/80 mb-4">{message}</p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/${locale}/onboarding`}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            {retry}
          </Link>
          <Link
            href={`/${locale}/login`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {backToLogin}
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
  let locale = "no";
  try {
    const { locale: l } = await params;
    locale = l;
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/${locale}/login?next=/onboarding`);
    }

    const { data: profile } = await getUserProfileOnboarding(supabase, user.id);

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
    // Next.js redirect() throws NEXT_REDIRECT – må rethrow så framework håndterer den
    if (error && typeof error === "object" && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Onboarding page error:", error);
    const t = await getTranslations("onboarding");
    return (
      <OnboardingErrorFallback
        locale={locale}
        title={t("error.title")}
        message={t("error.message")}
        retry={t("error.retry")}
        backToLogin={t("error.backToLogin")}
      />
    );
  }
}
