'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RiskDisclaimer } from '@/components/RiskDisclaimer'
import { 
  ExternalLink, 
  CheckCircle, 
  Shield, 
  TrendingDown,
  Wallet,
  ArrowRight,
  GraduationCap
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'

// Binance Referral Pro link
const BINANCE_REF_LINK = 'https://accounts.binance.com/register?ref=43427892'

export function BinanceGuideContent() {
  const t = useTranslations('binanceGuide')
  const locale = useLocale()
  const isNo = locale === 'no'

  const STEPS = [
    {
      number: '1',
      title: isNo ? 'Klikk på vår lenke' : 'Click our link',
      description: isNo 
        ? 'Bruk knappen nedenfor for å gå til Binance. Ved å bruke vår lenke får du lavere gebyrer på trading, og du støtter samtidig Klarpakke.'
        : 'Use the button below to go to Binance. By using our link, you get lower trading fees and support Klarpakke at the same time.',
      icon: ExternalLink
    },
    {
      number: '2',
      title: isNo ? 'Registrer deg' : 'Register',
      description: isNo
        ? 'Opprett konto med din e-postadresse og et sterkt passord. Bruk gjerne to-faktor-autentisering (2FA) for ekstra sikkerhet.'
        : 'Create an account with your email address and a strong password. Use two-factor authentication (2FA) for extra security.',
      icon: Shield
    },
    {
      number: '3',
      title: isNo ? 'Fullfør KYC (identitetskontroll)' : 'Complete KYC (identity verification)',
      description: isNo
        ? 'Binance krever verifisering av identitet (KYC) før du kan handle. Last opp legitimasjon (pass eller førerkort) og ta en selfie.'
        : 'Binance requires identity verification (KYC) before you can trade. Upload ID (passport or driver\'s license) and take a selfie.',
      icon: CheckCircle
    },
    {
      number: '4',
      title: isNo ? 'Sett inn penger' : 'Deposit funds',
      description: t('startSmall'),
      icon: Wallet
    },
    {
      number: '5',
      title: isNo ? 'Koble til Klarpakke' : 'Connect to Klarpakke',
      description: isNo
        ? 'Når du er klar, kan du koble Binance til din Klarpakke-lommebok på /no/konto via read-only API-nøkler.'
        : 'When ready, you can connect Binance to your Klarpakke wallet at /no/konto via read-only API keys.',
      icon: GraduationCap
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500 rounded-2xl mb-8 shadow-2xl shadow-yellow-500/20">
            <span className="text-3xl font-bold text-black">B</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            {isNo ? 'Slik kommer du i gang med ' : 'How to get started with '}{' '}
            <span className="text-yellow-400">Binance</span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
            {t('subtitle')}
          </p>

          {/* Hoved CTA */}
          <Button 
            size="lg"
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-8 py-6"
            asChild
          >
            <a href={BINANCE_REF_LINK} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-5 h-5 mr-2" />
              {isNo ? 'Opprett Binance-konto med vår lenke' : 'Create Binance account with our link'}
            </a>
          </Button>
          
          <p className="text-sm text-slate-500 mt-4">
            {isNo 
              ? 'Du får lavere gebyrer • Vi får støtte • Det koster deg ingenting ekstra'
              : 'You get lower fees • We get support • It costs you nothing extra'}
          </p>
        </div>
      </section>

      {/* Hvorfor Binance */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {isNo ? 'Hvorfor anbefaler vi Binance?' : 'Why do we recommend Binance?'}
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-500/10 rounded-xl">
                    <TrendingDown className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">
                      {isNo ? 'Lave gebyrer' : 'Low fees'}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {isNo 
                        ? 'Binance har blant de laveste trading-gebyrene i bransjen. Med vår lenke får du ytterligere rabatt.'
                        : 'Binance has among the lowest trading fees in the industry. With our link, you get additional discount.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">
                      {isNo ? 'Sikkerhet' : 'Security'}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {isNo
                        ? 'En av verdens største og mest sikre børser. Støtter to-faktor-autentisering (2FA) og cold storage.'
                        : 'One of the world\'s largest and most secure exchanges. Supports two-factor authentication (2FA) and cold storage.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <GraduationCap className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">
                      {isNo ? 'Støtter Klarpakke' : 'Supports Klarpakke'}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {isNo
                        ? 'Ved å bruke vår lenke støtter du vårt arbeid med å bygge Norges beste trading-utdanning.'
                        : 'By using our link, you support our work to build Norway\'s best trading education.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <Wallet className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">
                      {isNo ? 'Norsk støtte' : 'Norwegian support'}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {isNo
                        ? 'Binance har norskspråklig kundestøtte og aksepterer innskudd i NOK via bankoverføring.'
                        : 'Binance has Norwegian language customer support and accepts deposits in NOK via bank transfer.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stegvis guide */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {isNo ? 'Steg-for-steg guide' : 'Step-by-step guide'}
          </h2>

          <div className="space-y-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <Card key={step.number} className="border-slate-700/50 bg-slate-800/30">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-black">{step.number}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                          {step.title}
                          <Icon className="w-5 h-5 text-slate-400" />
                        </h3>
                        <p className="text-slate-400">{step.description}</p>
                        
                        {index === 0 && (
                          <Button 
                            className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                            asChild
                          >
                            <a href={BINANCE_REF_LINK} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              {isNo ? 'Gå til Binance' : 'Go to Binance'}
                            </a>
                          </Button>
                        )}
                        
                        {index === 4 && (
                          <Button 
                            variant="outline"
                            className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-800"
                            asChild
                          >
                            <a href={isNo ? '/no/konto' : '/en/konto'}>
                              {isNo ? 'Gå til Lommebok' : 'Go to Wallet'}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Hvordan vi tjener penger */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <Card className="border-emerald-500/20 bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-400 text-lg">?</span>
                </div>
                {isNo ? 'Hvordan vi tjener penger på dette' : 'How we make money from this'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                {isNo
                  ? 'Vi tror på full transparens. Her er nøyaktig hva som skjer når du bruker vår Binance-lenke:'
                  : 'We believe in full transparency. Here is exactly what happens when you use our Binance link:'}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-300">
                    <strong>{isNo ? 'Du får lavere gebyrer:' : 'You get lower fees:'}</strong>{' '}
                    {isNo
                      ? 'Ved å registrere deg via vår lenke, kan du få rabatt på trading-gebyrene dine (kickback).'
                      : 'By registering via our link, you can get a discount on your trading fees (kickback).'}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-300">
                    <strong>{isNo ? 'Vi får en liten andel:' : 'We get a small share:'}</strong>{' '}
                    {isNo
                      ? 'Binance deler en prosentandel av trading-gebyrene sine med oss via deres Referral Pro-program. Dette koster deg ingenting ekstra.'
                      : 'Binance shares a percentage of their trading fees with us via their Referral Pro program. This costs you nothing extra.'}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-300">
                    <strong>{isNo ? 'Du støtter Klarpakke:' : 'You support Klarpakke:'}</strong>{' '}
                    {isNo
                      ? 'Inntektene hjelper oss å holde undervisningen gratis eller rimelig for alle studenter.'
                      : 'The revenue helps us keep the education free or affordable for all students.'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 mt-4">
                <p className="text-sm text-slate-400">
                  <strong>{isNo ? 'Estimat:' : 'Estimate:'}</strong>{' '}
                  {isNo
                    ? 'Hvis du trader for 10 000 kr/måned, kan vi motta ca. 10-50 kr/måned i provisjon. Det høres kanskje ikke mye ut, men med mange studenter blir dette en bærekraftig måte å finansiere Klarpakke på.'
                    : 'If you trade for 10,000 NOK/month, we may receive approx. 10-50 NOK/month in commission. It may not sound like much, but with many students, this becomes a sustainable way to finance Klarpakke.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Vanlige spørsmål */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {isNo ? 'Vanlige spørsmål' : 'Frequently asked questions'}
          </h2>

          <div className="space-y-4">
            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  {isNo ? 'Må jeg bruke deres lenke?' : 'Do I have to use your link?'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  {isNo
                    ? 'Nei, du kan opprette Binance-konto direkte også. Men ved å bruke vår lenke får du lavere gebyrer og støtter vårt arbeid – uten at det koster deg noe ekstra.'
                    : 'No, you can create a Binance account directly too. But by using our link, you get lower fees and support our work – without it costing you anything extra.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  {isNo ? 'Er Binance trygt?' : 'Is Binance safe?'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  {isNo
                    ? 'Binance er verdens største kryptobørs med millioner av brukere. De har robust sikkerhet, inkludert 2FA og cold storage. Men som med all krypto: '
                    : 'Binance is the world\'s largest crypto exchange with millions of users. They have robust security, including 2FA and cold storage. But as with all crypto: '}{' '}
                  <strong>{isNo ? 'aldri invester mer enn du tåler å tape' : 'never invest more than you can afford to lose'}</strong>.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  {isNo ? 'Kan jeg koble Binance til Klarpakke?' : 'Can I connect Binance to Klarpakke?'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  {isNo ? 'Ja! Gå til ' : 'Yes! Go to '}{' '}
                  <a href={isNo ? '/no/konto' : '/en/konto'} className="text-blue-400 hover:underline">
                    {isNo ? 'din lommebok' : 'your wallet'}
                  </a>{' '}
                  {isNo
                    ? 'etter registrering. Der kan du koble til Binance via read-only API-nøkler. Dette lar oss vise din portefølje i sanntid.'
                    : 'after registration. There you can connect Binance via read-only API keys. This allows us to show your portfolio in real-time.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/30">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  {isNo ? 'Hva om jeg allerede har Binance?' : 'What if I already have Binance?'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  {isNo
                    ? 'Da kan du bare koble den eksisterende kontoen til din lommebok på /no/konto. Dessverre kan du ikke endre referral etter registrering, men du kan fortsatt bruke alle Klarpakkes funksjoner.'
                    : 'Then you can just connect your existing account to your wallet at /no/konto. Unfortunately, you cannot change the referral after registration, but you can still use all Klarpakke features.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Risk Disclaimer */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <RiskDisclaimer />
        </div>
      </section>

      {/* CTA bunn */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {isNo ? 'Klar til å komme i gang?' : 'Ready to get started?'}
          </h2>
          <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
            {isNo
              ? 'Opprett Binance-konto via vår lenke i dag. Du får lavere gebyrer, og du støtter vårt arbeid med å bygge Norges beste trading-utdanning.'
              : 'Create a Binance account via our link today. You get lower fees and support our work to build Norway\'s best trading education.'}
          </p>
          <Button 
            size="lg"
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-8 py-6"
            asChild
          >
            <a href={BINANCE_REF_LINK} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-5 h-5 mr-2" />
              {isNo ? 'Opprett Binance-konto' : 'Create Binance account'}
            </a>
          </Button>
          <p className="text-sm text-slate-500 mt-4">
            {t('timeEstimate')}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center text-slate-500 text-sm">
          <p>
            {isNo ? 'Har du spørsmål? Kontakt oss på ' : 'Have questions? Contact us at '}{' '}
            <a href="mailto:post@klarpakke.no" className="text-blue-400 hover:underline">
              post@klarpakke.no
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
