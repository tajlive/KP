"use client";

import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { useCopyTrading } from "@/lib/hooks/useCopyTrading";
import { useSubscription } from "@/lib/hooks/useSubscription";
import {
  AlertCircle,
  ChevronRight,
  Lock,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export function CopyTradingCard() {
  const {
    canCopyTrade,
    reason,
    paperTradesCount,
    currentMode,
    requirements,
    progress,
    isLoading,
    activeSessions,
  } = useCopyTrading();
  const { subscription, loading: subLoading } = useSubscription();
  const locale = useLocale();

  const [showDetails, setShowDetails] = useState(false);

  const tierSlug = subscription?.tier_slug ?? "student";
  const hasCopyTradingTier = ["master", "phd", "professor"].includes(tierSlug);
  const isComponentLoading = isLoading || subLoading;

  if (isComponentLoading) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Copy Trading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <p className="text-sm text-gray-500">Laster...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If tier doesn't support copy trading — show upgrade prompt
  if (!hasCopyTradingTier) {
    return (
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Copy Trading
              </CardTitle>
              <Lock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <CardDescription>Kopier topp-tradere automatisk</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <AlertDescription className="text-amber-700 text-sm">
              Copy trading krever <strong>Master</strong>, <strong>PhD</strong>{" "}
              eller <strong>Professor</strong> abonnement.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Oppgrader abonnement</p>
              <p className="text-xs text-gray-500">Fra 499 kr/mnd</p>
            </div>
            <Button asChild size="sm">
              <Link href={`/${locale}/priser`}>
                Oppgrader
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">Hvorfor copy trading?</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Kopier eksperter mens du lærer</li>
              <li>Automatisk replikering av trades</li>
              <li>Spar tid og reduser risiko</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rest of original logic for users with correct tier
  return (
    <TooltipProvider>
      <Card className={!canCopyTrade ? "border-amber-200 bg-amber-50/30" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Copy Trading
              </CardTitle>
              {!canCopyTrade && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="w-4 h-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{reason}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {canCopyTrade && (
              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                Tilgjengelig
              </span>
            )}
          </div>
          <CardDescription>Kopier topp-tradere automatisk</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!canCopyTrade ? (
            <div className="space-y-4">
              {/* Locked Message */}
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <AlertDescription className="text-amber-700 text-sm">
                  {reason}
                </AlertDescription>
              </Alert>

              {/* Progress for Paper Trades */}
              {currentMode === "paper" &&
                paperTradesCount < requirements.minPaperTrades && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Paper trades fullført
                      </span>
                      <span className="font-medium">
                        {paperTradesCount} / {requirements.minPaperTrades}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-gray-500">
                      Fullfør {requirements.minPaperTrades - paperTradesCount}{" "}
                      flere trades for å låse opp
                    </p>
                  </div>
                )}

              {/* Switch to live mode option */}
              {currentMode === "paper" &&
                paperTradesCount >= requirements.minPaperTrades && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-blue-900">
                        Klar for live trading?
                      </p>
                      <p className="text-xs text-blue-700">
                        Du har nok erfaring fra lekepenger
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/${locale}/dashboard?connect=binance`}>
                        Gå Live
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}

              {/* Educational message */}
              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">
                  Hvorfor er copy trading låst?
                </p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Du lærer mer ved å handle selv først</li>
                  <li>Forstå strategier før du kopierer dem</li>
                  <li>Bygg risikostyringsferdigheter</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Unlocked State */
            <div className="space-y-4">
              {activeSessions && activeSessions.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div>
                      <p className="font-semibold text-emerald-900">
                        Aktiv Kopiering
                      </p>
                      <p className="text-xs text-emerald-700">
                        Du kopierer {activeSessions.length} trader
                        {activeSessions.length > 1 ? "e" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-emerald-600">
                        {activeSessions[0].totalPnl > 0 ? "+" : ""}
                        {activeSessions[0].totalPnl.toFixed(0)} NOK
                      </span>
                      <span className="text-[10px] text-emerald-500">
                        ({activeSessions[0].totalPnlPercent}%)
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Siste aktivitet fra:{" "}
                    <span className="font-medium text-slate-700">
                      {activeSessions[0].sourceTraderName}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-bold">12</p>
                    <p className="text-xs text-gray-500">Topp-tradere</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="text-lg font-bold">+24.5%</p>
                    <p className="text-xs text-gray-500">Snitt avkastning</p>
                  </div>
                </div>
              )}

              <Button asChild className="w-full">
                <Link href={`/${locale}/copy-trading`}>
                  <Users className="w-4 h-4 mr-2" />
                  {activeSessions && activeSessions.length > 0
                    ? "Administrer kopiering"
                    : "Se topp-tradere"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>

              {!activeSessions ||
                (activeSessions.length === 0 && (
                  <p className="text-xs text-center text-gray-500">
                    Copy trading er aktivt. Finn en trader å kopiere fra
                    Leaderboard.
                  </p>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
