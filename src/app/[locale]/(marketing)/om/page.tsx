import { Metadata } from "next";
import { BRAND } from "@/lib/design/tokens";
import { 
  Target, 
  Users, 
  Shield, 
  TrendingUp,
  Award,
  MapPin,
  Building2,
  Mail,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import Image from "next/image";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return {
    title: "Om Klarpakke | Vår visjon og historie",
    description: "Klarpakke er Norges ledende plattform for krypto-utdanning og trading. Lær å handle kryptovaluta trygt og ansvarlig med våre kurs og verktøy.",
  };
}

const values = [
  {
    icon: Shield,
    title: "Sikkerhet først",
    description: "Vi prioriterer alltid brukernes sikkerhet. Fra paper-trading til avansert kryptering — din trygghet er vår jobb."
  },
  {
    icon: Target,
    title: "Kunnskap er makt",
    description: "Vi tror på å utdanne før vi handler. Våre kurs gir deg verktøyene du trenger for å ta informerte beslutninger."
  },
  {
    icon: Users,
    title: "Tilgjengelig for alle",
    description: "Krypto skal ikke være eksklusivt. Vi bygger verktøy som er enkle å bruke, uansett erfaringsnivå."
  },
  {
    icon: TrendingUp,
    title: "Datadrevet innsikt",
    description: "Vi bruker data og AI for å gi deg markedsinnsikt som tidligere var forbeholdt profesjonelle tradere."
  },
];

const milestones = [
  { year: "2023", title: "Klarpakke grunnlagt", description: "Startet med en visjon om å gjøre krypto trading tilgjengelig og trygt for nordmenn." },
  { year: "2024", title: "Lansering av akademi", description: "Lanserte vårt første kurstilbud med fokus på grunnleggende krypto-utdanning." },
  { year: "2024", title: "Paper Trading lansert", description: "Ga brukere muligheten til å øve risikofritt med 100 000 kr i lekepenger." },
  { year: "2025", title: "Auto-trading introdusert", description: "Lanserte AI-drevne trading-strategier for automatisert handel." },
];

export default async function OmPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0052FF] to-[#1e40af] pt-32 pb-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Vi gjør krypto
              <span className="block text-blue-200">tilgjengelig for alle</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-2xl">
              Klarpakke er Norges ledende plattform for krypto-utdanning og trading. 
              Vi kombinerer akademisk solid læring med praktiske verktøy for å gi deg 
              den beste starten på din krypto-reise.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Vår visjon
              </h2>
              <div className="space-y-4 text-lg text-slate-600 dark:text-slate-400">
                <p>
                  Vi tror at kunnskap om kryptovaluta og blockchain-teknologi vil være 
                  like viktig i fremtiden som kunnskap om aksjer og sparing er i dag.
                </p>
                <p>
                  Dessverre har krypto-markedet vært preget av useriøse aktører, 
                  komplekse plattformer og mangel på god utdanning. Det vil vi endre på.
                </p>
                <p>
                  Klarpakke ble grunnlagt med ett mål: Å gi nordmenn en trygg, 
                  pedagogisk og brukervennlig vei inn i krypto-verdenen.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-[#0052FF]/10 rounded-2xl flex items-center justify-center">
                    <Award className="w-8 h-8 text-[#0052FF]" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Org.nr</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">934 123 456</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Hovedkontor</p>
                      <p className="text-slate-600 dark:text-slate-400">Kongens gate 15, 7013 Trondheim</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">E-post</p>
                      <p className="text-slate-600 dark:text-slate-400">hei@klarpakke.no</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Juridisk navn</p>
                      <p className="text-slate-600 dark:text-slate-400">Klarpakke AS</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Våre verdier
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Dette er prinsippene som veileder alt vi gjør
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#0052FF]/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-[#0052FF]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{value.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Møt teamet
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Dedikerte mennesker som jobber for å gjøre krypto tilgjengelig
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                <span className="text-3xl">👨‍💼</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Tom Jensen</h3>
              <p className="text-[#0052FF] font-medium mb-4">Grunnlegger & CEO</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Entusiastisk krypto-investor med 5+ års erfaring. 
                Tom startet Klarpakke for å gjøre krypto tilgjengelig 
                for alle nordmenn, uavhengig av bakgrunn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white text-center mb-16">
            Vår reise
          </h2>
          
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 md:-translate-x-1/2" />
            
            {milestones.map((milestone, index) => (
              <div key={index} className={`relative flex items-start gap-8 mb-12 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className="hidden md:block w-1/2" />
                <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-[#0052FF] rounded-full border-4 border-white dark:border-slate-900 md:-translate-x-1/2" />
                <div className="ml-12 md:ml-0 md:w-1/2">
                  <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 ${index % 2 === 0 ? 'md:mr-8' : 'md:ml-8'}`}>
                    <span className="text-[#0052FF] font-bold text-lg">{milestone.year}</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 mb-2">{milestone.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{milestone.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Bli en del av fellesskapet
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Over 10 000 nordmenn har allerede startet sin krypto-reise med Klarpakke.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={hrefWithLocale(locale, "/register")}
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#0052FF] hover:bg-[#0047E0] text-white rounded-xl font-bold text-lg transition-all`}
            >
              Kom i gang gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href={hrefWithLocale(locale, "/kontakt")}
              className="px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Kontakt oss
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
