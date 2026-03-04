"use client";

import { Button } from "@/components/ui/button";
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

export function AutoTradeDemo() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const steps = [
    {
      title: "Scanner Markedet",
      icon: <Search className="h-5 w-5" />,
      text: "Analyserer BTC/USDT live priser...",
      rationale:
        "Vi overvåker markedet hvert sekund for å finne de beste mulighetene.",
      color: "blue",
    },
    {
      title: "Teknisk Analyse",
      icon: <TrendingUp className="h-5 w-5" />,
      text: "MA12 krysset MA26. RSI er 42.",
      rationale:
        "Krysset (Golden Cross) indikerer at trenden snur opp. RSI på 42 betyr at det ikke er overkjøpt ennå.",
      color: "indigo",
    },
    {
      title: "Risiko-Sjekk",
      icon: <ShieldCheck className="h-5 w-5" />,
      text: "Setter Stop-Loss på -2.5%.",
      rationale:
        "Vi beskytter kapitalen din ved å låse inn et maksimalt tap før vi i det hele tatt kjøper.",
      color: "green",
    },
    {
      title: "Utfører Kjøp",
      icon: <Zap className="h-5 w-5" />,
      text: "Ordre sendt: Kjøp BTC @ $42,500",
      rationale:
        "Handelen skjer lynraskt via din egen Binance-konto uten menneskelige feil.",
      color: "amber",
    },
    {
      title: "Overvåker Exit",
      icon: <CheckCircle2 className="h-5 w-5" />,
      text: "Trailing Stop aktivert på +1.5%.",
      rationale:
        "Vi 'låser inn' profit mens kursen stiger, og selger automatisk hvis trenden snur ned igjen.",
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
                Auto-Trade Simulator
              </h3>
              <p className="text-xs text-slate-400">
                Test teknologien på 30 sekunder
              </p>
            </div>
          </div>
          {!isPlaying && (
            <Button
              onClick={runDemo}
              className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-6 transition-all transform hover:scale-105"
            >
              <Play className="mr-2 h-4 w-4 fill-slate-900" /> Start Demo
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
                    Venter på start...
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
                    Simulering Fullført! Klar for ekte vare?
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
