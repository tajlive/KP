"use client";

import { useState, useCallback } from 'react';

export interface UseMoonshotOptions {
  model?: 'k3' | 'kimi-for-coding' | 'kimi-for-coding-highspeed';
  temperature?: number;
}

export interface UseMoonshotReturn {
  sendMessage: (message: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * React hook for å bruke KIMI K3 i komponenter
 *
 * KLA-auth: Browser-klienten er alltid anon (httpOnly auth-cookie), så
 * kallet går via server-ruten /api/ai/chat (KIMI K3 via OAuth, reasoning=high).
 * Edge-funksjonen moonshot-chat er ikke deployet.
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
