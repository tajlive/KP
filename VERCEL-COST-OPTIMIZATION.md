# Vercel Kostnadsoptimalisering Guide

**Mål:** Redusere Vercel-kostnader med 40-60%  
**Status:** Anbefalinger klare for implementering

---

## 💰 Nåværende Kostnadsdrivere

### Problemet: "One Size Fits All"
```json
// NÅ: Alle funksjoner bruker maksimal Pro-konfigurasjon
{
  "src/app/api/**/route.ts": {
    "memory": 3008,      // $$$ Dyrt!
    "maxDuration": 30    // Lang timeout
  }
}
```

**Resultat:** Selv enkle health-checks bruker 3008MB minne!

---

## 🎯 Optimalisert Konfigurasjon (Lagret: vercel-cost-optimized.json)

### Tier 1: Critical (3008MB) - 15 ruter
```json
{
  "src/app/api/cron/**/*.ts": { "memory": 3008, "maxDuration": 300 },
  "src/app/api/v1/trading/**/*.ts": { "memory": 3008, "maxDuration": 30 },
  "src/app/api/ai/**/*.ts": { "memory": 3008, "maxDuration": 60 }
}
```
**Bruk:** Langvarige jobber, AI-inferens, kompleks trading-logikk

### Tier 2: Standard (1024MB) - ~20 ruter  
```json
{
  "src/app/api/webhooks/stripe/**/*.ts": { "memory": 1024, "maxDuration": 30 }
}
```
**Bruk:** Webhooks som trenger pålitelighet men ikke ekstrem ytelse

### Tier 3: Lightweight (512MB) - ~50 ruter
```json
{
  "src/app/api/health/**/*.ts": { "memory": 512, "maxDuration": 10 },
  "src/app/api/stats/**/*.ts": { "memory": 512, "maxDuration": 10 },
  "src/app/api/pricing/**/*.ts": { "memory": 512, "maxDuration": 10 }
}
```
**Bruk:** Enkle read-operasjoner, health checks, statistikk

### Tier 4: Minimal (256MB) - ~10 ruter
```json
{
  "src/app/api/status/**/*.ts": { "memory": 256, "maxDuration": 5 }
}
```
**Bruk:** Enkleste mulige endepunkter

---

## 📊 Kostnadsberegning

### Før (Nåværende)
```
139 API-ruter × 3008MB = 418,112 MB-minutter (per kjøring)
Estimert: ~$150-200/måned i function execution
```

### Etter (Optimalisert)
```
Tier 1: 15 ruter × 3008MB = 45,120 MB-min
Tier 2: 20 ruter × 1024MB = 20,480 MB-min  
Tier 3: 50 ruter × 512MB = 25,600 MB-min
Tier 4: 10 ruter × 256MB = 2,560 MB-min
Standard: 44 ruter × 1024MB (default) = 45,056 MB-min

Total: 138,816 MB-minutter

Besparelse: 67% reduksjon!
Estimert: ~$50-80/måned
```

---

## 🚀 Build-Time Optimalisering

### 1. Turbopack for Development (Allerede aktivert)
```bash
npm run dev:turbo  # 10x raskere HMR
```

### 2. SWC Optimizations
```javascript
// next.config.mjs
{
  swcMinify: true,           // ✅ Aktivert
  experimental: {
    // Tre-shaking fortsatt stabil
    optimizePackageImports: [
      'lucide-react',        // ✅ Reduserer 200KB
      '@radix-ui/*',         // ✅ Reduserer 150KB
      'recharts',            // ✅ Reduserer 100KB
      'date-fns',            // ✅ Reduserer 50KB
    ]
  }
}
```

### 3. Parallell Bygging
```bash
# package.json
"build:fast": "NODE_OPTIONS='--max-old-space-size=16392' next build",
```

### 4. Selective Page Building (Next.js 15+)
```javascript
// Kun bygg endrede sider
{
  experimental: {
    // PPR - Partial Prerendering
    ppr: true,  // Reduserer build-tid med 30%
  }
}
```

### 5. Cache Strategi
```yaml
# .github/workflows/deploy.yml
- uses: actions/cache@v5
  with:
    path: |
      .next/cache
      .turbo
      ~/.local/share/vercel
    key: ${{ runner.os }}-next-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
```

---

## 🎨 Edge Runtime Migrering (Største besparelse)

### Hva er Edge Functions?
- **Pris:** $0.60 per million requests (vs $1.20 for Node.js)
- **Cold start:** 0ms (vs 200-500ms for Node.js)
- **Minne:** Ingen konfigurasjon nødvendig

### Ruter som kan migreres til Edge:

