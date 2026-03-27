# WebSocket Architecture — Klarpakke

**Dokumentasjon for Script 08: Real-Time WebSocket**

Dette dokumentet beskriver den forbedrede WebSocket-arkitekturen for Klarpakke, som gir robust, skalerbar real-time prisoppdatering fra Binance.

## Arkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Components                            │
│                   (useWebSocketPrice)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WebSocketManager                            │
│  - Singleton pattern                                            │
│  - Connection pooling (1 connection for alle symbols)           │
│  - Automatic reconnect med exponential backoff                  │
│  - Heartbeat/ping-pong                                          │
│  - Circuit breaker                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BinanceWebSocket                              │
│  - Stream multiplexing                                          │
│  - 24hrTicker (pris + 24h endring)                              │
│  - AggTrade (real-time trades)                                  │
│  - Depth (order book)                                           │
│  - Kline (candlesticks)                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Binance WS API                             │
│                   wss://stream.binance.com                      │
└─────────────────────────────────────────────────────────────────┘
```

## Fallback-løsning

```
┌─────────────────────────────────────────────────────────────────┐
│                    PriceFallback                                │
│  - REST API fallback når WS feiler                              │
│  - localStorage cache                                           │
│  - Circuit breaker                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Binance REST API                             │
│                   api.binance.com/api/v3                        │
└─────────────────────────────────────────────────────────────────┘
```

## Filer

| Fil | Beskrivelse |
|-----|-------------|
| `src/lib/websocket/WebSocketManager.ts` | Core singleton manager med reconnect, heartbeat |
| `src/lib/websocket/BinanceWebSocket.ts` | Binance-spesifikke streams (ticker, trades, depth) |
| `src/lib/websocket/fallback.ts` | REST API fallback og caching |
| `src/lib/websocket/index.ts` | Barrel exports |
| `src/hooks/useWebSocketPrice.ts` | React hooks for enkel integrasjon |
| `src/app/api/health/websocket/route.ts` | Health check API |

## Bruk

### Enkel prisvisning (én symbol)

```tsx
import { useWebSocketPrice } from "@/lib/websocket";

function PriceDisplay({ symbol }: { symbol: string }) {
  const { price, change24h, isConnected, isLoading, error } = useWebSocketPrice(symbol);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <span>${price?.toFixed(2)}</span>
      <span className={change24h && change24h >= 0 ? "text-green-500" : "text-red-500"}>
        {change24h?.toFixed(2)}%
      </span>
      <span>{isConnected ? "🟢" : "🔴"}</span>
    </div>
  );
}
```

### Flere symboler (effektiv deling av connection)

```tsx
import { useWebSocketPrices } from "@/lib/websocket";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

function PriceList() {
  const { prices, isConnected } = useWebSocketPrices(SYMBOLS);

  return (
    <div>
      {SYMBOLS.map((symbol) => (
        <div key={symbol}>
          {symbol}: ${prices[symbol]?.price.toFixed(2)}
        </div>
      ))}
    </div>
  );
}
```

### Avansert: Trade stream

```tsx
import { binanceWebSocket } from "@/lib/websocket";
import { useEffect } from "react";

function TradeStream({ symbol }: { symbol: string }) {
  useEffect(() => {
    const unsubscribe = binanceWebSocket.subscribeToAggTrades(symbol, (trade) => {
      console.log("New trade:", trade.price, trade.quantity);
    });

    return unsubscribe;
  }, [symbol]);

  return <div>Streaming trades...</div>;
}
```

### Order book (depth)

```tsx
import { binanceWebSocket } from "@/lib/websocket";

function OrderBook({ symbol }: { symbol: string }) {
  useEffect(() => {
    const unsubscribe = binanceWebSocket.subscribeToDepth(symbol, (depth) => {
      console.log("Bids:", depth.bids.slice(0, 5));
      console.log("Asks:", depth.asks.slice(0, 5));
    }, { level: 20, speed: 1000 });

    return unsubscribe;
  }, [symbol]);

  // ...
}
```

## Health Check

```bash
# Sjekk WebSocket status
curl http://localhost:3000/api/health/websocket

# Trigger reconnect
curl -X POST http://localhost:3000/api/health/websocket \
  -H "Content-Type: application/json" \
  -d '{"action": "reconnect"}'

