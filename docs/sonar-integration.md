# Perplexity Sonar Integration

Denne dokumentasjonen beskriver integrasjonen mot Perplexity Sonar/Sonar Pro API for narrativ-analyse, markedsregime-vurdering og forklaring av trading-signaler.

## Oversikt

Sonar-integrasjonen består av følgende moduler:

- **`src/lib/ai/sonar/`** - Kjerneklient og spesialiserte moduler
- **`src/lib/trading/confluent-signal-engine.ts`** - Signal-engine som kombinerer teknisk og AI-analyse
- **`src/app/api/signal/current/`** - API-endepunkt for å hente signaler
- **`src/app/api/signal/explanation/`** - API-endepunkt for forklaringer

## Dataflyt

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Confluent Signal Engine                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Tekniske   │    │   Narrativ   │    │   Regime     │               │
│  │  Indikatorer │    │    Scan      │    │    Scan      │               │
│  │  (lokal)     │    │   (Sonar)    │    │   (Sonar)    │               │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │
│         │                   │                   │                        │
│         └───────────────────┼───────────────────┘                        │
│                             ▼                                            │
│                  ┌────────────────────┐                                  │
│                  │  Vektet Kombinasjon │                                  │
│                  │  (konfigurerbar)    │                                  │
│                  └──────────┬─────────┘                                  │
│                             ▼                                            │
│                  ┌────────────────────┐                                  │
│                  │  Confluent Signal   │                                  │
│                  │  - score (0-100)    │                                  │
│                  │  - risk level (1-5) │                                  │
│                  │  - action           │                                  │
│                  └────────────────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   Signal Explanation API   │
                    │   (explainSignal)          │
                    │   - Pedagogisk forklaring  │
                    │   - Risikoadvarsler        │
                    └───────────────────────────┘
```

## Miljøvariabler

Legg til følgende i `.env.local`:

```bash
# Perplexity Sonar API
PERPLEXITY_API_KEY=pplx-...  # Din Perplexity API-nøkkel
SONAR_API_BASE_URL=https://api.perplexity.ai  # Optional, default vist

# Signal Engine Weights (optional, for tuning uten kodeendringer)
SIGNAL_WEIGHT_TECHNICAL=0.5   # Vekting av tekniske indikatorer
SIGNAL_WEIGHT_NARRATIVE=0.25  # Vekting av narrativ-analyse
SIGNAL_WEIGHT_REGIME=0.25     # Vekting av regime-analyse
```

## Moduler

### 1. Sonar Client (`src/lib/ai/sonar/client.ts`)

Hovedklient for API-kall med:
- **Retry-logikk**: Eksponensiell backoff opptil 3 forsøk
- **Rate limiting**: Token bucket per tier (sonar/sonar-pro)
- **Timeout**: Konfigurerbar, default 30s
- **Metrikker**: Antall kall, feilrate, latency

```typescript
import { callSonar, getSonarMetrics } from '@/lib/ai/sonar';

// Enkelt kall
const response = await callSonar('Din prompt her', {
  tier: 'sonar',      // 'sonar' | 'sonar-pro'
  mode: 'medium',     // 'low' | 'medium' | 'high'
  jsonMode: true,     // For strukturert output
  timeoutMs: 30000,
});

// Sjekk metrikker
const metrics = getSonarMetrics();
console.log(`Calls: ${metrics.callsTotal}, Errors: ${metrics.errorsTotal}`);
```

### 2. Narrative Scan (`src/lib/ai/sonar/narrativeScan.ts`)

Analyserer nyheter og sentiment for et spesifikt symbol.

```typescript
import { narrativeScan, narrativeScanWithFallback } from '@/lib/ai/sonar';

// Med fallback (returnerer default verdier ved feil)
const result = await narrativeScanWithFallback('BTC', {
  tier: 'sonar',
  mode: 'medium',
});

