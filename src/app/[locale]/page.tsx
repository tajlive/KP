import { setRequestLocale } from "next-intl/server";
import HeroSection from "@/components/landing/HeroSection";
import { TradingModesExplainer } from "@/components/landing/TradingModesExplainer";
import { generateMarketingMetadata } from "@/shared/ui/marketing";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateMarketingMetadata({
    locale,
    namespace: "landing",
    titleKey: "metadata.title",
    descriptionKey: "metadata.description",
    pathname: "",
  });
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

// Samme svarteliste som /api/leaderboard — FACT-AUDIT-verifisert
const BOT_NAMES = new Set([
  "Anne Mo", "Ingrid Sol", "Lars Vik", "Kari Aas", "Marte Hav",
  "Per Berg", "Bjørn Fjell", "Trond Dal", "Silje Lund", "Ola Nordmann",
]);

function isTestOrBot(name: string | null): boolean {
  if (!name) return true;
  if (BOT_NAMES.has(name)) return true;
  const lower = name.toLowerCase();
  return (
    lower.includes("tom+") || lower.includes("+sim") || lower.includes("+verify") ||
    lower.includes("direct test") || lower.includes("viking trader") ||
    (lower.includes("test") && lower.length < 20) || lower === "tom"
  );
}

/** Hent topp-avkastning — sorterer på return_pct, IKKE current_balance. Terskel ≥20%. */
async function getTopReturn(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { data: accounts } = await supabase
      .from("paper_accounts")
      .select("user_id, current_balance, initial_balance")
      .gt("initial_balance", 0)
      .limit(100);

    if (!accounts || accounts.length === 0) return null;

    const userIds = accounts.map((a) => a.user_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    const { data: stats } = await supabase
      .from("trading_stats")
      .select("user_id, total_trades")
      .in("user_id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const statsMap = new Map((stats ?? []).map((s) => [s.user_id, s]));

    let bestPct = 0;
    for (const acc of accounts) {
      const uid = acc.user_id;
      if (!uid || uid.includes("0000-0000")) continue;

      const name = profileMap.get(uid)?.display_name ?? null;
      if (isTestOrBot(name)) continue;

      const trades = statsMap.get(uid)?.total_trades ?? 0;
      if (trades < 1) continue;

      const current = Number(acc.current_balance);
      const initial = Number(acc.initial_balance);
      if (initial <= 0) continue;

      const pct = Math.round(((current - initial) / initial) * 100);
      if (pct > bestPct) bestPct = pct;
    }

    // Terskel: vis kun hvis den er reell og verdt å reklamere med
    return bestPct >= 20 ? bestPct : null;
  } catch {
    return null;
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const topReturn = await getTopReturn();

  return (
    <main>
      <HeroSection topReturn={topReturn ?? undefined} />
      <TradingModesExplainer />
    </main>
  );
}
