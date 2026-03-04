"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  BookOpen,
  Bug,
  Calendar,
  CheckCircle,
  GraduationCap,
  Mail,
  MessageCircle,
  Users,
} from "lucide-react";
import { useLocale } from "next-intl";

const WHAT_WE_TEST = [
  "Signup-flow – Funker registreringen smertefritt?",
  "E-post – Får du velkomst-mailen?",
  "Innlogging – Kan du sjekke din status?",
  "Design – Ser det bra ut på mobil/desktop?",
  "Ytelse – Hvor raskt laster sidene?",
];

const COMING_FEATURES = [
  {
    date: "Før 15. februar",
    items: ["Discord server", "Onboarding-video", "Kursplattform (delvis)"],
  },
  {
    date: "15. februar (Launch)",
    items: [
      "Full kursside",
      "Modul 1: Krypto-grunnlag",
      "Quiz etter hver modul",
      "Paper trading (1M NOK startkapital)",
    ],
  },
  {
    date: "Etter lansering",
    items: [
      "Live trading-signaler",
      "Community-chat",
      "Weekly Q&A",
      "Sertifisering",
    ],
  },
];

export function BetaTestingContent() {
  const locale = useLocale();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-emerald-500/10">
              <GraduationCap className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-blue-400 font-medium">
              Beta Testing Guide
            </span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Velkommen som Beta-tester
          </h1>

          <p className="text-xl text-slate-400">
            Du er en av de første 100 studentene ved Klarpakke Universitet. Her
            er alt du trenger å vite om beta-perioden.
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">100</p>
                <p className="text-sm text-slate-400">Beta-plasser</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">15. feb</p>
                <p className="text-sm text-slate-400">Oppstart</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6 text-center">
                <BookOpen className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">4 uker</p>
                <p className="text-sm text-slate-400">Til Master Trader</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">
            Slik fungerer betaen
          </h2>

          <div className="space-y-4">
            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      Registrer deg
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Gå til{" "}
                      <a
                        href={`/${locale}/opptak`}
                        className="text-blue-400 hover:underline"
                      >
                        klarpakke.no/{locale}/opptak
                      </a>{" "}
                      og fyll ut skjemaet. Du får tildelt et studentnummer
                      (f.eks. #7/100) og en velkomst-epost.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      Sjekk din status
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Bruk{" "}
                      <a
                        href={`/${locale}/innlogging`}
                        className="text-blue-400 hover:underline"
                      >
                        innloggingssiden
                      </a>{" "}
                      for å bekrefte at du er registrert og se din personlige
                      fremdrifts-sjekkliste.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      Forbered deg
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Følg med på e-post for guider til paper trading og trading
                      journal. Merk 15. februar i kalenderen!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What we test */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Hva tester vi?</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {WHAT_WE_TEST.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50"
              >
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Veien fremover</h2>

          <div className="space-y-6">
            {COMING_FEATURES.map((period, index) => (
              <div key={index} className="relative">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <h3 className="font-semibold text-white">{period.date}</h3>
                </div>
                <div className="ml-6 space-y-2">
                  {period.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center gap-2 text-slate-400 text-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report bugs */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <Card className="border-slate-700/50 bg-slate-800/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bug className="w-5 h-5 text-amber-400" />
                Rapporter feil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-4">
                Fant du noe som ikke fungerer? Send oss en e-post med:
              </p>
              <ul className="space-y-2 text-sm text-slate-400 mb-6">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  Hva prøvde du å gjøre?
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  Hva skjedde?
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  Hva forventet du?
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  Skjermbilde (hvis relevant)
                </li>
              </ul>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                asChild
              >
                <a href="mailto:post@klarpakke.no?subject=Beta%20feedback">
                  <Mail className="w-4 h-4 mr-2" />
                  Send feedback
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Support */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Support</h2>

          <div className="flex flex-col sm:flex-row gap-4">
            <Card className="flex-1 border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white">E-post</p>
                  <a
                    href="mailto:post@klarpakke.no"
                    className="text-blue-400 hover:underline text-sm"
                  >
                    post@klarpakke.no
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <MessageCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Discord</p>
                  <p className="text-slate-400 text-sm">
                    Lenke i velkomst-epost
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Klar til å bli en del av de 100 første?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-emerald-600"
              asChild
            >
              <a href={`/${locale}/opptak`}>
                Registrer deg nå
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              asChild
            >
              <a href={`/${locale}/innlogging`}>Sjekk din status</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto text-center text-slate-500 text-sm">
          <p>Beta Testing Guide • Klarpakke Universitet</p>
        </div>
      </footer>
    </div>
  );
}