// Resultat:
// {
//   symbol: 'BTC',
//   sentiment: 0.5,        // -1, -0.5, 0, 0.5, 1
//   event_risk: 0.3,       // 0-1
//   key_events: [...],     // Viktige hendelser
//   reasoning_excerpt: '...',
//   sources: [...]         // Kilder med URL
// }
```

### 3. Regime Scan (`src/lib/ai/sonar/regimeScan.ts`)

Vurderer det overordnede markedsregimet med caching.

```typescript
import { 
  regimeScan, 
  regimeScanWithFallback,
  isRegimeCacheValid,
  refreshRegime 
} from '@/lib/ai/sonar';

// Hent cachet regime (default TTL: 4 timer)
const regime = await regimeScanWithFallback();

// Tving oppdatering
const freshRegime = await refreshRegime();

// Sjekk cache-status
if (isRegimeCacheValid()) {
  console.log('Regime data is fresh');
}
```

### 4. Signal Explanation (`src/lib/ai/sonar/explainSignal.ts`)

Genererer pedagogiske forklaringer på norsk for trading-signaler.

```typescript
import { explainSignalWithFallback } from '@/lib/ai/sonar';

const explanation = await explainSignalWithFallback({
  symbol: 'BTC',
  timeframe: 'medium',
  decision: 'BUY',
  score: 75,
  risk_level: 3,
  factors: {
    trend: 0.8,
    volatility: 0.4,
    ai_signal: 0.75,
  },
  userRiskProfile: 'balanced',
  locale: 'nb-NO',
});

// Resultat:
// {
//   title: 'Kjøpssignal for Bitcoin',
//   summary: '2-4 setninger med forklaring...',
//   key_points: ['Punkt 1', 'Punkt 2'],
//   risk_warnings: ['Trading er risikofullt...'],
//   sources: [...]
// }
```

## API-endepunkter

### GET /api/signal/current

Henter nåværende signal for et symbol.

**Query Parameters:**
- `symbol` (string, default: 'BTC') - Trading symbol
- `strategy` (string, default: 'multisignal_aktiv') - Strategitype

**Response:**
```json
{
  "action": "BUY",
  "reason": "SMA(10) krysset over SMA(30) | Nyheter: ETF approval (high) | Regime: bull",
  "score": 72,
  "riskLevel": 3,
  "factors": {
    "trend": 0.8,
    "volatility": 0.4,
    "ai_signal": 0.72,
    "narrative_sentiment": 0.5,
    "event_risk": 0.2,
    "market_regime": "bull"
  },
  "metadata": {
    "narrativeData": { ... },
    "regimeData": { ... },
    "usedFallback": false
  },
  "_meta": {
    "requestId": "...",
    "durationMs": 2500,
    "symbol": "BTC",
    "strategy": "trend_balansert",
    "timestamp": "2024-..."
  }
}
```

### POST /api/signal/explanation

Genererer forklaring for et signal.

**Request Body:**
```json
{
  "symbol": "BTC",
  "timeframe": "medium",
  "decision": "BUY",
  "score": 75,
  "risk_level": 3,
  "factors": {
    "trend": 0.8,
    "volatility": 0.4
  },
  "userRiskProfile": "balanced",
  "locale": "nb-NO"
}
```

**Response:**
```json
{
  "title": "Kjøpssignal for Bitcoin",
  "summary": "Tekniske indikatorer viser positiv momentum...",
  "key_points": [
    "Trenden er stigende",
    "RSI er på moderat nivå"
  ],
  "risk_warnings": [
    "Trading er risikofullt. Du kan tape penger.",
    "Historisk avkastning er ingen garanti."
  ],
  "sources": [
    { "title": "Teknisk Analyse", "url": "https://..." }
  ],
  "_meta": {
    "requestId": "...",
    "durationMs": 1500,
    "cached": false,
    "timestamp": "2024-..."
  }
}
```

## Prompt-maler

### Narrative Scan

```
Du er en finansiell analytiker som skal analysere nyheter og narrativet rundt [SYMBOL].

