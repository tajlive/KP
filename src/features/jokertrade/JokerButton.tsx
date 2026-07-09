"use client";

import { ButtonHTMLAttributes, useState } from "react";
import { JokerIcon, SparkleIcon } from "./JokerIcons";

interface JokerButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onClick?: () => Promise<void>;
  loading?: boolean;
}

export function JokerButton({ onClick, loading, ...props }: JokerButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isBusy = loading || internalLoading;

  const handleClick = async () => {
    if (!onClick || isBusy) return;
    setInternalLoading(true);
    try {
      await onClick();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isBusy}
      className="
        group relative flex h-20 w-full items-center justify-center gap-3
        overflow-hidden rounded-full border-2 border-[#F59E0B]/40
        bg-gradient-to-r from-[#F59E0B] to-[#D97706]
        px-8 text-lg font-extrabold tracking-wide text-[#0A0B0D]
        shadow-[0_0_20px_rgba(245,158,11,0.3)]
        transition-all duration-300
        hover:shadow-[0_0_40px_rgba(245,158,11,0.5)]
        hover:scale-[1.02]
        active:scale-[0.98]
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
        min-h-[56px]
        sm:h-20 sm:text-xl
      "
      {...props}
    >
      {/* Pulse-ring */}
      <span
        className="
          absolute inset-0
          animate-ping rounded-full border-2 border-[#F59E0B]/30
          opacity-75
          [animation-duration:2s]
        "
        aria-hidden="true"
      />

      {/* Glow overlay */}
      <span
        className="
          absolute inset-0
          bg-gradient-to-r from-[#FCD34D]/20 via-transparent to-[#F59E0B]/20
          opacity-0 transition-opacity duration-300
          group-hover:opacity-100
        "
        aria-hidden="true"
      />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-3">
        {isBusy ? (
          <>
            <svg
              className="h-6 w-6 animate-spin text-[#0A0B0D]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span>🎭 Analyserer markedet...</span>
          </>
        ) : (
          <>
            <JokerIcon className="h-7 w-7" />
            <SparkleIcon className="h-5 w-5 text-amber-800" />
            <span>🎭 JOKER — Finn beste trade</span>
          </>
        )}
      </span>
    </button>
  );
}
