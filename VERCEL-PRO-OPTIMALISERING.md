# Vercel Pro Optimalisering - Klarpakke

## 🎯 Hvorfor Vercel Pro?

| Feature | Free | Pro | Betydning for Klarpakke |
|---------|------|-----|------------------------|
| **Build Time** | 45 min | 90 min | Større builds uten timeout |
| **Function Duration** | 10s | 30s | API routes med heavy lifting |
| **Bandwidth** | 100GB | 1TB | Bilder, assets, API |
| **Team Members** | 1 | 10 | Utviklingsteam |
| **Analytics** | ❌ | ✅ | Web Vitals, Performance |
| **Prioritized Builds** | ❌ | ✅ | Raskere deploy |
| **Edge Config** | ❌ | ✅ | Feature flags, config |
| **Vercel AI** | ❌ | ✅ | AI SDK, streaming, generering |

## 🤖 Vercel AI & Agent (Pro-funksjon)

### Vercel AI SDK
Med Pro får du tilgang til avanserte AI-funksjoner:

```typescript
// AI SDK for streaming responses
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Streaming API route
export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });
  
  return result.toDataStreamResponse();
}
```

### AI Agent med Vercel
```typescript
// Agent som kan kalle funksjoner
import { generateObject } from 'ai';
import { z } from 'zod';

const result = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    trade: z.object({
      symbol: z.string(),
      action: z.enum(['buy', 'sell']),
      amount: z.number(),
    }),
  }),
  prompt: 'Analyser markedet og foreslå en trade',
});
```

### For Klarpakke:
- **Trading signal AI**: Automatisk analyse
- **Chatbot for support**: RAG med docs
- **Market sentiment**: AI-drevet analyse

## 📋 Optimaliserings-Checklist

### 1. next.config.mjs Optimaliseringer

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Eksisterende config...
  
  // PRO: Enable experimental features
  experimental: {
    // Optimalisert bundling
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      '@ai-sdk/openai', // AI SDK
    ],
    // Server Actions (allerede aktivert)
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // AI features
    dynamicIO: true,
  },
  
  // PRO: Turbopack for dev (raskere utvikling)
  turbopack: {
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  
  // Image optimization for Pro-plan
  images: {
    ...existingImagesConfig,
    // PRO: Higher quality
    quality: 85,
    // PRO: Enable AVIF (bedre kompresjon)
    formats: ['image/avif', 'image/webp'],
    // PRO: Remote patterns (allerede konfigurert)
  },
};
```

### 2. vercel.json Optimaliseringer

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm ci",
  "outputDirectory": ".next",
  "regions": ["arn1"],
  
  "functions": {
    "src/app/api/**/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/cron/**/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/ai/**/route.ts": {
      "maxDuration": 60
    }
  },
  
  "crons": [
    {
      "path": "/api/cron/keepalive",
      "schedule": "0 6 */5 * *"
    },
    {
      "path": "/api/cron/update-usdt-nok",
      "schedule": "0 6 * * *"
    }
  ],
  
  "rewrites": [
    {
      "source": "/:locale/manifest.json",
      "destination": "/manifest.json"
    }
  ],
  
  "redirects": [
    {
      "source": "/:path((?!_next|api|auth|favicon|manifest|robots|sitemap).+)",
      "has": [{"type": "host", "value": "klarpakke.no"}],
      "destination": "https://www.klarpakke.no/$1",
      "permanent": true
    }
  ],
  
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(no|en)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
        }
      ]
    }
  ]
}
```

### 3. GitHub Actions Workflow (CI/CD)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:unit
      
      - name: Run type check
        run: npm run type-check
      
      - name: Deploy to Vercel
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 4. Environment Variables (Vercel Dashboard)

Sjekk at disse er satt i Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Production
NEXT_PUBLIC_APP_URL=https://www.klarpakke.no
NEXT_PUBLIC_SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***

# Sentry
NEXT_PUBLIC_SENTRY_DSN=***
SENTRY_AUTH_TOKEN=***

# AI (for Pro)
OPENAI_API_KEY=***
ANTHROPIC_API_KEY=***

# Andre
NEXT_PUBLIC_GA_ID=***
```

### 5. Analytics & Speed Insights Aktivering

```bash
# Installer Vercel Analytics
npm i @vercel/analytics @vercel/speed-insights

# Legg til i layout.tsx
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## 🚀 Steg-for-Steg Upgrade

### Steg 1: Oppgrader til Pro
1. Gå til https://vercel.com/dashboard
2. Klikk på Klarpakke-prosjektet
3. Settings → Billing → Upgrade to Pro
4. Velg plan: Pro ($20/måned)

### Steg 2: Konfigurer Team
1. Settings → Members
2. Inviter team members (opptil 10 på Pro)

### Steg 3: Aktiver Analytics
1. Analytics-fanen i dashboard
2. Enable Web Vitals
3. Enable Speed Insights

### Steg 4: Optimaliser Builds
1. Settings → General
2. Enable "Build Cache"
3. Konfigurer "Build Command"

### Steg 5: AI & Edge Config
1. Installer AI SDK: `npm i ai @ai-sdk/openai`
2. Sett opp OPENAI_API_KEY i Vercel
3. Aktiver Edge Config for feature flags

## 💰 Kostnadsestimat

| Plan | Månedlig | Årlig | For Klarpakke |
|------|----------|-------|---------------|
| Free | $0 | $0 | Nåværende |
| Pro | $20 | $240 | **Anbefalt** |
| Enterprise | Custom | Custom | Ved behov |

**Ekstra kostnader:**
- Bandwidth over 1TB: $0.40/GB
- Function execution over 1000GB-hrs: $0.15/GB-hr
- Edge Config writes: $0.50/1000
- AI tokens: Avhengig av bruk

## 📊 Forventet Forbedring

| Metric | Før (Free) | Etter (Pro) |
|--------|-----------|-------------|
| Build time | ~5 min | ~2 min (prioritized) |
| Function timeout | 10s | 30s |
| Cold start | ~500ms | ~200ms |
| Analytics | ❌ | ✅ Web Vitals |
| AI SDK | ❌ | ✅ |

## 🔧 Vercel CLI Kommandoer

```bash
# Sjekk deploys
vercel ls

# Sjekk logs
vercel logs [project]

# Sjekk env vars
vercel env ls

# Legg til env var
vercel env add KEY

# Deploy manuelt
vercel --prod

# Sjekk team
vercel teams ls

# Sjekk domener
vercel domains ls
```

## 🔧 Umiddelbare Optimaliseringer (uten Pro)

Mens vi venter på Pro:

1. **Enable Build Cache** (allerede gjort i vercel.json)
2. **Optimize images** (next/image konfigurert)
3. **Code splitting** (Next.js gjør automatisk)
4. **Lazy loading** (implementert)

## ✅ Neste Steg

1. [x] Test auth-fiksen i produksjon
2. [ ] Upgrade til Vercel Pro
3. [ ] Konfigurer Analytics
4. [ ] Sett opp Speed Insights
5. [ ] Optimaliser build settings
6. [ ] Implementer AI SDK for trading signals
7. [ ] Monitor performance

---

**Dokumentasjon oppdatert:** 2026-04-09
**Ansvarlig:** Kimi
**Status:** Venter på Pro-upgrade
