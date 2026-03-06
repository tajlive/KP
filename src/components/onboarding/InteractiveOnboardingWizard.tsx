"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { StrategyType, createPaperTrade } from "@/lib/trading-api";
import { createClient } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Loader2,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// KLA-98: Dynamically import canvas-confetti
let confetti: typeof import("canvas-confetti") | null = null;

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

const TEMPLATES = [
  {
    id: "dca_trygg" as StrategyType,
    title: "Trygg Sparing",
    risk: "Lav",
    desc: "Kjøper fast hver uke. Perfekt for langsiktig formue.",
    icon: ShieldCheck,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    id: "trend_balansert" as StrategyType,
    title: "Vekst",
    risk: "Middels",
    desc: "Følger markedets trender. Balansert risiko og avkastning.",
    icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    id: "multisignal_aktiv" as StrategyType,
    title: "Aggressiv",
    risk: "Høy",
    desc: "Aktiv trading med mange signaler. For deg som vil ha action.",
    icon: Zap,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
];

export default function InteractiveOnboardingWizard({
  userId,
  onComplete,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyType | null>(
    null,
  );
  const [isFinishing, setIsFinishing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [capital, setCapital] = useState(10000); // Default 10k NOK (mid-range)

  // KLA-98: Pre-initialize strategy in Step 2 to eliminate latency
  const [preInitialized, setPreInitialized] = useState(false);

  // Load canvas-confetti on client side
  useEffect(() => {
    import("canvas-confetti").then((mod) => {
      confetti = mod.default;
    });
  }, []);

  // KLA-98: Pre-initialize when template is selected in Step 2
  useEffect(() => {
    if (selectedTemplate && step === 2 && !preInitialized) {
      preInitializeStrategy();
    }
  }, [selectedTemplate, step, preInitialized]);

  const preInitializeStrategy = async () => {
    if (!selectedTemplate) return;

    try {
      // Call the API to pre-initialize the strategy
      const response = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyType: selectedTemplate,
          goal: "paper_trading",
          initialCapital: capital,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        setPreInitialized(true);
      }
    } catch (error) {
      console.error("Pre-initialization failed:", error);
    }
  };

  const triggerConfetti = () => {
    const fireConfetti = confetti;
    if (!fireConfetti) return;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = Math.floor(50 * (timeLeft / duration));

      if (fireConfetti) {
        fireConfetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
        });
        fireConfetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
        });
      }
    }, 250);
  };

  const handleFinish = async () => {
    if (!selectedTemplate) return;
    setIsFinishing(true);

    try {
      // If not pre-initialized, create strategy now
      if (!sessionId) {
        const startResponse = await fetch("/api/onboarding/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategyType: selectedTemplate,
            goal: "paper_trading",
            initialCapital: capital,
          }),
        });

        if (!startResponse.ok) {
          throw new Error("Failed to start onboarding");
        }

        const startData = await startResponse.json();
        setSessionId(startData.sessionId);

        // Create an initial "simulated" trade to show immediate action
        const tradeAmount = Math.min(capital * 0.003, 10000); // ~0.3% of capital, max 10k
        await createPaperTrade(startData.sessionId, {
          symbol: "BTC/USDT",
          side: "buy",
          quantity: 0.05,
          price: 65000,
          total_value: tradeAmount,
          fee: 0,
          status: "filled",
          realized_pnl: null,
          mode: "paper",
          is_copy: false,
          executed_at: new Date().toISOString(),
        });
      }

      // Call complete API
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: sessionId,
        }),
      });

      // Mark profile as setup complete
      const supabase = createClient();
      await supabase
        .from("user_profiles")
        .update({
          setup_completed_at: new Date().toISOString(),
          onboarding_step: "complete",
        })
        .eq("id", userId);

      // Also update user_profiles as fallback
      await supabase
        .from("user_profiles")
        .update({
          setup_completed_at: new Date().toISOString(),
        })
        .eq("id", userId);

      localStorage.setItem(`auto-trading-setup-${userId}`, "completed");

      setStep(4); // Move to success step

      // KLA-98: Trigger confetti on completion
      triggerConfetti();

      setTimeout(() => {
        onComplete();
      }, 3500);
    } catch (err) {
      console.error("Onboarding failed:", err);
      toast.error("Kunne ikke fullføre oppsett. Prøv igjen.");
      setIsFinishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 min-h-[600px] flex flex-col items-center justify-center">
      {/* Progress Bar */}
      <div className="w-full max-w-md mb-12 flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              step >= s ? "bg-blue-500" : "bg-slate-800",
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="text-center space-y-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-500/20 text-blue-400 mb-4 animate-bounce">
              <Sparkles className="w-10 h-10" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight">
                Klar til å la boten <br />
                <span className="text-blue-500 text-shadow-glow">
                  jobbe for deg?
                </span>
              </h1>
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                For å se live bevegelser i dashboardet må du først velge en
                strategi. Vi setter opp din første paper trade på under 60
                sekunder. Ingen ekte penger, kun ren læring.
              </p>
              <div className="bg-slate-800/50 rounded-xl p-4 text-sm text-slate-400 max-w-md mx-auto">
                <strong className="text-blue-400">💡 Slik fungerer det:</strong>
                <ol className="text-left mt-2 space-y-1 list-decimal list-inside">
                  <li>Velg din risikoprofil nedenfor</li>
                  <li>Velg hvor mye virtuell kapital du vil teste med</li>
                  <li>Start boten og se live handler i dashboardet!</li>
                </ol>
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => setStep(2)}
              className="bg-blue-600 hover:bg-blue-700 h-14 px-10 text-lg font-bold rounded-2xl group"
            >
              Kom i gang{" "}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-black text-white mb-2">
                Velg din stil
              </h2>
              <p className="text-slate-500">
                Vi har ferdige maler som passer din risikovilje.
              </p>
              {preInitialized && (
                <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Forhåndslastet
                </Badge>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t.id);
                    setStep(3);
                  }}
                  className={cn(
                    "relative p-6 rounded-3xl border-2 text-left transition-all hover:scale-105 hover:shadow-2xl group",
                    selectedTemplate === t.id
                      ? "border-blue-500 bg-blue-500/10 shadow-blue-500/10"
                      : "border-slate-800 bg-slate-900/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                      t.bg,
                      t.color,
                    )}
                  >
                    <t.icon className="w-6 h-6" />
                  </div>
                  <Badge
                    className={cn("mb-2 font-black text-[10px]", t.bg, t.color)}
                    variant="outline"
                  >
                    {t.risk} Risiko
                  </Badge>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {t.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {t.desc}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-md space-y-8 text-center"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
              <div className="w-16 h-16 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto text-blue-400">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">
                  Paper Trade Oppsett
                </h3>
                <p className="text-slate-500 text-sm">
                  Vi tildeler deg 1 000 000 NOK i virtuell kapital for å teste
                  strategien.
                </p>
              </div>

              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-left space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Mål-strategi:</span>
                  <span className="text-white font-bold">
                    {TEMPLATES.find((t) => t.id === selectedTemplate)?.title}
                  </span>
                </div>

                {/* Kapital-velger */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Virtuell Kapital:</span>
                    <span className="text-green-400 font-bold text-lg">
                      {new Intl.NumberFormat("no-NO").format(capital)} kr
                    </span>
                  </div>
                  <Slider
                    value={[capital]}
                    onValueChange={(value) => setCapital(value[0])}
                    min={1000}
                    max={100000}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>1 000 kr</span>
                    <span>100 000 kr</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    💡 Dette er lekepenger for testing. Velg beløp du ville
                    vurdert i ekte trading.
                  </p>
                </div>

                <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                  <span className="text-slate-500">Handelsmodus:</span>
                  <span className="text-blue-400 font-bold">
                    Simulert / Paper
                  </span>
                </div>
                {preInitialized && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-green-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Klar
                    </span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleFinish}
                disabled={isFinishing}
                className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-blue-500/20"
              >
                {isFinishing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Initialiserer bot...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-3" />
                    Start Boten Nå
                  </>
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setStep(2);
                setPreInitialized(false);
                setSessionId(null);
              }}
              className="text-slate-500"
            >
              Tilbake
            </Button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
              <CheckCircle2 className="w-16 h-16" />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white">Wow! 🎉</h2>
              <p className="text-slate-400 text-lg">
                Boten har gjort sin første paper trade.
              </p>
            </div>
            <div className="text-blue-400 font-bold animate-pulse">
              Sender deg til dashboardet...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
