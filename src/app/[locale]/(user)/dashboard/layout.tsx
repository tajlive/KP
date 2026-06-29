/**
 * Server layout wrapper for /dashboard/*.
 * Force dynamic so Supabase client is never created at build time (avoids
 * missing-env failures during prerender/build).
 */
export const dynamic = "force-dynamic";

import DashboardClientLayout from "./DashboardClientLayout";
import { requireAuth } from "@/lib/auth-guard";

export const runtime = 'nodejs';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireAuth(locale).catch(() => ({
    supabase: null,
    user: null,
  }));

  let initialTradingMode: "paper" | "live" = "paper";
  if (user && supabase) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("preferred_trading_mode")
      .eq("id", user.id)
      .single();
    initialTradingMode =
      profile?.preferred_trading_mode === "live" ? "live" : "paper";
  }

  return (
    <DashboardClientLayout initialTradingMode={initialTradingMode}>
      {children}
    </DashboardClientLayout>
  );
}

export { generateMetadata } from "./page";
