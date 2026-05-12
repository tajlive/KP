import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BotDetailView } from "@/features/auto-trade/BotDetailView";

export const runtime = 'edge';

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "autopilot" });
  return { title: t("title") };
}

export default async function BotDetailPage({
  params,
}: {
  params: Promise<{ locale: string; session_id: string }>;
}) {
  const { locale, session_id } = await params;
  const { supabase, user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/dashboard/bot/${session_id}`} />;
  }

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
        <p className="text-[#5E6478]">Session not found.</p>
      </div>
    );
  }

  const session = sessionRes.data;
  const strategyConfig =
    session.strategy_config &&
    typeof session.strategy_config === "object" &&
    !Array.isArray(session.strategy_config)
      ? (session.strategy_config as Record<string, unknown>)
      : undefined;
  return (
    <BotDetailView
      session={
        { ...session, strategy_config: strategyConfig } as Parameters<
          typeof BotDetailView
        >[0]["session"]
      }
      trades={(tradesRes.data ?? []) as never}
      locale={locale}
    />
  );
}
