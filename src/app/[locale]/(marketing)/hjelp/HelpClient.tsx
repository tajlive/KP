"use client";

import { useState } from "react";
import { Search, ChevronDown, BookOpen, Shield, CreditCard, MessageCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { HelpContactBlock } from "@/features/marketing/components";

export function HelpClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations('helpPage');

  const faqs = [
    {
      q: t('faqs.0.q'),
      a: t('faqs.0.a'),
      icon: BookOpen,
    },
    {
      q: t('faqs.1.q'),
      a: t('faqs.1.a'),
      icon: CreditCard,
    },
    {
      q: t('faqs.2.q'),
      a: t('faqs.2.a'),
      icon: Shield,
    },
    {
      q: t('faqs.3.q'),
      a: t('faqs.3.a'),
      icon: XCircle,
    },
    {
      q: t('faqs.4.q'),
      a: t('faqs.4.a'),
      icon: MessageCircle,
    },
    {
      q: t('faqs.5.q'),
      a: t('faqs.5.a'),
      icon: BookOpen,
    },
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-linear-to-b from-blue-50 to-white pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-600">{t('subtitle')}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Search */}
        <div className="relative mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* FAQs */}
        <div className="space-y-4 mb-16">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('noResults', { query: searchQuery })}</p>
              <p className="text-sm mt-2">{t('tryAnother')}</p>
            </div>
          ) : (
            filteredFaqs.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center gap-4 p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <faq.icon className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="font-medium text-gray-900 flex-1">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 pl-16 text-gray-600 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Section - Using shared component */}
        <HelpContactBlock />
      </div>
    </div>
  );
}
