"use client";

import { useState } from "react";
import { useTradingMode } from "@/lib/hooks/useTradingMode";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { ConnectBinanceModal } from "@/shared/ui/modals/ConnectBinanceModal";
import { Rocket, TrendingUp, Shield, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

export function LiveTradingBanner() {
  const { mode, canSwitchToLive } = useTradingMode();
  const { subscription } = useSubscription();
  const locale = useLocale();
  const [showConnectModal, setShowConnectModal] = useState(false);

  const tierSlug = subscription?.tier_slug ?? "student";
  const hasLiveTrading = ["bachelor", "master", "phd", "professor"].includes(
    tierSlug,
  );

  // Don't show if already in live mode
  if (mode === "live") return null;

  // If user doesn't have live trading tier — show upgrade prompt
  if (!hasLiveTrading) {
    return (
      <Alert className="mb-6 bg-linear-to-r from-amber-50 to-yellow-50 border-amber-200">
        <Lock className="h-5 w-5 text-amber-600" />
        <div className="flex-1">
          <AlertTitle className="text-amber-900">
            Live Trading er låst
          </AlertTitle>
          <AlertDescription className="text-amber-700 mt-2">
            <p className="mb-3">
              Du må oppgradere til <strong>Master</strong>, <strong>PhD</strong>{" "}
              eller <strong>Professor</strong> for å handle med ekte crypto på
              Binance.
            </p>
            <Button asChild className="bg-amber-600 hover:bg-amber-700">
              <Link href={`/${locale}/priser`}>
                Se abonnement
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  // If tier supports live trading but not connected yet
  if (!canSwitchToLive) {
    return (
      <>
        <Alert className="mb-6 bg-linear-to-r from-blue-50 to-indigo-50 border-blue-200">
          <Rocket className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <AlertTitle className="text-blue-900">
              Klar for ekte trading?
            </AlertTitle>
            <AlertDescription className="text-blue-700 mt-2">
              <p className="mb-3">
                Du har øvd med lekepenger. Koble til Binance-kontoen din for å
                handle med ekte crypto og få tilgang til avanserte funksjoner
                som copy trading.
              </p>

              <div className="flex flex-wrap gap-4 text-sm mb-4">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Ekte markedsutførelse</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>Pengene dine blir på Binance</span>
                </div>
              </div>

              <Button
                onClick={() => setShowConnectModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Koble til Binance-konto
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </AlertDescription>
          </div>
        </Alert>

        <ConnectBinanceModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
        />
      </>
    );
  }

  // User can switch to live — don't show banner
  return null;
}
