# Effektiv Editing av Klarpakke — Komplett Guide

**For:** Utviklere og produkteiere  
**Mål:** Redigere sider og funksjoner på minutter, ikke timer  
**Nåværende størrelse:** 565 komponenter, 102 sider, 33 features

---

## 🎯 FILOSOFI: "Feature-First" Arkitektur

```
DÅRLIG (gammel måte):
src/
├── components/
│   ├── Button.tsx        (brukt av 20 features)
│   ├── Chart.tsx         (brukt av 5 features)
│   └── Modal.tsx         (brukt av alle)
├── pages/
│   ├── dashboard.tsx
│   ├── trading.tsx
│   └── profile.tsx

PROBLEMER:
- Hvor finner jeg dashboard-koden? pages/dashboard.tsx
- Men hvor er chart-komponenten? components/Chart.tsx
- Og data-fetching? lib/api/dashboard.ts
→ 3 forskjellige steder!
```

```
BRA (Klarpakke way):
src/
├── features/
│   └── dashboard/
│       ├── DashboardClient.tsx    # Hovedkomponent
│       ├── DashboardTabs.tsx      # Sub-komponent
│       ├── PortfolioChart.tsx     # Chart (kun for dashboard)
│       ├── useDashboardData.ts    # Data fetching
│       └── dashboard.test.tsx     # Tester

FORDELER:
- Alt på ett sted
- Slett feature = slett én mappe
- Ny utvikler finner alt umiddelbart
```

---

## 🚀 SCENARIO 1: "Jeg vil endre dashboardet"

### Før (20 minutter):
```bash
# Hvor er koden??
find . -name "*dashboard*" | grep -v node_modules
# ... 15 treff
# Åpne 5 filer for å finne riktig
```

### Nå (2 minutter):
```bash
# Kjente stier (husk disse!)
src/features/dashboard/              # Dashboard-spesifikke komponenter
src/app/[locale]/(user)/dashboard/   # Page routes

# Rediger
code src/features/dashboard/DashboardContent.tsx
```

**Huskeregel:**
- **Features** (gjenbrukbare UI-deler) → `src/features/[navn]/`
- **Pages** (routing/entry points) → `src/app/[locale]/.../[page]/`
- **Shared UI** (knappene, inputs) → `src/shared/ui/`

---

## 🛠️ SCENARIO 2: "Jeg vil legge til en ny side"

### Steg-for-steg (5 minutter):

```bash
# 1. Finn liknende side først
echo "Skal jeg kopiere priser-siden?"
cp -r src/app/\[locale\]/\(marketing\)/priser \
      src/app/\[locale\]/\(marketing\)/ny-side

# 2. Endre filnavn
mv src/app/\[locale\]/\(marketing\)/ny-side/PriserClient.tsx \
   src/app/\[locale\]/\(marketing\)/ny-side/NySideClient.tsx

# 3. Rediger page.tsx
code src/app/\[locale\]/\(marketing\)/ny-side/page.tsx
```

### Alternativ (manuell):

```typescript
// src/app/[locale]/(marketing)/ny-side/page.tsx
import { getTranslations } from 'next-intl/server';
import NySideClient from './NySideClient';

export default async function NySidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nyside' });
  
  return <NySideClient />;
}
```

```typescript
// src/app/[locale]/(marketing)/ny-side/NySideClient.tsx
'use client';

export default function NySideClient() {
  return (
    <div className="min-h-screen bg-kp-bg-primary">
      {/* Din kode her */}
    </div>
  );
}
```

---

## 📝 SCENARIO 3: "Jeg vil endre tekst/oversettelser"

### Alle tekster er i messages/:

```bash
messages/
├── no/               # Norsk
│   ├── landing.json
│   ├── trading.json
│   ├── dashboard.json
│   └── common.json
└── en/               # Engelsk
    └── ...
```

### Eksempel: Endre hero-tekst

```bash
# 1. Finn riktig fil
code messages/no/landing.json

# 2. Endre
{
  "hero": {
    "title": {
      "line1": "DIN NYE TEKST HER",
      "line2": "og denne også"
    }
  }
}

# 3. Lagre → Hot reload oppdaterer siden automatisk!
```

### Tips for tekst:
- **Landingssider** → `messages/no/landing.json`
- **Trading** → `messages/no/trading.json`
- **Dashboard** → `messages/no/dashboard.json`
- **Felles** → `messages/no/common.json`

---

## 🎨 SCENARIO 4: "Jeg vil endre farger/styling"

