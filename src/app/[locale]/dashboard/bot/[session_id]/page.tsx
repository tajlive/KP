import { requireAuth } from "@/lib/auth-guard";
import { Metadata } from "next";
import { BotDetailView } from "@/components/auto-trade/BotDetailView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Bot detaljer" };
}

export default async function BotDetailPage({
  params,
}: {
  params: Promise<{ locale: string; session_id: string }>;
}) {
  const { locale, session_id } = await params;
  const { supabase, user } = await requireAuth(locale);

  const [sessionRes, tradesRes] = await Promise.all([
    supabase
      .from("trading_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("trades")
      .select("*")
      .eq("session_id", session_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!sessionRes.data) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#5E6478]">Bot ikke funnet.</p>
      </div>
    );
  }

  return (
    <BotDetailView
      session={sessionRes.data}
      trades={tradesRes.data ?? []}
      locale={locale}
    />
  );
}
