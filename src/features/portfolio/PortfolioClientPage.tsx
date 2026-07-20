"use client";

import * as React from "react";
import Link from "next/link";
import { Wallet, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { useLocale, useTranslations } from "next-intl";
import { formatNOK } from "@/lib/format/currency";

export default function PortfolioClientPage() {
  const locale = useLocale();
  const t = useTranslations("dashboard.portfolioPage");
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paperBalance, setPaperBalance] = React.useState<number>(100000);
  const [wallets, setWallets] = React.useState<Array<{ id: string; currency: string; balance: number }> | null>(null);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("auth_required");
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        // Timeout guard — prevent infinite loading
        const timeout = setTimeout(() => { setLoading(false); setError("Tidsavbrudd — prøv igjen"); }, 15000);
        const supabase = (await import("@/lib/supabase/client")).getSupabaseClient();
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("paper_balance")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          setPaperBalance(Number(profile.paper_balance ?? 100000));
        }
        const { data: walletData } = await supabase
          .from("wallets")
          .select("id, currency, balance")
          .eq("user_id", user.id)
          .gt("balance", 0);
        if (walletData) setWallets(walletData);
        clearTimeout(timeout);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Laster portefølje...</div>
      </div>
    );
  }

  if (error === "auth_required") {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
        <Wallet className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400">Du må logge inn for å se porteføljen</p>
        <Link href={`/${locale}/login?next=/${locale}/dashboard/portfolio`} className="px-6 py-2 bg-[#0066FF] text-white rounded-lg font-bold">
          Logg inn
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-400">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-700 text-white rounded-lg">
          Prøv igjen
        </button>
      </div>
    );
  }

  const displayAssets = [
    {
      type: "paper" as const,
      id: "paper-balance",
      currency: "Lekepenger",
      balance: paperBalance,
      label: "Tilgjengelig kapital",
    },
    ...(wallets || []).map((w) => ({
      type: "wallet" as const,
      id: w.id,
      currency: w.currency,
      balance: Number(w.balance),
      label: w.currency === "NOK" ? "Tilgjengelig" : "Beholdning",
    })),
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            <p className="text-slate-400 text-sm">{t("subtitle")}</p>
          </div>
        </div>

        {displayAssets.length === 0 ? (
          <div className="text-center p-16 bg-[#0A0D12] rounded-2xl border-2 border-dashed border-[#1E2530]">
            <div className="w-16 h-16 bg-[#1E2530] rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t("noAssets.title")}</h3>
            <p className="text-slate-500 max-w-xs mx-auto mb-6">{t("noAssets.description")}</p>
            <Link
              href={`/${locale}/trade`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0066FF] hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
            >
              {t("noAssets.button")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayAssets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-2xl p-6 flex items-center justify-between bg-[#0A0D12] border border-[#1E2530] hover:border-[#0066FF]/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0066FF]/10">
                    <Wallet className="w-6 h-6 text-[#0066FF]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{asset.currency}</h3>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{asset.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">{formatNOK(asset.balance, { fractionDigits: 2 })}</p>
                  <p className="text-slate-500 text-xs font-medium">Saldo</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
