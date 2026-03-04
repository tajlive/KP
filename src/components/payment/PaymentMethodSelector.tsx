"use client";

import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { StripeCheckoutButton } from "./StripeCheckoutButton";

interface PaymentMethodSelectorProps {
  stripePlanId: string;
  stripePlanName: string;
  className?: string;
}

/**
 * Payment Method Selector - Stripe Only
 * Vipps has been removed, only Stripe payment is supported
 */
export function PaymentMethodSelector({
  stripePlanId,
  stripePlanName,
  className = "",
}: PaymentMethodSelectorProps) {
  const t = useTranslations("payment");

  return (
    <div className={`w-full space-y-4 ${className}`}>
      <StripeCheckoutButton
        planId={stripePlanId}
        planName={stripePlanName}
        className="w-full bg-[#635BFF] hover:bg-[#5851DB] text-white py-4 text-lg font-semibold rounded-lg"
      >
        <div className="flex items-center justify-center gap-3">
          <CreditCard className="w-5 h-5" />
          <span>{t("payWithCard")}</span>
        </div>
      </StripeCheckoutButton>

      <p className="text-xs text-center text-slate-500 mt-4">
        {t("securePayment")}
      </p>
    </div>
  );
}
