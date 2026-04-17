'use client';

import { useState, useEffect } from 'react';

interface SocialProofProps {
  locale: string;
}

export function SocialProof({ locale }: SocialProofProps) {
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const res = await fetch('/api/stats/active-users');
        const data = await res.json();
        if (res.ok && typeof data.count === 'number' && data.count > 0) {
          setUserCount(data.count);
        } else {
          setUserCount(null);
        }
      } catch {
        setUserCount(null);
      }
    };

    fetchActiveUsers();
  }, []);

  if (userCount === null) {
    return null;
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-[#E2E5EC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-[#0052FF] to-[#00C2FF]"
            />
          ))}
        </div>
        <p className="text-sm text-[#5E6478]">
          <span className="font-semibold text-[#1A1D26]">{userCount}</span>{' '}
          {locale === 'no'
            ? 'nordmenn handler akkurat nå'
            : 'Norwegians are trading right now'}
        </p>
      </div>
      <div className="flex items-center gap-1 text-[#16A34A]">
        <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
        <span className="text-xs font-medium">Live</span>
      </div>
    </div>
  );
}
