# Tier-Verifikasjon, subscription.ts og Dashboard-Tilgangskontroll

**Dato:** 2026-02-24  
**Utført av:** Kimi Code CLI  
**Status:** ✅ Fullført

---

## Oppsummering

Tre hovedproblemer er løst:
1. **subscription.ts** er omskrevet til å bruke `TierSlug` fra `TIERS`-objektet (kilden til sannhet)
2. **DashboardClient.tsx** bruker nå `TierSlug`, henter `trial_started_at` fra Supabase, og viser trial-status
3. **SubscriptionGate.tsx** er oppdatert til å bruke det nye tier-systemet

---

## Filer Endret

### 1. src/types/subscription.ts (OMSKREVET)

**Tidligere:** Definerte egen duplisert `SubscriptionTier` type  
**Nå:** Importerer `TierSlug` og `TIERS` fra `@/lib/pricing/tiers`

```typescript
// FØR (gammel)
export type SubscriptionTier = 'student' | 'bachelor' | 'master' | 'phd' | 'professor';

// NÅ (ny)
import { TIERS, TierSlug } from '@/lib/pricing/tiers'
export type { TierSlug }
export type SubscriptionTier = TierSlug  // Bakoverkompatibel alias
```

**Nye funksjoner:**
- `canAccessLiveAutoTrading(tier)` – sjekker `TIERS[tier].liveTrading`
- `canAccessPaperTrading(tier)` – alle har tilgang
- `maxAutoTradingStrategies(tier)` – returnerer `TIERS[tier].autoTradingStrategies`
- `isTrialActive(tier, trialStartedAt)` – beregner om 14-dagers trial er aktiv
- `canUseAutoTradingNow(tier, trialStartedAt)` – live ELLER trial
- `trialDaysRemaining(tier, trialStartedAt)` – dager igjen av trial
- `getTierDisplayName(tier)` – menneskelesbare navn
- `getTierBadge(tier)` – emoji fra TIERS

---

### 2. src/app/[locale]/dashboard/DashboardClient.tsx

**Linje 7-11:** Endret imports
```typescript
// FØR
import { canAccessAutoTrading, type SubscriptionTier, isSubscriptionActive } from "@/types/subscription";

// NÅ
import { canAccessAutoTrading, type TierSlug, canUseAutoTradingNow, trialDaysRemaining, isSubscriptionActive } from "@/types/subscription";
```

**Linje 43-47:** Lagt til trial_started_at i UserData
```typescript
interface UserData {
  // ...
  subscription_tier: TierSlug;  // Endret fra SubscriptionTier
  trial_started_at: string | null;  // NYTT
}
```

**Linje 150-152:** Initial user med trial_started_at
```typescript
setUser({
  // ...
  subscription_tier: "student",  // Endret fra "free"
  trial_started_at: null,
});
```

**Linje 158:** Henter trial_started_at fra Supabase
```typescript
.select("subscription_tier, subscription_status, trial_started_at")
```

**Linje 167:** Type cast til TierSlug
```typescript
subscription_tier: (profileData.subscription_tier as TierSlug) || "student",
trial_started_at: profileData.trial_started_at || null,
```

**Linje 627-677:** Auto-trade JSX med trial-støtte
```typescript
{canUseAutoTradingNow(user.subscription_tier, user.trial_started_at) ? (
  <>
    {/* Trial-banner for student med aktiv trial */}
    {user.subscription_tier === 'student' && trialDaysRemaining(...) > 0 && (
      <div className="bg-gradient-to-r from-amber-500/20...">
        {trialDaysRemaining(...)} dager igjen av din gratis trial...
      </div>
    )}
    <AutoTradingDashboard />
  </>
) : (
  {/* Oppgraderingsmelding for student uten trial */}
)}
```

---

### 3. src/components/subscription/SubscriptionGate.tsx (OMSKREVET)

**FØR:** Brukte gammelt tier-system: `type SubscriptionTier = "free" | "starter" | "pro" | "enterprise"`

**NÅ:** Bruker `TierSlug` fra `@/types/subscription`

```typescript
import { TierSlug, getTierDisplayName } from "@/types/subscription";

// Alle "free" endret til "student"
// Alle tierLevels oppdatert til nytt system
const tierLevels: Record<TierSlug, number> = {
  student: 0,
  bachelor: 1,
  master: 2,
  phd: 3,
  professor: 4,
};
```

