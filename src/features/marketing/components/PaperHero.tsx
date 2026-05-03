
import { GraduationCap, PlayCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { hrefWithLocale } from "@/i18n/href-with-locale";

interface PaperHeroProps {
  locale: string;
}

export function PaperHero({ locale }: PaperHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-600 to-emerald-800 pt-32 pb-20 md:pt-40 md:pb-32">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-6">
            <GraduationCap className="w-4 h-4" />
            <span>100% gratis å prøve</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Øv på trading
            <span className="block text-emerald-200">uten å risikere penger</span>
          </h1>
          
          <p className="text-lg md:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Start med 100 000 kr i lekepenger. Test strategier, lær markedene, 
            og bli klar til å trade med ekte penger — helt risikofritt.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={hrefWithLocale(locale, "/register")}
              className="px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg shadow-xl hover:bg-emerald-50 transition-all duration-200 inline-flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Start nå — det er gratis
            </Link>
            <Link
              href={hrefWithLocale(locale, "/login")}
              className="px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-200 inline-flex items-center justify-center"
            >
              Logg inn
            </Link>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Ingen kredittkort</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Real-time data</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Ubegrenset øving</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
