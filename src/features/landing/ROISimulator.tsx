'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { ButtonPremium } from '@/shared/ui/ButtonPremium';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { localizedPathname } from '@/middleware/locale-path';

export function ROISimulator() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <section className="py-16 lg:py-24 bg-kp-bg-primary" id="roi-calculator">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kp-brand/10 text-kp-brand text-sm font-medium mb-4">
            <TrendingUp className="w-4 h-4" />
            <span>Start din reise</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-kp-text-primary mb-4">
            Klar til å{' '}
            <span className="bg-gradient-to-r from-kp-brand to-kp-brand-light bg-clip-text text-transparent">
              komme i gang?
            </span>
          </h2>
          <p className="text-kp-text-secondary max-w-xl mx-auto mb-8">
            Begynn med paper trading for å teste strategier risikofritt. 
            Når du er klar, kan du enkelt bytte til live trading.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ButtonPremium 
              onClick={() => router.push(localizedPathname(locale, '/signup'))}
              className="text-lg px-8 py-4"
            >
              Opprett gratis konto
            </ButtonPremium>
            <ButtonPremium 
              variant="secondary"
              onClick={() => router.push(localizedPathname(locale, '/priser'))}
              className="text-lg px-8 py-4"
            >
              Se priser
            </ButtonPremium>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default ROISimulator;
