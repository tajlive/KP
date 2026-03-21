import Image from "next/image";

/**
 * Betalingsmerker for footer / prisside.
 * Visa + Mastercard: Stripe.js fingerprinted assets.
 * PayPal: Simple Icons (CC0).
 * Stripe: Powered by Stripe (Newsroom).
 * Vipps: ordmerke i merke-oransje (#FF5B24) — kun for NO/SE/DK/FI (styrt av VippsMarketProvider).
 */
type PaymentTrustLogosProps = {
  stripeBadgeAriaLabel: string;
  /** dark = footer (lys tekst), light = prisside m.m. */
  variant?: "dark" | "light";
  /** Vipps markedsføres kun i Norden (NO, SE, DK, FI). */
  showVipps?: boolean;
};

export function PaymentTrustLogos({
  stripeBadgeAriaLabel,
  variant = "dark",
  showVipps = false,
}: PaymentTrustLogosProps) {
  const isDark = variant === "dark";
  const pipeClass = isDark ? "text-white/30" : "text-slate-300";
  const dotClass = isDark ? "text-white/25" : "text-slate-300";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {showVipps ? (
        <>
          <span
            className="inline-flex shrink-0 items-center rounded-md bg-[#FF5B24] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm"
            aria-hidden
          >
            Vipps
          </span>

          <span
            className={`text-sm font-light select-none px-0.5 ${dotClass}`}
            aria-hidden
          >
            ·
          </span>
        </>
      ) : null}

      <Image
        src="/brand/payments/visa.svg"
        alt=""
        width={42}
        height={27}
        className="h-[22px] w-auto shrink-0"
        unoptimized
        aria-hidden
      />
      <Image
        src="/brand/payments/mastercard.svg"
        alt=""
        width={42}
        height={27}
        className="h-[22px] w-auto shrink-0"
        unoptimized
        aria-hidden
      />

      <span
        className={`inline-flex shrink-0 items-center rounded-md bg-white px-2 py-0.5 shadow-sm ${
          isDark ? "ring-1 ring-white/10" : "ring-1 ring-slate-200"
        }`}
        aria-hidden
      >
        <Image
          src="/brand/payments/paypal.svg"
          alt=""
          width={56}
          height={18}
          className="h-[18px] w-auto"
          unoptimized
        />
      </span>

      <span
        className={`text-sm font-light select-none px-0.5 ${pipeClass}`}
        aria-hidden
      >
        |
      </span>

      <a
        href="https://stripe.com"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex shrink-0 opacity-95 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded ${
          isDark
            ? "focus-visible:outline-white/40"
            : "focus-visible:outline-[#0052FF]/40"
        }`}
        aria-label={stripeBadgeAriaLabel}
      >
        <Image
          src="/brand/payments/powered-by-stripe.svg"
          alt=""
          width={150}
          height={34}
          className="h-[26px] w-auto max-w-[min(100vw-4rem,150px)]"
          unoptimized
          aria-hidden
        />
      </a>
    </div>
  );
}
