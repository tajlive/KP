"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Lightbulb,
  Shield,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import React, { useState } from "react";
import { StrategyCard } from "./StrategyCard";
import { STRATEGIES } from "./strategies-data";

interface SetupWizardProps {
  onComplete?: (data: { strategy: string; amount: number }) => void;
}

const WIZARD_STEPS = [
  { id: "strategy", label: "Strategi", icon: Target },
  { id: "amount", label: "Beløp", icon: Wallet },
  { id: "confirm", label: "Bekreft", icon: CheckCircle },
];

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(10000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStrategyData = STRATEGIES.find(
    (s) => s.id === selectedStrategy,
  );

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStrategy) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    onComplete?.({
      strategy: selectedStrategy,
      amount,
    });

    setIsSubmitting(false);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!selectedStrategy;
      case 1:
        return amount >= 1000;
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen gemini-gradient-bg">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Kom i gang med{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Klarpakke
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Velg en strategi som passer deg, så tar vi oss av resten. Ingen
            erfaring nødvendig.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          className="flex items-center justify-center gap-2 md:gap-4 mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <React.Fragment key={step.id}>
                <motion.div
                  className={cn(
                    "flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 rounded-2xl transition-all duration-300",
                    isCompleted && "bg-indigo-500/20 text-indigo-400",
                    isCurrent &&
                      "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-slate-800/50 text-slate-500",
                  )}
                  animate={isCurrent ? { scale: 1.05 } : { scale: 1 }}
                >
                  <div
                    className={cn(
                      "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center",
                      isCompleted && "bg-indigo-500",
                      isCurrent && "bg-white/20",
                      !isCompleted && !isCurrent && "bg-slate-700",
                    )}
                  >
                    {isCompleted ? (
                      <Check
                        className="w-3 h-3 md:w-4 md:h-4 text-white"
                        strokeWidth={3}
                      />
                    ) : (
                      <span className="text-xs md:text-sm font-bold">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-sm hidden sm:block">
                    {step.label}
                  </span>
                </motion.div>

                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-8 md:w-12 h-0.5 hidden sm:block",
                      isCompleted ? "bg-indigo-500" : "bg-slate-700",
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Strategy Selection */}
            {currentStep === 0 && (
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-2">
                  Velg din strategi
                </h2>
                <p className="text-slate-400 text-center mb-6 md:mb-8">
                  Vi har tre ferdige strategier tilpasset ulike risikonivåer
                </p>

                <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                  {STRATEGIES.map((strategy, index) => (
                    <motion.div
                      key={strategy.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <StrategyCard
                        strategy={strategy}
                        isSelected={selectedStrategy === strategy.id}
                        onSelect={() => setSelectedStrategy(strategy.id)}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Risk Explanation */}
                <div className="mt-8 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-slate-400">
                      <span className="text-slate-300 font-medium">
                        💡 Tips:{" "}
                      </span>
                      Start med "Trygg sparing" hvis dette er første gang. Du
                      kan alltid bytte senere. Alle strategier har
                      <span className="text-emerald-400">
                        automatisk stop-loss
                      </span>{" "}
                      for å beskytte deg.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Amount Selection */}
            {currentStep === 1 && selectedStrategyData && (
              <div className="max-w-2xl mx-auto">
                <div className="gemini-card p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-2">
                    Hvor mye vil du starte med?
                  </h2>
                  <p className="text-slate-400 text-center mb-6 md:mb-8">
                    Du kan alltid endre dette senere. Minstebeløp er{" "}
                    {selectedStrategyData.minInvestment}.
                  </p>

                  {/* Selected Strategy Summary */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 mb-6 border border-slate-700/30">
                    <span className="text-3xl">
                      {selectedStrategyData.emoji}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {selectedStrategyData.title}
                      </p>
                      <p className="text-sm text-slate-400">
                        {selectedStrategyData.expectedReturn} forventet
                        avkastning
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(0)}
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Endre
                    </button>
                  </div>

                  {/* Preset Amounts */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setAmount(preset)}
                        className={cn(
                          "py-3 md:py-4 rounded-xl font-medium transition-all duration-200 text-sm md:text-base",
                          amount === preset
                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                        )}
                      >
                        {preset.toLocaleString("no-NO")} kr
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount Input */}
                  <div className="relative">
                    <input
                      type="number"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="
                        w-full bg-slate-800 border-2 border-slate-700 
                        rounded-2xl px-6 py-4 md:py-5 text-xl md:text-2xl font-bold text-white text-center
                        focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20
                        transition-all duration-200
                      "
                      placeholder="Skriv beløp"
                      min={1000}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                      NOK
                    </span>
                  </div>

                  {/* Amount Display */}
                  <div className="mt-4 text-center">
                    <p className="text-2xl md:text-3xl font-bold text-white">
                      {amount.toLocaleString("no-NO")} kr
                    </p>
                  </div>

                  {/* Help Text */}
                  <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-indigo-300 font-medium">
                          💡 Tips for småsparere
                        </p>
                        <p className="text-indigo-300/70 text-sm mt-1">
                          Start med et beløp du er komfortabel med. Du kan øke
                          senere når du ser at det fungerer. Husk at all trading
                          innebærer risiko.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 2 && selectedStrategyData && (
              <div className="max-w-2xl mx-auto">
                <div className="gemini-card p-6 md:p-8">
                  <motion.div
                    className="text-center mb-6 md:mb-8"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                      Klart til å starte!
                    </h2>
                    <p className="text-slate-400">
                      Gå gjennom detaljene før du aktiverer
                    </p>
                  </motion.div>

                  {/* Summary */}
                  <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                    <motion.div
                      className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-slate-800/50 border border-slate-700/30"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <span className="text-slate-400">Valgt strategi</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {selectedStrategyData.emoji}
                        </span>
                        <span className="text-white font-medium">
                          {selectedStrategyData.title}
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-slate-800/50 border border-slate-700/30"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="text-slate-400">Startbeløp</span>
                      <span className="text-white font-medium text-lg">
                        {amount.toLocaleString("no-NO")} kr
                      </span>
                    </motion.div>

                    <motion.div
                      className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-slate-800/50 border border-slate-700/30"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <span className="text-slate-400">
                        Forventet avkastning
                      </span>
                      <span className="text-emerald-400 font-medium">
                        {selectedStrategyData.expectedReturn} per år
                      </span>
                    </motion.div>

                    <motion.div
                      className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-slate-800/50 border border-slate-700/30"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <span className="text-slate-400">Risikonivå</span>
                      <span
                        className={cn(
                          "font-medium",
                          selectedStrategyData.riskLevel === "low" &&
                            "text-emerald-400",
                          selectedStrategyData.riskLevel === "medium" &&
                            "text-amber-400",
                          selectedStrategyData.riskLevel === "high" &&
                            "text-rose-400",
                        )}
                      >
                        {selectedStrategyData.riskLevel === "low" && "Lav"}
                        {selectedStrategyData.riskLevel === "medium" &&
                          "Moderat"}
                        {selectedStrategyData.riskLevel === "high" && "Høy"}
                      </span>
                    </motion.div>

                    <motion.div
                      className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-slate-800/50 border border-slate-700/30"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <span className="text-slate-400">Beskyttelse</span>
                      <span className="text-indigo-400 font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Auto stop-loss aktivert
                      </span>
                    </motion.div>
                  </div>

                  {/* Risk Warning */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="text-amber-300 font-medium mb-1">
                          Viktig å huske
                        </p>
                        <p className="text-amber-300/70">
                          All trading innebærer risiko. Historisk avkastning er
                          ingen garanti for fremtidig resultat. Ikke invester
                          mer enn du har råd til å tape.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          className="flex items-center justify-between max-w-2xl mx-auto mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="
              flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-medium
              text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className={cn(
              "flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 rounded-2xl font-semibold transition-all duration-500",
              canProceed() && !isSubmitting
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] hover:bg-[position:100%_0] text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                : "bg-slate-700 text-slate-500 cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starter...
              </>
            ) : (
              <>
                {currentStep === WIZARD_STEPS.length - 1 ? "Start nå" : "Neste"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
