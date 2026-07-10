import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Logo } from "@/shared/ui/Logo";
import { OnboardingTrustBar } from "@/features/onboarding/OnboardingTrustBar";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// 3-stegs onboarding flyt
const STEP_PATHS = [
  "/onboarding/step1-welcome",
  "/onboarding/step2-level",
  "/onboarding/step4-first-trade",
];

const STEP_LABELS = ["Velkommen", "Startkapital", "Første handel"];

function getCurrentStep(pathname: string): number {
  for (let i = 0; i < STEP_PATHS.length; i++) {
    if (pathname.includes(STEP_PATHS[i])) return i;
  }
  return 0;
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

  // Beregn nåværende steg
  const currentStep = getCurrentStep(""); // vil bli satt av client component
  const TOTAL_STEPS = 3;

  return (
    <div className="min-h-screen bg-[#0A0B0D]">
      {/* Top nav with logo */}
      <header className="border-b border-[#2A2D35] bg-[#15171B]/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/${locale}`}>
            <Logo className="h-7" />
          </Link>
        </div>
      </header>

      {/* Trust signals */}
      <OnboardingTrustBar />

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 md:pb-8">
        <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
