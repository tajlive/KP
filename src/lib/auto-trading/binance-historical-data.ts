/**
 * Binance Historical Data Fetcher
 * Fetches and caches historical candle data from Binance
 */

import { createClient } from '@/lib/supabase/server';

export interface BinanceCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
}

export type TimeInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

/**
 * Fetch historical candles from Binance
 */
export class BinanceHistoricalDataFetcher {
  private readonly BASE_URL = 'https://api.binance.com/api/v3';
  private readonly MAX_CANDLES_PER_REQUEST = 1000;
  private readonly RATE_LIMIT_DELAY_MS = 100;

  /**
   * Fetch historical candles with caching
   */
  async fetchCandles(
    symbol: string,
    interval: TimeInterval,
    startTime: Date,
    endTime: Date,
    options?: {
      useCache?: boolean;
      validateData?: boolean;
    }
  ): Promise<BinanceCandle[]> {
    const { useCache = true, validateData = true } = options || {};

    // Normalize symbol (remove USDT if present, then add it back)
    const normalizedSymbol = symbol.replace(/USDT$/i, '') + 'USDT';

    // 1. Check cache first
    if (useCache) {
      const cached = await this.getCachedCandles(normalizedSymbol, interval, startTime, endTime);
      if (cached && cached.length > 0) {
        const coverage = this.calculateCoverage(cached, startTime, endTime, interval);
        if (coverage >= 0.95) {
          console.info(`[Cache HIT] ${normalizedSymbol} ${interval} - ${cached.length} candles (${(coverage * 100).toFixed(1)}% coverage)`);
          return cached;
        }
      }
    }

    // 2. Fetch from Binance API
    console.info(`[Cache MISS] Fetching from Binance: ${normalizedSymbol} ${interval}`);
    const candles = await this.fetchFromBinance(normalizedSymbol, interval, startTime, endTime);

    // 3. Validate data quality
    if (validateData) {
      this.validateCandles(candles, interval);
    }

    // 4. Cache for future use
    await this.cacheCandles(normalizedSymbol, interval, candles);

    return candles;
  }

