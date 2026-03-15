import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Logo } from "@/components/Logo";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function OnboardingLayout({
  children,
  params,
}: OnboardingLayoutProps) {
  const { locale } = await params;
  const t = await getTranslations("onboarding");
  const supabase = await createClient();

  // Sjekk autentisering
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/onboarding`);
  }

  // Hent onboarding-status
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_step, onboarding_completed")
    .eq("user_id" as unknown, user.id)
    .single() as unknown;

  // Hvis onboarding allerede er fullført → dashboard
  if (profile?.onboarding_completed) {
    redirect(`/${locale}/dashboard`);
  }

  // Beregn nåværende steg fra URL
  // (Dette er Server Component, så vi bruker enkel logikk)
  const currentStep = profile?.onboarding_step || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/${locale}`}>
            <Logo className="h-8" />
          </Link>
          <div className="text-sm text-slate-500">
            {t("stepIndicator", { current: currentStep + 1, total: 5 })}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white dark:bg-slate-900">
        <div className="max-w-2xl mx-auto">
          <div className="h-1 bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
