import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";

export type StatCardChangeType = "positive" | "negative" | "neutral";

export interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: StatCardChangeType;
  icon?: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

const changeColorClass: Record<StatCardChangeType, string> = {
  positive: "text-kp-success",
  negative: "text-kp-danger",
  neutral: "text-kp-text-tertiary",
};

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
  animate = false,
  delay = 0,
}: StatCardProps) {
  const content = (
    <Card
      variant="glass"
      glassVariant="elevated"
      hover="lift"
      padding="md"
      className={cn("p-0", className)}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-kp-text-tertiary mb-1 truncate">
              {label}
            </p>
            <p className="text-2xl font-bold text-kp-text-primary tracking-tight tabular-nums">
              {value}
            </p>
            {change ? (
              <p
                className={cn(
                  "text-sm mt-1 font-medium",
                  changeColorClass[changeType],
                )}
              >
                {changeType === "positive" && "↑ "}
                {changeType === "negative" && "↓ "}
                {change}
              </p>
            ) : null}
          </div>
          {icon ? (
            <div className="shrink-0 p-2 rounded-lg bg-kp-bg-tertiary text-kp-brand">
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!animate) return content;

  return (
    <div
      className="animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      {content}
    </div>
  );
}

export default StatCard;