  /**
   * Fetch from Binance with pagination and rate limiting
   */
  private async fetchFromBinance(
    symbol: string,
    interval: TimeInterval,
    startTime: Date,
    endTime: Date
  ): Promise<BinanceCandle[]> {
    const allCandles: BinanceCandle[] = [];
    let currentStart = startTime.getTime();
    const endTimeMs = endTime.getTime();
    let retries = 0;
    const maxRetries = 3;

    while (currentStart < endTimeMs && retries < maxRetries) {
      try {
        const url = `${this.BASE_URL}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&startTime=${currentStart}&limit=${this.MAX_CANDLES_PER_REQUEST}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limit hit, waiting 5s...');
            await this.sleep(5000);
            retries++;
            continue;
          }
          if (response.status === 418) {
            throw new Error('IP banned by Binance - too many requests');
          }
          throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
          break;
        }

        // Parse candles
        const candles = data.map((k: unknown[]) => this.parseCandle(k));
        allCandles.push(...candles);

        // Move to next batch
        const lastCandle = candles[candles.length - 1];
        currentStart = lastCandle.closeTime + 1;

        // Reset retries on success
        retries = 0;

        // Rate limiting - be conservative
        await this.sleep(this.RATE_LIMIT_DELAY_MS);

        // Progress logging for long fetches
        if (allCandles.length % 5000 === 0) {
          const progress = ((currentStart - startTime.getTime()) / (endTimeMs - startTime.getTime()) * 100).toFixed(1);
          console.info(`  Progress: ${progress}% (${allCandles.length} candles)`);
        }

      } catch (error) {
        console.error('Error fetching from Binance:', error);
        retries++;
        if (retries >= maxRetries) {
          throw error;
        }
        await this.sleep(1000 * retries);
      }
    }

    console.info(`✅ Fetched ${allCandles.length} candles from Binance`);
    return allCandles;
  }

  /**
   * Parse raw Binance candle data
   */
  private parseCandle(raw: unknown[]): BinanceCandle {
    return {
      openTime: Number(raw[0]),
      open: parseFloat(String(raw[1])),
      high: parseFloat(String(raw[2])),
      low: parseFloat(String(raw[3])),
      close: parseFloat(String(raw[4])),
      volume: parseFloat(String(raw[5])),
      closeTime: Number(raw[6]),
      quoteAssetVolume: parseFloat(String(raw[7])),
      numberOfTrades: Number(raw[8]),
      takerBuyBaseAssetVolume: parseFloat(String(raw[9])),
      takerBuyQuoteAssetVolume: parseFloat(String(raw[10])),
    };
  }

  /**
   * Validate data quality
   */
  private validateCandles(candles: BinanceCandle[], interval: TimeInterval): void {
    if (candles.length === 0) {
      throw new Error('No candles returned from Binance');
    }

    const intervalMs = this.intervalToMilliseconds(interval);
    let gapsFound = 0;
    let anomaliesFound = 0;

    // Check for gaps in data
    for (let i = 1; i < candles.length; i++) {
      const expectedTime = candles[i - 1].closeTime + 1;
      const actualTime = candles[i].openTime;
      const diff = Math.abs(actualTime - expectedTime);

      if (diff > intervalMs * 2) {
        gapsFound++;
        if (gapsFound <= 3) {
          console.warn(`Data gap at index ${i}: ${(diff / intervalMs).toFixed(1)} intervals missing`);
        }
      }
    }

    // Check for price anomalies
    for (const candle of candles) {
      if (candle.high < candle.low) {
        throw new Error(`Invalid candle: high (${candle.high}) < low (${candle.low})`);
      }
      if (candle.close > candle.high * 1.01 || candle.close < candle.low * 0.99) {
        anomaliesFound++;
      }
      if (candle.open > candle.high * 1.01 || candle.open < candle.low * 0.99) {
        anomaliesFound++;
      }
    }

    if (gapsFound > 0) {
      console.warn(`⚠️ Data quality: ${gapsFound} gaps found in ${candles.length} candles`);
    }
    if (anomaliesFound > 0) {
      console.warn(`⚠️ Data quality: ${anomaliesFound} price anomalies detected`);
    }

    console.info(`✅ Data validation passed: ${candles.length} candles`);
  }

  /**
   * Calculate what percentage of the time range is covered by cached data
   */
  private calculateCoverage(
    candles: BinanceCandle[],
    startTime: Date,
    endTime: Date,
    interval: TimeInterval
  ): number {
    if (candles.length === 0) return 0;

    const firstCandleTime = candles[0].openTime;
    const lastCandleTime = candles[candles.length - 1].closeTime;
    const requestedStart = startTime.getTime();
    const requestedEnd = endTime.getTime();

    // Calculate overlap
    const overlapStart = Math.max(firstCandleTime, requestedStart);
    const overlapEnd = Math.min(lastCandleTime, requestedEnd);
    const overlapMs = Math.max(0, overlapEnd - overlapStart);

    const requestedMs = requestedEnd - requestedStart;
    return requestedMs > 0 ? overlapMs / requestedMs : 0;
  }

  /**
   * Cache candles in Supabase
   */
  private async cacheCandles(
    symbol: string,
    interval: TimeInterval,
    candles: BinanceCandle[]
  ): Promise<void> {
    const supabase = await createClient();

    // Batch insert (Supabase can handle ~1000 rows efficiently)
    const BATCH_SIZE = 1000;
    let inserted = 0;

    for (let i = 0; i < candles.length; i += BATCH_SIZE) {
      const batch = candles.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('binance_historical_candles')
        .upsert(
          batch.map(c => ({
            symbol: symbol.toUpperCase(),
            interval,
            open_time: new Date(c.openTime).toISOString(),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            close_time: new Date(c.closeTime).toISOString(),
            number_of_trades: c.numberOfTrades,
            quote_volume: c.quoteAssetVolume,
          })),
          { onConflict: 'symbol,interval,open_time' }
        );

      if (error) {
        console.error('Error caching candles:', error);
      } else {
        inserted += batch.length;
      }
    }

    console.info(`✅ Cached ${inserted}/${candles.length} candles to database`);
  }

  /**
   * Get cached candles from Supabase
   */
  private async getCachedCandles(
    symbol: string,
    interval: TimeInterval,
    startTime: Date,
    endTime: Date
  ): Promise<BinanceCandle[] | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('binance_historical_candles')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .eq('interval', interval)
      .gte('open_time', startTime.toISOString())
      .lte('open_time', endTime.toISOString())
      .order('open_time', { ascending: true });

    if (error) {
      console.error('Error fetching cached candles:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    return data.map(row => ({
      openTime: new Date(row.open_time).getTime(),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      closeTime: new Date(row.close_time).getTime(),
      quoteAssetVolume: row.quote_volume || 0,
      numberOfTrades: row.number_of_trades || 0,
      takerBuyBaseAssetVolume: 0,
      takerBuyQuoteAssetVolume: 0,
    }));
  }

  private intervalToMilliseconds(interval: TimeInterval): number {
    const map: Record<TimeInterval, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    return map[interval];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Pre-fetch common data sets for better performance
 */
export async function prefetchCommonData(): Promise<void> {
  const fetcher = new BinanceHistoricalDataFetcher();
  const symbols = ['BTC', 'ETH', 'SOL', 'BNB'];
  const intervals: TimeInterval[] = ['1h', '4h', '1d'];
  
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year

  console.info('🚀 Pre-fetching common historical data...');

  for (const symbol of symbols) {
    for (const interval of intervals) {
      try {
        await fetcher.fetchCandles(symbol, interval, startTime, endTime);
        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.error(`Failed to prefetch ${symbol} ${interval}:`, error);
      }
    }
  }

  console.info('✅ Pre-fetch complete');
}