# Reset manager (emergency)
curl -X POST http://localhost:3000/api/health/websocket \
  -H "Content-Type: application/json" \
  -d '{"action": "reset"}'
```

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-03-27T10:30:00.000Z",
  "connection": {
    "state": "connected",
    "isCircuitOpen": false
  },
  "subscriptions": {
    "total": 5,
    "uniqueSymbols": 3,
    "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
  },
  "metrics": {
    "connectCount": 1,
    "reconnectCount": 0,
    "errorCount": 0,
    "lastMessageAt": "2026-03-27T10:29:59.500Z",
    "lastConnectAt": "2026-03-27T10:00:00.000Z",
    "messagesReceived": 1250,
    "bytesReceived": 45000,
    "uptimeSeconds": 1800
  },
  "checks": {
    "isConnected": true,
    "hasRecentMessage": true,
    "hasSubscriptions": true,
    "noExcessiveReconnects": true
  }
}
```

## Konfigurasjon

### Reconnect strategi

| Parameter | Verdi | Beskrivelse |
|-----------|-------|-------------|
| `BASE_RECONNECT_DELAY_MS` | 1000 | Start forsinkelse |
| `MAX_RECONNECT_DELAY_MS` | 30000 | Maks forsinkelse |
| `MAX_RECONNECT_ATTEMPTS` | 10 | Maks antall forsøk |
| `HEARTBEAT_INTERVAL_MS` | 30000 | Hjerteslag intervall |
| `HEARTBEAT_TIMEOUT_MS` | 10000 | Timeout for pong |
| `CIRCUIT_BREAKER_THRESHOLD` | 5 | Før breaker åpner |
| `CIRCUIT_BREAKER_RESET_MS` | 60000 | Tid før reset |

### Fallback

| Parameter | Verdi | Beskrivelse |
|-----------|-------|-------------|
| `FALLBACK_INTERVAL_MS` | 10000 | POLL intervall |
| `CACHE_TTL_MS` | 60000 | Cache levetid |

## Forbedringer fra tidligere implementasjon

| Funksjon | Gammel | Ny |
|----------|--------|-----|
| Connection management | Enkel singleton | Robust med circuit breaker |
| Reconnect | Lineær backoff | Exponential backoff (1s → 30s) |
| Heartbeat | Nei | Ja (30s intervall) |
| Subscription IDs | Nei | Ja (muliggjør individuell unsubscribe) |
| Fallback | Nei | REST API + localStorage cache |
| Multi-symbol | Flere connections | Én multiplexed connection |
| Metrics | Nei | Detaljert logging av bytes, messages |
| Health check | Nei | Dedikert API endpoint |
| Type safety | Delvis | Full strict TypeScript |

## Testing

```tsx
// Test WebSocketManager
import { WebSocketManager } from "@/lib/websocket";

const manager = WebSocketManager.getInstance();
const subId = manager.subscribe("BTCUSDT", (data) => {
  console.log("Price update:", data);
});

// Cleanup
manager.unsubscribe(subId);

// Test fallback
import { PriceFallback } from "@/lib/websocket";

const fallback = new PriceFallback({
  symbols: ["BTCUSDT"],
  enabled: true,
  onPriceUpdate: (symbol, price) => console.log(symbol, price),
});

fallback.start();
```

## Feilsøking

| Problem | Årsak | Løsning |
|---------|-------|---------|
| "Circuit breaker is open" | For mange feil | Vent 60s, eller POST /api/health/websocket |
| Ingen prisoppdateringer | WS disconnected | Sjekk health, trigger reconnect |
| "Using fallback" | WS feilet etter 3 retries | Normal oppførsel, sjekk nettverk |
| Høy reconnect count | Ustabilt nettverk | Sjekk internett, øk threshold |

## Sikkerhet

- WebSocket connections er alltid til Binance (verifisert domene)
- Ingen sensitiv data sendes over WS (kun symbol abonnementer)
- localStorage cache inneholder kun offentlige priser

## ytelse

- Én WebSocket connection for alle symboler (multiplexing)
- Max 5 REST API fallback kall per sekund (rate limiting)
- Memory cache + localStorage for øyeblikkelig visning
- Automatic cleanup på unmount (ingen memory leaks)
