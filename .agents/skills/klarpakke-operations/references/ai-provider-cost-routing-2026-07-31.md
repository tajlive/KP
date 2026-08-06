# AI provider cost/quality routing i Klarpakke (2026-07-31)

## Mål
Bruk riktig modell til riktig oppgave:
- **Billigst mulig** for enkle spørsmål.
- **Best kvalitet** for arkitektur og dyp analyse.
- **Automatisk fallback** hvis primærmodell feiler.

## Modell-hierarki

| Oppgavetype | Primær | Fallback | Begrunnelse |
|---|---|---|---|
| **Enkel** (<1500 tegn, generelt spørsmål) | DeepSeek V4 Flash | Kimi K2.7 Code → NVIDIA | Lavest kostnad, godt nok |
| **Kompleks** (debug, analyse, optimering) | Kimi K2.7 Code | DeepSeek V4 Pro → NVIDIA | Best kodekvalitet |
| **Arkitektur/strategi** (>6000 tegn / arkitektur-nøkkelord) | Kimi K3 (reasoning max) | DeepSeek V4 Pro | Dyp reasoning |
| **Websearch** | Perplexity PRO | Kimi K3 | Live nettsøk |

## Implementasjon

### `src/lib/ai/providers.ts`

```typescript
export type TaskTier = 'simple' | 'complex' | 'architecture' | 'websearch';

export interface ProviderPlan {
  provider: 'kimi' | 'deepseek' | 'nvidia' | 'perplexity';
  model?: string;
  reasoningEffort?: 'low' | 'high' | 'max';
  tier: TaskTier;
}

export function classifyTask(messages: AIMessage[]): TaskTier {
  const text = messages.map(m => m.content).join('\n').toLowerCase();
  const combinedLength = messages.reduce((sum, m) => sum + m.content.length, 0);

  if (text.includes('websearch') || text.includes('søk nettet')) return 'websearch';
  if (text.includes('arkitektur') || text.includes('architecture') || combinedLength > 6000) return 'architecture';
  if (text.includes('debug') || text.includes('analyser') || combinedLength > 1500) return 'complex';
  return 'simple';
}

export function selectProviderPlan(
  messages: AIMessage[],
  forceProvider?: 'kimi' | 'deepseek' | 'nvidia' | 'perplexity' | 'auto',
  websearch = false,
): ProviderPlan[] {
  // ... returner prioritert liste basert på tilgjengelige API-nøkler
}
```

### `src/app/api/ai/chat/route.ts`

- Ikke-streaming: iterer `plans` og prøv hver til en lykkes.
- Streaming: prøv planer sekvensielt til stream initieres.
- Returner `routing: { tier, tried: [...] }` i svaret for transparens.

## Nøkkelord for klassifisering

```ts
const ARCHITECTURE_KEYWORDS = [
  'arkitektur', 'architecture', 'design system', 'refactor', 'migrasjon', 'strategi', 'system design', 'datamodell'
];
const COMPLEX_KEYWORDS = [
  'debug', 'feilsøk', 'analyser', 'optimize', 'performance', 'sikkerhet', 'root cause', 'rotårsak'
];
const WEBSEARCH_KEYWORDS = [
  'websearch', 'søk nettet', 'latest news', 'siste nytt', 'current price'
];
```

## API-nøkler som må være satt

| Provider | Env-var | Kommentar |
|---|---|---|
| Kimi | `KIMI_API_KEY` (Global) eller `KIMI_OAUTH_TOKEN` | Global API anbefalt |
| DeepSeek | `DEEPSEEK_API_KEY` | Lokal i `.env.local` |
| Perplexity | `PERPLEXITY_API_KEY` | Kun for websearch |
| NVIDIA | `NVIDIA_API_KEY` | Sjelden brukt |

## Verifisering

```bash
curl -s "https://www.klarpakke.no/api/ai/chat?path=providers"
```

Skal liste `deepseek` med `recommended: 'simple / cheap fallback'`.

## Lærdom fra denne runden
- Hermes sin fallback-kjede styrer *agentens* modellvalg, ikke appens.
- Appen må ha egen ruting basert på prompt-innhold for å spare kostnader ved skala.
- Kvalitet > kostnad for arkitektur/trading-logikk — hold Kimi K3/K2.7 som primær der.
