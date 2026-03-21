"use client";

import { useVippsMarket } from "@/components/providers/VippsMarketProvider";
import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CurrencyCode } from "@/lib/pricing.config";
import { StripeCheckoutButton } from "./StripeCheckoutButton";

interface PaymentMethodSelectorProps {
  stripePlanId: string;
  /** Må matche tier i Stripe metadata (bachelor, master, phd, professor) */
  stripeTierSlug: string;
  stripePlanName: string;
  billingCurrency?: CurrencyCode;
  className?: string;
}

/**
 * Checkout-knapp via Stripe Checkout. Kort, PayPal og lommebøker aktiveres i Stripe.
 * Vipps (innlogging) vises kun for NO/SE/DK/FI — se VippsMarketProvider / vipps-region.
 */
export function PaymentMethodSelector({
  stripePlanId,
  stripeTierSlug,
  stripePlanName,
  billingCurrency = "NOK",
  className = "",
}: PaymentMethodSelectorProps) {
  const t = useTranslations("payment");
  const { showVipps } = useVippsMarket();

  return (
    <div className={`w-full space-y-4 ${className}`}>
      <StripeCheckoutButton
        planId={stripePlanId}
        tierSlug={stripeTierSlug}
        planName={stripePlanName}
        currency={billingCurrency}
        className="w-full bg-[#635BFF] hover:bg-[#5851DB] text-white py-4 text-lg font-semibold rounded-lg"
      >
        <div className="flex items-center justify-center gap-3">
          <CreditCard className="w-5 h-5" />
          <span>{t("payWithCard")}</span>
        </div>
      </StripeCheckoutButton>

      <p className="text-xs text-center text-slate-500 mt-4">
        {showVipps ? t("securePayment") : t("securePaymentNoVipps")}
      </p>
    </div>
  );
}
