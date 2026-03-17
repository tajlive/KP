"use client";

import { Button } from "@/components/ui/button";
import { getAppUrl } from "@/lib/auth/config";
import { createClient } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface StripeCheckoutButtonProps {
  planId: string;
  planName: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}

export function StripeCheckoutButton({
  planId,
  planName,
  children,
  className,
  variant = "default",
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("payment");

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Sjekk om bruker er logget inn
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redirect til innlogging med returnUrl og riktig locale
        const currentLocale = window.location.pathname.split("/")[1] || "no";
        window.location.href = `/${currentLocale}/innlogging?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

      const currentLocale = window.location.pathname.split("/")[1] || "no";

      // Kall Next.js API route
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_id: planId,
          success_url: `${getAppUrl()}/${currentLocale}/priser/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${getAppUrl()}/${currentLocale}/priser`,
          user_id: user.id,
          user_email: user.email,
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
