'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  GraduationCap,
  Target,
  Wallet,
  BookOpen,
  ArrowRight,
  Sparkles,
  Shield
} from 'lucide-react'
import { useParams } from 'next/navigation'

const BETA_BENEFITS = [
  {
    icon: Wallet,
    title: 'Paper Trading',
    description: 'Øv med 1 million kroner i lekepenger – helt risikofritt'
  },
  {
    icon: BookOpen,
    title: 'Trading Journal',
    description: 'Systematisk logging av trades for å bygge gode vaner'
  },
  {
    icon: Target,
    title: 'Direkte påvirkning',
    description: 'Din feedback formater kurset – du er med på å bygge Norges beste trading-utdanning'
  },
  {
    icon: Sparkles,
    title: 'KLT-poeng (Early Adopter)',
    description: 'Beta-studenter får ekstra poeng som kan brukes på fremtidige kurs og verktøy'
  }
]

const WHAT_HAPPENS_NOW = [
  {
    step: '1',
    title: 'Sjekk din status',
    description: 'Bekreft at du er registrert og se ditt studentnummer',
    action: 'Sjekk status',
    href: '/LOCALE/innlogging',
    primary: true
  },
  {
    step: '2',
    title: 'Les beta-guiden',
    description: 'Forstå hva du kan forvente av beta-perioden',
    action: 'Les guiden',
    href: '/LOCALE/beta-testing',
    primary: false
  },
  {
    step: '3',
    title: 'Vent på oppstart',
    description: '15. februar 2026 starter vi! Du får mer info på e-post',
    action: null,
    href: null,
    primary: false
  }
]

export function VelkommenContent() {
  const params = useParams();
  const locale = (params?.locale as string) || 'no';
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl mb-8 shadow-2xl shadow-blue-500/20">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Velkommen til{' '}
            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-pink-400 bg-clip-text text-transparent">
              Klarpakke Universitet
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            Du er nå en del av Norges første krypto-universitet.
            Sammen skal vi bygge den beste trading-utdanningen for nordmenn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-lg px-8"
              asChild
            >
              <a href={`/${locale}/innlogging`}>
                Sjekk din status
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              asChild
            >
              <a href={`/${locale}/beta-testing`}>
                Les beta-guiden
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* What happens now */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Hva skjer nå?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {WHAT_HAPPENS_NOW.map((item) => (
              <Card
                key={item.step}
                className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm relative overflow-hidden"
              >
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center text-sm font-bold text-slate-400">
                  {item.step}
                </div>
                <CardHeader>
                  <CardTitle className="text-white text-lg">{item.title}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                {item.action && (
                  <CardContent>
                    <Button
                      variant={item.primary ? 'default' : 'outline'}
                      size="sm"
                      className={item.primary
                        ? 'bg-gradient-to-r from-blue-600 to-emerald-600'
                        : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      }
                      asChild
                    >
                      <a href={item.href!.replace('/LOCALE/', `/${locale}/`)}>
                        {item.action}
                        {item.primary && <ArrowRight className="w-4 h-4 ml-2" />}
                      </a>
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Beta benefits */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Hva du får i betaen
            </h2>
            <p className="text-slate-400">
              Som en av de første 100 studentene får du eksklusive fordeler
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {BETA_BENEFITS.map((benefit) => {
              const Icon = benefit.icon
              return (
                <Card
                  key={benefit.title}
                  className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-emerald-500/10">
                        <Icon className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                        <p className="text-sm text-slate-400">{benefit.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Safety notice */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-400 mb-2">100% Paper Trading i starten</h3>
                  <p className="text-amber-300/80 text-sm leading-relaxed">
                    I beta-perioden bruker vi kun lekepenger (paper trading).
                    Dette betyr at du kan øve og lære uten å risikere ekte penger.
                    Fokuset er på å bygge kunnskap og gode vaner før du eventuelt går over til ekte trading.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Klar til å starte?
          </h2>
          <p className="text-slate-400 mb-8">
            Sjekk at du er registrert og se frem til oppstart 15. februar!
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-lg px-8"
            asChild
          >
            <a href={`/${locale}/innlogging`}>
              Sjekk din status nå
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center text-slate-500 text-sm">
          <p>Spørsmål? Kontakt oss på{' '}
            <a href="mailto:post@klarpakke.no" className="text-blue-400 hover:text-blue-300">
              post@klarpakke.no
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
