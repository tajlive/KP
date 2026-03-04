"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TierSlug } from "@/lib/pricing/tiers";
import { cn } from "@/lib/utils";
import { ArrowRight, CreditCard, Loader2, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CheckoutButtonProps {
  tierSlug: TierSlug;
  locale: string;
  label: string;
  popular?: boolean;
  className?: string;
}

export function CheckoutButton({
  tierSlug,
  locale,
  label,
  popular = false,
  className,
}: CheckoutButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [loading, setLoading] = useState<null | "stripe" | "vipps">(null);
  const [error, setError] = useState<string | null>(null);

  // Student er alltid gratis — send til signup
  if (tierSlug === "student") {
    return (
      <Button
        className={cn(
          "w-full h-12 rounded-xl text-base font-semibold transition-all",
          "bg-white hover:bg-slate-50 text-slate-900 border border-slate-200",
          className,
        )}
        onClick={() => router.push(`/${locale}/signup?plan=student`)}
      >
        {label}
      </Button>
    );
  }

  async function handleStripe() {
    setLoading("stripe");
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tierSlug,
          locale,
          userId: user?.id,
          userEmail: user?.email,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Stripe feilet");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setLoading(null);
    }
  }

  async function handleVipps() {
    setLoading("vipps");
    setError(null);
    try {
      const res = await fetch("/api/vipps/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierSlug, locale }),
      });
      const data = (await res.json()) as {
        redirectUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.redirectUrl)
        throw new Error(data.error ?? "Vipps feilet");
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setLoading(null);
    }
  }

  return (
    <>
      {/* Primærknapp - åpner betalingsdialog */}
      <Button
        onClick={() => setShowPaymentDialog(true)}
        className={cn(
          "w-full h-12 rounded-xl text-base font-semibold transition-all",
          popular
            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
            : "bg-slate-900 hover:bg-slate-800 text-white",
          className,
        )}
      >
        {label}
        {popular && <ArrowRight className="w-4 h-4 ml-2" />}
      </Button>

      {/* Betalingsdialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Velg betalingsmetode
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {/* Stripe-knapp */}
            <Button
              onClick={handleStripe}
              disabled={loading !== null}
              className="w-full h-14 rounded-xl text-base font-semibold bg-[#635BFF] hover:bg-[#4f49cc] text-white transition-all"
            >
              {loading === "stripe" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Laster...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Betal med kort (Stripe)
                </>
              )}
            </Button>

            {/* Vipps-knapp */}
            <Button
              onClick={handleVipps}
              disabled={loading !== null}
              className="w-full h-14 rounded-xl text-base font-semibold bg-[#FF5B24] hover:bg-[#e64d1a] text-white transition-all"
            >
              {loading === "vipps" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Laster...
                </>
              ) : (
                <>
                  <Smartphone className="w-5 h-5 mr-2" />
                  Betal med Vipps
                </>
              )}
            </Button>

            {/* Feilmelding */}
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          <p className="text-xs text-center text-gray-500">
            Sikker betaling. Ingen binding.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
