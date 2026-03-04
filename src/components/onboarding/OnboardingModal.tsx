'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { 
  X, 
  Rocket, 
  BookOpen, 
  TrendingUp, 
  ArrowRight
} from 'lucide-react';
import { useOnboarding } from '@/components/providers/OnboardingProvider';

export default function OnboardingModal() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const locale = useLocale();
  const { showOnboarding, currentStep, closeOnboarding, nextStep, skipOnboarding } = useOnboarding();

  if (!showOnboarding) return null;

  const steps = [
    {
      icon: Rocket,
      title: t('step1.title'),
      description: t('step1.description'),
    },
    {
      icon: BookOpen,
      title: t('step2.title'),
      description: t('step2.description'),
    },
    {
      icon: TrendingUp,
      title: t('step3.title'),
      description: t('step3.description'),
    },
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep >= 2) {
      // Last step - go to courses
      closeOnboarding();
      router.push(`/${locale}/courses`);
    } else {
      nextStep();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
        {/* Close button */}
        <button
          onClick={skipOnboarding}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={t('skip')}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-2xl flex items-center justify-center">
            <Icon className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {currentStepData.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {currentStepData.description}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-blue-600'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={skipOnboarding}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              {t('skip')}
            </button>
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30"
            >
              {currentStep < 2 ? t('next') : t('finish')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
