"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Brain, TrendingUp, Shield, Clock } from "lucide-react";

/**
 * PilotExplanation — forklarer hvordan Pilot fungerer for nybegynnere.
 * Vises på dashboard for aktive tradere.
 */
export function PilotExplanation() {
  const t = useTranslations("dashboard.pilotExplanation");
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card border border-[#1E2530] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#151B24] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0052FF]/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-[#6FA3FF]" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">
              {t("title")}
            </h3>
            <p className="text-xs text-slate-500">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#1E2530] pt-4">
          {/* Steg 1: Hva boten gjør */}
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t("step1Title")}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t("step1Desc")}
              </p>
            </div>
          </div>

          {/* Steg 2: Hvordan den vet hva den skal gjøre */}
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-3 h-3 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t("step2Title")}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t("step2Desc")}
              </p>
            </div>
          </div>

          {/* Steg 3: Risiko */}
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-3 h-3 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t("step3Title")}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t("step3Desc")}
              </p>
            </div>
          </div>

          {/* Steg 4: Når skjer det */}
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-3 h-3 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t("step4Title")}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {t("step4Desc")}
              </p>
            </div>
          </div>

          {/* Oppsummering */}
          <div className="bg-[#0A0D12] rounded-lg p-3 mt-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              {t("summary")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
