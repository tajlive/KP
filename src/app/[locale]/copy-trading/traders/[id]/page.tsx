import { requireAuth } from "@/lib/auth-guard";
import CreatorProfileClient from "@/components/copy-trading/CreatorProfileClient";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface TraderProfilePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: TraderProfilePageProps) {
  const { id, locale: _locale } = await params;
  const supabase = await createClient();

  // Try to get trader info from leaderboard_bots first
  const { data: trader } = await supabase
    .from("leaderboard_bots")
    .select("display_name")
    .eq("user_id", id)
    .single();

  if (!trader) {
    // Fallback to profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", id)
      .single();

    return {
      title: profile?.display_name
        ? `${profile.display_name} | Kopier Trading`
        : "Trader Profil | Klarpakke",
    };
  }

  return {
    title: `${trader.display_name} | Kopier Trading`,
  };
}

export default async function TraderProfilePage({ params }: TraderProfilePageProps) {
  const { id, locale: _locale } = await params;
  await requireAuth(_locale);

  const supabase = await createClient();

  // Verify trader exists
  const { data: trader } = await supabase
    .from("leaderboard_bots")
    .select("user_id")
    .eq("user_id", id)
    .single();

  if (!trader) {
    // Try profiles as fallback
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .single();

    if (!profile) {
      notFound();
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <CreatorProfileClient traderId={id} />
    </div>
  );
}
