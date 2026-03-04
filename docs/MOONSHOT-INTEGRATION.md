# 🌙 Moonshot AI (KIMI) Integrasjon

> **Fullført:** Moonshot AI er nå integrert i Klarpakke!

## Hva er dette?

[Moonshot AI](https://www.moonshot.cn/) er kinesisk AI-selskap bak **Kimi** - samme AI som brukes i KIMI Code CLI (utviklingsassistenten din). Nå kan brukerne dine chatte med Kimi direkte i dashboardet!

## Struktur

```
src/
├── lib/
│   └── moonshot.ts          # Server-side service
├── hooks/
│   └── useMoonshot.ts       # React hooks
└── components/ai/
    └── MoonshotChat.tsx     # Chat-komponent

supabase/
└── functions/
    └── moonshot-chat/       # Edge Function
        └── index.ts
```

## Komponenter

### 1. `MoonshotChat` - Ferdig chat-komponent

```tsx
import { MoonshotChat } from '@/components/ai/MoonshotChat';

export default function Dashboard() {
  return (
    <div>
      <h1>AI Assistent</h1>
      <MoonshotChat />
    </div>
  );
}
```

### 2. `useMoonshot` hook - Egendefinert bruk

```tsx
import { useMoonshot } from '@/hooks/useMoonshot';

function MyComponent() {
  const { sendMessage, isLoading, error } = useMoonshot({
    model: 'moonshot-v1-8k',  // eller 'moonshot-v1-32k', 'moonshot-v1-128k'
    temperature: 0.7,
  });

  const handleAsk = async () => {
    const response = await sendMessage('Hva er Bitcoin?');
    console.log(response);
  };

  return (
    <button onClick={handleAsk} disabled={isLoading}>
      {isLoading ? 'Tenker...' : 'Spør'}
    </button>
  );
}
```

## Oppsett

### 1. API Key

Hent API key fra [Moonshot Platform](https://platform.moonshot.cn/):

1. Lag konto
2. Gå til API Keys
3. Kopier key og legg til i `.env.local`:

```bash
MOONSHOT_API_KEY=sk-your-key-here
```

### 2. Supabase Secret (Production)

```bash
supabase secrets set MOONSHOT_API_KEY=sk-your-key-here --project-ref vuxbjlykgmzskxbclquf
```

### 3. Deploy Edge Function

```bash
supabase functions deploy moonshot-chat --project-ref vuxbjlykgmzskxbclquf
```

## Modeller

| Modell | Context Window | Bruk |
|--------|---------------|------|
| `moonshot-v1-8k` | 8,192 tokens | Korte spørsmål, rask |
| `moonshot-v1-32k` | 32,768 tokens | Lengre samtaler |
| `moonshot-v1-128k` | 131,072 tokens | Dokument-analyse |

## Priser (Moonshot)

| Modell | Input | Output |
|--------|-------|--------|
| 8k | ¥0.006 / 1K tokens | ¥0.006 / 1K tokens |
| 32k | ¥0.012 / 1K tokens | ¥0.012 / 1K tokens |
| 128k | ¥0.024 / 1K tokens | ¥0.024 / 1K tokens |

~ ca 0.08 NOK per spørsmål (8k modell)

## Sikkerhet

- ✅ API key holdes server-side (Edge Function)
- ✅ Krever autentisering (verify_jwt = true)
- ✅ Input validering
- ✅ Error handling

## Testing

```bash
# Test Edge Function direkte
curl -X POST "https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/moonshot-chat" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hva er Bitcoin?"}'
```

## Status

- ✅ Edge Function deployet
- ✅ React hooks klare
- ✅ UI komponent klart
- ✅ Secrets konfigurert

**Klar til bruk!** 🚀
