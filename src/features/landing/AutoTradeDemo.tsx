"use client";

import { Button } from "@/shared/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Play,
  Search,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function AutoTradeDemo() {
  const t = useTranslations("landing.autoTradeDemo");
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const steps = [
    {
      title: t("step1Title"),
      icon: <Search className="h-5 w-5" />,
      text: t("step1Text"),
      rationale: t("step1Rationale"),
      color: "blue",
    },
    {
      title: t("step2Title"),
      icon: <TrendingUp className="h-5 w-5" />,
      text: t("step2Text"),
      rationale: t("step2Rationale"),
      color: "indigo",
    },
    {
      title: t("step3Title"),
      icon: <ShieldCheck className="h-5 w-5" />,
      text: t("step3Text"),
      rationale: t("step3Rationale"),
      color: "green",
    },
    {
      title: t("step4Title"),
      icon: <Zap className="h-5 w-5" />,
      text: t("step4Text"),
      rationale: t("step4Rationale"),
      color: "amber",
    },
    {
      title: t("step5Title"),
      icon: <CheckCircle2 className="h-5 w-5" />,
      text: t("step5Text"),
      rationale: t("step5Rationale"),
      color: "green",
    },
  ];

  const runDemo = async () => {
    setIsPlaying(true);
    setStep(0);
    setLogs([]);

    for (let i = 0; i < steps.length; i++) {
      setStep(i);
      setLogs((prev) => [...prev, steps[i].text]);
      await new Promise((r) => setTimeout(r, 1500));
    }

    setTimeout(() => {
      setIsPlaying(false);
    }, 2000);
  };

  return (
    <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {t("title")}
              </h3>
              <p className="text-xs text-slate-400">
                {t("subtitle")}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 mt-1">
                {t("badge")}
              </span>
            </div>
          </div>
          {!isPlaying && (
            <Button
              onClick={runDemo}
              className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-6 transition-all transform hover:scale-105"
            >
              <Play className="mr-2 h-4 w-4 fill-slate-900" /> {t("start")}
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Tech Visualization */}
          <div className="space-y-4">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: step >= i ? 1 : 0.3,
                  x: step === i ? 10 : 0,
                  scale: step === i ? 1.02 : 1,
                }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  step === i
                    ? "bg-white/5 border-white/20 shadow-lg"
                    : "border-transparent"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    step === i ? "bg-blue-600" : "bg-slate-800"
                  }`}
                >
                  {s.icon}
                </div>
                <div>
                  <div>
                    <h4
                      className={`text-sm font-bold ${step === i ? "text-white" : "text-slate-400"}`}
                    >
                      {s.title}
                    </h4>
                    {step === i && isPlaying && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-1"
                      >
                        <div className="text-xs text-blue-400 font-mono mb-1">
                          {s.text}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight italic bg-white/5 p-2 rounded-lg border border-white/5">
                          💡 {s.rationale}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
                {step > i && (
                  <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />
                )}
                {step === i && isPlaying && (
                  <Loader2 className="ml-auto h-4 w-4 text-blue-500 animate-spin" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Terminal / Logs Overlay */}
          <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 h-[300px] font-mono text-[11px] relative overflow-hidden flex flex-col">
            <div className="flex gap-1.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-2 text-slate-300 custom-scrollbar">
              <AnimatePresence>
                {logs.length === 0 && (
                  <div className="text-slate-500 italic">
                    {t("waiting")}
                  </div>
                )}
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2"
                  >
                    <span className="text-blue-500">
                      [{new Date().toLocaleTimeString([], { hour12: false })}]
                    </span>
                    <span>{log}</span>
                  </motion.div>
                ))}
                {step === steps.length - 1 && !isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-center font-bold"
                  >
                    {t("completed")}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Background scanner line animation */}
            <motion.div
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 w-full h-px bg-blue-500/20 z-0"
            />
          </div>
        </div>
      </div>

      {/* Decorative background glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
