/**
 * USE SANITY DESIGN TOKENS HOOK
 * 
 * Henter design tokens fra Sanity CMS og injecter dem som CSS variabler.
 * Brukes i root layout for dynamisk theming.
 */

'use client';

import { useEffect, useState } from 'react';

interface DesignTokens {
  brandColors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
  };
  semanticColors: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  darkMode: {
    bgPrimary: string;
    bgSecondary: string;
    bgElevated: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    baseFontSize: number;
  };
  spacing: {
    unit: number;
    scale: number;
  };
  borderRadius: {
    button: number;
    card: number;
    input: number;
  };
  shadows: {
    card: string;
    elevated: string;
    glow: string;
  };
}

interface TokensResponse {
  tokens: DesignTokens;
  css: string;
  lastUpdated: string | null;
  source: 'sanity' | 'default';
}

interface UseSanityTokensReturn {
  tokens: DesignTokens | null;
  loading: boolean;
  error: Error | null;
  source: 'sanity' | 'default' | null;
}

/**
 * Injecter CSS fra Sanity tokens inn i dokumentet
 */
function injectSanityTokensCSS(css: string): void {
  const styleId = 'sanity-design-tokens';
  
  // Fjern eksisterende hvis finnes
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Opprett ny style tag
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * React hook for å hente og applisere Sanity design tokens
 */
export function useSanityTokens(): UseSanityTokensReturn {
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<'sanity' | 'default' | null>(null);

  useEffect(() => {
    // Bare kjør på klient-siden
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const fetchTokens = async () => {
      try {
        // Sjekk sessionStorage for cached tokens (reduserer API kall)
        const cached = sessionStorage.getItem('sanity-design-tokens');
        const cachedTime = sessionStorage.getItem('sanity-design-tokens-time');
        const now = Date.now();
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutter

        if (cached && cachedTime && (now - parseInt(cachedTime)) < cacheMaxAge) {
          const parsed = JSON.parse(cached) as TokensResponse;
          setTokens(parsed.tokens);
          setSource(parsed.source);
          injectSanityTokensCSS(parsed.css);
          setLoading(false);
          return;
        }

        // Fetch fra API (ikke direkte fra Sanity)
        const response = await fetch('/api/v1/design-tokens');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tokens: ${response.status}`);
        }

        const data: TokensResponse = await response.json();
        
        // Cache i sessionStorage
        sessionStorage.setItem('sanity-design-tokens', JSON.stringify(data));
        sessionStorage.setItem('sanity-design-tokens-time', now.toString());
        
        // Set state
        setTokens(data.tokens);
        setSource(data.source);
        
        // Inject CSS (overskriver fallback verdier)
        if (data.source === 'sanity') {
          injectSanityTokensCSS(data.css);
        }
        
      } catch (err) {
        console.warn('[useSanityTokens] Failed to load tokens:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        // Fallback: fortsett med hardkodede verdier (ingen error visning)
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  return { tokens, loading, error, source };
}

/**
 * Komponent som automatisk injecter Sanity tokens CSS
 * Brukes i root layout
 */
export function SanityTokensProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  useSanityTokens();
  return children;
}
