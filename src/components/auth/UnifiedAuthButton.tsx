'use client';

import { useState, useCallback } from 'react';

import { Loader2, Linkedin, Mail } from 'lucide-react';
import { SUPPORTED_PROVIDERS, PROVIDER_NAMES } from '@/lib/auth/config';
import { signInWithOAuth, sendMagicLink, isValidEmail } from '@/lib/auth/utils';
import { toast } from 'sonner';

export type Provider = keyof typeof SUPPORTED_PROVIDERS;

interface UnifiedAuthButtonProps {
  provider: Provider;
  locale?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'minimal';
  redirectPath?: string;
}

const PROVIDER_STYLES: Record<Provider, {
  icon: React.ReactNode;
  className: string;
  textClass: string;
}> = {
  GOOGLE: {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    className: 'bg-white hover:bg-gray-50 border border-gray-300',
    textClass: 'text-gray-900',
  },
  MICROSOFT: {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 21 21">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
    ),
    className: 'bg-white hover:bg-gray-50 border border-gray-300',
    textClass: 'text-gray-900',
  },
  LINKEDIN: {
    icon: <Linkedin className="w-5 h-5" />,
    className: 'bg-[#0A66C2] hover:bg-[#004182]',
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
      // Pass redirectPath if provided (sanitert i InnloggingClient)
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
    w-full px-4 py-4 min-h-[48px]
    font-medium rounded-lg
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    shadow-sm hover:shadow-md
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
        onClick={() => setShowForm(true)}
        className={`
          flex items-center justify-center gap-3
          w-full px-4 py-4 min-h-[48px]
          bg-slate-100 hover:bg-slate-200
          text-slate-700 font-medium
          rounded-lg border border-slate-300
          transition-all duration-200
          ${className}
        `}
      >
        <Mail className="w-5 h-5" />
        {locale === 'no' ? 'Magisk lenke (uten passord)' : 'Magic link (no password)'}
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
      <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-800">
          {locale === 'no' ? 'Sjekk eposten din!' : 'Check your email!'}
        </h3>
        <p className="text-green-700 mt-2 text-sm">
          {locale === 'no' ? `Vi har sendt en magisk lenke til ${email}` : `We sent a magic link to ${email}`}
        </p>
        <div className="mt-4 p-4 bg-white rounded-lg border border-green-200 text-left">
          <p className="text-sm text-slate-700 font-medium mb-2">
            {locale === 'no' ? 'Neste steg:' : 'Next steps:'}
          </p>
          <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
            <li>{locale === 'no' ? 'Åpne eposten din' : 'Open your email'}</li>
            <li>{locale === 'no' ? 'Klikk på den magiske lenken i mailen' : 'Click the magic link in the email'}</li>
            <li>{locale === 'no' ? 'Du blir automatisk logget inn' : 'You will be automatically logged in'}</li>
          </ol>
        </div>
        <button onClick={onBack} className="mt-4 text-sm text-green-600 hover:text-green-800 underline">
          {locale === 'no' ? 'Tilbake' : 'Back'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {locale === 'no' ? 'Magisk lenke' : 'Magic link'}
        </span>
        <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">✕</button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={locale === 'no' ? 'din@epost.no' : 'your@email.com'}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-semibold"
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
  providers = ['GOOGLE', 'LINKEDIN'],
  showMagicLink = true,
  redirectPath,
}: {
  locale?: string;
  providers?: Provider[];
  showMagicLink?: boolean;
  redirectPath?: string;
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
      )}

      {showMagicLink && <MagicLinkAuthButton locale={locale} />}
    </div>
  );
}
