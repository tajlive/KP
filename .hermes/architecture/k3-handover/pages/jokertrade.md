# Side: JokerTrade (`/jokertrade`)

> **Fil:** `src/app/[locale]/(social)/jokertrade/page.tsx`
> **Komponenter:** JokerTradeLanding, JokerTradeClient, PositionCard, AgentVotes, JokerButton, TradeHistory

---

## Arkitektur: Én side, tre tilstander

Hele siden er én fil. Ingen separat "landing" vs "dashboard". Tilstanden bestemmes av auth-status og om brukeren har handler.

```
page.tsx
├── JokerTradePage (server component)
│   └── JokerTradeShell (client component — "use client")
│       ├── [Tilstand A] JokerTradeHero (ikke innlogget)
│       │   ├── Verdier (100K lekepenger, 12 agenter, 30 sek)
│       │   ├── Start-knapp → /register
│       │   └── LivePriceTicker
│       ├── [Tilstand B] WelcomeBanner (innlogget, ingen handler)
│       │   ├── JokerButton (stor, animert, pulserende)
│       │   └── Verdier
│       └── [Tilstand C] Dashboard (innlogget, har handler)
│           ├── P&L-header (total gevinst/tap)
│           ├── PositionCard[] (åpne posisjoner)
│           ├── AgentVotes (siste AI-innsikt)
│           ├── JokerButton (kjør ny analyse)
│           └── TradeHistory (siste handler)
```

---

## Tilstand A: Ikke innlogget

```
┌────────────────────────────────────────────┐
│                                            │
│         🎭 JokerTrade                      │
│    Din personlige AI-trader                │
│                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 100 000  │ │    12    │ │   30     │   │
│  │   kr     │ │ agenter  │ │ sekunder │   │
│  │lekepenger│ │ stemmer  │ │  å sette │   │
│  │null risiko│ │ 24/7    │ │   opp    │   │
│  └──────────┘ └──────────┘ └──────────┘   │
│                                            │
│     [🚀 Start gratis — 30 sekunder]         │
│                                            │
│   Live: ₿ $65 446 ▲  ⟠ $1 970 ▲  ◎ $77 ▲ │
│                                            │
└────────────────────────────────────────────┘
```

---

## Tilstand B: Innlogget, ingen handler

```
┌────────────────────────────────────────────┐
│                                            │
│       🎭 Velkommen til JokerTrade!         │
│                                            │
│  Din AI-trader er klar. Trykk på           │
│  JOKER-knappen så finner AI-en den         │
│  beste trade-opportuniteten akkurat nå.    │
│                                            │
│         ┌─────────────────┐               │
│         │                 │               │
│         │    🃏  JOKER    │               │
│         │   Start AI     │               │
│         │                 │               │
│         └─────────────────┘               │
│          ↑ pulserende gull-glød            │
│          ↑ animate-glow-pulse              │
│                                            │
│  ✅ 12 agenter analyserer 50+ kryptopar   │
│  ✅ AI stemmer og velger beste trade      │
│  ✅ Handler med lekepenger — null risiko  │
│                                            │
└────────────────────────────────────────────┘
```

---

## Tilstand C: Innlogget, har handler

