import { requireAuth } from "@/lib/auth-guard";
import { Metadata } from "next";
import { TradingInterface } from "@/components/trading/TradingInterface";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isNo = locale === "no";
  return {
    title: isNo ? "Handle" : "Trade",
    description: isNo
      ? "Kjøp og selg kryptovaluta med lekepenger."
      : "Buy and sell crypto with virtual money.",
  };
}

export default async function TradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireAuth(locale);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("paper_balance, tier")
    .eq("id", user.id)
    .single();

  return (
    <TradingInterface
      userId={user.id}
      locale={locale}
      paperBalance={profile?.paper_balance ?? 100000}
      tier={profile?.tier ?? "student"}
    />
  );
}
