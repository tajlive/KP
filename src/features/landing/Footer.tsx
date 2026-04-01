'use client';

import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { PaymentTrustLogos } from './PaymentTrustLogos';
import { useVippsMarket } from '@/shared/providers/VippsMarketProvider';
import { GlassCard } from '@/shared/ui/GlassCard';

export function Footer() {
  const [currentYear, setCurrentYear] = useState(2026);
  const locale = useLocale();
  const t = useTranslations('footer');
  const { showVipps } = useVippsMarket();

  const footerLinks = {
    product: [
      { href: '/kurs', label: t('links.courses') },
      { href: '/priser', label: t('links.pricing') },
      { href: '/paper-trading', label: t('links.paperTrading') },
      { href: '/kalkulator', label: t('links.calculator') },
    ],
    company: [
      { href: '/om-oss', label: t('links.about') },
      { href: '/kontakt', label: t('links.contact') },
      { href: '/hjelp', label: t('links.help') },
    ],
    legal: [
      { href: '/personvern', label: t('links.privacy') },
      { href: '/vilkar', label: t('links.terms') },
    ],
  };

  const socialLinks = [
    {
      name: 'Twitter/X',
      href: 'https://twitter.com/klarpakke',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/klarpakke',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="relative bg-kp-bg-primary border-t border-kp-border pt-16 pb-8">
      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-kp-brand/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-bold text-kp-text-primary">Klarpakke</span>
            </Link>
            <p className="text-sm text-kp-text-tertiary mb-6 max-w-xs">
              {t('description', { defaultValue: 'Norges første krypto-trading skole. Lær å handle trygt med paper trading.' })}
            </p>
            
            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-kp-surface-highlight flex items-center justify-center text-kp-text-tertiary hover:text-kp-text-primary hover:bg-kp-surface-elevated transition-colors"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          <div>
            <h3 className="text-sm font-semibold text-kp-text-primary mb-4">
              {t('headings.product')}
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/${locale}${link.href}`}
                    className="text-sm text-kp-text-tertiary hover:text-kp-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-kp-text-primary mb-4">
              {t('headings.company')}
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/${locale}${link.href}`}
                    className="text-sm text-kp-text-tertiary hover:text-kp-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-kp-text-primary mb-4">
              {t('headings.legal')}
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/${locale}${link.href}`}
                    className="text-sm text-kp-text-tertiary hover:text-kp-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment methods */}
          <div className="col-span-2 md:col-span-2 lg:col-span-1">
            <h3 className="text-sm font-semibold text-kp-text-primary mb-4">
              {t('headings.payment')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {['Vipps', 'Stripe', 'Apple Pay'].map((method) => (
                <span
                  key={method}
                  className="px-3 py-1.5 rounded-lg bg-kp-surface-highlight text-xs font-medium text-kp-text-tertiary border border-kp-border"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-kp-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm text-kp-text-muted">
            <span>© {currentYear} Klarpakke AS</span>
            <span className="hidden md:inline">·</span>
            <span>Org.no: 929003292 MVA</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-kp-text-muted">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-kp-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              256-bit SSL
            </span>
            <span>·</span>
            <span>GDPR-sikret</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 pt-6 border-t border-kp-border/50">
          <p className="text-xs text-kp-text-muted text-center max-w-3xl mx-auto">
            ⚠️ {t('disclaimer', { defaultValue: 'Klarpakke er en opplæringsplattform. All trading er simulert. Vi gir ikke finansiell rådgivning.' })}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
