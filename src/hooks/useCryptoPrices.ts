'use client'

import { useState, useEffect } from 'react'

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
  image?: string
}

const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
}

export function useCryptoPrices() {
  const [prices, setPrices] = useState<CryptoPrice[]>([
    { symbol: 'BTC', name: 'Bitcoin', price: 98432, change24h: 2.4 },
    { symbol: 'ETH', name: 'Ethereum', price: 3456, change24h: 1.8 },
    { symbol: 'SOL', name: 'Solana', price: 178, change24h: -0.5 },
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = Object.values(CRYPTO_IDS).join(',')
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
          { cache: 'no-store' }
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch prices')
        }

        const data = await response.json()
        
        const formatted: CryptoPrice[] = [
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            price: data.bitcoin?.usd || 98432,
            change24h: data.bitcoin?.usd_24h_change || 0,
          },
          {
            symbol: 'ETH',
            name: 'Ethereum',
            price: data.ethereum?.usd || 3456,
            change24h: data.ethereum?.usd_24h_change || 0,
          },
          {
            symbol: 'SOL',
            name: 'Solana',
            price: data.solana?.usd || 178,
            change24h: data.solana?.usd_24h_change || 0,
          },
        ]

        setPrices(formatted)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching crypto prices:', err)
        setError('Kunne ikke hente live priser')
        setLoading(false)
        // Keep fallback prices
      }
    }

    fetchPrices()
    
    // Update every 30 seconds
    const interval = setInterval(fetchPrices, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return { prices, loading, error }
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
  }
  return price.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 4 
  })
}

export function formatChange(change: number): { text: string; isPositive: boolean } {
  const isPositive = change >= 0
  const sign = isPositive ? '+' : ''
  return {
    text: `${sign}${change.toFixed(2)}%`,
    isPositive,
  }
}
