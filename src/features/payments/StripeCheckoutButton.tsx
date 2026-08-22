"use client";

import { Button } from "@/shared/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrencyCode } from "@/lib/pricing.config";

interface StripeCheckoutButtonProps {
  /** Brukes kun som fallback / validering; server løser priceId fra tier + currency */
  planId: string;
  /** Tier-slug for metadata og webhook (bachelor | master | phd | professor) */
  tierSlug: string;
  /** Betalingsvaluta (Stripe Price må finnes for kombinasjonen) */
  currency?: CurrencyCode;
  planName: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}

export function StripeCheckoutButton({
  planId,
  tierSlug,
  planName,
  currency = "NOK",
  children,
  className,
  variant = "default",
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("payment");
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      // KLA-auth: browser-klienten er alltid anon (httpOnly auth-cookie) —
      // auth-sjekk via server-API. 401 betyr reelt utlogget.
      const authRes = await fetch("/api/user/profile", {
        credentials: "same-origin",
      });

      if (authRes.status === 401) {
        // Redirect til innlogging med returnUrl og riktig locale.
        // Client-side navigasjon via router (Next.js-regel: ikke window.location
        // for interne ruter).
        const currentLocale = window.location.pathname.split("/")[1] || "no";
        router.push(
          `/${currentLocale}/innlogging?redirect=${encodeURIComponent(window.location.pathname)}`,
        );
        return;
      }

      const currentLocale = window.location.pathname.split("/")[1] || "no";

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier: tierSlug,
          currency,
          priceId: planId?.startsWith("price_") ? planId : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            t("errors.checkout_failed") ||
            "Kunne ikke starte betaling",
        );
      }

      const { url } = await response.json();

      // Redirect til Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Ingen checkout URL mottatt");
      }
    } catch (err: unknown) {
      console.error("Checkout error:", err);
      setError(
        err instanceof Error
          ? err.message
          : t("errors.unexpected") || "Kunne ikke starte betaling. Prøv igjen.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleCheckout}
        disabled={loading}
        variant={variant}
        className={className}
        size="lg"
        aria-label={planName}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t("loading") || "Laster..."}
          </>
        ) : (
          children
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-400 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
