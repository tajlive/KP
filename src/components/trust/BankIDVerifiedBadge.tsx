'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function BankIDVerifiedBadge() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    async function checkVerification() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.bankid_verified) {
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Failed to check BankID status:', error);
      }
    }
    checkVerification();
  }, []);

  if (!isVerified) return null;

  return (
    <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-sm font-semibold">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      BankID-verifisert
    </div>
  );
}
