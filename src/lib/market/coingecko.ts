import { useState, useEffect } from 'react';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
}

// Gratis tier: 10-30 calls/minutt, ingen API key nødvendig
export async function getCryptoPrices(coins: string[] = ['bitcoin', 'ethereum', 'solana']): Promise<CryptoPrice[]> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=nok&ids=${coins.join(',')}&order=market_cap_desc`,
      { next: { revalidate: 60 } } // Cache 60 sekunder
    );
    
    if (!response.ok) throw new Error('CoinGecko API feil');
    return await response.json();
  } catch (error) {
    console.error('CoinGecko feil:', error);
    return [];
  }
}

// Enkel pris (for live ticker)
export async function getSimplePrices(coins: string[] = ['bitcoin', 'ethereum', 'solana']) {
  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coins.join(',')}&vs_currencies=nok&include_24hr_change=true`,
      { next: { revalidate: 30 } }
    );
    return await response.json();
  } catch (error) {
    return null;
  }
}

// React hook for live priser
export function useCryptoPrices(coins?: string[]) {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      const data = await getCryptoPrices(coins);
      setPrices(data);
      setLoading(false);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Oppdater hvert 30s
    return () => clearInterval(interval);
  }, [coins?.join(',')]);

  return { prices, loading };
}
