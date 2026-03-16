'use client';

import { AlertTriangle, BookOpen, CheckCircle2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface RiskDisclaimerProps {
  onAccept: () => void;
  locale?: string;
}

const RISK_FACTS = [
  {
    icon: AlertTriangle,
    title: 'Krypto er høyrisiko',
    text: 'Kryptovaluta kan miste 50-90% av verdien på kort tid. Du kan tape alt du investerer. Ingen strategi, bot eller AI kan eliminere denne risikoen.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  {
    icon: Shield,
    title: 'Aldri invester mer enn du tåler å tape',
    text: 'En god regel: Hvis du mister alle pengene du investerer i krypto, skal det IKKE påvirke din evne til å betale regninger, husleie eller mat.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: BookOpen,
    title: 'Lekepenger først, ekte penger etterpå',
    text: 'Vi gir deg 100.000 kr i lekepenger. Øv med disse først. Gå ALDRI til ekte penger før du forstår hva du gjør og har handlet i minst 30 dager.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
];

const CHECKBOXES = [
  'Jeg forstår at jeg kan tape alt jeg investerer i krypto',
  'Jeg vil aldri investere penger jeg trenger til daglige utgifter',
  'Jeg forstår at Klarpakke ikke garanterer avkastning',
];

export function RiskDisclaimer({ onAccept }: RiskDisclaimerProps) {
  const [checked, setChecked] = useState<boolean[]>(
    new Array(CHECKBOXES.length).fill(false)
  );

  const allChecked = checked.every(Boolean);

  const toggle = (i: number) =>
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg space-y-6"
    >
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">
          Viktig informasjon om risiko
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Les dette nøye før du begynner
        </p>
      </div>

      <div className="space-y-3">
        {RISK_FACTS.map((fact, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className={`rounded-xl border ${fact.border} ${fact.bg} p-4`}
          >
            <div className="flex gap-3">
              <fact.icon className={`mt-0.5 h-5 w-5 shrink-0 ${fact.color}`} />
              <div>
                <h3 className="font-semibold text-white">{fact.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                  {fact.text}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
        <p className="text-sm font-medium text-zinc-300">
          Bekreft at du har lest og forstått:
        </p>
        {CHECKBOXES.map((label, i) => (
          <div
            key={i}
            role="checkbox"
            aria-checked={checked[i]}
            tabIndex={0}
            onClick={() => toggle(i)}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(i); } }}
            className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-zinc-700/30"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                checked[i]
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-zinc-600 bg-zinc-800'
              }`}
            >
              {checked[i] && (
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              )}
            </span>
            <span className="text-sm leading-snug text-zinc-300">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onAccept}
        disabled={!allChecked}
        className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
          allChecked
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'cursor-not-allowed bg-zinc-700 text-zinc-500'
        }`}
      >
        {allChecked ? 'Jeg forstår risikoen — la oss begynne' : 'Kryss av alle boksene for å fortsette'}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Klarpakke er en læringsplattform og gir ikke finansiell rådgivning.
        All trading skjer på eget ansvar.
      </p>
    </motion.div>
  );
}