---

## Verifikasjon

### TypeScript
```bash
npm run type-check
```
✅ **0 feil**

### Bygg
```bash
npm run build
```
✅ **Suksess** – alle sider bygget

### Spot-sjekker
```bash
# 1. subscription.ts bruker TierSlug fra tiers.ts
grep "from '@/lib/pricing/tiers'" src/types/subscription.ts
> import { TIERS, TierSlug } from '@/lib/pricing/tiers'

# 2. DashboardClient bruker TierSlug
grep "subscription_tier: TierSlug" src/app/[locale]/dashboard/DashboardClient.tsx
> subscription_tier: TierSlug;

# 3. trial_started_at hentes fra Supabase
grep "trial_started_at" src/app/[locale]/dashboard/DashboardClient.tsx
> .select("subscription_tier, subscription_status, trial_started_at")
> trial_started_at: profileData.trial_started_at || null,

# 4. SubscriptionGate bruker TierSlug
grep "TierSlug" src/components/subscription/SubscriptionGate.tsx | head -3
> import { TierSlug, getTierDisplayName } from "@/types/subscription";
>   requiredTier: TierSlug;
```

---

## Migrering av Tier-Verdier

**Gammelt system → Nytt system:**
| Gammel | Ny |
|--------|-----|
| free / gratis | student |
| standard / basis | bachelor |
| proff / komplett | master |
| pro / extrem | phd |
| family | professor |

**Bakoverkompatibilitet:** `SubscriptionTier` er nå et alias for `TierSlug`, så eksisterende kode som bruker `SubscriptionTier` vil fortsatt fungere.

---

## Manuelle Tester Som Gjenstår

### Test 1: Student med aktiv trial
**Steg:**
1. Logg inn med bruker som har `subscription_tier = 'student'` og `trial_started_at = [for 5 dager siden]`
2. Gå til `/no/dashboard`
3. Klikk på "Auto Trade" i sidebar

**Forventet:** 
- Viser trial-banner med "9 dager igjen av din gratis trial"
- AutoTradingDashboard vises under banneret

### Test 2: Student etter utløpt trial
**Steg:**
1. Logg inn med bruker som har `subscription_tier = 'student'` og `trial_started_at = [for 20 dager siden]`
2. Gå til `/no/dashboard` → "Auto Trade"

**Forventet:**
- Viser oppgraderingsmelding
- Lenke til `/no/priser`
- Ingen AutoTradingDashboard

### Test 3: Bachelor-bruker
**Steg:**
1. Logg inn med `subscription_tier = 'bachelor'`
2. Gå til `/no/dashboard` → "Auto Trade"

**Forventet:**
- AutoTradingDashboard vises
- Ingen trial-banner (ikke student)
- Tilgang til 3 strategier

### Test 4: Paper Trading auth (ikke innlogget)
**Steg:**
1. Logg ut
2. Gå til `/no/paper-trading`
3. Klikk "Start Simulator"

**Forventet:** Sendes til `/no/innlogging?callbackUrl=/no/dashboard`

### Test 5: Paper Trading auth (innlogget)
**Steg:**
1. Logg inn
2. Gå til `/no/paper-trading`
3. Klikk "Åpne Simulator"

**Forventet:** Sendes til `/no/dashboard?tab=paper-trading` med Paper Trading-fanen aktiv

---

## Oppsummering

| Krav | Status |
|------|--------|
| subscription.ts avledet fra TIERS | ✅ |
| TierSlug brukt i DashboardClient | ✅ |
| trial_started_at hentet fra Supabase | ✅ |
| Ingen hardkodede "free"/"pro" i ny kode | ✅ |
| TypeScript = 0 feil | ✅ |
| npm run build = suksess | ✅ |

**Endrede filer:**
1. `src/types/subscription.ts` – omskrevet til å bruke TIERS
2. `src/app/[locale]/dashboard/DashboardClient.tsx` – TierSlug + trial-støtte
3. `src/components/subscription/SubscriptionGate.tsx` – oppdatert til TierSlug

**profiles-tabellen:**
- `trial_started_at` finnes ✅ (migration `20260224041000_add_trial_system.sql`)
