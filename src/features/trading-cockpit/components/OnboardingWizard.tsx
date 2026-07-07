"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, TrendingUp, Shield, Bitcoin } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface Step {
  icon: typeof TrendingUp;
  title: string;
  desc: string;
  action: string;
}

const STEPS: Step[] = [
  {
    icon: Shield,
    title: "Du handler med lekepenger",
    desc: "Akkurat nå er du i papir-modus. Det betyr at du får 100 000 kr i lekepenger — helt risikofritt. Du kan ikke tape ekte penger her.",
    action: "Skjønner!",
  },
  {
    icon: TrendingUp,
    title: "Slik fungerer det",
    desc: "Du velger en kryptovaluta, bestemmer om du tror den går opp eller ned, og trykker kjøp. Akkurat som ekte trading — bare uten risiko.",
    action: "Gi meg et eksempel",
  },
  {
    icon: Bitcoin,
    title: "Eksempel: Kjøp BTC for 1 000 kr",
    desc: "Du kjøper Bitcoin for 1 000 kr. Hvis prisen går opp 5%, tjener du 50 kr. Går den ned 5%, taper du 50 kr — men bare i lekepenger. Du bestemmer alltid selv når du vil selge.",
    action: "Nå vil jeg prøve selv!",
  },
  {
    icon: Zap,
    title: "Klar for din første handel?",
    desc: "Under finner du sanntidspriser. Velg en krypto, trykk kjøp, og se hvordan det går. Du kan selge når som helst.",
    action: "Start min første handel",
  },
];

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else onComplete();
  }, [step, onComplete]);

  const s = STEPS[step];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 sm:p-8 text-white relative overflow-hidden"
    >
      {/* Decorative background */}
      <div aria-hidden className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div aria-hidden className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      {/* Progress dots */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all ${
              i <= step ? "bg-white w-8" : "bg-white/30 w-4"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">{s.title}</h3>
              <p className="text-blue-100 text-sm leading-relaxed">{s.desc}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            {step > 0 && (
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setStep((s) => s - 1)}
              >
                Tilbake
              </Button>
            )}
            <Button
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold"
              onClick={next}
            >
              {s.action}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
