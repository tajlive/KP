'use client';

import { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2 } from 'lucide-react';

interface BalanceData {
  success: boolean;
  session_id?: string;
  balance?: {
    starting: number;
    current: number;
    pnl: number;
    pnlPercentage: number;
    isPositive: boolean;
  };
  recentTrades?: Array<{
    id: string;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    total_value: number;
    created_at: string;
  }>;
  error?: string;
  message?: string;
}

export function PaperTradingCard() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<BalanceData['balance'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(true);
  const [state, setState] = useState<'loading' | 'empty' | 'success' | 'error'>('loading');

  // Polling management
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Error throttling
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);
  const [errorCount, setErrorCount] = useState(0);
  const lastErrorMessageRef = useRef<string>('');

  // Mobile detection
  const isMobileRef = useRef<boolean>(false);
  const POLL_INTERVAL_MS = 30000; // 30s desktop, 60s mobile (set below)
  const FETCH_TIMEOUT_MS = 5000; // 5 second max fetch time
  const ERROR_TOAST_THROTTLE_MS = 5000; // Only show error toast every 5s

  // Detect mobile on mount
  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|Android/i.test(navigator.userAgent);
  }, []);

  // Fetch with timeout protection
  const fetchWithTimeout = async (signal: AbortSignal): Promise<BalanceData> => {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch('/api/paper-trading/balance', {
        signal: AbortSignal.any([signal, timeoutController.signal]),
      });

      if (!response.ok) {
        // Log server-side errors to Sentry
        if (response.status >= 500) {
          Sentry.captureMessage(`Paper trading balance fetch failed: ${response.status}`, 'error');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data: BalanceData = await response.json();
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Throttled error toast
  const showErrorToast = (message: string) => {
    const now = Date.now();
    const timeSinceLastError = now - lastErrorTime;

    // Only show toast if 5+ seconds since last error OR error message is different
    if (timeSinceLastError > ERROR_TOAST_THROTTLE_MS || message !== lastErrorMessageRef.current) {
      lastErrorMessageRef.current = message;
      setLastErrorTime(now);
      setErrorCount(1);
      toast({
        title: 'Saldo hentes',
        description: message,
        variant: 'destructive',
      });
    } else {
      // Count duplicate errors (for analytics)
      setErrorCount((c) => c + 1);
    }
  };

  const fetchBalance = async (signal: AbortSignal) => {
    try {
      const data = await fetchWithTimeout(signal);

      // Check for success flag
      if (!data.success || !data.balance) {
        // No session found - valid state
        setHasSession(false);
        setState('empty');
        setBalance(null);
        return;
      }

      // Success case
      setBalance(data.balance);
      setHasSession(true);
      setState('success');
      setIsLoading(false);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Abort is expected (cleanup or timeout)
        return;
      }

      const errorMsg =
        error instanceof Error ? error.message : String(error);

      // Send detailed error to Sentry
      Sentry.captureException(error, {
        tags: {
          component: 'PaperTradingCard',
          endpoint: 'paper-trading/balance',
          errorType: errorMsg.includes('timeout') ? 'network_timeout' : 'network_error',
        },
        extra: {
          isMobile: isMobileRef.current,
          errorMessage: errorMsg,
          errorCount: errorCount + 1,
        },
      });

      // Show throttled error toast
      showErrorToast(
        errorMsg.includes('timeout')
          ? 'Nettverket er tregt. Prøver igjen...'
          : 'Kunne ikke hente saldo. Sjekk internettforbindelsen.'
      );

      setState('error');
      setIsLoading(false);
    }
  };

  const scheduleNextPoll = (signal: AbortSignal) => {
    // Adjust interval for mobile
    const interval = isMobileRef.current ? POLL_INTERVAL_MS * 2 : POLL_INTERVAL_MS;

    pollingTimeoutRef.current = setTimeout(() => {
      if (!signal.aborted) {
        fetchBalance(signal);
      }
    }, interval);
  };

  // Initial fetch + polling setup
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Fetch immediately
    fetchBalance(controller.signal).then(() => {
      // Schedule next poll
      if (!controller.signal.aborted) {
        scheduleNextPoll(controller.signal);
      }
    });

    // Cleanup on unmount
    return () => {
      controller.abort();
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  // Render states
  if (state === 'empty') {
    return (
      <div className="p-6 border border-slate-200 rounded-lg bg-slate-50">
        <p className="text-slate-600">Ingen aktiv papirhandelssesjon. Start en ny for å se saldoen.</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <p className="text-red-700">Kunne ikke hente saldo. Sjekk internettforbindelsen.</p>
      </div>
    );
  }

  if (state === 'loading' || !balance) {
    return (
      <div className="p-6 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
        <p className="text-slate-600">Henter saldo...</p>
      </div>
    );
  }

  // Success render
  return (
    <div className="p-6 border border-slate-200 rounded-lg bg-white">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-slate-600">Gjeldende saldo</p>
          <p className="text-2xl font-bold text-slate-900">
            {balance.current.toLocaleString('no-NO', { style: 'currency', currency: 'NOK' })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-600">Startkapital</p>
            <p className="text-sm font-semibold text-slate-900">
              {balance.starting.toLocaleString('no-NO', { style: 'currency', currency: 'NOK' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">P&L</p>
            <p className={`text-sm font-semibold ${
              balance.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {balance.isPositive ? '+' : ''}
              {balance.pnl.toLocaleString('no-NO', { style: 'currency', currency: 'NOK' })}
              ({balance.pnlPercentage.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
