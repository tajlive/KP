import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { Metadata } from "next";
import { AutopilotLaunchPad } from "@/features/autopilot/AutopilotLaunchPad";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNo = locale === "no";
  return {
    title: isNo ? "Aktiver AI Autopilot" : "Activate AI Autopilot",
    description: isNo
      ? "Start din autonome trading-agent med ett klikk."
      : "Start your autonomous trading agent with one click.",
  };
}

export default async function AutopilotLaunchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/dashboard/autopilot/launch`} />;
  }

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
