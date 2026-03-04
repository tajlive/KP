'use client';
import { useState } from 'react';
import { translations } from '@/lib/i18n/translations';
import { createClient } from '@/lib/utils';

interface WaitlistFormProps {
  language?: "no" | "en"
}

export function WaitlistForm({ language = "no" }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const t = translations[language].hero;
  const wt = translations[language].waitlist;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('waitlist')
        .insert({ email: email?.toLowerCase()?.trim(), created_at: new Date().toISOString() });

      if (!error) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
        <p className="font-semibold">{wt.success.title}</p>
        <p className="text-sm">{wt.success.description}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.emailPlaceholder}
        required
        className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={status === 'loading'}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition disabled:opacity-50"
      >
        {status === 'loading' ? wt.loading : t.ctaButton}
      </button>
    </form>
  );
}
