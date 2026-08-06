# Frontend Errors

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 1. TypeError: `.toFixed()` on undefined

**Symptom:** `TypeError: Cannot read properties of undefined (reading 'toFixed')` i dashboard

**Rotårsak:** En komponent kaller `.toFixed()` på en verdi som er `undefined`/`null`. Dette skjer oftest når API-data ikke er lastet ennå (initial render) eller når et felt mangler.

**Finn stedet:**
```bash
grep -rn "\.toFixed(" src/features/dashboard/ src/features/portfolio/
```

**Fiks:** Bruk `?? 0` eller `?? ""` før `.toFixed()`:
```tsx
// FØR (kræsjer hvis undefined):
{activeSessions[0].totalPnl.toFixed(0)}

// EITER (guard):
{(activeSessions[0]?.totalPnl ?? 0).toFixed(0)}
```

**Prevensjon:** Søk etter alle `.toFixed()`-kall hver gang nye widgets legges til.

---


## 2. WidgetErrorBoundary som ikke rapporterer

**Symptom:** Dashboard viser "Dashboard-widgeten kunne ikke lastes" men ingen feil i Sentry.

**Rotårsak:** `WidgetErrorBoundary.componentDidCatch()` kalte bare `console.error()` — aldri `captureException()`.

**Fiks:**
```tsx
import { captureException } from "@/lib/sentry";

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  console.error("[WidgetErrorBoundary] Widget crashed:", error, errorInfo);
  captureException(error, { extra: { componentStack: errorInfo.componentStack ?? "" } });
}
```

**Prevensjon:** ALDRI bruk `console.error()` alene i error boundaries — alltid send til Sentry.

---


## 8. null/undefined guards — checklist

Ved rendering av dynamiske data, bruk ALLtid:

| Pattern | Eksempel |
|---------|----------|
| Optional chaining | `obj?.prop?.subprop` |
| Nullish coalescing | `value ?? defaultValue` |
| Array guard | `arr?.[0]?.prop ?? default` |
| Ternery for optional | `val != null ? fn(val) : fallback` |
| Number guard | `(num ?? 0).toFixed(2)` |

---


## 11. toFixed på undefined — bredt søk

**Symptom:** `TypeError: Cannot read properties of undefined (reading 'toFixed')` i minifisert chunk

**Finn alle steder:**
```bash
grep -rn "\.toFixed(" src/features/ | grep -v "__tests__" | grep -v "??\|?."
```

**Fiks (2 alternativer):**
```tsx
// Alternativ 1 — inline guard:
{(value ?? 0).toFixed(2)}
{value != null ? value.toFixed(2) : "—"}

// Alternativ 2 — hjelpefunksjon:
function safeFixed(val: number | null | undefined, digits = 2, fallback = "—") {
  return val != null ? val.toFixed(digits) : fallback;
}
```

**Prevensjon:** Bruk alltid `?? 0` eller `!= null` sjekk før `.toFixed()` på data fra API.

```typescript
import { testSentry } from "@/lib/sentry";
testSentry();
```

Kall denne manuelt i devtools-konsollen på produksjon:
```js
fetch("/api/health/sentry")
```

Sjekk at eventen dukker opp i Sentry dashboard innen 1 minutt.


