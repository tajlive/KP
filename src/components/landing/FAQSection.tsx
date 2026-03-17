'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';

export default function FAQSection() {
  const locale = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Trenger jeg kunnskap om trading fra før?',
      answer: 'Nei, du trenger ingen forkunnskaper. Våre kurs starter fra grunnleggende konsepter og bygger seg gradvis opp. Alt er forklart på norsk med praktiske eksempler. Du lærer steg-for-steg, fra de mest grunnleggende prinsippene til avanserte strategier.',
    },
    {
      question: 'Hva er lekepenger?',
      answer: 'Lekepenger betyr at du trader med simulert kapital (100 000 kr) i et trygt miljø. Du får øve på å kjøpe og selge krypto, sette stop-loss, og teste strategier uten å risikere ekte penger. Det er som en flysimulator for trading — du lærer uten konsekvenser.',
    },
    {
      question: 'Kan jeg få pengene tilbake hvis jeg ikke er fornøyd?',
      answer: 'Ja, vi tilbyr 14 dagers full refusjon. Hvis du ikke er fornøyd av noen grunn, sender vi pengene tilbake uten spørsmål. Det er vår personlige garanti til deg.',
    },
    {
      question: 'Hvor lang tid tar det å lære?',
      answer: 'De fleste fullfører grunnkurset på 1-2 uker ved å bruke 30-60 minutter per dag. Du bestemmer selv tempo. Kurset er tilgjengelig 24/7, så du kan lære når det passer deg best. Noen bruker lengre tid, andre kortere — det viktigste er at du lærer grundig.',
    },
    {
      question: 'Er dette en snarvei til raske penger?',
      answer: 'Nei, trading er en ferdighet som krever læring, øvelse og disiplin. Vårt mål er å gi deg solid kunnskap som gjør deg til en informert og ansvarlig trader. Vi fokuserer på langsiktig læring, ikke urealistiske løfter om raske penger.',
    },
    {
      question: 'Hvilke betalingsmetoder aksepterer dere?',
      answer: 'Vi aksepterer Visa, Mastercard, Apple Pay og Google Pay via Stripe. Betalingen er 100% sikker og SSL-kryptert. Vi lagrer aldri kortinformasjonen din.',
    },
    {
      question: 'Fungerer dette på mobil?',
      answer: 'Ja, hele plattformen er mobil-optimalisert. Du kan ta kurs, gjøre paper trades, og chatte med læringsassistenten fra telefonen din. Lær hvor som helst, når som helst.',
    },
    {
      question: 'Hva om jeg har spørsmål underveis?',
      answer: 'Læringsassistenten vår er tilgjengelig når som helst og svarer på norsk. I tillegg har du tilgang til community hvor du kan stille spørsmål og dele erfaringer med andre studenter. Vi svarer også på e-post innen 24 timer.',
    },
    {
      question: 'Må jeg bruke en spesifikk broker?',
      answer: 'Nei, Klarpakke er helt uavhengig. Du velger selv hvilken broker du vil bruke når du er klar til å trade med ekte penger. Vi gir deg kunnskapen — du bestemmer selv hvor du vil trade.',
    },
    {
      question: 'Hva skjer etter jeg fullfører kurset?',
      answer: 'Du får et digitalt sertifikat som bekrefter at du har fullført kurset. Du beholder tilgang til alt innhold for alltid, inkludert framtidige oppdateringer. Du kan også oppgradere til høyere planer for mer avanserte funksjoner når du er klar.',
    },
  ];

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-6">
            <HelpCircle className="w-4 h-4" />
            Spørsmål & Svar
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Ofte stilte spørsmål
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Alt du trenger å vite før du starter
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-700 transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <span className="font-bold text-gray-900 dark:text-white pr-8 text-base">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 dark:text-gray-400 shrink-0 transition-transform duration-300 ${
                    openIndex === idx ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Har du flere spørsmål?
          </p>
          <a
            href={`/${locale}/kontakt`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all hover:scale-105"
          >
            Kontakt oss
          </a>
        </motion.div>
      </div>
    </section>
  );
}
