"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, ChevronRight, Shield } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

interface OnboardingCompletionProps {
  onClose: () => void;
}

export function OnboardingCompletion({ onClose }: OnboardingCompletionProps) {
  const router = useRouter();
  const locale = (useParams()?.locale as string) ?? "no";

  return (
    <motion.div
      key="completion"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
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

      <h2 className="mb-2 text-3xl font-bold text-white">Gratulerer! 🎉</h2>
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
          onClick={onClose}
        >
          Gå til dashboard
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/${locale}/dashboard/trade?mode=live`)}
        >
          Prøv live trading
        </Button>
      </div>
    </motion.div>
  );
}
