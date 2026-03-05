"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Shield, Trophy, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ClientLeagueDetails() {
  const params = useParams<any>() as { id?: string; locale?: string } | null;
  const id = (params as Record<string, string>)?.id;
  const t = useTranslations("leagues");
  const locale = useLocale();

  // Mock data - in real app fetch via id
  const league = {
    id: id,
    title: "Februar Mesterskap 2026",
    description:
      locale === "no"
        ? "Bli med i vår månedlige trading-konkurranse! Alle starter med 100,000 virtuelle kroner. Den med høyest avkastning ved månedens slutt vinner 5000kr i Bitcoin."
        : "Join our monthly trading competition! Everyone starts with 100,000 virtual kroner. The one with the highest return at the end of the month wins 5000kr in Bitcoin.",
    prize_pool: "5 000 NOK",
    start_date: "2026-02-01",
    end_date: "2026-02-28",
    participants_count: 142,
    rules:
      locale === "no"
        ? [
            "Startkapital: 100,000 virtuelle NOK",
            "Maks giring: 5x",
            "Kun topp 50 krypto-valutaer er tillatt",
            "Minimum 5 trades må gjennomføres for å kvalifisere",
          ]
        : [
            "Starting capital: 100,000 virtual NOK",
            "Max leverage: 5x",
            "Only top 50 cryptocurrencies allowed",
            "Minimum 5 trades required to qualify",
          ],
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/leagues"
          className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {locale === "no" ? "Tilbake til ligaer" : "Back to leagues"}
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-600/20 text-blue-400 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                  {locale === "no" ? "Aktiv Nå" : "Active Now"}
                </span>
                <span className="text-slate-400 text-sm flex items-center gap-1">
                  <Users className="w-4 h-4" /> {league.participants_count}{" "}
                  {t("participants")}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {league.title}
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
                {league.description}
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6 min-w-[200px] text-center">
              <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">
                {t("prize")}
              </p>
              <p className="text-2xl font-bold text-white">
                {league.prize_pool}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                {locale === "no" ? "Regler" : "Rules"}
              </h3>
              <ul className="space-y-3">
                {league.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                {locale === "no" ? "Tidslinje" : "Timeline"}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-slate-300 bg-slate-800/50 p-3 rounded-lg">
                  <span>{locale === "no" ? "Start" : "Start"}</span>
                  <span className="font-mono">
                    {new Date(league.start_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300 bg-slate-800/50 p-3 rounded-lg">
                  <span>{locale === "no" ? "Slutt" : "End"}</span>
                  <span className="font-mono">
                    {new Date(league.end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex justify-center">
            <Button className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold py-6 px-12 text-lg rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all">
              {t("joinLeague")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
