"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Crown, Gift, Coins, Users, Zap, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

const ADMIN_EMAIL = "tomarnejensen@gmail.com";
const TIERS = ["student", "bachelor", "master", "phd", "professor"] as const;

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetEmail, setTargetEmail] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("master");
  const [paperAmount, setPaperAmount] = useState("10000");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email === ADMIN_EMAIL) {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">🔒 Ingen tilgang</h1>
          <p className="text-zinc-500">Denne siden er kun for admin.</p>
        </div>
      </div>
    );
  }

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setActionLoading(action);
    try {
      await fn();
      toast.success(`${action} fullført!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Noe gikk galt");
    }
    setActionLoading(null);
  };

  const giveTier = async () => {
    if (!targetEmail) return;
    const res = await fetch("/api/admin/give-tier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, tier: selectedTier }),
    });
    if (!res.ok) throw new Error(await res.text());
  };

  const givePaperMoney = async () => {
    if (!targetEmail) return;
    const res = await fetch("/api/admin/give-paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, amount: parseInt(paperAmount) }),
    });
    if (!res.ok) throw new Error(await res.text());
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-violet-500/5 via-transparent to-amber-500/5">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-amber-500 shadow-lg shadow-violet-500/20">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-zinc-500">Kun synlig for {ADMIN_EMAIL}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* User input */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <label htmlFor="targetEmail" className="text-sm font-medium text-zinc-400 mb-3 block">Bruker (epost)</label>
          <Input
            id="targetEmail"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="epost@example.com"
            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 rounded-xl h-12 text-base"
          />
        </div>

        {/* Give Tier */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-500/[0.04] to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center size-10 rounded-xl bg-violet-500/10">
              <Gift className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gi bort tier</h2>
              <p className="text-sm text-zinc-500">Oppgrader eller nedgrader en brukers abonnement</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-4">
            {TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                  selectedTier === tier
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                    : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]"
                }`}
              >
                {tier === "phd" ? "PhD" : tier}
              </button>
            ))}
          </div>

          <Button
            onClick={() => handleAction("Gi tier", giveTier)}
            disabled={!targetEmail || !!actionLoading}
            className="w-full h-12 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-semibold"
          >
            {actionLoading === "Gi tier" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Gift className="w-4 h-4 mr-2" />
            )}
            Gi {selectedTier} til {targetEmail || "..."}
          </Button>
        </div>

        {/* Give Paper Money */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-amber-500/[0.04] to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center size-10 rounded-xl bg-amber-500/10">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gi lekepenger</h2>
              <p className="text-sm text-zinc-500">Fyll på paper account med virtuelle kroner</p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Input
              value={paperAmount}
              onChange={(e) => setPaperAmount(e.target.value)}
              type="number"
              className="bg-white/[0.04] border-white/[0.08] text-white text-2xl font-bold text-center rounded-xl h-16"
            />
            <span className="flex items-center text-zinc-500 font-medium">kr</span>
          </div>

          <div className="flex gap-2 mb-4">
            {["5000", "25000", "100000", "500000"].map((amt) => (
              <button
                key={amt}
                onClick={() => setPaperAmount(amt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  paperAmount === amt
                    ? "bg-amber-500 text-white"
                    : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08]"
                }`}
              >
                {parseInt(amt).toLocaleString("no")} kr
              </button>
            ))}
          </div>

          <Button
            onClick={() => handleAction("Gi lekepenger", givePaperMoney)}
            disabled={!targetEmail || !!actionLoading}
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {actionLoading === "Gi lekepenger" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Coins className="w-4 h-4 mr-2" />
            )}
            Gi {parseInt(paperAmount).toLocaleString("no")} kr til {targetEmail || "..."}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <Users className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">—</p>
            <p className="text-xs text-zinc-500 mt-1">Brukere</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <Zap className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">—</p>
            <p className="text-xs text-zinc-500 mt-1">Handler i dag</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <Sparkles className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">∞</p>
            <p className="text-xs text-zinc-500 mt-1">Din tier</p>
          </div>
        </div>
      </div>
    </div>
  );
}
