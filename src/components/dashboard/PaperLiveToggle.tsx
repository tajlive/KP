"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PaperLiveToggleProps {
  mode: "paper" | "live";
  onToggle: (mode: "paper" | "live") => void;
  tier: string;
  locale: string;
}

export function PaperLiveToggle({
  mode,
  onToggle,
  tier,
  locale,
}: PaperLiveToggleProps) {
  const [showUpgradeHint, setShowUpgradeHint] = useState(false);

  return (
    <div className="flex flex-col items-start">
      <div className="inline-flex items-center bg-[#F1F3F9] rounded-full p-1">
        <button
          onClick={() => {
            onToggle("paper");
            setShowUpgradeHint(false);
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            mode === "paper"
              ? "bg-white text-[#1A1D26] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              : "text-[#5E6478] hover:text-[#1A1D26]"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
          {locale === "no" ? "Lekepenger" : "Virtual"}
        </button>
        <button
          onClick={() => {
            if (tier === "student") {
              setShowUpgradeHint(true);
              return;
            }
            setShowUpgradeHint(false);
            onToggle("live");
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            mode === "live"
              ? "bg-white text-[#1A1D26] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              : "text-[#5E6478] hover:text-[#1A1D26]",
            tier === "student" && "opacity-50 cursor-not-allowed"
          )}
        >
          {tier === "student" && <Lock className="w-3.5 h-3.5" />}
          {locale === "no" ? "Ekte krypto" : "Live"}
        </button>
      </div>
      {showUpgradeHint && tier === "student" && (
        <p className="mt-1.5 text-xs text-slate-500">
          <Link
            href={`/${locale}/priser`}
            className="text-[#0052FF] hover:underline"
          >
            {locale === "no"
              ? "Oppgrader til Bachelor for ekte trading"
              : "Upgrade to Bachelor for live trading"}
          </Link>
        </p>
      )}
    </div>
  );
}
