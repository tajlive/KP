/**
 * WebSocket Fallback Module
 * 
 * Provides REST API fallback when WebSocket connections fail.
 * Implements circuit breaker pattern and caching for resilience.
 */

import { useRealtimeStore } from "@/store/realtime-store";

const FALLBACK_INTERVAL_MS = 10000; // Poll every 10 seconds when WS is down
const CACHE_TTL_MS = 60000; // Cache prices for 60 seconds
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT_MS = 30000;

// In-memory price cache
interface CachedPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

// LocalStorage cache key
const CACHE_KEY = "klarpakke_price_cache";

interface FallbackOptions {
  symbols: string[];
  onPriceUpdate?: (symbol: string, price: number, data: Partial<CachedPrice>) => void;
  enabled?: boolean;
}

class PriceFallback {
  private symbols: string[] = [];
  private onPriceUpdate?: (symbol: string, price: number, data: Partial<CachedPrice>) => void;
  private interval: ReturnType<typeof setInterval> | null = null;
  private isEnabled = false;
  private abortController: AbortController | null = null;
  
  // Circuit breaker state
  private consecutiveFailures = 0;
  private circuitOpen = false;
  private circuitResetTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Cache
  private memoryCache: Map<string, CachedPrice> = new Map();

  constructor(options?: FallbackOptions) {
    if (options) {
      this.symbols = options.symbols.map((s) => s.toUpperCase());
      this.onPriceUpdate = options.onPriceUpdate;
      this.isEnabled = options.enabled ?? false;
    }
    
    // Load cached prices from localStorage on init
    this.loadCacheFromStorage();
  }

  /**
   * Start fallback polling
   */
  start(): void {
    if (!this.isEnabled || this.interval) return;
    
    // Immediate first fetch
    this.fetchPrices();
    
    // Start interval
    this.interval = setInterval(() => {
      this.fetchPrices();
    }, FALLBACK_INTERVAL_MS);
  }

  /**
   * Stop fallback polling
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Update symbols to fetch
   */
  setSymbols(symbols: string[]): void {
    const newSymbols = symbols.map((s) => s.toUpperCase());
    const hasChanges = 
      newSymbols.length !== this.symbols.length ||
      newSymbols.some((s) => !this.symbols.includes(s));
    
    if (hasChanges) {
      this.symbols = newSymbols;
      
      // Restart if running
      if (this.interval) {
        this.stop();
        this.start();
      }
    }
  }

