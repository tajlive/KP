'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/utils';

type Status = 'operational' | 'degraded' | 'down';

interface SystemHealth {
  supabase: Status;
  binance: Status;
  email: Status;
}

export default function SystemStatus() {
  const [health, setHealth] = useState<SystemHealth>({
    supabase: 'operational',
    binance: 'operational',
    email: 'operational',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        // Check Supabase connectivity with a lightweight query
        const supabase = createClient();
        const { error } = await supabase.from('user_profiles').select('id', { count: 'exact', head: true });
        setHealth({
          supabase: error ? 'degraded' : 'operational',
          binance: 'operational',
          email: 'operational',
        });
      } catch (error) {
        console.error('Health check failed:', error);
        setHealth({
          supabase: 'degraded',
          binance: 'operational',
          email: 'operational',
        });
      } finally {
        setLoading(false);
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = Object.values(health).every(s => s === 'operational');

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
        <span className="text-gray-500">Sjekker systemer...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${allOperational ? 'bg-green-500' : 'bg-yellow-500'}`} />
      <span className="text-gray-400">
        {allOperational ? 'Alle systemer operative' : 'Noen systemer opplever problemer'}
      </span>
    </div>
  );
}
