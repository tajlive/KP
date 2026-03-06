# KLARPAKKE Route Konsolideringsplan

## Mål: Redusere fra 51 til ~30 routes

---

## 🔴 Fase 1: Fjerne Engelske Duplikater (Redirects)

| Behold (Norsk) | Fjern (Engelsk) | Handling |
|----------------|-----------------|----------|
| `innlogging` | `login` | Redirect til innlogging |
| `registrer` | `signup` | Redirect til registrer |
| `glemt-passord` | `reset-password` | Redirect til glemt-passord |
| `innstillinger` | `settings` | Redirect til innstillinger |
| `priser` | `pricing` | Redirect til priser |
| `om-oss` | `about` | Redirect til om-oss |
| `vilkar` | `terms` | Redirect til vilkar |
| `personvern` | `privacy` | Redirect til personvern |

### Implementasjon:
Erstatt engelske sider med simple redirects:
```typescript
import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/innlogging`);
}
```

---

## 🟡 Fase 2: Slå Sammen Admin Routes

### Nåværende:
- `admin/` - Hovedadmin (16 sub-mapper)
- `admin-dashboard/` - Duplikat (2 filer)

### Etter:
- `admin/` - Beholdes som hovedadmin
- `admin-dashboard/` → Slettes (merges inn i admin)

---

## 🟡 Fase 3: Slå Sammen Auto-Trading Routes

### Nåværende:
- `auto-trading/` - Hovedside
- `auto-trading-ai/` - Redirect (allerede!)
- `beta/` - Beta-funksjoner
- `beta-testing/` - Test-variant

### Etter:
- `auto-trading/` - Hovedside for auto-trading
- `auto-trading/ai/` - Understide for AI (flytt fra auto-trading-ai)
- `beta/` - Beta-funksjoner
- `beta-testing/` → Slettes (merges inn i beta)

---

## 🟡 Fase 4: Vurdere Leaderboard Routes

### Nåværende:
- `leaderboard/` - Hoved leaderboard
- `leaderboard-preview/` - Preview-versjon

### Forslag:
- `leaderboard/` - Behold
- `leaderboard-preview/` → Slettes hvis ikke i bruk

---

## 📊 Forventet Resultat

| Kategori | Før | Etter |
|----------|-----|-------|
| Auth (norsk+eng) | 8 | 4 |
| Admin | 2 | 1 |
| Auto-trading | 4 | 2-3 |
| Leaderboard | 2 | 1 |
| **Totalt** | **51** | **~35** |

---

## 🚀 Implementeringsrekkefølge

1. **Fase 1** - Engelske redirects (raskt, lav risiko)
2. **Fase 2** - Admin merge (medium risiko)
3. **Fase 3** - Auto-trading merge (medium risiko)
4. **Fase 4** - Leaderboard vurdering (lav risiko)

---

## ⚠️ Viktig

- Test hver endring før neste
- Oppdater middleware hvis nødvendig
- Sjekk at lenker fungerer etter endringer
