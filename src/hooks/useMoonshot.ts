"use client";

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/utils';

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
  const { model = 'moonshot-v1-8k', temperature = 0.7 } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke innlogget');
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/moonshot-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            message,
            model,
            temperature,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ukjent feil';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [model, temperature]);

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

/**
 * Hook for streaming-respons fra Moonshot AI
 */
export function useMoonshotStream(options: UseMoonshotOptions = {}) {
  const { model = 'moonshot-v1-8k', temperature = 0.7 } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sendMessageStream = useCallback(async (message: string) => {
    setIsLoading(true);
    setError(null);
    setStreamedText('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke innlogget');
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/moonshot-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            message,
            model,
            temperature,
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullText += chunk;
        setStreamedText(fullText);
      }

      return fullText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ukjent feil';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [model, temperature]);

  return {
    sendMessageStream,
    streamedText,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