```
┌────────────────────────────────────────────┐
│  🎭 JokerTrade    ● Aktiv    Sist: 2m siden│
│  ═══════════════════════════════════════════│
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Total P&L                             │  │
│  │ +1 247 kr                  ▲ +14.3%  │  │
│  │ Siden start                            │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Åpne posisjoner                           │
│  ┌──────────────────────────────────────┐  │
│  │ SOLUSDT          3.5 SOL             │  │
│  │ Snitt: $142.75    Nå: $145.20       │  │
│  │ P&L: +$8.58 (+1.7%)  ▲              │  │
│  │                                      │  │
│  │ ┌─ Agent-stemmer ─────────────────┐  │  │
│  │ │ trend      92% BUY ████████████  │  │  │
│  │ │ momentum   88% BUY ███████████   │  │  │
│  │ │ news       85% BUY ██████████    │  │  │
│  │ │ narrative  82% BUY █████████     │  │  │
│  │ │ volume     78% BUY ████████      │  │  │
│  │ │ sentiment  75% BUY ███████       │  │  │
│  │ │ onchain    70% BUY ██████        │  │  │
│  │ │ breakout   65% BUY █████         │  │  │
│  │ │ ... 4 more agents ...            │  │  │
│  │ │      8/12 BUY  (67%)             │  │  │
│  │ └─────────────────────────────────┘  │  │
│  │ [▲ Vis mindre]                       │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ ETHUSDT          0.25 ETH            │  │
│  │ Snitt: $2 018.30  Nå: $2 012.10     │  │
│  │ P&L: -$1.55 (-0.3%)  ▼              │  │
│  │ 7/12 agenter BUY → [▼ Hvorfor?]     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  🧠 Siste AI-innsikt                       │
│  "8 av 12 agenter stemte BUY på SOL —     │
│   Solana Firedancer upgrade +              │
│   2 whale-akkumuleringer"                  │
│  ─ 2 min siden                            │
│                                            │
│  [🃏 Kjør ny CryptoPilot-analyse]          │
│                                            │
│  Siste handler                             │
│  ┌──────────────────────────────────────┐  │
│  │ 2m siden  SOLUSDT  BUY  3.5 SOL     │  │
│  │           $142.75     Åpen           │  │
│  │ 2m siden  ETHUSDT  BUY  0.25 ETH    │  │
│  │           $2 018.30   Åpen           │  │
│  │ 3t siden  BTCUSDT  SELL 0.0026 BTC  │  │
│  │           $65 450     +$3.94         │  │
│  └──────────────────────────────────────┘  │
│  [Se alle handler →]                       │
└────────────────────────────────────────────┘
```

---

## i18n-nøkler (no.json)

```json
{
  "jokertrade": {
    "hero": {
      "title": "Din personlige AI-trader",
      "stats": {
        "balance": "100 000 kr",
        "balanceLabel": "lekepenger",
        "agents": "12 agenter",
        "agentsLabel": "stemmer 24/7",
        "setup": "30 sekunder",
        "setupLabel": "å sette opp"
      },
      "cta": "Start gratis — 30 sekunder"
    },
    "welcome": {
      "title": "Velkommen til JokerTrade!",
      "description": "Din AI-trader er klar. Trykk på JOKER-knappen så finner AI-en den beste trade-opportuniteten akkurat nå.",
      "features": [
        "12 agenter analyserer 50+ kryptopar",
        "AI stemmer og velger beste trade",
        "Handler med lekepenger — null risiko"
      ]
    },
    "dashboard": {
      "title": "JokerTrade",
      "active": "Aktiv",
      "lastUpdated": "Sist oppdatert",
      "totalPnl": "Total P&L",
      "sinceStart": "Siden start",
      "openPositions": "Åpne posisjoner",
      "aiInsight": "Siste AI-innsikt",
      "runAnalysis": "Kjør ny CryptoPilot-analyse",
      "recentTrades": "Siste handler",
      "seeAll": "Se alle handler"
    },
    "position": {
      "average": "Snitt",
      "current": "Nå",
      "agentVotes": "Agent-stemmer",
      "showMore": "Vis mer",
      "showLess": "Vis mindre",
      "why": "Hvorfor?"
    },
    "button": {
      "start": "Start AI",
      "analyzing": "Analyserer..."
    }
  }
}
```

---

## Auth-flyt

```tsx
// JokerTradeShell.tsx — "use client"
import { useAuth } from "@/lib/auth/useAuth";

export function JokerTradeShell() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<JokerTradeData>({ ... });

  // Fetch data når innlogget (poll hvert 30. sekund)
  useEffect(() => {
    if (!user) return;
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) return <Spinner />;
  if (!user) return <JokerTradeHero />;

  const hasTrades = data.history.length > 0 || data.positions.length > 0;
  if (!hasTrades) return <WelcomeBanner onStart={triggerJoker} />;

  return <Dashboard data={data} onAnalyze={triggerJoker} />;
}
```