### Design tokens (én sannhet):

```bash
# Farger
code src/globals.css                    # CSS variabler
# ELLER
code tailwind.config.mjs               # Tailwind tokens
```

### Hurtig-endring:

```css
/* src/globals.css */
:root {
  /* Bytt primærfarge fra blå til lilla */
  --kp-brand: #8B5CF6;        /* FØR: #0052FF */
  --kp-brand-hover: #7C3AED;  /* FØR: #0047E0 */
}
```

### Komponent-spesifikk styling:

```typescript
// DÅRLIG (hardkodet i 10 filer):
<button className="bg-blue-500 hover:bg-blue-600">

// BRA (bruk tokens):
<button className="bg-kp-brand hover:bg-kp-brand-hover">
```

**Regel:** Aldri hardkod farger, alltid bruk `kp-*` tokens!

---

## ⚡ UTVIKLINGSVERKTØY (Sett opp nå!)

### 1. KIMI CLI Snippets (Lagre i Cursor/KIMI)

```json
// .cursor/snippets/klarpakke.json
{
  "New Feature Component": {
    "prefix": "kp-feature",
    "body": [
      "'use client';",
      "",
      "import { motion } from 'framer-motion';",
      "",
      "interface ${1:ComponentName}Props {",
      "  $2",
      "}",
      "",
      "export function ${1:ComponentName}({ $3 }: ${1:ComponentName}Props) {",
      "  return (",
      "    <motion.div",
      "      initial={{ opacity: 0, y: 20 }}",
      "      animate={{ opacity: 1, y: 0 }}",
      "      className=\"$4\"",
      "    >",
      "      $0",
      "    </motion.div>",
      "  );",
      "}",
      ""
    ],
    "description": "Create a new Klarpakke feature component"
  },
  
  "New Page": {
    "prefix": "kp-page",
    "body": [
      "import { getTranslations } from 'next-intl/server';",
      "import ${1:PageName}Client from './${1:PageName}Client';",
      "",
      "export default async function ${1:PageName}Page({ ",
      "  params ",
      "}: { ",
      "  params: Promise<{ locale: string }> ",
      "}) {",
      "  const { locale } = await params;",
      "  const t = await getTranslations({ locale, namespace: '${2:namespace}' });",
      "  ",
      "  return <${1:PageName}Client />;",
      "}"
    ]
  }
}
```

### 2. Fuzzy File Search (Mest brukt!)

```bash
# I terminal (fzf)
cd /Users/taj/klarpakke && fzf

# I VS Code
Cmd+P (Mac) / Ctrl+P (Win)
# Så skriv: "dash port"
# → finner PortfolioDashboard.tsx
```

### 3. Grep for å finne kode (Veldig nyttig!)

```bash
# Finn hvor komponent brukes
grep -r "PortfolioChart" src/ --include="*.tsx"

# Finn tekst i oversettelser
grep -r "Din portefølje" messages/

# Finn API endepunkter
grep -r "export async function" src/app/api/ --include="*.ts"
```

### 4. Component Navigator (Lag denne!)

```bash
#!/bin/bash
# ~/bin/kp-nav (lagre og chmod +x)

echo "🚀 Klarpakke Navigator"
echo "======================"
echo ""
echo "1. Dashboard"
echo "2. Trading"
echo "3. Landing"
echo "4. API Routes"
echo "5. Database"
echo ""
read -p "Velg: " choice

case $choice in
  1) code src/features/dashboard/ ;;
  2) code src/features/trading/ ;;
  3) code src/features/landing/ ;;
  4) code src/app/api/ ;;
  5) code supabase/migrations/ ;;
esac
```

---

## 🗂️ CMS FOR INNHOLD (Ikke-kode endringer)

### Problem:
- Produkt-eiere kan ikke endre tekst uten utvikler
- Markedsføring må vente på deploy

### Løsning: Sanity CMS (Anbefalt)

```typescript
// sanity/schemas/page.ts
export default {
  name: 'page',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'content', type: 'array', of: [{ type: 'block' }] },
    { name: 'heroImage', type: 'image' },
    { name: 'ctaText', type: 'string' },
    { name: 'ctaLink', type: 'string' },
  ]
}
```

### Bruk i kode:

```typescript
// src/app/[locale]/[slug]/page.tsx
import { client } from '@/lib/sanity/client';

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  const page = await client.fetch(`
    *[_type == "page" && slug.current == $slug][0]
  `, { slug: params.slug });
  
  return (
    <div>
      <h1>{page.title}</h1>
      <PortableText value={page.content} />
    </div>
  );
}
```

