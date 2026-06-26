'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { RiskBadge, type RiskLevel } from '@/shared/ui/RiskBadge';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';

type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';

interface OnboardingAnswers {
  goal?: 'sparing' | 'vekst' | 'trading';
  timeHorizon?: 'over3ar' | '1til3ar' | 'under1ar';
}

const LEVELS: { key: ExperienceLevel; risk: RiskLevel }[] = [
  { key: 'beginner', risk: 'low' },
  { key: 'intermediate', risk: 'medium' },
  { key: 'expert', risk: 'high' },
];

function getRecommendedLevel(answers: OnboardingAnswers | null): ExperienceLevel {
  if (!answers) return 'beginner';

  const { goal, timeHorizon } = answers;

  if (goal === 'sparing' || timeHorizon === 'over3ar') return 'beginner';
  if (goal === 'vekst' || timeHorizon === '1til3ar') return 'intermediate';
  if (goal === 'trading' || timeHorizon === 'under1ar') return 'expert';

  return 'beginner';
}

export default function Step2LevelPage() {
  const t = useTranslations('onboarding.level');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const supabase = createClient();
  const prefersReducedMotion = useReducedMotion();

  const [checking, setChecking] = useState(true);
  const [selected, setSelected] = useState<ExperienceLevel | null>(null);
  const [recommended, setRecommended] = useState<ExperienceLevel>('beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push(
            `/${locale}/innlogging?next=${encodeURIComponent(`/${locale}/onboarding/step2-level`)}`,
          );
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_step, onboarding_completed')
          .eq('id', user.id)
          .single();

        if (profile?.onboarding_completed) {
          router.push(`/${locale}/dashboard`);
          return;
        }

        const step = profile?.onboarding_step ?? 0;

        if (step < 1) {
          router.push(`/${locale}/onboarding/step1-welcome`);
          return;
        }

        if (step >= 3) {
          router.push(`/${locale}/onboarding/step3-trading-mode`);
          return;
        }

        const raw = localStorage.getItem('kp-onboarding-answers');
        let answers: OnboardingAnswers | null = null;

        if (raw) {
          try {
            answers = JSON.parse(raw) as OnboardingAnswers;
          } catch {
            answers = null;
          }
        }

        const rec = getRecommendedLevel(answers);
        setRecommended(rec);
        setSelected(rec);
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [router, supabase, locale]);

  const handleContinue = async () => {
    if (!selected) return;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `/${locale}/innlogging?next=${encodeURIComponent(`/${locale}/onboarding/step2-level`)}`,
        );
        return;
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          trading_experience: selected,
          onboarding_step: 2,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push(`/${locale}/onboarding/step3-trading-mode`);
    } catch (err) {
      console.error('Failed to save level:', err);
      setError(t('error'));
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-kp-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-kp-text-primary">{t('title')}</h1>
        <p className="text-kp-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label={t('title')}>
        {LEVELS.map((level, index) => {
          const isSelected = selected === level.key;
          const isRecommended = recommended === level.key;

          return (
            <motion.div
              key={level.key}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                prefersReducedMotion ? undefined : { delay: index * 0.05, duration: 0.25 }
              }
            >
              <Card
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => setSelected(level.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(level.key);
                  }
                }}
                className={cn(
                  'cursor-pointer transition-colors hover:border-kp-brand/50',
                  isSelected ? 'border-kp-brand bg-kp-surface-highlight' : 'border-kp-border',
                )}
              >
                <CardContent className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-kp-text-primary">
                        {t(`levels.${level.key}.label`)}
                      </span>
                      {isRecommended && (
                        <span className="text-xs font-medium text-kp-brand bg-kp-brand-subtle rounded-full px-2 py-0.5">
                          {t('recommended')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-kp-text-secondary mt-1">
                      {t(`levels.${level.key}.description`)}
                    </p>
                  </div>
                  <RiskBadge level={level.risk} />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-kp-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={() => router.push(`/${locale}/onboarding/step1-welcome`)}
          disabled={loading}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selected || loading}
          loading={loading}
          className="flex-[2]"
        >
          {loading ? t('loading') : t('continue')}
        </Button>
      </div>
    </div>
  );
}
