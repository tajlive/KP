'use client';

import { UserPlus, Gamepad2, Rocket } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Registrer deg gratis',
    description: 'Opprett konto med BankID. Ingen kredittkort nødvendig. Start på under 2 minutter.',
    color: 'bg-teal-500',
  },
  {
    icon: Gamepad2,
    number: '02',
    title: 'Start med lekepenger',
    description: 'Få kr 10 000 i virtuelle midler. Lær plattformen. Test strategier. Gjør feil uten risiko.',
    color: 'bg-amber-500',
  },
  {
    icon: Rocket,
    number: '03',
    title: 'Oppgrader når du er klar',
    description: 'Fortsett med paper trading, eller koble til Binance for live trading. Du bestemmer.',
    color: 'bg-indigo-500',
  },
];

export function ThreeSteps() {
  return (
    <div className="py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="font-fraunces text-3xl md:text-4xl font-bold text-slate-100 mb-4">
          Kom i gang på 3 enkle steg
        </h2>
        <p className="font-lexend text-slate-400 max-w-2xl mx-auto">
          Ingen forkunnskaper nødvendig. Vi guider deg fra første øyeblikk.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        {steps.map((step, idx) => (
          <div
            key={step.number}
            className="relative bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8 group hover:border-slate-600 transition-colors"
          >
            {/* Connector line (hidden on mobile) */}
            {idx < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-slate-700" />
            )}

            {/* Step number */}
            <div className={`w-12 h-12 ${step.color} rounded-xl flex items-center justify-center mb-6`}>
              <step.icon className="w-6 h-6 text-white" />
            </div>

            {/* Number badge */}
            <span className="absolute top-6 right-6 font-fraunces text-4xl font-bold text-slate-700/50">
              {step.number}
            </span>

            {/* Content */}
            <h3 className="font-fraunces text-xl font-bold text-slate-100 mb-3">
              {step.title}
            </h3>
            <p className="font-lexend text-slate-400 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-12">
        <button className="bg-teal-500 hover:bg-teal-600 text-white font-lexend font-medium px-8 py-4 rounded-xl transition-colors inline-flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Start gratis i dag
        </button>
        <p className="font-lexend text-slate-500 text-sm mt-4">
          Ingen kredittkort nødvendig · Avbryt når som helst
        </p>
      </div>
    </div>
  );
}
