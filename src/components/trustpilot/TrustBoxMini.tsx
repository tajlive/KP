"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSummary } from "@/lib/trustpilot/api";
import type { TrustpilotSummary } from "@/lib/trustpilot/mock-reviews";
import { isMockData } from "@/lib/trustpilot/mock-reviews";

interface TrustBoxMiniProps {
  className?: string;
  variant?: "dark" | "light";
}

export function TrustBoxMini({ className = "", variant = "dark" }: TrustBoxMiniProps) {
  const t = useTranslations("trustpilot");
  const [summary, setSummary] = useState<TrustpilotSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getSummary();
        setSummary(data);
        setIsDemo(isMockData());
      } catch (error) {
        console.warn("Failed to load Trustpilot summary:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSummary();
  }, []);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 w-32 bg-white/10 rounded" />
      </div>
    );
  }

  if (!summary) return null;

  const isDark = variant === "dark";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const mutedColor = isDark ? "text-white/60" : "text-slate-500";
  const demoBadgeColor = isDark
    ? "bg-yellow-500/20 text-yellow-300"
    : "bg-yellow-100 text-yellow-800";

  return (
    <Link
      href="https://www.trustpilot.com/review/klarpakke.no"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 group ${className}`}
      aria-label={t("mini.ariaLabel", { stars: summary.stars, count: summary.count })}
    >
      {/* Stars */}
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < Math.round(summary.stars)
                ? "fill-green-500 text-green-500"
                : isDark
                  ? "fill-white/20 text-white/20"
                  : "fill-slate-200 text-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Score */}
      <div className={`flex items-center gap-1.5 ${textColor}`}>
        <span className="font-bold">{summary.stars.toFixed(1)}</span>
        <span className={mutedColor}>/</span>
        <span className={mutedColor}>5</span>
      </div>

      {/* Count */}
      <span className={`text-sm ${mutedColor}`}>
        ({summary.count.toLocaleString()} {t("reviews")})
      </span>

      {/* Demo badge */}
      {isDemo && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${demoBadgeColor}`}>
          {t("demo")}
        </span>
      )}

      {/* Trustpilot logo text */}
      <span
        className={`text-sm font-medium ml-1 group-hover:underline ${
          isDark ? "text-white/80" : "text-slate-600"
        }`}
      >
        Trustpilot
      </span>
    </Link>
  );
}
