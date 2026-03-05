import type React from "react"
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/utils";
import { Loader2, Check, PiggyBank, BarChart3, Zap } from "lucide-react";
import { toast } from "sonner";

interface PlanSelectionWizardProps {
  onComplete: () => void;
  userId: string;
}

type PlanType = "WANT_SAVINGS" | "WANT_INCOME" | "WANT_GROWTH";
type RiskLevel = "conservative" | "balanced" | "aggressive";

const PLANS = [
  {
    id: "WANT_SAVINGS" as PlanType,
    title: "Langsiktig Sparing",
    description: "Smart DCA som kjøper mer når prisene er lave. For deg som vil bygge formue over tid.",
    icon: PiggyBank,
    strategy: "dca_trygg",
    color: "text-green-400",
  },
  {
    id: "WANT_INCOME" as PlanType,
    title: "Passiv Inntekt",
    description: "Grid-bot som utnytter svingninger for å skape jevnlig gevinst.",
    icon: BarChart3,
    strategy: "grid_bot",
    color: "text-blue-400",
  },
  {
    id: "WANT_GROWTH" as PlanType,
    title: "Offensiv Vekst",
    description: "Trend-følger som jakter de store bevegelsene i markedet.",
    icon: Zap,
    strategy: "multisignal_aktiv",
    color: "text-amber-400",
  },
];

export function PlanSelectionWizard({ onComplete, userId }: PlanSelectionWizardProps): JSX.Element {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("balanced");
  const [capital, setCapital] = useState(10000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!selectedPlan) return;
    
    setIsSubmitting(true);
    
    try {
      const supabase = createClient();
      
      // Create trading session with canonical schema
      const plan = PLANS.find((p) => p.id === selectedPlan)!;
      
      // Optimistic: mark complete and call onComplete immediately
      localStorage.setItem(`auto-trading-setup-${userId}`, "completed");
      toast.success("Oppsett fullført!");
      onComplete();

      // Persist in background (parallel)
      const [sessionResult, profileResult] = await Promise.all([
        supabase.from("trading_sessions").insert({
          user_id: userId,
          mode: "paper",
          status: "active",
          strategy_id: plan.strategy,
          strategy_config: {
            plan: selectedPlan,
            risk_level: riskLevel,
            capital: capital,
          },
          trading_pair: "BTC/USDT",
          risk_level: riskLevel,
          current_capital: capital,
          initial_capital: capital,
        }),
        supabase
          .from("user_profiles")
          .update({ setup_completed_at: new Date().toISOString() })
          .eq("id", userId),
      ]);

      if (sessionResult.error || profileResult.error) {
        console.error("Background persist failed:", sessionResult.error || profileResult.error);
        // Don't rollback — local state is fine, DB will sync on next load
      }
    } catch (err) {
      console.error("Error completing setup:", err);
      toast.error("Noe gikk galt");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <Card className="max-w-4xl mx-auto bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white text-center">
            Velg din trading-plan
          </CardTitle>
          <p className="text-slate-400 text-center">
            Vi skreddersyr oppsettet til dine mål
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => {
                  setSelectedPlan(plan.id);
                  setStep(2);
                }}
                className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-105 ${
                  selectedPlan === plan.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <plan.icon className={`w-10 h-10 mb-4 ${plan.color}`} />
                <h3 className="font-bold text-white text-lg mb-2">{plan.title}</h3>
                <p className="text-slate-400 text-sm">{plan.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card className="max-w-2xl mx-auto bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white text-center">
            Velg risikonivå
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {[
              { id: "conservative", label: "Forsiktig", desc: "Lav risiko, konservativ vekst" },
              { id: "balanced", label: "Balansert", desc: "Middels risiko, balansert avkastning" },
              { id: "aggressive", label: "Aggressiv", desc: "Høy risiko, høy potensiell avkastning" },
            ].map((risk) => (
              <button
                key={risk.id}
                onClick={() => {
                  setRiskLevel(risk.id as RiskLevel);
                  setStep(3);
                }}
                className={`p-4 rounded-lg border text-left transition-all ${
                  riskLevel === risk.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="font-medium text-white">{risk.label}</div>
                <div className="text-slate-400 text-sm">{risk.desc}</div>
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => setStep(1)} className="w-full">
            Tilbake
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 3) {
    return (
      <Card className="max-w-2xl mx-auto bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white text-center">
            Velg startkapital
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {capital.toLocaleString("no-NO")} kr
            </div>
            <input
              type="range"
              min="1000"
              max="1000000"
              step="1000"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="w-full mt-4"
            />
            <div className="flex justify-between text-slate-500 text-sm mt-2">
              <span>1 000 kr</span>
              <span>1 000 000 kr</span>
            </div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">Oppsummering</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Plan: {PLANS.find((p) => p.id === selectedPlan)?.title}</li>
              <li>Risiko: {riskLevel === "conservative" ? "Forsiktig" : riskLevel === "balanced" ? "Balansert" : "Aggressiv"}</li>
              <li>Kapital: {capital.toLocaleString("no-NO")} kr</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              Tilbake
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Fullfør oppsett
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
