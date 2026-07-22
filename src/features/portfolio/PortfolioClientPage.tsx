"use client";

import * as React from "react";
import Link from "next/link";
import { Wallet, ArrowRight, AlertCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatNOK } from "@/lib/format/currency";

export default function PortfolioClientPage() {
  const locale = useLocale();
  const t = useTranslations("dashboard.portfolioPage");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paperBalance, setPaperBalance] = React.useState<number>(100000);
  const [wallets, setWallets] = React.useState<Array<{ id: string; currency: string; balance: number }> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const timeout = setTimeout(() => { setLoading(false); setError("Tidsavbrudd — prøv igjen"); }, 10000);

        // Fetch profile via API (independent of AuthContext — avoids Supabase client hang)
        const res = await fetch(`/api/user/profile`);
        if (res.status === 401) {
          clearTimeout(timeout);
          if (!cancelled) { setError("auth_required"); setLoading(false); }
          return;
        }
        const data = await res.json();

        if (data.ok && data.profile) {
          setPaperBalance(Number(data.profile.paper_balance ?? 100000));
        }
        if (data.wallets) {
          setWallets(data.wallets);
        }

        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) { setLoading(false); setError(e instanceof Error ? e.message : "Kunne ikke laste portefølje"); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Laster portefølje...</div>
      </div>
    );
  }

  if (error === "auth_required") {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Logg inn for å se portefølje</h2>
          <Link href={`/${locale}/login`} className="text-[#0066FF] hover:underline">
            Gå til innlogging
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-white">Det oppstod en feil</h2>
        <p className="text-slate-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-[#0066FF] text-white rounded-lg font-bold"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Saldo-kort */}
        <div className="bg-gradient-to-br from-[#1A1D2E] to-[#0F1225] border border-[#2A2D3E] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Papirhandel-balanse</h2>
            <Wallet className="w-5 h-5 text-[#0066FF]" />
          </div>
          <p className="text-3xl font-bold text-white">{formatNOK(paperBalance)}</p>
          <Link
            href="/trade"
            className="inline-flex items-center gap-2 mt-4 text-sm text-[#0066FF] hover:underline"
          >
            Gå til handel <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Wallet-kort */}
        {wallets && wallets.length > 0 && (
          <div className="bg-[#1A1D2E] border border-[#2A2D3E] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Wallet</h2>
            <div className="space-y-3">
              {wallets.map((w) => (
                <div key={w.id} className="flex justify-between items-center py-2 border-b border-[#2A2D3E] last:border-0">
                  <span className="text-slate-300">{w.currency}</span>
                  <span className="text-white font-mono">{formatNOK(w.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!wallets || wallets.length === 0) && (
          <div className="bg-[#1A1D2E] border border-[#2A2D3E] rounded-2xl p-6 text-center">
            <Wallet className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400">Ingen wallet-data</p>
          </div>
        )}
      </div>
    </div>
  );
}
