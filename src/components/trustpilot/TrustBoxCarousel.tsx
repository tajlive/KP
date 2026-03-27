"use client";

import { useTranslations } from "next-intl";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getReviews } from "@/lib/trustpilot/api";
import type { TrustpilotReview } from "@/lib/trustpilot/mock-reviews";
import { isMockData } from "@/lib/trustpilot/mock-reviews";
import { CARD } from "@/lib/design/tokens";

interface TrustBoxCarouselProps {
  maxReviews?: number;
  className?: string;
}

function ReviewCard({ review }: { review: TrustpilotReview }) {
  const t = useTranslations("trustpilot");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("nb-NO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={`${CARD.darkHover} flex-shrink-0 w-[300px] sm:w-[340px] flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.stars
                  ? "fill-green-500 text-green-500"
                  : "fill-slate-700 text-slate-700"
              }`}
            />
          ))}
        </div>
        {review.verified && (
          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
            {t("verified")}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 mb-4">
        <Quote className="w-5 h-5 text-slate-600 mb-2" />
        <h4 className="font-semibold text-white mb-2">{review.title}</h4>
        <p className="text-sm text-slate-400 line-clamp-4">{review.text}</p>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-sm font-bold">
              {review.author
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{review.author}</p>
              <p className="text-xs text-slate-500">{formatDate(review.date)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrustBoxCarousel({
  maxReviews = 5,
  className = "",
}: TrustBoxCarouselProps) {
  const t = useTranslations("trustpilot");
  const [reviews, setReviews] = useState<TrustpilotReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await getReviews(maxReviews);
        setReviews(data);
        setIsDemo(isMockData());
      } catch (error) {
        console.warn("Failed to load Trustpilot reviews:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadReviews();
  }, [maxReviews]);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      checkScroll();
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, [reviews]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 360;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return (
      <div className={`flex gap-4 overflow-hidden ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[300px] sm:w-[340px] h-[280px] bg-slate-900 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Demo badge */}
      {isDemo && (
        <div className="absolute -top-3 right-0 z-10">
          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
            {t("demoData")}
          </span>
        </div>
      )}

      {/* Carousel container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 snap-x snap-mandatory"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="snap-start"
          >
            <ReviewCard review={review} />
          </motion.div>
        ))}
      </div>

      {/* Navigation arrows - desktop only */}
      <div className="hidden md:flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className={`p-2 rounded-full border border-slate-700 transition-colors ${
            canScrollLeft
              ? "hover:bg-slate-800 text-white"
              : "opacity-30 cursor-not-allowed text-slate-500"
          }`}
          aria-label={t("scrollLeft")}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Dots indicator */}
        <div className="flex gap-2">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({
                    left: i * 360,
                    behavior: "smooth",
                  });
                }
              }}
              className="w-2 h-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
              aria-label={t("goToReview", { number: i + 1 })}
            />
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className={`p-2 rounded-full border border-slate-700 transition-colors ${
            canScrollRight
              ? "hover:bg-slate-800 text-white"
              : "opacity-30 cursor-not-allowed text-slate-500"
          }`}
          aria-label={t("scrollRight")}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
