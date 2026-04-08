import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Sparkles, ArrowRight } from 'lucide-react';
import { ButtonPremium } from '@/shared/ui/ButtonPremium';
import { BadgePremium } from '@/shared/ui/BadgePremium';
import { motion } from 'framer-motion';
import { client, isSanityConfigured } from '@/lib/sanity/client';
import { landingContentQuery } from '@/lib/sanity/queries';
import { Skeleton } from '@/shared/ui/skeleton';

interface LandingContent {
  heroTitle: { line1: string; line2: string };
  heroSubtitle: string;
  heroCta: { text: string; link: string };
  trustBadges: Array<{ text: string; icon: string }>;
  features: Array<{ title: string; description: string; icon: string }>;
}

// Fallback data (hardcoded as backup)
const fallbackContent: LandingContent = {
  heroTitle: {
    line1: 'Lær å trade krypto',
    line2: 'med AI som mentor',
  },
  heroSubtitle: 'Fra nybegynner til proff med papirhandel, AI-analyse og automatisk trading. Gratis å starte.',
  heroCta: {
    text: 'Start gratis',
    link: '/register',
  },
  trustBadges: [
    { text: 'Alltid gratis å prøve', icon: '✓' },
    { text: 'Ingen kort påkrevd', icon: '✓' },
    { text: 'Kanseller når som helst', icon: '✓' },
  ],
  features: [],
};

async function getLandingContent(language: string): Promise<LandingContent> {
  if (!isSanityConfigured()) {
    return fallbackContent;
  }
  
  try {
    const content = await client.fetch<LandingContent>(landingContentQuery, { language });
    return content || fallbackContent;
  } catch (error) {
    console.error('Failed to fetch landing content from Sanity:', error);
    return fallbackContent;
  }
}

interface SanityHeroSectionProps {
  locale?: string;
}

export default async function SanityHeroSection({ locale = 'no' }: SanityHeroSectionProps) {
  const [t, content] = await Promise.all([
    getTranslations({ locale, namespace: 'landing.hero' }),
    getLandingContent(locale),
  ]);

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
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="mb-8">
            <BadgePremium variant="brand" icon={<Sparkles className="w-3.5 h-3.5" />}>
              {t('badge')}
            </BadgePremium>
          </div>

          {/* Main Headline - FROM SANITY */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-kp-text-primary tracking-tight leading-[1.1] mb-6">
            {content.heroTitle.line1}
            <span className="block mt-2 bg-gradient-to-r from-kp-brand via-kp-brand-light to-purple-400 bg-clip-text text-transparent">
              {content.heroTitle.line2}
            </span>
          </h1>

          {/* Subtitle - FROM SANITY */}
          <p className="text-lg sm:text-xl text-kp-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            {content.heroSubtitle}
          </p>

          {/* CTA Buttons - FROM SANITY */}
          <div className="flex flex-col items-center gap-4">
            <ButtonPremium 
              size="lg" 
              glow
              className="w-full sm:w-auto min-w-[240px]"
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
              asChild
            >
              <a href={content.heroCta.link}>
                {content.heroCta.text}
              </a>
            </ButtonPremium>
            
            {/* Trust indicators - FROM SANITY */}
            <div className="mt-12 pt-8 border-t border-kp-border flex flex-wrap items-center justify-center gap-6 text-sm text-kp-text-tertiary">
              {content.trustBadges.map((badge, index) => (
                <div key={index} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-kp-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
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
    <section className="relative min-h-[90vh] flex items-center justify-center bg-kp-bg-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 text-center">
        <Skeleton className="h-8 w-32 mx-auto mb-8" />
        <Skeleton className="h-16 sm:h-20 md:h-24 w-3/4 mx-auto mb-6" />
        <Skeleton className="h-8 w-1/2 mx-auto mb-10" />
        <Skeleton className="h-14 w-48 mx-auto" />
      </div>
    </section>
  );
}
