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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRouter } from "next/navigation";
import { useState } from "react";

const experienceLevels = [
  {
    value: "beginner",
    title: "🌱 Nybegynner",
    description: "Jeg har lite eller ingen erfaring med trading",
  },
  {
    value: "intermediate",
    title: "📈 Middels",
    description: "Jeg har prøvd trading før og forstår grunnleggende",
  },
  {
    value: "experienced",
    title: "💪 Erfaren",
    description: "Jeg trader regelmessig og kjenner markedet godt",
  },
  {
    value: "expert",
    title: "🏆 Ekspert",
    description: "Jeg er profesjonell trader med dyp markedskunnskap",
  },
];

export default function OnboardingStep2() {
  const router = useRouter();
  const [experience, setExperience] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!experience) return;

    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 2,
          trading_experience: experience,
        }),
      });

      if (res.ok) {
        router.push("/onboarding/step3-trading-mode");
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Din Trading-Erfaring</CardTitle>
        <CardDescription>
          Dette hjelper oss å tilpasse dashboardet for ditt nivå
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={experience} onValueChange={setExperience}>
          <div className="space-y-3">
            {experienceLevels.map((level) => (
              <div
                key={level.value}
                className={`flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer transition-colors ${
                  experience === level.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
                onClick={() => setExperience(level.value)}
              >
                <RadioGroupItem value={level.value} id={level.value} />
                <Label
                  htmlFor={level.value}
                  className="font-normal cursor-pointer flex-1"
                >
                  <span className="font-medium block">{level.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {level.description}
                  </span>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/onboarding/step1-welcome")}
            className="flex-1"
          >
            ← Tilbake
          </Button>
          <Button
            onClick={handleNext}
            disabled={!experience || loading}
            className="flex-1"
          >
            {loading ? "Lagrer..." : "Neste →"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