INSTRUKSJONER:
1. Søk i åpne webkilder for informasjon om [SYMBOL] fra de siste 12-24 timer
2. Returner KUN gyldig JSON som matcher det eksakte skjemaet
3. Vurder sentiment fra -1 til 1
4. Vurder event_risk fra 0 til 1
```

### Regime Scan

```
Du er en makroanalytiker som skal vurdere det overordnede markedsregimet.

INSTRUKSJONER:
1. Analyser hele kryptomarkedet
2. Vurder om vi er i: bull, bear, range, eller unclear
3. Identifiser hoveddrivere og risikofaktorer
4. Returner KUN gyldig JSON
```

### Signal Explanation

```
Du er en pedagogisk investeringsveileder for Klarpakke Universitet.
Forklar et trading-signal på en enkel måte for en norsk småsparere.

VIKTIG:
- Bruk enkel, forståelig norsk
- Vær nøktern - ikke overdriv
- Inkluder alltid en risikoadvarsel
- Returner KUN gyldig JSON
```

## Personvern og sikkerhet

### Ingen PII til Sonar

- Kun symbols (f.eks. "BTC", "ETH")
- Aggregerte tall og score
- Anonyme risikoprofiler ("conservative", "balanced", "aggressive")
- Aldri bruker-id, navn, eller kontoinformasjon

### Logging

- Logger feil uten full prompt (kan inneholde sensitiv info)
- Logger metadata: tier, mode, latency
- Logger valideringsfeil for debugging

### Rate Limiting

- In-memory token bucket per tier
- Sonar: 100 tokens/min, burst 10
- Sonar Pro: 50 tokens/min, burst 5

## UI-integrasjon

### ConfluentSignalCard Komponent

`ConfluentSignalCard` er en gjenbrukbar komponent som viser Confluent-signaler med AI-analyse.

```tsx
import { ConfluentSignalCard } from '@/components/signals/ConfluentSignalCard';
import type { ConfluentSignal } from '@/lib/trading/confluent-signal-engine';

// Bruk med et signal
<ConfluentSignalCard
  signal={signal}
  symbol="BTC"
  timeframe="medium"
  showExplanationButton={true}
/>
```

Komponenten viser:
- **Symbol og timeframe** - Hvilken asset og tidsramme
- **Decision badge** - Fargekodet (grønn/gul/rød) etter signaltype
- **Score (0-100)** - Med progress bar
- **AI-faktorer** - Utvidbart panel med trend, volatilitet, sentiment, event_risk, regime
- **"Hvorfor dette signalet?"** - Knapp som åpner forklaringsmodal

### Feature-gating

Bruk `useFeatureFlag('sonar-ui')` for å sjekke om Sonar-UI skal vises:

```tsx
import { useFeatureFlag } from '@/lib/feature-flags';

function MyComponent() {
  const sonarEnabled = useFeatureFlag('sonar-ui');
  
  return sonarEnabled ? <ConfluentSignalCard ... /> : <BasicSignalCard ... />;
}
```

## Feature Flags

### Miljøvariabler

| Variabel | Type | Beskrivelse |
|----------|------|-------------|
| `ENABLE_SONAR_INTEGRATION` | Server | Aktiver Sonar API-kall i backend |
| `NEXT_PUBLIC_ENABLE_SONAR_UI` | Client | Vis AI-badges og forklaringsknapp i UI |
| `SONAR_USE_PRO_TIER` | Server | Bruk sonar-pro istedenfor sonar |

### Oppsett

```bash
# .env.local - Development
ENABLE_SONAR_INTEGRATION=true
NEXT_PUBLIC_ENABLE_SONAR_UI=true
SONAR_USE_PRO_TIER=false

