'use client'

import { useState, useEffect } from 'react';

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  image?: string;
}

interface PricesResponse {
  ok: boolean;
  data: CryptoPrice[];
  fallback?: boolean;
  timestamp: string;
}

const DEFAULT_PRICES: CryptoPrice[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 98432, change24h: 2.4 },
  { symbol: 'ETH', name: 'Ethereum', price: 3456, change24h: 1.8 },
  { symbol: 'SOL', name: 'Solana', price: 178, change24h: -0.5 },
];

const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
};

/**
 * Hook for fetching crypto prices from our API proxy
 * Falls back to cached values on error
 */
export function useCryptoPrices() {
  const [prices, setPrices] = useState<CryptoPrice[]>(DEFAULT_PRICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const ids = Object.keys(CRYPTO_IDS).join(',');
        const response = await fetch(`/api/market/prices?coins=${ids}&currency=usd`, {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result: PricesResponse = await response.json();
        
        if (!result.ok || !result.data) {
          throw new Error('Invalid response format');
        }
        
        setPrices(result.data);
        setIsFallback(result.fallback || false);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching crypto prices:', err);
        setError('Kunne ikke hente live priser');
        setLoading(false);
        // Keep existing prices (fallback)
        setIsFallback(true);
      }
    };

    fetchPrices();
    
    // Update every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { 
    prices, 
    loading, 
    error, 
    isFallback,
  };
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }
  return price.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 4 
  });
}

export function formatChange(change: number): { text: string; isPositive: boolean } {
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '';
  return {
    text: `${sign}${change.toFixed(2)}%`,
    isPositive,
  };
}
