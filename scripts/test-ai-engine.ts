/**
 * Direct test of AI ensemble engine with Binance 1h data
 */
import { generateEnsembleSignalsBatch } from '../src/lib/ai/ensemble-engine';

async function fetchHourlyCandles(symbol: string, limit = 100) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Binance API error: ${res.status} for ${symbol}`);
  const data = await res.json() as [number, string, string, string, string, string][];
  return data.map((c) => ({
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

async function main() {
  console.log('Fetching 1h candles for BTCUSDT from Binance...');
  const candles = await fetchHourlyCandles('BTCUSDT', 100);
  console.log(`Fetched ${candles.length} candles`);

  const prices = candles.map((c) => c.close);
  console.log('Testing generateEnsembleSignalsBatch...');
  const results = await generateEnsembleSignalsBatch(
    ['BTCUSDT'],
    () => prices,
    { riskProfile: 'balanced', useLLM: true }
  );
  console.log('Results:', JSON.stringify(results, null, 2));
}

main().catch(console.error);
