// Direkte integrasjonstest: KrakenMarketDataProvider mot ekte API
import { KrakenMarketDataProvider } from '../src/lib/trading/canonical/market-data/kraken-provider.ts';

const p = new KrakenMarketDataProvider();
for (const sym of ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']) {
  const price = await p.getPrice(sym);
  const klines = await p.getKlines(sym, '1h', 5);
  const chg = await p.get24hChange(sym);
  const last = klines[klines.length - 1];
  console.log(`${sym}: pris=${price.toFixed(2)} | 1h-close=${last.close.toFixed(2)} | 24h=${chg.toFixed(2)}% | lys=${klines.length}`);
}
try {
  await p.getPrice('FAKESYM');
  console.log('FEIL: FAKESYM skulle kastet');
} catch (e) {
  console.log(`Fallback OK: ${e.message}`);
}
