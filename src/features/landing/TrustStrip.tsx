/**
 * TrustStrip — Premium 2026 Design
 * Trust signals with glassmorphism cards and subtle animations
 * @deprecated Consolidate into shared marketing shells when refactoring this page.
 */

import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { GlassCard } from '@/shared/ui/GlassCard';
import { Shield, Zap } from 'lucide-react';

interface TrustStripProps {
  locale?: string;
}

export async function TrustStrip({ locale = 'no' }: TrustStripProps) {
  const t = await getTranslations({ locale, namespace: 'landing.trustStrip' });

  const stats = [
    {
      label: t('stats.riskFree'),
      value: t('stats.zero'),
      suffix: '',
      description: t('stats.riskDesc'),
      icon: <Shield className="w-5 h-5" />,
    },
    {
      label: t('stats.signals'),
      value: t('stats.alwaysOn'),
      suffix: '',
      description: t('stats.signalsDesc'),
      icon: <Zap className="w-5 h-5" />,
    },
  ];

  const paymentLogos = [
    { name: 'Vipps', src: '/images/payments/vipps.svg' },
    { name: 'Stripe', src: '/images/payments/stripe.svg' },
    { name: 'Apple Pay', src: '/images/payments/apple-pay.svg' },
    { name: 'PayPal', src: '/images/payments/paypal.svg' },
  ];

  return (
    <section 
      data-testid="trust-strip"
      className="relative w-full bg-kp-bg-primary border-y border-kp-border py-12 sm:py-16 lg:py-20 overflow-hidden"
    >
      {/* Background gradient orbs */}
      <div 
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,82,255,0.3) 0%, transparent 70%)' }}
      />
      <div 
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Grid — only verifiable claims, no platform numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {stats.map((stat) => (
            <GlassCard
              key={stat.label}
              variant="elevated"
              hover="lift"
              padding="md"
              className="group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-kp-surface-highlight text-kp-brand group-hover:text-kp-brand-light transition-colors">
                  {stat.icon}
                </div>
                {stat.suffix && (
                  <span className="text-xs font-medium text-kp-text-tertiary bg-kp-surface-highlight px-2 py-1 rounded-badge">
                    {stat.suffix}
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-kp-text-primary tracking-tight mb-1">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-kp-text-secondary mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-kp-text-tertiary">
                {stat.description}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <span className="text-sm text-kp-text-tertiary font-medium">
            {t('payment.secure')}
          </span>
          <div className="flex items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all">
            {paymentLogos.map((logo) => (
              <Image
                key={logo.name}
                src={logo.src}
                alt={logo.name}
                width={48}
                height={24}
                className="object-contain"
              />
            ))}
          </div>
        </div>

        {/* Trust badges row */}
        <div className="mt-10 pt-8 border-t border-kp-border flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <div className="flex items-center gap-2 text-sm text-kp-text-tertiary">
            <Shield className="w-4 h-4 text-kp-success" />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-kp-text-tertiary">
            <svg className="w-4 h-4 text-kp-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>GDPR-sikret</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-kp-text-tertiary">
            <svg className="w-4 h-4 text-kp-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Lynrask utførelse</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TrustStrip;
