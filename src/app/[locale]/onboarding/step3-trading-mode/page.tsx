"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingStep3() {
  const router = useRouter();
  const [mode, setMode] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!mode) return;

    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 3,
          preferred_trading_mode: mode,
        }),
      });

      if (res.ok) {
        if (mode === "live") {
          router.push("/onboarding/step4-binance");
        } else {
          // Skip Binance step for paper trading
          router.push("/onboarding/step5-complete");
        }
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Velg Trading-Modus</CardTitle>
        <CardDescription>
          Du kan bytte mellom paper og live trading når som helst
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={mode} onValueChange={setMode}>
          <div className="space-y-3">
            <div
              className={`flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer transition-colors ${
                mode === "paper"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
              onClick={() => setMode("paper")}
            >
              <RadioGroupItem value="paper" id="paper" />
              <Label
                htmlFor="paper"
                className="font-normal cursor-pointer flex-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-medium">Paper Trading</span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded-full">
                    Anbefalt
                  </span>
                </div>
                <span className="text-sm text-muted-foreground block">
                  Start med virtuell kapital (1 000 000 NOK). Perfekt for å
                  teste strategier uten risiko.
                </span>
              </Label>
            </div>

            <div
              className={`flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer transition-colors ${
                mode === "live"
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
              onClick={() => setMode("live")}
            >
              <RadioGroupItem value="live" id="live" />
              <Label
                htmlFor="live"
                className="font-normal cursor-pointer flex-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-medium">Live Trading</span>
                </div>
                <span className="text-sm text-muted-foreground block">
                  Trade med ekte penger via Binance. Krever konto-tilkobling.
                </span>
              </Label>
            </div>
          </div>
        </RadioGroup>

        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm">
            <strong>Tips:</strong> Vi anbefaler å starte med paper trading for å
            bli kjent med plattformen før du går over til live trading.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/onboarding/step2-experience")}
            className="flex-1"
          >
            ← Tilbake
          </Button>
          <Button
            onClick={handleNext}
            disabled={!mode || loading}
            className="flex-1"
          >
            {loading ? "Lagrer..." : "Neste →"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
