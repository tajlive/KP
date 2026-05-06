import {
  PRESET_PROFILES,
  PresetProfileId,
} from "@/lib/auto-trading/preset-profiles";
import { Info, Shield, Target, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface PulseRiskCardsProps {
  profileId: PresetProfileId;
}

export async function PulseRiskCards({ profileId }: PulseRiskCardsProps) {
  const t = await getTranslations("dashboard.pulse");
  const profile = PRESET_PROFILES[profileId];

  const cards = [
    {
      label: t("riskMetrics.maxExposure"),
      value: `${profile.maxTotalExposurePct}%`,
      icon: Shield,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: t("riskMetrics.stopLoss"),
      value: `${profile.stopLossPct}%`,
      icon: Target,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      label: t("riskMetrics.positionSize"),
      value: `${profile.maxPositionSizePct}%`,
      icon: Zap,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-slate-900/80 transition-all border-b-2 hover:border-b-white/10"
        >
          <div
            className={`w-10 h-10 ${card.bgColor} rounded-xl flex items-center justify-center`}
          >
            <card.icon className={`w-5 h-5 ${card.color}`} />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              {card.label}
            </p>
            <p className="text-white font-bold text-lg">{card.value}</p>
          </div>
        </div>
      ))}

      {/* Bot Explanation Card */}
      <div className="md:col-span-3 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            {t("botStrategy")}
          </p>
          <p className="text-slate-300 text-sm leading-relaxed">
            {profile.tooltip.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
