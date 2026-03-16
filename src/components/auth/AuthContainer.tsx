'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { AuthButtons } from './UnifiedAuthButton';
import { EmailAuthForm } from './EmailAuthForm';
import { TrendingUp, Shield, Zap, LineChart } from 'lucide-react';
import Link from 'next/link';

interface AuthContainerProps {
  locale?: string;
  defaultMode?: 'login' | 'register';
  redirectPath?: string;
}

export function AuthContainer({
  locale: localeProp,
  defaultMode = 'login',
  redirectPath: redirectPathProp,
}: AuthContainerProps) {
  const detectedLocale = useLocale();
  const locale = localeProp || detectedLocale;
  const redirectPath = redirectPathProp || `/${locale}/dashboard`;
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };

  const features = [
    {
      icon: Shield,
      title: locale === 'no' ? '100% Risikofri' : '100% Risk-Free',
      description: locale === 'no' 
        ? 'Trade med lekepenger og lær uten å risikere egne midler'
        : 'Trade with virtual money and learn without risking your own funds',
      color: 'emerald',
    },
    {
      icon: LineChart,
      title: locale === 'no' ? 'Ekte Markedsdata' : 'Real Market Data',
      description: locale === 'no'
        ? 'Sanntidspriser fra Binance API – akkurat som ekte trading'
        : 'Real-time prices from Binance API – just like real trading',
      color: 'cyan',
    },
    {
      icon: Zap,
      title: locale === 'no' ? 'Trading Coach' : 'Trading Coach',
      description: locale === 'no'
        ? 'Få personlige råd og strategier fra vår trading coach'
        : 'Get personalized advice and strategies from our trading coach',
      color: 'emerald',
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">Klarpakke</span>
            </Link>
          </div>

          {/* OAuth Buttons */}
          {!showEmailForm && (
            <>
              <AuthButtons 
                locale={locale} 
                providers={['GOOGLE', 'LINKEDIN']}
                showMagicLink={true}
              />

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-slate-500">
                    {locale === 'no' ? 'eller' : 'or'}
                  </span>
                </div>
              </div>

              {/* Email form toggle */}
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
              >
                {mode === 'login'
                  ? (locale === 'no' ? 'Logg inn med e-post' : 'Sign in with email')
                  : (locale === 'no' ? 'Opprett konto med e-post' : 'Create account with email')
                }
              </button>
            </>
          )}

          {/* Email Auth Form */}
          {showEmailForm && (
            <div className="space-y-4">
              <EmailAuthForm
                mode={mode}
                locale={locale}
                redirectPath={redirectPath}
              />
              
              <button
                onClick={() => setShowEmailForm(false)}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                ← {locale === 'no' ? 'Tilbake' : 'Back'}
              </button>
            </div>
          )}

          {/* Toggle mode */}
          <div className="text-center text-sm">
            <span className="text-slate-500">
              {mode === 'login'
                ? (locale === 'no' ? 'Har ikke konto? ' : "Don't have an account? ")
                : (locale === 'no' ? 'Har allerede konto? ' : 'Already have an account? ')
              }
            </span>
            <button
              onClick={toggleMode}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {mode === 'login'
                ? (locale === 'no' ? 'Opprett en' : 'Create one')
                : (locale === 'no' ? 'Logg inn' : 'Sign in')
              }
            </button>
          </div>

          {/* Terms */}
          <p className="text-xs text-slate-400 text-center">
            {locale === 'no' 
              ? 'Ved å fortsette godtar du våre vilkår og personvernerklæring'
              : 'By continuing, you agree to our Terms and Privacy Policy'
            }
          </p>
        </div>
      </div>

      {/* Right side - Features (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 bg-linear-to-br from-emerald-500/10 via-background to-cyan-500/10 items-center justify-center p-12">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">Klarpakke</span>
          </div>

          <h2 className="text-3xl font-bold mb-6">
            {locale === 'no' ? 'Lær å trade krypto' : 'Learn to trade crypto'}
            <br />
            <span className="gradient-text">
              {locale === 'no' ? 'uten risiko' : 'without risk'}
            </span>
          </h2>

          <p className="text-muted-foreground mb-8">
            {locale === 'no'
              ? 'Øv deg på kryptotrading med papirpenger. Få 100 000 USDT i startkapital og lær å trade med ekte markedsdata fra Binance.'
              : 'Practice crypto trading with paper money. Get 100,000 USDT in starting capital and learn to trade with real market data from Binance.'
            }
          </p>

          <div className="space-y-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg bg-${feature.color}-500/10 flex items-center justify-center shrink-0`}>
                  <feature.icon className={`h-5 w-5 text-${feature.color}-400`} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-sm text-muted-foreground">
              "Klarpakke hjalp meg å forstå trading før jeg satte inn ekte penger. Nå er jeg en selvsikker trader!"
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-400 to-cyan-400" />
              <div>
                <p className="font-medium">Erik Hansen</p>
                <p className="text-sm text-muted-foreground">{locale === 'no' ? 'Proff-medlem' : 'Pro Member'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