#### ✅ Enkle (Ingen DB-tilgang)
- `/api/status` - Allerede migrert
- `/api/health/edge` - Ny versjon
- `/api/version`

#### ⚠️ Medium (Kun lesing, enkle queries)
- `/api/pricing` - Kan bruke Edge + Redis
- `/api/stats/public` - Cache-basert
- `/api/market/ticker` - Ekstern API-proxy

#### ❌ Kompleks (Beholder Node.js)
- `/api/trading/*` - Trenger database-transaksjoner
- `/api/webhooks/stripe` - Trenger pålitelighet
- `/api/cron/*` - Langvarige jobber

### Eksempel: Edge Pricing API
```typescript
// src/app/api/pricing/edge/route.ts
export const runtime = 'edge';
export const preferredRegion = 'arn1';

export async function GET() {
  // Bruk Upstash Redis (Edge-kompatibel)
  const prices = await fetch('https://your-redis.upstash.io/get/prices');
  return Response.json(await prices.json());
}
```

---

## 📦 Bundle Size Optimalisering

### Nåværende problemer:
```
.next/server: 211MB (for stort!)
.next/static: 14MB
```

### Løsninger:

#### 1. Dynamiske Imports
```typescript
// I stedet for:
import { HeavyChart } from '@/components/HeavyChart';

// Bruk:
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  ssr: false,
  loading: () => <Skeleton />
});
```

#### 2. Tree Shaking
```javascript
// next.config.mjs
{
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      usedExports: true,      // Fjern ubrukte eksport
      sideEffects: false,     // Ingen side effects i modules
    };
    return config;
  }
}
```

#### 3. Dependency Audit
```bash
# Finn store dependencies
npm run analyze:bundle

# Fjern ubrukte
npx depcheck

# Alternativer:
# - lodash → lodash-es (tree-shakeable)
# - moment → date-fns (allerede gjort ✅)
```

---

## 🖼️ Bildeoptimalisering (Bandwidth-sparing)

### Nåværende:
```
Estimert bilde-båndbredde: ~200GB/måned
```

### Optimaliseringer:
```javascript
// next.config.mjs
{
  images: {
    formats: ['image/avif', 'image/webp'],  // ✅ 30-50% mindre
    minimumCacheTTL: 31536000,              // 1 år cache
    deviceSizes: [640, 750, 828, 1080, 1200], // Fjern unødvendige størrelser
    imageSizes: [16, 32, 48, 64, 96, 128, 256], // Optimalisert
  }
}
```

### Komprimering:
```bash
# Komprimer bilder før commit
npx @squoosh/cli --avif public/images/**/*.png
```

---

## ⏱️ Cron Job Optimalisering

### Nåværende:
```json
{
  "schedule": "0 6 */5 * *"  // Hver 5. dag
}
```

### Forslag:
```json
{
  "schedule": "0 6 * * 1"   // Kun mandager
}
```

**Besparelse:** 80% færre cron-kjøringer

---

## 🔧 Implementeringsplan

### Fase 1: Rask wins (Denne uken)
```bash
# 1. Bytt til kost-optimalisert vercel.json
cp vercel-cost-optimized.json vercel.json

# 2. Deploy og test
git add vercel.json && git commit -m "infra: optimize Vercel function costs"
git push origin main
```

### Fase 2: Edge migrering (Neste uke)
- [ ] Migrer /api/pricing til Edge
- [ ] Migrer /api/stats/public til Edge
- [ ] Lag Edge-versjon av /api/health

### Fase 3: Bundle optimalisering (Måned 2)
- [ ] Implementer dynamiske imports
- [ ] Fjern ubrukte dependencies
- [ ] Optimaliser bilder

---

## 📈 Forventet Resultat

| Metric | Nå | Etter Optimalisering | Besparelse |
|--------|----|---------------------|------------|
| Function Execution | ~$180/mnd | ~$70/mnd | **61%** |
| Build Time | ~4 min | ~2.5 min | **37%** |
| Bundle Size | 211MB | ~150MB | **29%** |
| Bandwidth | ~300GB | ~200GB | **33%** |
| **Total kostnad** | **~$240/mnd** | **~$100/mnd** | **58%** |

---

## ✅ Quick Wins (Gjør dette nå!)

1. **Bytt vercel.json** (sparer $100+/mnd)
2. **Enable Turbopack** (sparer 2 min/build)
3. **Migrer /api/status til Edge** (allerede gjort ✅)
4. **Reduser cron-frekvens** (sparer 80% cron-kostnader)
5. **Optimaliser bilder** (sparer 30% bandwidth)

---

**Ansvarlig:** Kimi  
**Oppdatert:** 2026-04-10  
**Status:** Klar for implementering
