"use client";

import type { RiskLevel } from "@/store/onboarding-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronRight,
  Clock,
  DollarSign,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface Question {
  id: string;
  icon: React.ElementType;
  question: string;
  options: { value: string; label: string; emoji: string; score: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: "experience",
    icon: Shield,
    question: "Hvor mye trading\nerfaring har du?",
    options: [
      {
        value: "beginner",
        label: "Helt ny — aldri tradet",
        emoji: "🌱",
        score: 1,
      },
      {
        value: "intermediate",
        label: "1-2 år erfaring",
        emoji: "📊",
        score: 2,
      },
      {
        value: "advanced",
        label: "3+ år — erfaren trader",
        emoji: "🎯",
        score: 3,
      },
    ],
  },
  {
    id: "risk_tolerance",
    icon: TrendingUp,
    question: "Hvor mye risiko\ner du ok med?",
    options: [
      {
        value: "low",
        label: "Lav — stabil og trygg vekst",
        emoji: "🛡️",
        score: 1,
      },
      {
        value: "medium",
        label: "Moderat — balansert tilnærming",
        emoji: "⚖️",
        score: 2,
      },
      {
        value: "high",
        label: "Høy — aggressiv profitt",
        emoji: "🚀",
        score: 3,
      },
    ],
  },
  {
    id: "capital",
    icon: DollarSign,
    question: "Hvor mye tenker\ndu å investere?",
    options: [
      { value: "small", label: "5.000 – 25.000 NOK", emoji: "💰", score: 1 },
      { value: "medium", label: "25.000 – 100.000 NOK", emoji: "💎", score: 2 },
      { value: "large", label: "100.000+ NOK", emoji: "🏦", score: 3 },
    ],
  },
  {
    id: "time_horizon",
    icon: Clock,
    question: "Hva er din\ntidshorisont?",
    options: [
      { value: "long", label: "Langsiktig — 1+ år", emoji: "🌳", score: 1 },
      { value: "medium", label: "Uker & måneder", emoji: "📅", score: 2 },
      {
        value: "short",
        label: "Dagshandel — ultra kort",
        emoji: "⚡",
        score: 3,
      },
    ],
  },
  {
    id: "goal",
    icon: Target,
    question: "Hva er ditt\nhovedmål?",
    options: [
      { value: "learn", label: "Lære & eksperimentere", emoji: "📚", score: 1 },
      { value: "grow", label: "Stabil inntekt", emoji: "📈", score: 2 },
      { value: "maximize", label: "Maksimere profitt", emoji: "🏆", score: 3 },
    ],
  },
];

export function RiskProfileStep() {
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const { setRiskProfile, markStepComplete } = useOnboardingStore();
  const shouldReduce = useReducedMotion();

  const q = QUESTIONS[qIdx];
  const Icon = q.icon;
  const total = QUESTIONS.length;

  const handleAnswer = (score: number) => {
    const next = { ...answers, [q.id]: score };
    setAnswers(next);

    if (qIdx < total - 1) {
      setTimeout(() => setQIdx(qIdx + 1), 250);
    } else {
      // Calculate result
      const avg = Object.values(next).reduce((a, b) => a + b, 0) / total;
      const level: RiskLevel =
        avg < 1.5 ? "conservative" : avg < 2.5 ? "balanced" : "aggressive";
      setRiskProfile(level);
      markStepComplete("risk_profile");
      setTimeout(() => setShowResult(true), 300);
    }
  };

  if (showResult) {
    return <RiskResult />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-10">
      {/* Mini progress */}
      <div className="w-full max-w-sm mb-10">
        <div className="flex gap-1.5">
          {QUESTIONS.map((_, i) => (
            <motion.div
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i < qIdx
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                  : i === qIdx
                    ? "bg-blue-500"
                    : "bg-gray-200 dark:bg-gray-800"
              }`}
              animate={i === qIdx ? { scaleX: [0.7, 1] } : {}}
              transition={{ type: "spring", stiffness: 200 }}
            />
          ))}
        </div>
        <p className="text-[13px] text-gray-400 dark:text-gray-500 text-center mt-3">
          Spørsmål {qIdx + 1} av {total}
        </p>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qIdx}
          initial={shouldReduce ? {} : { opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduce ? {} : { opacity: 0, scale: 1.05, y: -20 }}
          transition={
            shouldReduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 300, damping: 25 }
          }
          className="w-full max-w-sm"
        >
          {/* Icon + Question */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ rotate: -15, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600
                         flex items-center justify-center shadow-[0_4px_20px_rgba(59,130,246,0.25)]"
            >
              <Icon className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-[24px] font-bold text-gray-900 dark:text-white leading-tight whitespace-pre-line">
              {q.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.15 + i * 0.08,
                  type: "spring",
                  stiffness: 200,
                }}
                onClick={() => handleAnswer(opt.score)}
                className="w-full flex items-center gap-4 p-4
                           bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
                           rounded-2xl
                           border-2 border-transparent
                           hover:border-cyan-500/40
                           hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10
                           active:scale-[0.97]
                           shadow-[0_2px_8px_rgba(0,0,0,0.04)]
                           transition-all duration-200"
              >
                <span className="text-2xl w-10 h-10 flex items-center justify-center shrink-0">
                  {opt.emoji}
                </span>
                <span className="text-[15px] font-medium text-gray-900 dark:text-white text-left flex-1">
                  {opt.label}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Risk result reveal screen */
function RiskResult() {
  const { riskProfile } = useOnboardingStore();

  const profiles: Record<
    string,
    { emoji: string; title: string; desc: string; gradient: string }
  > = {
    conservative: {
      emoji: "🛡️",
      title: "Konservativ",
      desc: "Du foretrekker stabil vekst med minimal risiko. Vi anbefaler en DCA-strategi med stopp-loss.",
      gradient: "from-emerald-500 to-cyan-500",
    },
    balanced: {
      emoji: "⚖️",
      title: "Balansert",
      desc: "Perfekt balanse mellom risiko og avkastning. Multi-signal strategi passer deg best.",
      gradient: "from-blue-500 to-indigo-500",
    },
    aggressive: {
      emoji: "🚀",
      title: "Aggressiv",
      desc: "Du jager maksimal profitt og tåler svingninger. Momentum-strategi med leverage er for deg.",
      gradient: "from-rose-500 to-amber-500",
    },
  };

  const profile = profiles[riskProfile || "balanced"];

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
        className="text-6xl mb-6"
      >
        {profile.emoji}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center max-w-sm"
      >
        <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Din risikoprofil
        </p>
        <h2
          className={`text-[32px] font-bold mb-3 bg-clip-text text-transparent ${
            {
              conservative: "bg-gradient-to-r from-emerald-500 to-cyan-500",
              balanced: "bg-gradient-to-r from-blue-500 to-indigo-500",
              aggressive: "bg-gradient-to-r from-rose-500 to-amber-500",
            }[riskProfile || "balanced"]
          }`}
        >
          {profile.title}
        </h2>
        <p className="text-[17px] text-gray-600 dark:text-gray-400 leading-relaxed">
          {profile.desc}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-[13px] text-gray-400 dark:text-gray-500 text-center"
      >
        Trykk «Neste» for å velge strategi basert på din profil →
      </motion.div>
    </div>
  );
}
