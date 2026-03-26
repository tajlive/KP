"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, createClient } from "@/lib/utils";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Check,
  ChevronRight,
  Clock,
  Rocket,
  Shield,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { TradeExampleCard } from "./TradeExampleCard";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingProgress {
  user_id: string;
  step1_completed: boolean;
  step2_completed: boolean;
  step3_completed: boolean;
  step4_completed: boolean;
  step5_completed: boolean;
  step2_started_at?: string;
  strategy_id?: string;
  paper_bot_id?: string;
  is_completed: boolean;
  completed_at?: string;
}

const STEPS = [
  { id: 1, title: "Velg strategi", icon: Rocket },
  { id: 2, title: "Vent 3 dager", icon: Timer },
  { id: 3, title: "Forstå gevinst", icon: Target },
  { id: 4, title: "Forstå tap", icon: TrendingDown },
  { id: 5, title: "Sammenlign", icon: Trophy },
];

const STRATEGIES = [
  {
    id: "trend",
    name: "Trend Trading",
    description: "Følger markedets retning",
    icon: TrendingUp,
    color: "from-blue-500 to-cyan-500",
    risk: "Middels",
  },
  {
    id: "dca",
    name: "DCA Strategy",
    description: "Jevne kjøp over tid",
    icon: Activity,
    color: "from-emerald-500 to-green-500",
    risk: "Lav",
  },
  {
    id: "grid",
    name: "Grid Trading",
    description: "Handler i et prisområde",
    icon: BarChart3,
    color: "from-emerald-500 to-pink-500",
    risk: "Middels",
  },
  {
    id: "breakout",
    name: "Breakout",
    description: "Utbrudd fra nivåer",
    icon: Sparkles,
    color: "from-amber-500 to-orange-500",
    risk: "Høy",
  },
  {
    id: "ai",
    name: "AI Optimized",
    description: "AI-tilpasset strategi",
    icon: Zap,
    color: "from-rose-500 to-red-500",
    risk: "Middels",
  },
];

const MOCK_WIN_TRADE = {
  id: "win-1",
  pair: "BTC/USDT",
  side: "BUY" as const,
  amount: 25000,
  pnlPercent: 5.2,
  strategy: "Trend Trading",
  aiExplanation:
    "Strategien identifiserte en sterk bullish trend ved $42,000-nivået. Volumøkning bekreftet utbruddet.",
  timestamp: new Date(),
};

const MOCK_LOSS_TRADE = {
  id: "loss-1",
  pair: "ETH/USDT",
  side: "BUY" as const,
  amount: 15000,
  pnlPercent: -2.8,
  strategy: "DCA Strategy",
  aiExplanation:
    "Markedet opplevde en uventet likviditets-squeeze. Ved å tape kun 2.8% beskytter vi kapitalen.",
  timestamp: new Date(),
};

