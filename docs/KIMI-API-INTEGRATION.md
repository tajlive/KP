# KIMI API Integrasjon for Klarpakke

> **Merk:** KIMI 2.6 er ikke lansert ennå. Moonshot AI sin siste modell er fortsatt KIMI 2.5.

## Alternativer for AI i Klarpakke

### 1. **OpenAI / Perplexity (Allerede satt opp)** ✅
Du har allerede `PERPLEXITY_API_KEY` i `.env.local`. Dette er den enkleste løsningen:

```typescript
// src/lib/ai.ts
import { createOpenAI } from '@ai-sdk/openai';

const perplexity = createOpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: 'https://api.perplexity.ai',
});

export async function askCryptoAssistant(question: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { 
          role: 'system', 
          content: 'Du er en hjelpsom krypto-ekspert for norske brukere. Gi korte, presise svar.' 
        },
        { role: 'user', content: question }
      ],
    }),
  });
  return response.json();
}
```

### 2. **Moonshot AI (Kimi) API** 🌙
Hvis du vil bruke Moonshot AI (samme som KIMI Code CLI):

```bash
# Legg til i .env.local
MOONSHOT_API_KEY=sk-your-key-here
```

```typescript
// src/lib/kimi.ts
export async function askKimi(question: string) {
  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',  // eller 'moonshot-v1-32k'
      messages: [
        { role: 'system', content: 'Du er KIMI, krypto-ekspert for Klarpakke.' },
        { role: 'user', content: question }
      ],
    }),
  });
  return response.json();
}
```

### 3. **Edge Function for AI** (Anbefalt for produksjon)
```typescript
// supabase/functions/ai-assistant/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { question } = await req.json();
  
  // Bruk Perplexity (allerede konfigurert)
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'Krypto-ekspert for Klarpakke' },
        { role: 'user', content: question }
      ],
    }),
  });
  
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Sammenligning

| Tjeneste | Fordeler | Ulemper |
|----------|----------|---------|
| **Perplexity** ✅ | Allerede satt opp, norsk støtte, søk-innebygd | Kostnad per request |
| **Moonshot/Kimi** | Samme som utviklingsverktøyet ditt | Krever ny API-key |
| **OpenAI** | Rask, pålitelig | Kan være dyr |

## Anbefaling

Bruk **Perplexity** som du allerede har! Den har:
- ✅ Internett-søk (viktig for krypto-priser)
- ✅ God norsk støtte
- ✅ Allerede konfigurert i `.env.local`

Vil du at jeg skal implementere en **AI Chat-komponent** i dashboardet? 🤖
