import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import CreatorProfileClient from "@/features/copy-trading/CreatorProfileClient";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export const runtime = 'edge';

export const dynamic = "force-dynamic";

interface TraderProfilePageProps {
  params: Promise<{ locale: string; id: string }>;
}

// Fallback UI for når datahenting feiler
function TraderErrorFallback({ locale }: { locale: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-red-900/20 border border-red-700/50 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-200 mb-2">
          Kunne ikke laste trader-profil
        </h2>
        <p className="text-red-300/80 mb-4">
          Det oppstod en feil ved lasting av trader-informasjon. Vennligst prøv igjen.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/${locale}/copy-trading`}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Tilbake til copy trading
          </Link>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: TraderProfilePageProps) {
  try {
    const { id, locale: _locale } = await params;
    const supabase = await createClient();

    // Try to get trader info from leaderboard_bots first
    const { data: trader } = await supabase
      .from("leaderboard_bots")
      .select("display_name")
      .eq("id", id)
      .single();

    if (!trader) {
      // Fallback to profiles
      const { data: profile } = await supabase
        .from("user_profiles")
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
  } catch (error) {
    console.error('Trader metadata error:', error);
    return {
      title: "Trader Profil | Klarpakke",
    };
  }
}

export default async function TraderProfilePage({ params }: TraderProfilePageProps) {
  try {
    const { id, locale: _locale } = await params;
    const { user } = await requireAuth(_locale);
    if (!user) {
      return <LoginRequired next={`/${_locale}/copy-trading/traders/${id}`} />;
    }

    const supabase = await createClient();

    // Verify trader exists
    const { data: trader } = await supabase
      .from("leaderboard_bots")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!trader) {
      // Try profiles as fallback
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("user_id")
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
  } catch (error) {
    console.error('Trader profile page error:', error);
    const { locale: _locale } = await params;
    // Return fallback UI istedenfor å krasje
    return <TraderErrorFallback locale={_locale} />;
  }
}