### Fordeler:
- ✅ Produkt-eier redigerer i Sanity Studio
- ✅ Ingen deploy nødvendig
- ✅ A/B testing støtte
- ✅ Image CDN

**Alternativer:**
- **Notion** (enklere, gratis)
- **Strapi** (self-hosted)
- **Contentful** (enterprise)

---

## 🔥 HOT RELOAD WORKFLOW

### Optimal utviklingsflyt:

```bash
# 1. Start dev server
cd /Users/taj/klarpakke && npm run dev

# 2. Åpne to vinduer:
#    - Venstre: Kode (VS Code/Cursor)
#    - Høyre: Browser (localhost:3000)

# 3. Gjør endring i koden
#    → Browser oppdaterer automatisk (1-2 sek)

# 4. Test på mobil
#    ngrok http 3000
#    Åpne URL på telefon
```

### Branch-strategi for rask editing:

```bash
# Hver feature = egen branch
git checkout -b feature/new-chart
git checkout -b fix/dashboard-loading
git checkout -b content/update-prices

# Push og deploy preview
gh pr create --web
# Vercel lager preview URL automatisk
```

---

## 📋 SJEKKLISTE: Før du starter editing

### Har du:
- [ ] `npm run dev` kjører (hot reload)
- [ ] Åpnet rett mappe i editor
- [ ] Funnet liknende komponent å kopiere fra
- [ ] Sjekket messages/ for tekster
- [ ] Sjekket shared/ui for gjenbrukbare komponenter

### Unngå:
- [ ] Hardkoding av farger (bruk tokens)
- [ ] Duplisering av kode (sjekk om komponent finnes)
- [ ] Breaking changes i API uten versjonering
- [ ] Store PR-er (max 10 filer)

---

## 🎯 QUICK REFERENCE

### Hvor finner jeg...?

| Vil endre... | Gå til... | Eksempel fil |
|--------------|-----------|--------------|
| Landingsside | `src/features/landing/` | `HeroSection.tsx` |
| Dashboard | `src/features/dashboard/` | `DashboardContent.tsx` |
| Trading UI | `src/features/trading/` | `UnifiedTradingDashboard.tsx` |
| Tekster | `messages/no/` | `landing.json` |
| Farger | `src/globals.css` | CSS variabler |
| Knapp-stil | `src/shared/ui/` | `ButtonPremium.tsx` |
| API | `src/app/api/` | `paper-trading/execute/route.ts` |
| Database | `supabase/migrations/` | `*.sql` |
| Ny side | `src/app/[locale]/(gruppe)/` | `ny-side/page.tsx` |

### Vanlige kommandoer:

```bash
# Finne fil
find src -name "*dashboard*" -type f

# Søke i innhold
grep -r "funksjon" src/features/dashboard/

# Kopiere feature
cp -r src/features/dashboard src/features/dashboard-v2

# Slette feature
rm -rf src/features/gammel-feature

# Sjekk størrelse
find src/features -name "*.tsx" | wc -l
```

---

## 🚀 FREMtidig: AI-Assisted Editing

### Med KIMI/Cursor:

```
"Oppdater dashboardet til å vise win rate i stedet for PnL"

→ KIMI finner:
   1. DashboardContent.tsx
   2. useDashboardData.ts
   3. messages/no/dashboard.json

→ Endrer:
   - Komponent
   - Data fetching
   - Oversettelser

→ Tester:
   - npm run type-check
   - npm run lint
```

---

## ✅ OPPSUMMERING

### For å editere effektivt:

1. **Husk strukturen:**
   - Features = `src/features/[navn]/`
   - Pages = `src/app/[locale]/.../`
   - Tekster = `messages/[språk]/`

2. **Bruk snippets:**
   - `kp-feature` for nye komponenter
   - `kp-page` for nye sider

3. **Kopier, ikke skriv fra scratch:**
   - Finn liknende komponent
   - Kopier → Endre → Lagre

4. **Sanity CMS** for innhold:
   - Produkt-eier redigerer selv
   - Ingen deploy nødvendig

5. **Hot reload:**
   - Lagre fil → Se endring umiddelbart
   - Test på flere skjermer samtidig

---

**Husk:** Dette er et 565-komponent prosjekt. Bruk **fuzzy search** (Cmd+P) og **grep** for å navigere raskt!

*Guide laget av KIMI*  
*Sist oppdatert: 2026-04-07*
