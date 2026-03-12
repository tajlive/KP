'use client';

import { Check, X, Sparkles, Zap } from 'lucide-react';

export default function ComparisonSection() {
  const features = [
    { name: 'Norsk språk', klarpakke: true, tradingskolen: true, nordic: false },
    { name: 'Paper trading med ekte data', klarpakke: true, tradingskolen: 'Begrenset', nordic: false },
    { name: 'Læringsassistent', klarpakke: 'Ubegrenset', tradingskolen: 'Ikke tilgjengelig', nordic: false },
    { name: 'Strukturerte videokurs', klarpakke: true, tradingskolen: 'Kun live webinar', nordic: true },
    { name: 'Lær i ditt eget tempo', klarpakke: true, tradingskolen: false, nordic: true },
    { name: 'Sertifikat ved fullføring', klarpakke: true, tradingskolen: false, nordic: 'Delvis' },
    { name: 'Ingen broker-tvang', klarpakke: true, tradingskolen: false, nordic: true },
    { name: 'Copy-trading (kommer)', klarpakke: 'Snart', tradingskolen: false, nordic: false },
    { name: 'Månedlig pris', klarpakke: '249-999 kr', tradingskolen: 'Gratis*', nordic: '21 200 kr' },
  ];

  const renderCell = (value: boolean | string, isKlarpakke = false) => {
    if (value === true) {
      return (
        <div className="flex items-center justify-center">
          <div className={`w-7 h-7 rounded-full ${
            isKlarpakke 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/50' 
              : 'bg-green-100 dark:bg-green-900/30'
          } flex items-center justify-center`}>
            <Check className={`w-4 h-4 ${
              isKlarpakke 
                ? 'text-white' 
                : 'text-green-600 dark:text-green-400'
            }`} />
          </div>
        </div>
      );
    }
    if (value === false) {
      return (
        <div className="flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
        </div>
      );
    }
    return (
      <div className={`text-center text-sm font-medium ${
        isKlarpakke 
          ? 'text-blue-600 dark:text-blue-400 font-semibold' 
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {value}
      </div>
    );
  };

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" />
            Sammenligning
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Hvorfor Klarpakke?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Samme kvalitet som dyre kurs. På norsk. 97% billigere enn konkurrentene.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="relative">
          {/* Spotlight badge for Klarpakke column */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 md:left-[42%] z-10">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Beste valg
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden mt-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 dark:from-gray-800 dark:via-blue-900/20 dark:to-gray-800">
                    <th className="px-6 py-5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Funksjoner
                    </th>
                    <th className="px-6 py-5 text-center bg-gradient-to-b from-blue-600 to-indigo-600 text-white relative">
                      {/* Highlight glow */}
                      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none" />
                      <div className="relative">
                        <div className="text-xl font-black mb-1 flex items-center justify-center gap-2">
                          Klarpakke
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-medium opacity-90">
                          Du er her
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tradingskolen
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nordic Markets
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {features.map((feature, idx) => (
                    <tr 
                      key={idx} 
                      className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </td>
                      <td className="px-6 py-4 bg-blue-50/30 dark:bg-blue-900/10 group-hover:bg-blue-100/50 dark:group-hover:bg-blue-900/20 transition-colors">
                        {renderCell(feature.klarpakke, true)}
                      </td>
                      <td className="px-6 py-4">
                        {renderCell(feature.tradingskolen)}
                      </td>
                      <td className="px-6 py-4">
                        {renderCell(feature.nordic)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer notes */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-850 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-3 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">*</span>
                  <span>Tradingskolen er gratis, men krever bruk av deres broker (skjulte kostnader i spreads/fees)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                  <span>Nordic Markets pris er for 3-måneders program</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Alt du trenger for å lære trading. <span className="font-bold text-gray-900 dark:text-white">På norsk.</span> <span className="font-bold text-blue-600">Til en brukdel av prisen.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
