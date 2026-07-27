"use client";

import { useTranslations } from "next-intl";

interface Trader {
  email: string;
  pct_return: number;
  win_rate: number;
  total_trades: number;
  verified: boolean;
}

function TraderAvatar({ email }: { email: string }) {
  const initial = (email ?? "?").charAt(0).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-kp-brand/10 flex items-center justify-center text-kp-brand font-bold text-sm shrink-0">
      {initial}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <circle cx="8" cy="8" r="7" fill="rgba(0,82,255,0.1)" />
      <path
        d="M5 8l2 2 4-4"
        stroke="#0052FF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface SocialProofProps {
  traders: Trader[];
}

export function SocialProof({ traders }: SocialProofProps) {
  const t = useTranslations("landing");

  if (!traders || traders.length === 0) return null;

  return (
    <section className="py-20 bg-kp-bg-secondary">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-heading-sm sm:text-heading font-black text-kp-text-primary text-center mb-8">
          {t("socialProof.title")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {traders.slice(0, 3).map((trader, i) => (
            <div
              key={i}
              className="border border-kp-border rounded-2xl bg-kp-bg-card p-5 animate-fade-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Avatar + email + verified */}
              <div className="flex items-center gap-3 mb-3">
                <TraderAvatar email={trader.email} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-kp-text-primary font-bold text-sm truncate">
                      {trader.email
                        ? `${trader.email.charAt(0)}***@${trader.email.split("@")[1] ?? "..."}`
                        : "***"}
                    </span>
                    {trader.verified && <VerifiedBadge />}
                  </div>
                  <div className="text-kp-text-muted text-caption">
                    {trader.total_trades}{" "}
                    {t("socialProof.tradeCount", { count: trader.total_trades })}
                  </div>
                </div>
              </div>

              {/* Avkastning + win-rate */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-black text-kp-success">
                    +{trader.pct_return}%
                  </div>
                  <div className="text-caption text-kp-text-muted">
                    {t("socialProof.returnLabel")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-kp-text-primary">
                    {trader.win_rate}%
                  </div>
                  <div className="text-caption text-kp-text-muted">win-rate</div>
                </div>
              </div>

              {/* Verifisert badge */}
              {trader.verified && (
                <div className="mt-3 pt-2 border-t border-kp-border-light">
                  <span className="inline-flex items-center gap-1 text-caption text-kp-brand">
                    <VerifiedBadge />
                    {t("socialProof.verifiedBadge")}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
