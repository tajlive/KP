// Verifiser clamp-fiksen: alle 11 symboler må gi |change24hPct| <= 1000
import { createKrakenMarketDataProvider } from "../src/lib/trading/canonical/market-data";

const provider = createKrakenMarketDataProvider();
const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT",
  "AVAXUSDT", "DOTUSDT", "LINKUSDT", "UNIUSDT", "POLUSDT", "BNBUSDT",
];

const snapshots = await Promise.all(
  SYMBOLS.map(async (symbol) => {
    try {
      const snap = await provider.get24hSnapshot(symbol);
      return { symbol, ok: true, snap };
    } catch (err) {
      return { symbol, ok: false, error: String(err).slice(0, 80) };
    }
  }),
);

let feil = 0;
for (const r of snapshots) {
  if (!r.ok) {
    console.log(`✗ ${r.symbol}: ${r.error}`);
    feil++;
    continue;
  }
  const c = r.snap.change24hPct;
  const ok = Number.isFinite(c) && Math.abs(c) <= 1000;
  if (!ok) feil++;
  console.log(
    `${ok ? "✓" : "✗ OVERFLOW"} ${r.symbol}: price=${r.snap.price.toFixed(2)} change24hPct=${c.toFixed(2)}`,
  );
}
console.log(feil === 0 ? "\nALLE OK — ingen overflow-verdier" : `\n${feil} FEIL`);
process.exit(feil === 0 ? 0 : 1);
