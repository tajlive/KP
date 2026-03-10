import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
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
    .eq("user_id", user.id)
    .single();

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
}
