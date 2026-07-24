"use client";

import { useState, useCallback } from 'react';

export interface UseMoonshotOptions {
  model?: 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k';
  temperature?: number;
}

export interface UseMoonshotReturn {
  sendMessage: (message: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * React hook for å bruke Moonshot AI (Kimi) i komponenter
 *
 * KLA-auth: Browser-klienten er alltid anon (httpOnly auth-cookie), så
 * kallet kan ikke gå direkte til edge-funksjonen moonshot-chat med
 * Bearer-token (den er heller ikke deployet). Går via server-ruten
 * /api/ai/chat som autentiserer med auth-cookie.
 *
 * @example
 * ```tsx
 * function CryptoChat() {
 *   const { sendMessage, isLoading, error } = useMoonshot();
 *
 *   const handleAsk = async () => {
 *     const response = await sendMessage("Hva er Bitcoin?");
 *   };
 *
 *   return (
 *     <button onClick={handleAsk} disabled={isLoading}>
 *       {isLoading ? 'Tenker...' : 'Spør'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useMoonshot(options: UseMoonshotOptions = {}): UseMoonshotReturn {
  const { temperature = 0.7 } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          temperature,
          forceProvider: 'kimi',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.content as string;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ukjent feil';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [temperature]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendMessage,
    isLoading,
    error,
    clearError,
  };
}
