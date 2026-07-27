"use client";

import { useTranslations } from "next-intl";

interface JokerButtonProps {
  onClick: () => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export function JokerButton({ onClick, loading, disabled }: JokerButtonProps) {
  const t = useTranslations("joker");
  const isBusy = loading ?? false;

  return (
    <button
      onClick={onClick}
      disabled={isBusy || disabled}
      className="
        group relative inline-flex items-center justify-center gap-3
        rounded-2xl bg-kp-brand px-10 py-5
        font-extrabold text-kp-bg-primary
        animate-glow-pulse
        transition-all duration-300
        hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)]
        active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:animate-none
        min-h-[64px] text-lg sm:text-xl
      "
    >
      {/* Content */}
      <span className="relative z-10 flex items-center gap-3">
        {isBusy ? (
          <>
            <svg
              className="h-6 w-6 animate-spin text-kp-bg-primary"
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
            <span>{t("loading")}</span>
          </>
        ) : (
          <>
            <span className="text-xl sm:text-2xl" aria-hidden="true">
              🃏
            </span>
            <span>{t("button")}</span>
          </>
        )}
      </span>
    </button>
  );
}