const MOCK_LEADERBOARD = [
  { rank: 1, name: "CryptoKing", pnl: "+45.2%", trades: 24, winRate: 78 },
  { rank: 2, name: "DiamondHands", pnl: "+31.8%", trades: 12, winRate: 85 },
  { rank: 3, name: "MoonShot", pnl: "+18.5%", trades: 8, winRate: 62 },
  { rank: 7, name: "Du", pnl: "+5.2%", trades: 1, winRate: 100, isUser: true },
  { rank: 12, name: "TradeMaster", pnl: "+2.1%", trades: 15, winRate: 53 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────────────────────────────────────

const stepVariants = {
  enter: { y: 100, opacity: 0, scale: 0.9 },
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
  exit: { y: -50, opacity: 0, scale: 0.95 },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, type: "spring" as const, stiffness: 200 },
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(3 * 24 * 60 * 60);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [paperBotCreating, setPaperBotCreating] = useState(false);
  // Bruker ref for å unngå stale closure i countdown
  const step2CompletedRef = useRef(false);
  const supabase = createClient();
  const router = useRouter();
  const locale = (useParams()?.locale as string) ?? "no";

  useEffect(() => {
    const checkOnboarding = async () => {
      // Sjekk om tabellen eksisterer
      const { error: tableError } = await supabase
        .from("onboarding_progress")
        .select("count")
        .limit(1);

      if (tableError && tableError.code === "42P01") {
        setDbLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const oData = data as OnboardingProgress | null;

      if (error && error.code === "PGRST116") {
        await supabase.from("onboarding_progress").insert({
          user_id: user.id,
          step1_completed: false,
          step2_completed: false,
          step3_completed: false,
          step4_completed: false,
          step5_completed: false,
        });
        setIsVisible(true);
      } else if (oData) {
        // Gjenopprett valgt strategi hvis den finnes
        if (oData.strategy_id) setSelectedStrategy(oData.strategy_id);

        if (!oData.step1_completed) setCurrentStep(1);
        else if (!oData.step2_completed) {
          setCurrentStep(2);
          if (oData.step2_started_at) {
            const start = new Date(oData.step2_started_at).getTime();
            const now = Date.now();
            const threeDays = 3 * 24 * 60 * 60 * 1000;
            const remaining = Math.max(
              0,
              Math.floor((start + threeDays - now) / 1000),
            );
            setTimeLeft(remaining);
            // Fix: bruk setTimeout for å unngå race condition mot auth
            if (remaining === 0) {
              setTimeout(() => handleStepComplete(2), 0);
            }
          }
        } else if (!oData.step3_completed) setCurrentStep(3);
        else if (!oData.step4_completed) setCurrentStep(4);
        else if (!oData.step5_completed) setCurrentStep(5);
        else setIsCompleted(true);

        if (!oData.step5_completed) setIsVisible(true);
      }
      setDbLoading(false);
    };

    checkOnboarding();
  }, [supabase]);

  // Countdown for steg 2
  useEffect(() => {
    if (currentStep !== 2) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Unngå dobbelt kall hvis allerede trigget fra useEffect over
          if (!step2CompletedRef.current) {
            step2CompletedRef.current = true;
            handleStepComplete(2);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep]);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#10B981", "#34D399", "#6EE7B7", "#059669"],
    });
  }, []);

  const handleStepComplete = async (stepId: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const colName = `step${stepId}_completed`;
    const updates: Record<string, boolean | string> = { [colName]: true };

    if (stepId === 1) {
      // ✅ FIX: Lagre valgt strategi til DB
      if (selectedStrategy) updates.strategy_id = selectedStrategy;
      updates.step2_started_at = new Date().toISOString();
      fireConfetti();
    }

    if (stepId === 5) {
      updates.is_completed = true;
      updates.completed_at = new Date().toISOString();
    }

    await supabase
      .from("onboarding_progress")
      .update(updates)
      .eq("user_id", user.id);

    // ✅ FIX: Auto-start paper trade etter steg 5
    if (stepId === 5 && selectedStrategy) {
      setPaperBotCreating(true);
      try {
        const { data: botData, error: botError } =
          await supabase.functions.invoke("create-paper-bot", {
            body: { strategy_id: selectedStrategy, user_id: user.id },
          });
        if (botError) {
          throw botError;
        }

        if (botData?.bot_id) {
          await supabase
            .from("onboarding_progress")
            .update({ paper_bot_id: botData.bot_id } as Record<string, unknown>)
            .eq("user_id", user.id);
        }

        console.log("Paper bot created:", botData?.bot_id);
      } catch (e) {
        // Paper bot-oppretting er ikke blokkerende – onboarding fullfører uansett
        console.warn("create-paper-bot feilet:", e);
      } finally {
        setPaperBotCreating(false);
      }
    }

    if (stepId < 5) {
      setCurrentStep(stepId + 1);
    } else {
      await supabase
        .from("user_profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      document.cookie =
        "kp_onboarding_status=completed; path=/; max-age=31536000; SameSite=Lax";
      setIsCompleted(true);
      fireConfetti();
    }
  };

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return { days, hours, mins, secs };
  };

  if (dbLoading || !isVisible) return null;

  const time = formatTime(timeLeft);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg">
        <button
          onClick={async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              const now = new Date().toISOString();
              await Promise.all([
                supabase
                  .from("onboarding_progress")
                  .update({ is_completed: true, completed_at: now })
                  .eq("user_id", user.id),
                supabase
                  .from("user_profiles")
                  .update({ onboarding_completed: true })
                  .eq("id", user.id),
              ]);
              document.cookie =
                "kp_onboarding_status=completed; path=/; max-age=31536000; SameSite=Lax";
            }
            setIsVisible(false);
          }}
          className="absolute -top-16 right-0 text-slate-500 hover:text-slate-300 text-sm underline transition-colors"
        >
          Hopp over →
        </button>

        {/* Progress Bar */}
        <div className="absolute -top-20 left-0 right-0">
          <div className="relative flex items-center justify-between px-4">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-slate-800" />
            <motion.div
              className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-linear-to-r from-emerald-500 to-teal-500"
              initial={{ width: "0%" }}
              animate={{
                width:
                  currentStep === 1
                    ? "0%"
                    : currentStep === 2
                      ? "25%"
                      : currentStep === 3
                        ? "50%"
                        : currentStep === 4
                          ? "75%"
                          : "100%",
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
            {STEPS.map((step) => {
              const isDone = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors",
                    isDone && "border-emerald-500 bg-emerald-500",
                    isCurrent &&
                      "border-emerald-400 bg-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.4)]",
                    !isDone && !isCurrent && "border-slate-700 bg-slate-900",
                  )}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isDone ? (
                    <Check className="h-6 w-6 text-white" />
                  ) : (
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isCurrent ? "text-emerald-400" : "text-slate-500",
                      )}
                    />
                  )}
                  <span className="absolute -bottom-6 left-1/2 w-20 -translate-x-1/2 text-center text-xs text-slate-400">
                    {step.title}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {!isCompleted ? (
            <motion.div
              key={currentStep}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl md:p-8"
            >
              <div className="flex flex-col items-center text-center">
                <h2 className="mb-2 text-2xl font-bold text-white">
                  {STEPS.find((s) => s.id === currentStep)?.title}
                </h2>
                <p className="mb-6 text-slate-400">
                  {currentStep === 1 &&
                    "Velg en auto-trading strategi som passer dine mål"}
                  {currentStep === 2 &&
                    "Strategien din kjører nå automatisk i paper mode"}
                  {currentStep === 3 && "Se hvordan en vellykket handel ser ut"}
                  {currentStep === 4 &&
                    "Forstå hvorfor tap er en del av trading"}
                  {currentStep === 5 &&
                    "Sammenlign dine resultater med andre tradere"}
                </p>

                <div className="mb-6 w-full">
                  {/* STEG 1: Strategi-valg */}
                  {currentStep === 1 && (
                    <div className="grid grid-cols-1 gap-3">
                      {STRATEGIES.map((strategy, i) => {
                        const Icon = strategy.icon;
                        const isSelected = selectedStrategy === strategy.id;
                        return (
                          <motion.div
                            key={strategy.id}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <Card
                              className={cn(
                                "cursor-pointer border-2 p-4 transition-all hover:scale-[1.02]",
                                isSelected
                                  ? "border-emerald-500 bg-emerald-500/10"
                                  : "border-slate-700 bg-slate-900 hover:border-slate-600",
                              )}
                              onClick={() => setSelectedStrategy(strategy.id)}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br",
                                    strategy.color,
                                  )}
                                >
                                  <Icon className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                  <h3 className="font-semibold text-white">
                                    {strategy.name}
                                  </h3>
                                  <p className="text-sm text-slate-400">
                                    {strategy.description}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {strategy.risk} risiko
                                </Badge>
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* STEG 2: Countdown */}
                  {currentStep === 2 && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
                      <div className="mb-6 flex justify-center">
                        <motion.div
                          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Clock className="h-10 w-10 text-emerald-400" />
                        </motion.div>
                      </div>
                      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                        Gjenstående tid
                      </p>
                      <div className="flex justify-center gap-3">
                        {[
                          { value: time.days, label: "Dager" },
                          { value: time.hours, label: "Timer" },
                          { value: time.mins, label: "Min" },
                          { value: time.secs, label: "Sek" },
                        ].map((item, i) => (
                          <div key={i} className="text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800 text-2xl font-bold text-emerald-400">
                              {String(item.value).padStart(2, "0")}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.label}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Button
                        className="mt-6 w-full bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => handleStepComplete(2)}
                      >
                        Jeg forstår — fortsett til neste steg
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* STEG 3: Gevinst-eksempel – bruker eksisterende komponent */}
                  {currentStep === 3 && (
                    <TradeExampleCard trade={MOCK_WIN_TRADE} isWin />
                  )}

                  {/* STEG 4: Tap-eksempel – bruker eksisterende komponent */}
                  {currentStep === 4 && (
                    <TradeExampleCard trade={MOCK_LOSS_TRADE} isWin={false} />
                  )}

                  {/* STEG 5: Leaderboard */}
                  {currentStep === 5 && (
                    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                      <div className="border-b border-slate-800 bg-slate-800/50 p-3">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-tight text-slate-400">
                          <span>Trader</span>
                          <span>Avkastning</span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-800">
                        {MOCK_LEADERBOARD.map((user, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={cn(
                              "flex items-center justify-between p-3",
                              user.isUser &&
                                "border-l-4 border-emerald-500 bg-emerald-500/5",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 text-center font-bold text-slate-500">
                                {user.rank}
                              </span>
                              <span
                                className={cn(
                                  "text-sm",
                                  user.isUser
                                    ? "font-bold text-emerald-400"
                                    : "text-slate-300",
                                )}
                              >
                                {user.name}
                              </span>
                              {user.isUser && (
                                <Badge className="bg-emerald-500 text-xs">
                                  Du
                                </Badge>
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-sm font-bold",
                                user.pnl.startsWith("+")
                                  ? "text-emerald-400"
                                  : "text-red-400",
                              )}
                            >
                              {user.pnl}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {currentStep === 1 ? (
                  <Button
                    className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600"
                    disabled={!selectedStrategy}
                    onClick={() => handleStepComplete(1)}
                  >
                    Start med{" "}
                    {STRATEGIES.find((s) => s.id === selectedStrategy)?.name ||
                      "strategi"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : currentStep !== 2 ? (
                  <Button
                    className="w-full"
                    disabled={paperBotCreating}
                    onClick={() => handleStepComplete(currentStep)}
                  >
                    {paperBotCreating
                      ? "Starter boten din..."
                      : currentStep === 5
                        ? "Fullfør onboarding 🎉"
                        : "Neste steg"}
                    {!paperBotCreating && (
                      <ChevronRight className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <p className="text-sm italic text-slate-500">
                    Strategien jobber mens du venter...
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="completion"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring" as const,
                stiffness: 300,
                damping: 25,
              }}
              className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-slate-800 p-10 text-center shadow-[0_0_50px_rgba(16,185,129,0.2)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-emerald-500/5" />
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring" as const,
                  stiffness: 500,
                  damping: 15,
                  delay: 0.3,
                }}
                className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-500 shadow-xl"
              >
                <Check className="h-12 w-12 text-white stroke-[3px]" />
              </motion.div>
              <h2 className="mb-2 text-3xl font-bold text-white">
                Gratulerer! 🎉
              </h2>
              <p className="mb-6 text-slate-400">
                Du har fullført onboarding og er klar for live trading.
              </p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-8 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-400"
              >
                <Shield className="h-4 w-4" />
                🌱 Sertifisert nybegynner
              </motion.div>
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => setIsVisible(false)}
                >
                  Gå til dashboard
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push(`/${locale}/dashboard/trade?mode=live`)
                  }
                >
                  Prøv live trading
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
