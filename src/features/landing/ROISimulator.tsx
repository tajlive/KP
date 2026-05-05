'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { ButtonPremium } from '@/shared/ui/ButtonPremium';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { localizedPathname } from '@/middleware/locale-path';

export function ROISimulator() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('landing.roiSimulator');

  return (
    <section className="py-16 lg:py-24 bg-kp-bg-primary" id="roi-calculator" data-testid="backtest-calculator">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kp-brand/10 text-kp-brand text-sm font-medium mb-4">
            <TrendingUp className="w-4 h-4" />
            <span>{t('badge')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-kp-text-primary mb-4">
            {t('title')}
            <span className="bg-gradient-to-r from-kp-brand to-kp-brand-light bg-clip-text text-transparent">
              {t('titleAccent')}
            </span>
          </h2>
          <p className="text-kp-text-secondary max-w-xl mx-auto mb-8">
            {t('description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ButtonPremium 
              onClick={() => router.push(localizedPathname(locale, '/signup'))}
              className="text-lg px-8 py-4"
            >
              {t('ctaPrimary')}
            </ButtonPremium>
            <ButtonPremium 
              variant="secondary"
              onClick={() => router.push(localizedPathname(locale, '/priser'))}
              className="text-lg px-8 py-4"
            >
              {t('ctaSecondary')}
            </ButtonPremium>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default ROISimulator;
