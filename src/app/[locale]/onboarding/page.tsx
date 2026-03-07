import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingRoot() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/innlogging");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_step, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  const step = profile?.onboarding_step || 0;

  // Redirect to correct step
  if (step === 0 || step === 1) {
    redirect("/onboarding/step1-welcome");
  }
  if (step === 2) {
    redirect("/onboarding/step2-experience");
  }
  if (step === 3) {
    redirect("/onboarding/step3-trading-mode");
  }
  if (step === 4) {
    redirect("/onboarding/step4-binance");
  }
  if (step === 5) {
    redirect("/onboarding/step5-complete");
  }

  // Fallback
  redirect("/onboarding/step1-welcome");
}
