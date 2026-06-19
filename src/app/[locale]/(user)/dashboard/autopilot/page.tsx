import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { Metadata } from "next";
import { AutopilotLaunchPad } from "@/features/autopilot/AutopilotLaunchPad";
import { AutopilotMonitor } from "@/features/autopilot/AutopilotMonitor";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNo = locale === "no";
  return {
    title: isNo ? "Auto-handel" : "Auto Trading",
    description: isNo
      ? "La AI trade for deg — fullstendig automatisk."
      : "Let AI trade for you — fully automatic.",
  };
}

export default async function AutopilotPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/dashboard/autopilot`} />;
  }

  // Check if user already has an active autopilot
  const { data: autopilot } = await supabase
    .from("ai_autopilot_configs")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasActiveAutopilot = autopilot?.status === "active" || autopilot?.status === "paused";

  if (hasActiveAutopilot) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <AutopilotMonitor locale={locale} />
      </div>
    );
  }

  // Fetch profile for paper balance suggestion
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("paper_balance")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <AutopilotLaunchPad
        userId={user.id}
        locale={locale}
        paperBalance={profile?.paper_balance ?? undefined}
      />
    </div>
  );
}
