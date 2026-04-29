"use client";

import { Button } from "@/shared/ui/button";
import { m } from "framer-motion";
import { Clock } from "lucide-react";

interface Step2CountdownProps {
  time: { days: number; hours: number; mins: number; secs: number };
  onComplete: () => void;
}

export function Step2Countdown({ time, onComplete }: Step2CountdownProps) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
      <div className="mb-6 flex justify-center">
        <m.div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Clock className="h-10 w-10 text-emerald-400" />
        </m.div>
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
            <p className="mt-1 text-xs text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onComplete}
        className="mt-6 text-xs text-slate-500 hover:text-slate-300"
      >
        (Debug: Hopp over)
      </Button>
    </div>
  );
}
