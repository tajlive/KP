import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { withRequestCache } from '@/lib/cache';
import { safeFetch } from '@/lib/sanity/client';
import { landingContentQuery } from '@/lib/sanity/queries';
import { Skeleton } from '@/shared/ui/skeleton';

interface LandingContent {
  heroTitle?: { line1?: string; line2?: string };
  heroSubtitle?: string;
  heroCta?: { text?: string; link?: string };
  trustBadges?: Array<{ text?: string; icon?: string }>;
  features?: Array<{ title?: string; description?: string; icon?: string }>;
}

function getFallbackContent(locale: string): LandingContent {
  const isEn = locale === 'en';
  return {
    heroTitle: { line1: '', line2: '' },
    heroSubtitle: '',
    heroCta: { text: '', link: '' },
    trustBadges: [
      { text: isEn ? 'Always free to try' : 'Alltid gratis å prøve', icon: '✓' },
      { text: isEn ? 'No card required' : 'Ingen kort påkrevd', icon: '✓' },
      { text: isEn ? 'Cancel anytime' : 'Kanseller når som helst', icon: '✓' },
    ],
    features: [],
  };
}

const cachedGetLandingContent = withRequestCache(getLandingContentImpl, {
  key: 'landing-content',
  tags: ['sanity', 'sanity:landing', 'sanity:landingContent'],
  revalidate: 60,
});

async function getLandingContentImpl(language: string): Promise<LandingContent> {
  const fallback = getFallbackContent(language);
  return safeFetch<LandingContent>(
    landingContentQuery,
    { language },
    fallback,
    { next: { revalidate: 60, tags: ['sanity', 'sanity:landing', 'sanity:landingContent'] } }
  );
}

async function getLandingContent(language: string): Promise<LandingContent> {
  return cachedGetLandingContent(language);
}

interface SanityHeroSectionProps {
  locale?: string;
}

export default async function SanityHeroSection({ locale = 'no' }: SanityHeroSectionProps) {
  const [t, content] = await Promise.all([
    getTranslations({ locale, namespace: 'landing.hero' }),
    getLandingContent(locale),
  ]);

  const title = content.heroTitle?.line1 || t('title');
  const titleAccent = content.heroTitle?.line2 || '';
  const subtitle = content.heroSubtitle || t('subtitle');
  const primaryText = content.heroCta?.text || t('ctaPrimary');
  const primaryLink = content.heroCta?.link || `/${locale}/onboarding/step1-welcome`;
  const secondaryText = t('ctaSecondary');
  const secondaryLink = `/${locale}/priser`;
  const trustBadges = content.trustBadges ?? [];

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-kp-bg-primary">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 h-48 w-48 sm:h-64 sm:w-64 md:h-96 md:w-96 rounded-full opacity-30 blur-3xl sm:animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(0,82,255,0.4) 0%, transparent 60%)',
            animationDelay: '0s',
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 h-40 w-40 sm:h-56 sm:w-56 md:h-80 md:w-80 rounded-full opacity-20 blur-3xl sm:animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 60%)',
            animationDelay: '-3s',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Headline — Sanity overrides, otherwise i18n fallback */}
          <h1 className="hero-headline text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold tracking-tight text-kp-text-primary leading-[1.1] mb-6">
            {title}
            {titleAccent && (
              <span className="block mt-2 bg-gradient-to-r from-kp-brand via-kp-brand-light to-purple-400 bg-clip-text text-transparent">
                {titleAccent}
              </span>
            )}
          </h1>

          {/* Subtitle — Sanity overrides, otherwise i18n fallback */}
          <p className="text-lg sm:text-xl text-kp-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed">
            {subtitle}
          </p>

          {/* CTA Buttons — Sanity CTA overrides primary; secondary is fixed i18n value */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="primary" className="w-full sm:w-auto min-w-[240px]" asChild>
              <Link href={primaryLink} className="inline-flex items-center justify-center gap-2">
                {primaryText}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>

            <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-[240px]" asChild>
              <Link href={secondaryLink} className="inline-flex items-center justify-center">
                {secondaryText}
              </Link>
            </Button>
          </div>

          {/* Trust indicators — from Sanity / fallback */}
          {trustBadges.length > 0 && (
            <div className="mt-10 pt-6 border-t border-kp-border flex flex-wrap items-center justify-center gap-6 text-sm text-kp-text-secondary">
              {trustBadges.map((badge, index) => (
                <div key={index} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-kp-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Legal links for Google OAuth verification */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-kp-text-muted">
            <span>{locale === 'en' ? 'By continuing you agree to our' : 'Ved å fortsette godtar du våre'}</span>
            <a href={`/${locale}/vilkar`} className="underline hover:text-kp-text-primary transition-colors">
              {locale === 'en' ? 'Terms' : 'vilkår'}
            </a>
            <span>{locale === 'en' ? 'and' : 'og'}</span>
            <a href={`/${locale}/personvern`} className="underline hover:text-kp-text-primary transition-colors">
              {locale === 'en' ? 'Privacy Policy' : 'personvernerklæring'}
            </a>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-kp-bg-primary to-transparent" />
    </section>
  );
}

// Loading skeleton
export function SanityHeroSectionSkeleton() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center bg-kp-bg-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
        <Skeleton className="h-16 sm:h-20 md:h-24 w-3/4 mx-auto mb-6" />
        <Skeleton className="h-8 w-1/2 mx-auto mb-10" />
        <Skeleton className="h-14 w-48 mx-auto" />
      </div>
    </section>
  );
}
