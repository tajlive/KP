"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Check, Shield, ChevronRight } from "lucide-react";


function BankIdButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="w-full gap-2 bg-[#5E2E91] hover:bg-[#4A2473] text-white font-semibold py-6"
    >
      <Shield className="w-5 h-5" />
      Logg inn med BankID
    </Button>
  );
}

function ProgressBar({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-slate-500 mb-2">
        <span>Steg {step} av {total}</span>
        <span>{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-500 rounded-full"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Velkommen til Klarpakke
          </h1>
          <p className="text-slate-500">
            Fullfør onboarding for å komme i gang
          </p>
        </div>

        <ProgressBar step={step} />

        <div className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Identifiser deg
              </h2>
              <BankIdButton onClick={nextStep} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Bekreft e-post
              </h2>
              <Button onClick={nextStep} className="w-full gap-2">
                <Check className="w-4 h-4" />
                Bekreftet
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Velg trading-nivå
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {["Nybegynner", "Middels", "Erfaren"].map((level) => (
                  <Button
                    key={level}
                    variant="outline"
                    onClick={nextStep}
                    className="w-full justify-between"
                  >
                    {level}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">
                Du er klar!
              </h2>
              <p className="text-slate-500">
                Gå til dashboard for å starte trading.
              </p>
              <Button className="w-full">Gå til dashboard</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
