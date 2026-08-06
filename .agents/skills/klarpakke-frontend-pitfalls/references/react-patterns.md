# React Patterns

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 1. React: setState + les state i samme tick = stale verdi

**Fiks:** Lokal variabel i stedet for state:

```tsx
// FEIL:
setStartingValue(reell);
buildPortfolioData(data, startingValue);

// RIKTIG:
const start = reell;
setStartingValue(start);
buildPortfolioData(data, start);
```

---


## 2. Framer Motion m.div blokkerer klikk

**Fiks:** `<Link>` direkte, fjern `m.div`:

```tsx
// FØR:
<m.div><a href="/leaderboard">CTA</a></m.div>

// EITER:
<Link href="/leaderboard" prefetch={false} className="block ...">CTA</Link>
```

---


## 14b. Ikon-konvensjon: ALLTID lucide-react, ALDRI emoji/unicode

**Toms regel (2026-08-01):** «Ikke bruk generiske ikon» — ALLE ikoner i Klarpakke-UI skal hentes fra `lucide-react`, aldri emoji eller unicode-symboler.

**Hvorfor:**
- Emoji ser uprofesjonelt ut, varierer mellom OS, og har ingen konsistent størrelse/farge
- lucide-react-ikoner arver `currentColor`, skalerer med `w-* h-*`, og har 100% konsistent rendering
- Klarpakke bruker allerede et kjerne-sett: `TrendingUp`, `TrendingDown`, `Activity`, `BarChart3`, `Shield`, `Zap`, `Target`, `Clock`, `Trophy`, `Flame`, `Gift`, `ChevronRight`, `ChevronDown`, `ChevronUp`, `Play`, `Loader2`

**Regel:**
```tsx
// FEIL — generiske emoji:
<span>🎯 Sjanse for gevinst</span>
<MetricCard icon="📊" ... />

// RIKTIG — lucide-react:
import { TrendingUp, Shield, Zap } from "lucide-react";
<MetricCard icon={<TrendingUp className="w-4 h-4" />} ... />
```

**Fargekonvensjon for ikoner i metrikk-kort:**
- Positiv verdi → `text-emerald-400`
- Negativ verdi/advarsel → `text-red-400`
- Amber/warning → `text-amber-400`

**Unntak:** Mynt-symboler (₿ BTC, ⟠ ETH, ◎ SOL) er akseptert — disse er valuta-notasjon, ikke dekorative ikoner.

---


