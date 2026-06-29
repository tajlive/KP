# Edge Config Setup — Klarpakke

> **Hva:** Vercel Edge Config gir sanntids feature flags og runtime-konfigurasjon med <50ms latens globalt.  
> **Kostnad:** Inkludert i Vercel Pro.  
> **Dokumentasjon:** https://vercel.com/docs/storage/edge-config

---

## 1. Opprett Edge Config Store

### Via Vercel Dashboard
1. Gå til [vercel.com/dashboard](https://vercel.com/dashboard) → velg **Klarpakke**-prosjektet
2. Klikk **Storage** → **Edge Config** → **Create Store**
3. Velg et navn: `klarpakke-flags`
4. Klikk **Connect** til prosjektet ditt

### Via CLI
```bash
npx vercel env pull
npx vercel edge-config create klarpakke-flags
npx vercel edge-config connect klarpakke-flags --project=klarpakke
```

Etter tilkobling får du automatisk miljøvariabelen:
```bash
EDGE_CONFIG=https://edge-config.vercel.com/ecfg_xxxxxxxx
```

---

## 2. Legg inn flagg

I Vercel-dashboardet (eller via CLI), sett følgende JSON:

```json
{
  "featureFlags": {
    "tradingV3": true,
    "rlSignals": false,
    "euTaxReport": false,
    "betaTrading": false,
    "whitelabelFees": false,
    "maintenanceMode": false,
    "signalEngineKillSwitch": false,
    "sonarUi": true
  },
  "maintenanceMode": false
}
```

**Viktig:** Endringer i Edge Config propagerer globalt på under 1 sekund.

### Oppdatere flagg via CLI
```bash
# Hent nåværende
npx vercel edge-config get featureFlags --store=klarpakke-flags

# Sett ny verdi
npx vercel edge-config set featureFlags '{"tradingV3":true,"maintenanceMode":false}' --store=klarpakke-flags

# Aktiver maintenance mode (nødstopp)
npx vercel edge-config set maintenanceMode true --store=klarpakke-flags
```

---

## 3. Bruk i kode

### Server-side (async)
```tsx
import { getFlagsAsync, isEnabled } from '@/lib/flags';

export default async function Page() {
  const flags = await getFlagsAsync();

  if (flags.maintenanceMode) {
    return <MaintenancePage />;
  }

  return flags.tradingV3 ? <TradingV3 /> : <TradingV2 />;
}
```

### Client-side (React hook)
```tsx
import { useFeatureFlag, FeatureGate } from '@/lib/feature-flags';

function MyComponent() {
  const tradingV3 = useFeatureFlag('tradingV3');

  return (
    <FeatureGate flag="sonarUi" fallback={<BasicSignal />}>
      <SonarSignal />
    </FeatureGate>
  );
}
```

### Middleware / kill-switch
```tsx
import { isMaintenanceMode } from '@/lib/edge-config';

export async function middleware(req: NextRequest) {
  if (await isMaintenanceMode()) {
    return NextResponse.redirect(new URL('/maintenance', req.url));
  }
  return NextResponse.next();
}
```

---

## 4. Fallback-oppførsel

Hvis `EDGE_CONFIG` mangler eller er ugyldig:
- `getFlagsAsync()` returnerer **env-baserte defaults** (`process.env.NEXT_PUBLIC_*`)
- Appen fungerer som normalt — ingen nedetid

---

## 5. Beste praksis

| Regel | Hvorfor |
|-------|---------|
| **Kun boolske flagg** i Edge Config | Enklest å resonnere rundt, raskest å evaluere |
| **Server-side lesing først** | Ingen bundle overhead, fungerer ved SSR/SSG |
| **Hydrer til Provider** | Én server-fetch per request, resten via React context |
| **Dokumenter alle flagg** | Hold `FeatureFlags`-interfacet i `src/lib/flags.ts` som SOT |

---

## 6. Troubleshooting

**"Edge Config not available"-warnings i loggen?**
→ Sjekk at `EDGE_CONFIG` er satt i Vercel-dashboardet:  
Project Settings → Environment Variables → `EDGE_CONFIG`

**Flagg-endringer tar lang tid?**
→ Edge Config har vanligvis <1s propagation. Hvis det tar lenger: sjekk at du redigerer riktig **store**.

**Lokal utvikling uten Edge Config?**
→ Fallback til env-variabler fungerer automatisk. For lokal testing kan du sette:  
```bash
EDGE_CONFIG="https://edge-config.vercel.com/ecfg_xxx"
```
