'use client';

import { useState, useCallback } from 'react';

import { Loader2, Mail } from 'lucide-react';
import { SUPPORTED_PROVIDERS, PROVIDER_NAMES } from '@/lib/auth/config';
import { signInWithOAuth, sendMagicLink, isValidEmail } from '@/lib/auth/utils';
import { RADIUS, SHADOW } from '@/lib/design/tokens';
import { toast } from 'sonner';

export type Provider = keyof typeof SUPPORTED_PROVIDERS;

interface UnifiedAuthButtonProps {
  provider: Provider;
  locale?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'minimal';
  redirectPath?: string;
}

/** Offisielle logoer: Google, Microsoft, LinkedIn, Vipps */
const PROVIDER_STYLES: Record<Provider, {
  icon: React.ReactNode;
  className: string;
  textClass: string;
}> = {
  GOOGLE: {
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    className: 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100',
    textClass: 'text-gray-900 dark:text-slate-100',
  },
  MICROSOFT: {
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 21 21" aria-hidden>
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
    ),
    className: 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100',
    textClass: 'text-gray-900 dark:text-slate-100',
  },
  LINKEDIN: {
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
      </svg>
    ),
    className: 'bg-[#0A66C2] hover:bg-[#004182] border border-[#0A66C2]',
    textClass: 'text-white',
  },
  VIPPS: {
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
    className: 'bg-[#FF5B24] hover:bg-[#E54E1B] border border-[#FF5B24] text-white',
    textClass: 'text-white',
  },
};

export function UnifiedAuthButton({
  provider,
  locale = 'no',
  className = '',
  variant = 'default',
  redirectPath,
}: UnifiedAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const providerKey = SUPPORTED_PROVIDERS[provider];
  const displayName = PROVIDER_NAMES[providerKey];
  const styles = PROVIDER_STYLES[provider];

  const handleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      if (provider === 'VIPPS') {
        const next = redirectPath ? encodeURIComponent(redirectPath) : '';
        const res = await fetch(`/api/auth/vipps-url?locale=${locale}${next ? `&next=${next}` : ''}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
        const data = (await res.json()) as { url: string };
        if (data.url) window.location.href = data.url;
        return;
      }
      const data = await signInWithOAuth(provider, locale, redirectPath);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(`[Auth] ${provider} sign in error:`, error);
      toast.error(
        locale === 'no'
          ? `Kunne ikke logge inn med ${displayName}. Prøv igjen.`
          : `Could not sign in with ${displayName}. Please try again.`
      );
      setIsLoading(false);
    }
  }, [provider, locale, displayName, redirectPath]);

  const baseClasses = `
    flex items-center justify-center gap-3
    w-full px-4 py-3.5 min-h-[52px]
    font-medium ${RADIUS.button} ${SHADOW.card}
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `;

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className={`
          flex items-center justify-center gap-2
          px-4 py-2 rounded-lg
          hover:bg-gray-100
          transition-colors
          disabled:opacity-50
          ${className}
        `}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {styles.icon}
            <span className="text-sm">{displayName}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className={`
        ${baseClasses}
        ${styles.className}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <Loader2 className={`w-5 h-5 animate-spin ${styles.textClass}`} />
          <span className={styles.textClass}>
            {locale === 'no' ? 'Logger inn...' : 'Logging in...'}
          </span>
        </>
      ) : (
        <>
          {styles.icon}
          <span className={styles.textClass}>
            {locale === 'no'
              ? `Fortsett med ${displayName}`
              : `Continue with ${displayName}`}
          </span>
        </>
      )}
    </button>
  );
}

export function MagicLinkAuthButton({
  locale = 'no',
  className = '',
}: {
  locale?: string;
  className?: string;
}) {
  const [showForm, setShowForm] = useState(false);

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className={`
          flex items-center justify-center gap-3
          w-full px-4 py-3.5 min-h-[52px]
          bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700
          text-slate-700 dark:text-slate-200 font-medium
          border border-slate-200 dark:border-slate-600
          ${RADIUS.button} ${SHADOW.card}
          transition-all duration-200
          ${className}
        `}
      >
        <Mail className="w-5 h-5 shrink-0 text-slate-500 dark:text-slate-400" />
        {locale === 'no' ? 'Send lenke til e-post (uten passord)' : 'Email me a login link'}
      </button>
    );
  }

  return <MagicLinkForm locale={locale} onBack={() => setShowForm(false)} />;
}

function MagicLinkForm({
  locale,
  onBack,
}: {
  locale: string;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setError(locale === 'no' ? 'Vennligst skriv inn en gyldig e-postadresse' : 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await sendMagicLink(email, locale);
      if (error) setError(error.message);
      else setSent(true);
    } catch {
      setError(locale === 'no' ? 'En feil oppstod. Prøv igjen.' : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={`text-center p-6 ${RADIUS.button} bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800`}>
        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
          {locale === 'no' ? 'Sjekk eposten din' : 'Check your email'}
        </h3>
        <p className="text-emerald-700 dark:text-emerald-300 mt-2 text-sm">
          {locale === 'no' ? `Vi sendte en lenke til ${email}` : `We sent a link to ${email}`}
        </p>
        <ol className="mt-4 text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside text-left max-w-xs mx-auto">
          <li>{locale === 'no' ? 'Åpne eposten din' : 'Open your email'}</li>
          <li>{locale === 'no' ? 'Klikk på lenken' : 'Click the link'}</li>
        </ol>
        <button type="button" onClick={onBack} className="mt-4 text-sm text-[#0052FF] hover:text-[#0047E0] font-medium">
          {locale === 'no' ? 'Tilbake' : 'Back'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 p-5 bg-white dark:bg-slate-800/50 ${RADIUS.button} border border-slate-200 dark:border-slate-600 ${SHADOW.card}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {locale === 'no' ? 'Lenke til e-post' : 'Email link'}
        </span>
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded">✕</button>
      </div>

      {error && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{error}</div>}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={locale === 'no' ? 'din@epost.no' : 'you@example.com'}
        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0052FF] focus:border-[#0052FF] transition-shadow duration-200"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0052FF] hover:bg-[#0047E0] text-white py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50"
      >
        {loading
          ? locale === 'no' ? 'Sender...' : 'Sending...'
          : locale === 'no' ? 'Send innloggingslenke' : 'Send login link'}
      </button>
    </form>
  );
}

export function AuthButtons({
  locale = 'no',
  providers = ['VIPPS', 'GOOGLE', 'MICROSOFT', 'LINKEDIN'],
  showMagicLink = true,
  redirectPath,
  cardBg = 'bg-white dark:bg-slate-900',
}: {
  locale?: string;
  providers?: Provider[];
  showMagicLink?: boolean;
  redirectPath?: string;
  cardBg?: string;
}) {
  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <UnifiedAuthButton
          key={provider}
          provider={provider}
          locale={locale}
          redirectPath={redirectPath}
        />
      ))}

      {providers.length > 0 && showMagicLink && (
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className={`${cardBg} px-4 text-sm text-slate-500 dark:text-slate-400`}>
              {locale === 'no' ? 'eller' : 'or'}
            </span>
          </div>
        </div>
      )}

      {showMagicLink && <MagicLinkAuthButton locale={locale} />}
    </div>
  );
}
