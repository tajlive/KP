"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, Lightbulb, MousePointerClick, Settings, Zap } from "lucide-react";

type TradeMode = "manual" | "auto" | "pilot";

interface ModeGuideProps {
  mode: TradeMode;
  className?: string;
}

const GUIDES: Record<TradeMode, { icon: typeof Lightbulb; title: string; steps: string[]; tip: string }> = {
  manual: {
    icon: MousePointerClick,
    title: "Slik handler du manuelt",
    steps: [
      "1. Velg en kryptovaluta (f.eks. Bitcoin)",
      "2. Skriv inn beløpet du vil kjøpe for (kroner)",
      "3. Trykk «Kjøp» — handelen utføres med én gang til markedspris",
      "4. Følg med i porteføljen og selg når du vil",
    ],
    tip: "💡 Start med små beløp (200–500 kr) for å lære. Du startet med 100 000 kr i lekepenger — null risiko!",
  },
  auto: {
    icon: Settings,
    title: "Slik bruker du Auto",
    steps: [
      "1. Velg hvilke kryptovalutaer AI-en skal handle",
      "2. Sett risikonivå (Lav/Medium/Høy) — styrer hvor mye per handel",
      "3. Trykk «Start Auto» — AI-en følger dine regler og handler automatisk",
      "4. Følg med på resultatene i dashboardet — du kan stoppe når som helst",
    ],
    tip: "💡 Auto er for deg som vil ha kontroll, men slippe å følge markedet 24/7. AI-en gjør jobben basert på dine innstillinger.",
  },
  pilot: {
    icon: Zap,
    title: "Slik bruker du Pilot (AI-styrt)",
    steps: [
      "1. Piloten overvåker 10 markeder: BTC, ETH, SOL og flere",
      "2. AI-en analyserer RSI, trender og volatilitet for å finne kjøps- og salgsmuligheter",
      "3. Handler utføres automatisk — du trenger ikke gjøre noe",
      "4. Følg med på historikken for å se hva AI-en handler",
    ],
    tip: "💡 Pilot er for deg med lite tid. Len deg tilbake og la AI-en jobbe. Alle handler skjer med lekepenger.",
  },
};

export function ModeGuide({ mode, className }: ModeGuideProps) {
  const [visible, setVisible] = React.useState(true);
  const [dismissed, setDismissed] = React.useState(false);

  const guide = GUIDES[mode];

  React.useEffect(() => {
    if (!guide) return;
    // Sjekk om brukeren har sett guiden før (per modus)
    const key = `klp-modeguide-${mode}`;
    if (localStorage.getItem(key)) {
      setVisible(false);
      setDismissed(true);
    }
  }, [mode, guide]);

  const handleDismiss = () => {
    localStorage.setItem(`klp-modeguide-${mode}`, "1");
    setVisible(false);
    setDismissed(true);
  };

  if (!guide || !visible || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "relative rounded-xl border border-blue-500/20 bg-blue-950/30 p-4 sm:p-5",
        className,
      )}
    >
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-blue-800/30 text-blue-400/60 hover:text-blue-300 transition-colors"
        aria-label="Lukk guide"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Icon + Title */}
      <div className="flex items-center gap-2 mb-3">
        <guide.icon className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-bold text-blue-200 uppercase tracking-wide">
          {guide.title}
        </h3>
      </div>

      {/* Steps */}
      <ol className="space-y-1.5 mb-3">
        {guide.steps.map((step, i) => (
          <li key={i} className="text-sm text-slate-300 leading-relaxed flex gap-2">
            <span className="text-blue-400 shrink-0">{step.slice(0, 2)}</span>
            <span>{step.slice(3)}</span>
          </li>
        ))}
      </ol>

      {/* Tip */}
      <div className="flex items-start gap-2 text-xs text-blue-300/80 bg-blue-950/50 rounded-lg px-3 py-2">
        <span className="shrink-0">💡</span>
        <span>{guide.tip.replace("💡 ", "")}</span>
      </div>
    </motion.div>
  );
}