  /**
   * Enable/disable fallback
   */
  setEnabled(enabled: boolean): void {
    if (enabled === this.isEnabled) return;
    
    this.isEnabled = enabled;
    
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  /**
   * Get cached price for a symbol
   */
  getCachedPrice(symbol: string): CachedPrice | null {
    const normalizedSymbol = symbol.toUpperCase();
    
    // Check memory cache first
    const cached = this.memoryCache.get(normalizedSymbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached;
    }
    
    // Check localStorage
    const storageCache = this.getCacheFromStorage();
    const storagePrice = storageCache[normalizedSymbol];
    if (storagePrice && Date.now() - storagePrice.timestamp < CACHE_TTL_MS) {
      // Update memory cache
      this.memoryCache.set(normalizedSymbol, storagePrice);
      return storagePrice;
    }
    
    return null;
  }

  /**
   * Get all cached prices
   */
  getAllCachedPrices(): Record<string, CachedPrice> {
    const result: Record<string, CachedPrice> = {};
    
    // Merge memory and storage cache
    const storageCache = this.getCacheFromStorage();
    const allSymbols = new Set([
      ...this.memoryCache.keys(),
      ...Object.keys(storageCache),
    ]);
    
    for (const symbol of allSymbols) {
      const cached = this.getCachedPrice(symbol);
      if (cached) {
        result[symbol] = cached;
      }
    }
    
    return result;
  }

  /**
   * Prefetch prices for symbols (useful for warming cache)
   */
  async prefetch(symbols?: string[]): Promise<void> {
    const symbolsToFetch = symbols || this.symbols;
    if (symbolsToFetch.length === 0) return;
    
    await this.fetchPricesForSymbols(symbolsToFetch);
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(): boolean {
    return this.circuitOpen;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit(): void {
    this.circuitOpen = false;
    this.consecutiveFailures = 0;
    if (this.circuitResetTimer) {
      clearTimeout(this.circuitResetTimer);
      this.circuitResetTimer = null;
    }
  }

  /**
   * Clear all cached prices
   */
  clearCache(): void {
    this.memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  private async fetchPrices(): Promise<void> {
    if (this.circuitOpen || this.symbols.length === 0) return;
    
    await this.fetchPricesForSymbols(this.symbols);
  }

  private async fetchPricesForSymbols(symbols: string[]): Promise<void> {
    // Cancel any pending request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    
    try {
      // EU/EØS (2026): via egen API-rute → Kraken (ingen direkte Binance-kall)
      const url = `/api/market/binance-24hr?symbols=${encodeURIComponent(symbols.join(","))}`;
      
      const response = await fetch(url, {
        signal: this.abortController.signal,
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const body = (await response.json()) as {
        prices?: Array<{
          symbol: string;
          price: number;
          change24h: number;
        }>;
      };
      const data = body.prices ?? [];
      
      // Reset failure counter on success
      this.consecutiveFailures = 0;
      
      // Process and cache prices
      const now = Date.now();
      const cacheUpdate: Record<string, CachedPrice> = {};
      
      for (const ticker of data) {
        const cachedPrice: CachedPrice = {
          symbol: ticker.symbol,
          price: Number(ticker.price),
          change24h: Number(ticker.change24h),
          volume24h: 0,
          high24h: 0,
          low24h: 0,
          timestamp: now,
        };
        
        // Update memory cache
        this.memoryCache.set(ticker.symbol, cachedPrice);
        cacheUpdate[ticker.symbol] = cachedPrice;
        
        // Notify callback
        this.onPriceUpdate?.(ticker.symbol, cachedPrice.price, {
          change24h: cachedPrice.change24h,
          volume24h: cachedPrice.volume24h,
          high24h: cachedPrice.high24h,
          low24h: cachedPrice.low24h,
        });
        
        // Update global store
        useRealtimeStore.getState().updatePrice(ticker.symbol, {
          price: cachedPrice.price,
          change24h: cachedPrice.change24h,
          volume24h: cachedPrice.volume24h,
          high24h: cachedPrice.high24h,
          low24h: cachedPrice.low24h,
        });
      }
      
      // Update localStorage cache
      this.updateStorageCache(cacheUpdate);
      
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Request was cancelled, don't count as failure
      }
      
      this.handleError(error);
    }
  }

  private handleError(error: unknown): void {
    this.consecutiveFailures++;
    
    console.error("[PriceFallback] Fetch error:", error);
    
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.openCircuitBreaker();
    }
  }

  private openCircuitBreaker(): void {
    this.circuitOpen = true;
    console.warn("[PriceFallback] Circuit breaker opened due to repeated failures");
    
    // Schedule circuit reset
    this.circuitResetTimer = setTimeout(() => {
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
    }, CIRCUIT_BREAKER_TIMEOUT_MS);
  }

  private loadCacheFromStorage(): void {
    const cache = this.getCacheFromStorage();
    
    for (const [symbol, price] of Object.entries(cache)) {
      if (Date.now() - price.timestamp < CACHE_TTL_MS) {
        this.memoryCache.set(symbol, price);
      }
    }
  }

  private getCacheFromStorage(): Record<string, CachedPrice> {
    if (typeof window === "undefined") return {};
    
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        return JSON.parse(stored) as Record<string, CachedPrice>;
      }
    } catch {
      // Ignore localStorage errors
    }
    
    return {};
  }

  private updateStorageCache(updates: Record<string, CachedPrice>): void {
    if (typeof window === "undefined") return;
    
    try {
      const existing = this.getCacheFromStorage();
      const merged = { ...existing, ...updates };
      
      // Clean old entries
      const now = Date.now();
      const cleaned: Record<string, CachedPrice> = {};
      for (const [symbol, price] of Object.entries(merged)) {
        if (now - price.timestamp < CACHE_TTL_MS) {
          cleaned[symbol] = price;
        }
      }
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cleaned));
    } catch {
      // Ignore localStorage errors (e.g., quota exceeded)
    }
  }
}

/**
 * Fetch current prices via REST API (one-shot)
 * Useful for initial load or when WebSocket is unavailable.
 * EU/EØS (2026): via egen API-rute → Kraken.
 */
async function fetchPricesREST(symbols: string[]): Promise<Record<string, CachedPrice>> {
  if (symbols.length === 0) return {};
  
  const url = `/api/market/binance-24hr?symbols=${encodeURIComponent(symbols.map((s) => s.toUpperCase()).join(","))}`;
  
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const body = (await response.json()) as {
    prices?: Array<{
      symbol: string;
      price: number;
      change24h: number;
    }>;
  };
  const data = body.prices ?? [];
  
  const now = Date.now();
  const result: Record<string, CachedPrice> = {};
  
  for (const ticker of data) {
    result[ticker.symbol] = {
      symbol: ticker.symbol,
      price: Number(ticker.price),
      change24h: Number(ticker.change24h),
      volume24h: 0,
      high24h: 0,
      low24h: 0,
      timestamp: now,
    };
  }
  
  return result;
}

/**
 * Fetch single symbol price via REST API
 * EU/EØS (2026): via egen API-rute → Kraken.
 */
async function fetchPriceREST(symbol: string): Promise<CachedPrice | null> {
  const url = `/api/market/binance-24hr?symbols=${encodeURIComponent(symbol.toUpperCase())}`;
  
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const body = (await response.json()) as {
    prices?: Array<{
      symbol: string;
      price: number;
      change24h: number;
    }>;
  };
  const ticker = body.prices?.[0];
  
  if (!ticker) return null;
  
  return {
    symbol: ticker.symbol,
    price: Number(ticker.price),
    change24h: Number(ticker.change24h),
    volume24h: 0,
    high24h: 0,
    low24h: 0,
    timestamp: Date.now(),
  };
}

export { PriceFallback, fetchPricesREST, fetchPriceREST, type CachedPrice };
export { FALLBACK_INTERVAL_MS, CACHE_TTL_MS };
