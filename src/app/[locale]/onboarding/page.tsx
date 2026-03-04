import { requireAuth } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingClient from "@/components/onboarding/OnboardingClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kom i gang | Klarpakke",
  description: "Sett opp din første trading strategi",
};

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);

  const supabase = await createClient();

  // Check if user has already completed onboarding
  // Try user_profiles first
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_completed, setup_completed_at")
    .eq("id", user.id)
    .single();

  const onboardingCompleted =
    profile?.onboarding_completed === true ||
    profile?.setup_completed_at !== null;

  if (onboardingCompleted) {
    // Also check profiles table as fallback
    const { data: fallbackProfile } = await supabase
      .from("profiles")
      .select("onboarding_completed, setup_completed_at")
      .eq("id", user.id)
      .single();

    const fallbackCompleted =
      fallbackProfile?.onboarding_completed === true ||
      fallbackProfile?.setup_completed_at !== null;

    if (fallbackCompleted) {
      // User has completed onboarding, redirect to dashboard
      redirect(`/${locale}/dashboard`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <OnboardingClient userId={user.id} />
    </div>
  );
}
