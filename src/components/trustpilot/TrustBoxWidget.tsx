"use client";

import { useTranslations } from "next-intl";
import { Star, Quote, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getReviews, getSummary } from "@/lib/trustpilot/api";
import type { TrustpilotReview, TrustpilotSummary } from "@/lib/trustpilot/mock-reviews";
import { isMockData } from "@/lib/trustpilot/mock-reviews";
import { CARD } from "@/lib/design/tokens";

interface TrustBoxWidgetProps {
  maxReviews?: number;
  className?: string;
}

function ReviewCardFull({ review, index }: { review: TrustpilotReview; index: number }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("nb-NO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`${CARD.darkHover}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-lg">
            {review.author
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-white">{review.author}</p>
            <p className="text-sm text-slate-500">{formatDate(review.date)}</p>
          </div>
        </div>
        {review.verified && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
            Verifisert
          </span>
        )}
      </div>

      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < review.stars
                ? "fill-green-500 text-green-500"
                : "fill-slate-700 text-slate-700"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div>
        <h4 className="font-semibold text-white mb-2">{review.title}</h4>
        <div className="relative">
          <Quote className="absolute -left-1 -top-1 w-6 h-6 text-slate-700 opacity-50" />
          <p className="text-slate-300 pl-6 leading-relaxed">{review.text}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function TrustBoxWidget({ maxReviews = 6, className = "" }: TrustBoxWidgetProps) {
  const t = useTranslations("trustpilot");
  const [reviews, setReviews] = useState<TrustpilotReview[]>([]);
  const [summary, setSummary] = useState<TrustpilotSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [reviewsData, summaryData] = await Promise.all([
          getReviews(maxReviews),
          getSummary(),
        ]);
        setReviews(reviewsData);
        setSummary(summaryData);
        setIsDemo(isMockData());
      } catch (error) {
        console.warn("Failed to load Trustpilot data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [maxReviews]);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-[200px] bg-slate-900 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!summary || reviews.length === 0) return null;

  return (
    <div className={`${className}`}>
      {/* Header with summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-black text-white">
              {summary.stars.toFixed(1)}
            </span>
            <div className="flex flex-col">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(summary.stars)
                        ? "fill-green-500 text-green-500"
                        : "fill-slate-700 text-slate-700"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-slate-400">{t("trustScore")}</span>
            </div>
          </div>
          <div className="h-12 w-px bg-slate-700 hidden sm:block" />
          <div className="hidden sm:block">
            <p className="text-2xl font-bold text-white">
              {summary.count.toLocaleString()}
            </p>
            <p className="text-sm text-slate-400">{t("reviews")}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isDemo && (
            <span className="text-sm bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-full">
              {t("demoData")}
            </span>
          )}
          <Link
            href="https://www.trustpilot.com/review/klarpakke.no"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
          >
            {t("readAllReviews")}
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Reviews grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {reviews.map((review, index) => (
          <ReviewCardFull key={review.id} review={review} index={index} />
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-8 text-center">
        <Link
          href="https://www.trustpilot.com/review/klarpakke.no"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-400 transition-colors"
        >
          {t("visitTrustpilot")}
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
