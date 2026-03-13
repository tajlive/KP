"use client";

import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";

interface ProgressBarProps {
  current: number;
  total: number;
  moduleTitle: string;
  locale: string;
}

export function ProgressBar({
  current,
  total,
  moduleTitle,
  locale,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const completedText =
    locale === "no"
      ? `${current} av ${total} leksjoner fullført`
      : locale === "en"
        ? `${current} of ${total} lessons completed`
        : `${current} / ${total}`;

  return (
    <div className="bg-card border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{moduleTitle}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span>{percentage}%</span>
        </div>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground mt-2">{completedText}</p>
    </div>
  );
}
