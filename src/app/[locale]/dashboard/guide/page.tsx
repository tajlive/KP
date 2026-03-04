"use client";

import { useLocale } from "next-intl";
import Link from "next/link";

const steps = [
  {
    icon: "1",
    titleNo: "Velg modus: Paper eller Live",
    titleEn: "Choose mode: Paper or Live",
    descNo:
      "Start alltid med Paper Trading (ovemodus). Her bruker du virtuell kapital og kan ove uten risiko. Nar du er komfortabel, bytt til Live Trading.",
    descEn:
      "Always start with Paper Trading (practice mode). You use virtual capital and can practice risk-free. When comfortable, switch to Live Trading.",
  },
  {
    icon: "2",
    titleNo: "Velg en strategi",
    titleEn: "Choose a strategy",
    descNo:
      "Vi tilbyr 4 strategier: DCA (manedlig sparing, lav risiko), Trendhandel (moderat risiko), Grid Trading (hoyere risiko), og Kombinert (ekspert). Start med DCA om du er nybegynner.",
    descEn:
      "We offer 4 strategies: DCA (monthly savings, low risk), Trend Trading (moderate risk), Grid Trading (higher risk), and Combined (expert). Start with DCA if you are a beginner.",
  },
  {
    icon: "3",
    titleNo: "Folg med pa resultater",
    titleEn: "Track your results",
    descNo:
      "Dashboardet viser portefolieverdi, antall handler, vinnerprosent og P&L i sanntid. Alle handler logges i handelshistorikken.",
    descEn:
      "The dashboard shows portfolio value, trade count, win rate and P&L in real-time. All trades are logged in the trade history.",
  },
  {
    icon: "4",
    titleNo: "Oppgrader til Live Trading",
    titleEn: "Upgrade to Live Trading",
    descNo:
      "Nar du er klar: koble til Binance-kontoen din, velg et abonnement, og start ekte handel. Systemet bruker samme strategier som paper trading.",
    descEn:
      "When ready: connect your Binance account, choose a subscription, and start real trading. The system uses the same strategies as paper trading.",
  },
];

export default function GuidePage() {
  const locale = useLocale();
  const isNo = locale === "no";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {isNo ? "Kom i gang med trading" : "Getting started with trading"}
        </h1>
        <p className="text-gray-400">
          {isNo
            ? "Fire enkle steg for a starte din forste trading-sesjon."
            : "Four simple steps to start your first trading session."}
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step, i) => (
          <div
            key={i}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex gap-6 items-start"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
              {step.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {isNo ? step.titleNo : step.titleEn}
              </h3>
              <p className="text-gray-400">
                {isNo ? step.descNo : step.descEn}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-900/50 to-emerald-900/50 rounded-lg p-6 border border-blue-700/50">
        <h3 className="text-lg font-semibold text-white mb-2">
          {isNo ? "Klar til a starte?" : "Ready to start?"}
        </h3>
        <p className="text-gray-300 mb-4">
          {isNo
            ? "Ga til trading-dashboardet og velg din forste strategi."
            : "Go to the trading dashboard and choose your first strategy."}
        </p>
        <Link
          href={`/${locale}/dashboard/trading`}
          className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
        >
          {isNo ? "Apne Trading Dashboard" : "Open Trading Dashboard"}
        </Link>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          {isNo ? "Ofte stilte sporsmal" : "FAQ"}
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-white">
              {isNo
                ? "Kan jeg tape ekte penger i paper trading?"
                : "Can I lose real money in paper trading?"}
            </h4>
            <p className="text-gray-400 text-sm mt-1">
              {isNo
                ? "Nei. Paper trading bruker kun virtuell kapital. Du kan ove sa mye du vil uten risiko."
                : "No. Paper trading uses only virtual capital. You can practice as much as you want without risk."}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white">
              {isNo
                ? "Hvilken strategi bor jeg starte med?"
                : "Which strategy should I start with?"}
            </h4>
            <p className="text-gray-400 text-sm mt-1">
              {isNo
                ? "DCA (Manedlig Sparing) er best for nybegynnere. Den kjoper automatisk med jevne mellomrom og reduserer risiko over tid."
                : "DCA (Monthly Savings) is best for beginners. It buys automatically at regular intervals, reducing risk over time."}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white">
              {isNo
                ? "Hva trenger jeg for live trading?"
                : "What do I need for live trading?"}
            </h4>
            <p className="text-gray-400 text-sm mt-1">
              {isNo
                ? "En Binance-konto med API-nokkler, og et aktivt abonnement pa Klarpakke."
                : "A Binance account with API keys, and an active Klarpakke subscription."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
