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

/** Hent topp-avkastning fra paper_accounts (samme kilde som /api/leaderboard). */
async function getTopReturn(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("paper_accounts")
      .select("current_balance")
      .gt("current_balance", 100_000)
      .order("current_balance", { ascending: false })
      .limit(1);
    const balance = Number(data?.[0]?.current_balance ?? 100_000);
    return Math.round(((balance - 100_000) / 100_000) * 100);
  } catch {
    return 316; // fallback
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const topReturn = await getTopReturn();

  return (
    <main>
      <HeroSection topReturn={topReturn} />
      <TradingModesExplainer />
    </main>
  );
}
