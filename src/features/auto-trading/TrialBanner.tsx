import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';
import { Sparkles, Clock, Lock, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface TrialBannerProps {
  trialStatus: {
    isActive: boolean;
    daysRemaining: number;
    hoursRemaining: number;
    urgency?: 'none' | 'warning' | 'critical';
    message?: string;
  } | null;
  locale: string;
  tier: {
    liveTrading: boolean;
    slug: string;
  };
}

const TRIAL_DAYS = 14;

export function TrialBanner({ trialStatus, locale, tier }: TrialBannerProps) {
  const t = useTranslations('trading.sessionDetail');

  // Ingen banner for betalte tiers med live trading
  if (tier.liveTrading && tier.slug !== 'student') {
    return null;
  }

  // Trial aktiv
  if (trialStatus?.isActive) {
    const progressPercent = Math.max(0, Math.min(100, (trialStatus.daysRemaining / TRIAL_DAYS) * 100));
    const isUrgent = trialStatus.urgency === 'critical';
    const isWarning = trialStatus.urgency === 'warning';

    return (
      <Alert
        className={cn(
          "relative overflow-hidden border-2 transition-all duration-300",
          isUrgent
            ? "bg-linear-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-300 dark:border-red-800"
            : isWarning
            ? "bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-300 dark:border-amber-800"
            : "bg-linear-to-r from-blue-50 via-indigo-50 to-emerald-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-emerald-950/30 border-blue-300 dark:border-blue-800"
        )}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 opacity-30 dark:opacity-20 animate-gradient-slow">
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white to-transparent dark:via-white/10" />
        </div>

        <div className="relative flex flex-col sm:flex-row items-start gap-4">
          <div className={cn(
            "shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
            isUrgent
              ? "bg-red-100 dark:bg-red-900/50"
              : isWarning
              ? "bg-amber-100 dark:bg-amber-900/50"
              : "bg-blue-100 dark:bg-blue-900/50"
          )}>
            {isUrgent ? (
              <Clock className="h-6 w-6 text-red-600 dark:text-red-400 animate-pulse" />
            ) : (
              <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <AlertTitle className={cn(
              "text-lg font-bold mb-2",
              isUrgent
                ? "text-red-900 dark:text-red-100"
                : isWarning
                ? "text-amber-900 dark:text-amber-100"
                : "text-blue-900 dark:text-blue-100"
            )}>
              {isUrgent
                ? t('hoursRemaining', { hours: trialStatus.hoursRemaining })
                : t('daysRemaining', { days: trialStatus.daysRemaining })
              }
            </AlertTitle>

            <AlertDescription className="space-y-3">
              <p className={cn(
                "text-sm",
                isUrgent
                  ? "text-red-800 dark:text-red-200"
                  : isWarning
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-blue-800 dark:text-blue-200"
              )}>
                {isUrgent ? (
                  <>
                    {t('trialExpiringSoon')}
                    <strong className="block mt-1">{t('specialOffer')}</strong>
                  </>
                ) : isWarning ? (
                  <>
                    {t('trialWarning')}
                  </>
                ) : (
                  <>
                    {t('trialTestLive', { days: trialStatus.daysRemaining })}
                    {' '}{t('subtitle')}
                  </>
                )}
              </p>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className={cn(
                    isUrgent
                      ? "text-red-700 dark:text-red-300"
                      : isWarning
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-blue-700 dark:text-blue-300"
                  )}>
                    {t('trialProgress')}
                  </span>
                  <span className={cn(
                    isUrgent
                      ? "text-red-600 dark:text-red-400"
                      : isWarning
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-blue-600 dark:text-blue-400"
                  )}>
                    {t('daysLeftOf14', { days: trialStatus.daysRemaining })}
                  </span>
                </div>
                <Progress
                  value={progressPercent}
                  className={cn(
                    "h-2",
                    isUrgent && "[&>div]:bg-red-600",
                    isWarning && "[&>div]:bg-amber-600"
                  )}
                />
              </div>
            </AlertDescription>
          </div>

          <Button
            asChild
            size="lg"
            className={cn(
              "shrink-0 group w-full sm:w-auto",
              isUrgent
                ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/50"
                : isWarning
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/50"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/50"
            )}
          >
            <Link href={`/${locale}/priser`} className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {isUrgent ? t('upgradeNow') : t('seePlans')}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </Alert>
    );
  }

  // Trial utløpt
  if (trialStatus && !trialStatus.isActive && !tier.liveTrading) {
    return (
      <Alert variant="destructive" className="border-2 border-red-300 dark:border-red-800">
        <Lock className="h-5 w-5" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between flex-1 gap-3">
          <div>
            <AlertTitle className="text-lg font-bold">{t('trialExpiredTitle')}</AlertTitle>
            <AlertDescription>
              {t('trialExpired')}
              <strong className="block mt-1">{t('upgradePrompt')}</strong>
            </AlertDescription>
          </div>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href={`/${locale}/priser`}>
              {t('upgrade')}
            </Link>
          </Button>
        </div>
      </Alert>
    );
  }

  return null;
}
