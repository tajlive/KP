"use client";

import { useOnboardingStore } from "@/store/onboarding-store";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Rocket,
  Shield,
  Star,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface Template {
  id: string;
  name: string;
  tagline: string;
  icon: React.ElementType;
  gradientFrom: string;
  gradientTo: string;
  bgTint: string;
  selectedBorder: string;
  stats: {
    avgReturn: string;
    maxDrawdown: string;
    winRate: string;
    trades: string;
  };
  features: string[];
  riskMatch: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "conservative",
    name: "Konservativ",
    tagline: "Stabil vekst, lav risiko",
    icon: Shield,
    gradientFrom: "from-emerald-500",
    gradientTo: "to-cyan-500",
    bgTint: "bg-emerald-50/50 dark:bg-emerald-900/10",
    selectedBorder: "border-emerald-500",
    stats: {
      avgReturn: "+8.2%",
      maxDrawdown: "-5.1%",
      winRate: "67%",
      trades: "~15/mnd",
    },
    features: [
      "Stopp-loss beskyttelse",
      "Lav volatilitet",
      "Langsiktig DCA",
      "Risk-first",
    ],
    riskMatch: ["conservative"],
  },
  {
    id: "balanced",
    name: "Balansert",
    tagline: "Optimal balanse mellom risiko & avkastning",
    icon: BarChart3,
    gradientFrom: "from-blue-500",
    gradientTo: "to-indigo-500",
    bgTint: "bg-blue-50/50 dark:bg-blue-900/10",
    selectedBorder: "border-blue-500",
    stats: {
      avgReturn: "+14.7%",
      maxDrawdown: "-12.3%",
      winRate: "62%",
      trades: "~30/mnd",
    },
    features: [
      "Multi-signal analyse",
      "Dynamisk risk",
      "Diversifisert",
      "Mellomlangsiktig",
    ],
    riskMatch: ["balanced"],
  },
  {
    id: "aggressive",
    name: "Aggressiv",
    tagline: "Maksimer profitt, høyere risiko",
    icon: Rocket,
    gradientFrom: "from-rose-500",
    gradientTo: "to-amber-500",
    bgTint: "bg-rose-50/50 dark:bg-rose-900/10",
    selectedBorder: "border-rose-500",
    stats: {
      avgReturn: "+24.1%",
      maxDrawdown: "-23.7%",
      winRate: "58%",
      trades: "~50/mnd",
    },
    features: [
      "Høy leverage",
      "Momentum trading",
      "Rask eksekusjon",
      "Kortsiktige posisjoner",
    ],
    riskMatch: ["aggressive"],
  },
];

export function StrategyTemplateStep() {
  const {
    riskProfile,
    selectedTemplate: storeTemplate,
    setSelectedTemplate,
    markStepComplete,
  } = useOnboardingStore();
  const [selected, setSelected] = useState<string>(storeTemplate || "");

  const recommendedId =
    TEMPLATES.find((t) => t.riskMatch.includes(riskProfile || "balanced"))
      ?.id || "balanced";

  const handleSelect = (id: string) => {
    setSelected(id);
    setSelectedTemplate(id);
    markStepComplete("strategy_selection");
  };

  return (
    <div className="px-5 py-8 pb-32">
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-2 leading-tight">
          Velg din strategi
        </h1>
        <p className="text-[15px] text-gray-500 dark:text-gray-400">
          Basert på din profil anbefaler vi{" "}
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {TEMPLATES.find((t) => t.id === recommendedId)?.name}
          </span>
        </p>
      </motion.div>

      {/* Template cards */}
      <div className="space-y-4 max-w-lg mx-auto">
        {TEMPLATES.map((template, i) => {
          const Icon = template.icon;
          const isSelected = selected === template.id;
          const isRecommended = template.id === recommendedId;

          return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              onClick={() => handleSelect(template.id)}
              className={`w-full text-left relative overflow-hidden rounded-3xl p-5
                         backdrop-blur-xl transition-all duration-300
                         active:scale-[0.98]
                         ${
                           isSelected
                             ? `border-2 ${template.selectedBorder} ${template.bgTint} shadow-lg`
                             : "border-2 border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 shadow-sm hover:shadow-md"
                         }`}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute top-4 right-4 z-10">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold
                                   bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full
                                   shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                  >
                    <Star className="w-3 h-3" />
                    Anbefalt
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-3.5 mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${template.gradientFrom} ${template.gradientTo}
                                flex items-center justify-center flex-shrink-0
                                shadow-[0_4px_12px_rgba(0,0,0,0.15)]`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                    {template.tagline}
                  </p>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500
                               flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  {
                    label: "Snitt",
                    value: template.stats.avgReturn,
                    icon: TrendingUp,
                    positive: true,
                  },
                  {
                    label: "Drawdown",
                    value: template.stats.maxDrawdown,
                    icon: AlertTriangle,
                    positive: false,
                  },
                  {
                    label: "Win Rate",
                    value: template.stats.winRate,
                    icon: null,
                    positive: true,
                  },
                  {
                    label: "Trades",
                    value: template.stats.trades,
                    icon: null,
                    positive: null,
                  },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">
                      {stat.label}
                    </p>
                    <p
                      className={`text-[15px] font-bold tabular-nums ${
                        stat.positive === true
                          ? "text-emerald-600 dark:text-emerald-400"
                          : stat.positive === false
                            ? "text-rose-500"
                            : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {template.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${template.gradientFrom} ${template.gradientTo}`}
                    />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
