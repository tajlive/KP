'use client';
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, BookOpen, Trophy, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const nextSteps = [
  {
    icon: BookOpen,
    title: "Utforsk Paper Trading",
    description: "Test strategier med virtuell kapital",
  },
  {
    icon: Trophy,
    title: "Sjekk ut Leaderboard",
    description: "Se top-performing tradere",
  },
  {
    icon: TrendingUp,
    title: "Opprett din første strategi",
    description: "Sett opp en trading-bot",
  },
  {
    icon: Users,
    title: "Bli med i fellesskapet",
    description: "Følg andre tradere og lær",
  },
];

export default function OnboardingStep5() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        router.push(data.redirectTo || "/dashboard");
      }
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      // Fallback redirect
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl">Du er klar! 🎉</CardTitle>
        <CardDescription>
          Alt er satt opp og klart til bruk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="font-medium text-center">Neste steg:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nextSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <step.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-center">
            <strong>Tips:</strong> Start med paper trading for å bli kjent med
            plattformen. Når du føler deg komfortabel, kan du gå over til live
            trading.
          </p>
        </div>

        <Button
          onClick={handleComplete}
          className="w-full h-12 text-lg"
          size="lg"
          disabled={loading}
        >
          {loading ? "Fullfører..." : "Gå til Dashboard →"}
        </Button>
      </CardContent>
    </Card>
  );
}