# .env.production - Production (gradvis utrulling)
ENABLE_SONAR_INTEGRATION=true
NEXT_PUBLIC_ENABLE_SONAR_UI=false  # Skru på etter testing
```

### Atferd

| Server Flag | Client Flag | Resultat |
|-------------|-------------|----------|
| false | false | Kun tekniske signaler, ingen AI-visning |
| true | false | AI-analyse i backend, men skjult i UI |
| true | true | Full AI-funksjonalitet |
| false | true | UI prøver å vise AI, men får fallback-verdier |

### Health Check

Sjekk Sonar-integrasjonens status:

```bash
curl /api/health/sonar
```

Respons:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "sonar": {
    "enabled": true,
    "tier": "sonar",
    "apiKeyConfigured": true,
    "apiHealthy": true
  },
  "confluentEngine": {
    "healthy": true,
    "factors": {
      "technical": true,
      "narrative": true,
      "regime": true
    }
  }
}
```

## Konfigurering uten kodeendringer

### Vekting av faktorer

Endre miljøvariabler for å justere signal-kalkulasjon:

```bash
# Øk vekt på tekniske indikatorer
SIGNAL_WEIGHT_TECHNICAL=0.6
SIGNAL_WEIGHT_NARRATIVE=0.2
SIGNAL_WEIGHT_REGIME=0.2
```

### Cache TTL

Endre i `src/lib/ai/sonar/config.ts`:

```typescript
export const DEFAULT_CACHE_CONFIG: SonarCacheConfig = {
  regimeTtlMs: 4 * 60 * 60 * 1000,    // 4 timer
  explanationTtlMs: 30 * 60 * 1000,    // 30 minutter
  narrativeTtlMs: 2 * 60 * 60 * 1000,  // 2 timer
};
```

### Fallback-verdier

Endre i `src/lib/ai/sonar/config.ts`:

```typescript
export const FALLBACK_VALUES = {
  narrative_sentiment: 0,
  event_risk: 0,
  market_regime: 'unclear' as const,
};
```

## Tester

Kjør alle Sonar-relaterte tester:

```bash
# Alle sonar-tester
npm test -- src/lib/ai/sonar

# Confluent signal engine
npm test -- src/lib/trading/__tests__/confluent-signal-engine.test.ts

# Med coverage
npm run test:coverage -- src/lib/ai/sonar
```

## Overvåking

### Metrikker

Sonar-klienten tracker:
- `callsTotal` - Totalt antall API-kall
- `callsByTier` - Fordelt på sonar/sonar-pro
- `callsByMode` - Fordelt på low/medium/high
- `errorsTotal` - Totalt antall feil
- `averageLatencyMs` - Gjennomsnittlig responstid

### Signal og Explanation Metrics

```typescript
import { 
  getSonarMetricsSnapshot, 
  getSonarErrorRates 
} from '@/lib/ai/sonar/metrics';

// Hent metrics snapshot
const metrics = getSonarMetricsSnapshot();
// {
//   explanationCalls: 42,
//   explanationErrors: 2,
//   signalCalls: 156,
//   signalErrors: 3,
//   averageExplanationLatency: 1250,
//   averageSignalLatency: 2800
// }

// Beregn error rates
const errorRates = getSonarErrorRates();
// {
//   explanationErrorRate: 0.047,
//   signalErrorRate: 0.019
// }
```

### Health Check

```typescript
import { checkConfluentEngineHealth } from '@/lib/trading/confluent-signal-engine';

const health = await checkConfluentEngineHealth();
// {
//   healthy: true,
//   factors: {
//     technical: true,
//     narrative: true,
//     regime: true
//   },
//   sonarEnabled: true
// }
```

## Troubleshooting

### "Rate limit exceeded"

- Øk `tokensPerMinute` i `RATE_LIMIT_CONFIG` hvis du har høyere limits
- Reduser burst-størrelse for å jevne ut trafikk

### "Invalid JSON response"

- Sjekk at `jsonMode: true` er satt
- Verifiser at prompten tydelig ber om JSON
- Sjekk valideringsfeil i logger

### Treg respons

- Bruk `mode: 'low'` for raskere responstid
- Øk cache-TTL for regime-scan
- Bruk `tier: 'sonar'` istedenfor 'sonar-pro' for billigere og raskere kall
