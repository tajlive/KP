import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Logo } from "@/shared/ui/Logo";

export const runtime = 'nodejs';

// Krever Supabase env; unngå statisk generering ved build
export const dynamic = "force-dynamic";

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
  const supabase = await createServerClient();

  // Sjekk autentisering
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/onboarding`)}`,
    );
  }

  // Hent onboarding-status
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_step, onboarding_completed")
    .eq("id", user.id)
    .single();

  // Hvis onboarding allerede er fullført → dashboard
  if (profile?.onboarding_completed) {
    redirect(`/${locale}/dashboard`);
  }

  // Beregn nåværende steg fra URL
  // 5-stegs flyt: DB step 0-4 mappes direkte til visning
  const dbStep = profile?.onboarding_step || 0;
  const TOTAL_STEPS = 5;
  const displayStep = Math.min(dbStep, TOTAL_STEPS - 1);

  return (
    <div className="min-h-screen bg-[var(--kp-bg-primary)]">
      {/* Header */}
      <header className="bg-[var(--kp-bg-secondary)] border-b border-[var(--kp-border)]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/${locale}`}>
            <Logo className="h-8" />
          </Link>
          <div className="text-sm text-[var(--kp-text-muted)]">
            {t("stepIndicator", { current: displayStep + 1, total: TOTAL_STEPS })}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-[var(--kp-bg-secondary)]">
        <div className="max-w-2xl mx-auto">
          <div className="h-1 bg-[var(--kp-bg-tertiary)]">
            <div
              className="h-full bg-[var(--kp-ai)] transition-all duration-500"
              style={{ width: `${((displayStep + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[var(--kp-bg-secondary)] rounded-2xl shadow-sm border border-[var(--kp-border)] p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
