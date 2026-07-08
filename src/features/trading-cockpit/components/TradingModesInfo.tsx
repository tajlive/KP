"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Hand, Bot, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ArrowRight } from "lucide-react";

export function TradingModesInfo() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-blue-400/[0.04] to-transparent p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center size-8 rounded-xl bg-blue-400/10">
            <Hand className="size-4 text-blue-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Manuell handel</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
          Du bestemmer selv når du vil kjøpe og selge.
          Perfekt for å lære og prøve strategier.
        </p>
        <div className="flex items-center gap-1 text-[10px] text-blue-400/60 font-medium">
          <Sparkles className="size-3" />
          Du er her
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-emerald-400/[0.04] to-transparent p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center size-8 rounded-xl bg-emerald-400/10">
            <Bot className="size-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Auto-handel</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
          Boten handler automatisk basert på strategi.
          Sett opp én gang — så går det av seg selv.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-3 text-xs rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.08]"
          onClick={() => router.push("/dashboard/auto-trade")}
        >
          <Bot className="size-3 mr-1" />
          Åpne auto-handel
          <ArrowRight className="size-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
