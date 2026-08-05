"use client";

import { Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export function HelpContactBlock() {
  const locale = useLocale();
  const t = useTranslations('helpPage');

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Email */}
      <div className="bg-blue-50 rounded-2xl p-8">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('contact.emailTitle')}</h2>
        <p className="text-gray-600 mb-4">
          {t('contact.emailDesc')}
        </p>
        <a
          href="mailto:post@klarpakke.no"
          className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
        >
          post@klarpakke.no
        </a>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('contact.linksTitle')}</h2>
        <ul className="space-y-3">
          <li>
            <Link href={`/${locale}/priser`} className="text-blue-600 hover:underline">
              {t('contact.pricingLink')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/personvern`} className="text-blue-600 hover:underline">
              {t('contact.privacyLink')}
            </Link>
          </li>
          <li>
            <Link href={`/${locale}/vilkar`} className="text-blue-600 hover:underline">
              {t('contact.termsLink')}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
