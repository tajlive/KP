"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, TrendingUp, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingStep1() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/start", { method: "POST" });
      if (res.ok) {
        router.push("/onboarding/step2-experience");
      }
    } catch (err) {
      console.error("Failed to start onboarding:", err);
    }
    setLoading(false);
  };

  const features = [
    {
      icon: Shield,
      title: "Paper Trading",
      description: "Test strategier uten risiko med virtuell kapital",
    },
    {
      icon: TrendingUp,
      title: "Automatiserte Strategier",
      description: "AI-drevne trading-bots som handler for deg 24/7",
    },
    {
      icon: Users,
      title: "Copy Trading",
      description: "Følg erfarne tradere og kopier deres strategier",
    },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">🚀</span>
        </div>
        <CardTitle className="text-2xl">Velkommen til Klarpakke!</CardTitle>
        <CardDescription className="text-base">
          Vi hjelper deg i gang med kryptotrading på få minutter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">{feature.title}</p>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={handleStart}
          className="w-full h-12 text-lg"
          size="lg"
          disabled={loading}
        >
          {loading ? "Starter..." : "Kom i gang →"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Tar kun 2 minutter å fullføre
        </p>
      </CardContent>
    </Card>
  );
}
