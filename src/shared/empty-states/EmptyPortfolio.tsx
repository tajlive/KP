
import { Wallet, ArrowRight, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import Link from "next/link";

interface EmptyPortfolioProps {
  hasRealAccount?: boolean;
  locale?: string;
}

export function EmptyPortfolio({
  hasRealAccount,
  locale = "no",
}: EmptyPortfolioProps) {
  const isNorwegian = locale === "no";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Animated Illustration */}
      <div className="relative w-48 h-48 mb-8">
        {/* Background glow */}
        <div className="absolute inset-0 bg-linear-to-br from-blue-500/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse" />

        {/* Floating coins animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Main wallet */}
            <div className="relative z-10 w-24 h-24 bg-linear-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
              <Wallet className="w-12 h-12 text-white" />
            </div>

            {/* Floating elements */}
            <div
              className="absolute -top-4 -right-4 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm animate-bounce"
              style={{ animationDelay: "0s", animationDuration: "2s" }}
            >
              ₿
            </div>
            <div
              className="absolute -bottom-2 -left-6 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs animate-bounce"
              style={{ animationDelay: "0.5s", animationDuration: "2.5s" }}
            >
              Ξ
            </div>
            <div
              className="absolute top-0 -left-8 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs animate-bounce"
              style={{ animationDelay: "1s", animationDuration: "3s" }}
            >
              $
            </div>
          </div>
        </div>

        {/* Sparkles */}
        <Sparkles className="absolute top-4 right-8 w-6 h-6 text-yellow-400 animate-pulse" />
        <Sparkles
          className="absolute bottom-8 left-8 w-4 h-4 text-blue-400 animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      {/* Text Content */}
      <h3 className="text-2xl font-bold text-white mb-3">
        {isNorwegian ? "Ingen investeringer ennå!" : "No investments yet!"}
      </h3>

      <p className="text-slate-400 max-w-md mb-2 leading-relaxed">
        {isNorwegian
          ? "Porteføljen din er tom. Start med lekepenger for å øve uten risiko, eller koble til Binance for ekte trading."
          : "Your portfolio is empty. Start with paper trading to practice risk-free, or connect Binance for live trading."}
      </p>

      {/* Benefits list */}
      <div className="flex flex-wrap justify-center gap-4 mb-8 mt-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="w-3 h-3 text-green-400" />
          </div>
          {isNorwegian ? "100 000 kr lekepenger" : "100,000 NOK virtual money"}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-400 text-xs font-bold">0%</span>
          </div>
          {isNorwegian ? "Ingen risiko" : "No risk"}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          size="lg"
          className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl px-8 shadow-lg shadow-blue-600/20"
          asChild
        >
          <Link href={`/${locale}/dashboard/trade?mode=paper`}>
            {isNorwegian ? "Start lekepenger" : "Start Paper Trading"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </Button>

        {!hasRealAccount && (
          <Button
            size="lg"
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5 rounded-xl px-8"
            asChild
          >
            <Link href={`/${locale}/dashboard`}>
              {isNorwegian ? "Koble til Binance" : "Connect Binance"}
            </Link>
          </Button>
        )}
      </div>

      {/* Trust indicators */}
      <div className="mt-8 flex items-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          {isNorwegian
            ? "Real-time data fra Binance"
            : "Real-time data from Binance"}
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          {isNorwegian ? "Sikker øvingsplattform" : "Secure practice platform"}
        </span>
      </div>
    </div>
  );
}
