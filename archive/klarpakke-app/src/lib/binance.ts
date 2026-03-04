import Binance from 'node-binance-api';

import { env } from '$lib/env';

const binance = new Binance().options({
  APIKEY: env.BINANCE_API_KEY || '',
  APISECRET: env.BINANCE_SECRET || '',
  useServerTime: true, // Sync time
});

export async function getRiskScore(symbol = 'BTCUSDT', leverage = 5, positionSize = 10000) {
  try {
    // 1. Fetch ticker (price + 24h change)
    const ticker = await binance.prices(symbol);
    const price = parseFloat(ticker[symbol]);

    // 2. Volatility (ATR proxy via 24h high/low)
    const klines = await binance.candles(symbol, '1h', 24, null, { limit: 24 });
    const highs = klines.map(k => parseFloat(k[2]));
    const lows = klines.map(k => parseFloat(k[3]));
    const atr = (highs.reduce((a,b)=>a+b)/highs.length - lows.reduce((a,b)=>a+b)/lows.length) / price;

    // 3. Risk metrics
    const maxLoss = positionSize * leverage * atr;
    const liquidationPrice = price * (1 - 1/leverage);
    const riskScore = Math.min(atr * leverage * 100, 100);

    return {
      symbol,
      price,
      atr: (atr*100).toFixed(2) + '%',
      riskScore: Math.round(riskScore),
      maxLoss: Math.round(maxLoss) + ' NOK',
      liquidationPrice: liquidationPrice.toFixed(2),
      recommendation: riskScore > 70 ? 'HIGH RISK - AVSTÅ' : riskScore > 40 ? 'MEDIUM' : 'LOW',
    };
  } catch (error) {
    return { error: error.message, riskScore: 100 };
  }
}

export async function getLiveSignals() {
  // WebSocket streams for real-time
  const stream = binance.ws.ticker('BTCUSDT@aggTrade', (ticker) => {
    // Emit risk updates
  });

  return stream;
}

export default binance;