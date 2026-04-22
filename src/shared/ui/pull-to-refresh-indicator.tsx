"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  distance: number;
  isReady: boolean;
  isRefreshing: boolean;
  className?: string;
}

/**
 * Visual pull-to-refresh indicator.
 * Shows a downward arrow that rotates into a spinner when refreshing.
 *
 * Inspired by iOS native + Coinbase mobile pull-to-refresh.
 */
export function PullToRefreshIndicator({
  distance,
  isReady,
  isRefreshing,
  className,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(distance / 80, 1);

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden",
        className
      )}
      style={{
        height: `${Math.max(distance, 0)}px`,
        opacity: isRefreshing ? 1 : progress,
      }}
    >
      <motion.div
        animate={{
          rotate: isRefreshing
            ? 360
            : isReady
              ? 180
              : progress * 180,
          scale: isReady && !isRefreshing ? 1.2 : 1,
        }}
        transition={
          isRefreshing
            ? { duration: 0.8, repeat: Infinity, ease: "linear" }
            : { type: "spring", stiffness: 300, damping: 20 }
        }
        className="flex items-center justify-center"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "text-white/60",
            isReady && !isRefreshing && "text-blue-400"
          )}
        >
          {isRefreshing ? (
            <>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </>
          ) : (
            <>
              <path d="M12 5v14" />
              <path d="m19 12-7 7-7-7" />
            </>
          )}
        </svg>
      </motion.div>
    </div>
  );
}
