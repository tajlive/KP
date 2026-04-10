# Vercel Kostnader - Forklart

**Din situasjon:** Vercel Pro ($20/måned) + Supabase (Free)

---

## 💰 Vercel Pro Kostnadsstruktur

```
Fast kostnad:     $20/måned (Pro-plan)
Function usage:   $0.15 per GB-hour  ← DETTE ER PROBLEMET
Bandwidth:        $0.40 per GB over 1TB
```

### Hva er GB-hour?

**Eksempel:** Din `/api/cron/tick` kjører hver 5. dag
- Kjøretid: ~60 sekunder
- Minne: 3008MB (3GB)
- GB-hour: 3GB × (60/3600) timer = 0.05 GB-hour
- Kostnad: 0.05 × $0.15 = $0.0075 per kjøring

**Men:** Hvis du har 139 funksjoner som alle bruker 3008MB:
- Hver funksjonskall = 3GB × tid
- Hundrevis av kall per dag = $$$$

---

## 🔍 Din Faktiske Bruk (Estimat)

### Før optimalisering (3008MB på alt):
```
139 API-ruter × 3008MB = 418GB minne-allokering

Hvis hver rute kalles 100 ganger/dag:
- 13,900 kall/dag
- Gj.snitt 500ms per kall
- GB-hours: 13,900 × 3GB × 0.00014t = 5.8 GB-hour/dag
- Månedlig: 174 GB-hour × $0.15 = $26/måned

+ Webhook-kall (Stripe, etc.)
+ Cron-jobs (tunge)
+ Byggs (90 min × 2GB = 3 GB-hour per build)

TOTAL ESTIMAT: $20 + $40-80 = $60-100/måned
```

### Etter optimalisering (tier-based):
```
Tier 1 (15 ruter × 3GB):   45GB allokering
Tier 2 (20 ruter × 1GB):   20GB allokering  
Tier 3 (50 ruter × 0.5GB): 25GB allokering
Tier 4 (10 ruter × 0.25GB): 2.5GB allokering
Standard (44 ruter × 1GB): 44GB allokering

Total: ~137GB (67% reduksjon)

Nytt estimat: $20 + $15-30 = $35-50/måned
```

---

## ⚠️ Hva koster mest?

### 1. **Cron-jobs** (Største synder)
```typescript
// /api/cron/tick - kjører hver 5. dag
// Runtime: 30-60 sekunder
// Minne: 3008MB (før)
// Kostnad: ~$0.01 per kjøring

// Hvis den feiler og retryer 3x = 4x kostnad
```

### 2. **Webhook-kall** (Uforutsigbart)
```
Stripe webhooks: Kan være 100+ per dag
Hver med 3008MB = dyrt!
```

### 3. **Bygg** (Vær obs!)
```
90 min build × 2GB minne = 3 GB-hour
$0.45 per build!

Hvis du bygger 10 ganger/dag (mange commits):
= $4.50/dag = $135/måned KUN på builds!
```

---

## ✅ Hva jeg nettopp gjorde (sparer penger)

### Endring 1: Reduserte minne på enkle ruter
```
/api/status:     3008MB → 256MB  (90% reduksjon!)
/api/health:     3008MB → 512MB  (83% reduksjon!)
/api/pricing:    3008MB → 512MB  (83% reduksjon!)
```

### Endring 2: Separerte webhooks
```
/api/webhooks/stripe: 3008MB → 1024MB (66% reduksjon)
```

### Endring 3: Beholdt kraft for kritiske
```
/api/cron/*:     Fortsatt 3008MB (trenger det)
/api/trading/*:  Fortsatt 3008MB (trenger det)
```

---

## 📊 Realistisk Kostnadsestimat

### Din faktiske regning blir nok:

| Post | Før | Etter | Kommentar |
|------|-----|-------|-----------|
| Pro-plan | $20 | $20 | Fast |
| Functions | $30-50 | $10-20 | Nå redusert |
| Bandwidth | $5-10 | $5-10 | Innenfor 1TB |
| Builds | $10-20 | $10-20 | Avhengig av commits |
| **TOTALT** | **$65-100** | **$45-70** | **Sparer $20-30/mnd** |

---

## 🎯 Ekstra besparelser

### 1. **Reduser cron-frekvens**
```json
// Fra: "0 6 */5 * *" (6 ganger/mnd)
// Til:  "0 6 * * 1"  (4 ganger/mnd)
// Sparing: 33%
```

### 2. **Bygg kun ved nødvendig**
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
    paths-ignore:  # IKKE bygg ved disse endringene
      - '**.md'
      - 'docs/**'
      - 'scripts/**'
```

### 3. **Caching**
```bash
# Allerede konfigurert ✅
# .next/cache + .turbo cache
# Reduserer build-tid og dermed kostnad
```

---

## 🔍 Hvordan sjekke din faktiske bruk

### 1. Vercel Dashboard
```
https://vercel.com/dashboard → Klarpakke → Usage
```

### 2. Se function execution
```
Dashboard → Functions → Execution Time
```

### 3. Sjekk etter 1 uke
```
Se om du nærmer deg 1000 GB-hour (da blir det dyrt)
```

---

## ✅ Oppsummering

**Du betaler:**
- $20/mnd for Pro-plan (fast)
- ~$20-40/mnd for function usage (variabel)
- **Totalt: ~$40-60/mnd**

**Med min optimalisering:**
- $20/mnd for Pro-plan (fast)
- ~$10-25/mnd for function usage (redusert)
- **Totalt: ~$30-45/mnd**

**Årlig sparing: $120-180**

---

**Backup ligger i:** `vercel.json.backup.pro` (hvis du vil tilbake)
