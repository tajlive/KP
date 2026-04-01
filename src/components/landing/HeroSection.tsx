'use server';

import { getTranslations } from 'next-intl/server';
import { Sparkles, ArrowRight } from 'lucide-react';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { BadgePremium } from '@/components/ui/BadgePremium';
import { motion } from 'framer-motion';
import { LiveSparkChartHero } from './LiveSparkChart';

interface HeroSectionProps {
  locale?: string;
}

export default async function HeroSection({ locale = 'no' }: HeroSectionProps) {
  const t = await getTranslations({ locale, namespace: 'landing.hero' });

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-kp-bg-primary">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl animate-float"
          style={{ 
            background: 'radial-gradient(circle, rgba(0,82,255,0.4) 0%, transparent 60%)',
            animationDelay: '0s',
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl animate-float"
          style={{ 
            background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 60%)',
            animationDelay: '-3s',
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, rgba(0,82,255,0.2) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="mb-8">
            <BadgePremium variant="brand" icon={<Sparkles className="w-3.5 h-3.5" />}>
              {t('badge')}
            </BadgePremium>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-kp-text-primary tracking-tight leading-[1.1] mb-6">
            {t('title.line1')}
            <span className="block mt-2 bg-gradient-to-r from-kp-brand via-kp-brand-light to-purple-400 bg-clip-text text-transparent">
              {t('title.line2')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-kp-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('subtitle')}
          </p>

          {/* CTA Buttons - Single primary CTA */}
          <div className="flex flex-col items-center gap-4">
            <ButtonPremium 
              size="lg" 
              glow
              className="w-full sm:w-auto min-w-[240px]"
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
            >
              {t('cta.primary')}
            </ButtonPremium>
            
            {/* Disclaimer */}
            <p className="text-xs text-kp-text-tertiary mt-2">
              ⚠️ {t('disclaimer')}
            </p>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 pt-8 border-t border-kp-border flex flex-wrap items-center justify-center gap-6 text-sm text-kp-text-tertiary">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-kp-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('trust.free')}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-kp-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('trust.noCard')}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-kp-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('trust.cancel')}</span>
            </div>
          </div>

          {/* Live Price Charts */}
          <div className="mt-12 flex justify-center">
            <LiveSparkChartHero />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-kp-bg-primary to-transparent" />
    </section>
  );
}
