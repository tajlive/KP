# KIMI 2.5 — Full Fix: Vercel Produksjon Grønn
> Klarpakke | 2026-03-27 | P0 | Bruk: Lim inn hele denne filen i KIMI 2.5

---

## 🧠 KONTEKST (les først)

Repo: `/Users/taj/klarpakke`  
Problem: Alle Vercel produksjonsbygg feiler (`● Error`, `[0ms]` build-tid).  
Lokal status: `next build` ✅ | `tsc --noEmit` ✅ | 226 tester ✅  
Siste push: `df52b0b11` (force-deploy)  
Vercel siste bygg: `Canceled` på 9s — starter ikke engang.  

Kjente årsaker (sjekk i denne rekkefølgen):
1. `NEXTAUTH_SECRET` mangler i Vercel produksjon
2. Vercel "Ignored Build Step" er ikke konfigurert — eller feil konfigurert
3. Gjenstående Supabase `.eq()` feil i filer `tsc --noEmit` ikke fanger
4. `risk-validator.ts` bruker `positions.eq("session_id")` — kolonnen finnes ikke
5. `conditional-order/route.ts` bruker `positions.eq("session_id")` — kolonnen finnes ikke

---

## 🎯 MÅL

Vercel produksjon er GRØNN. Alle feil fikset. Ingen nye migrasjoner.

---

## 🤖 AGENT-ARBEIDSDELING (kjør parallelt)

### Agent 1 — NEXTAUTH_SECRET

```bash
# Sjekk om NEXTAUTH_SECRET allerede er satt
vercel env ls production 2>&1 | grep NEXTAUTH_SECRET

# Hvis IKKE satt:
echo "$(openssl rand -base64 32)" | vercel env add NEXTAUTH_SECRET production --force
echo "$(openssl rand -base64 32)" | vercel env add NEXTAUTH_SECRET preview --force
echo "NEXTAUTH_SECRET satt i production + preview"
```

---

### Agent 2 — Fix `positions.session_id` (2 filer)

**Rotproblem**: `positions`-tabellen har IKKE `session_id`. Har: `id`, `user_id`, `portfolio_id`, `symbol`, `quantity`.  
Ref: `/Users/taj/klarpakke/src/types/supabase-generated.ts` — `positions.Row`

**Fil 1**: `src/lib/trading/safety/risk-validator.ts`

Finn:
```typescript
const {  positions } = await supabase
  .from("positions")
  .select("symbol, quantity, avg_entry_price")
  .eq("session_id", trade.sessionId);
```

Erstatt med:
```typescript
const {  positions } = await supabase
  .from("positions")
  .select("symbol, quantity, avg_entry_price")
  .eq("user_id", trade.userId);
```

**Fil 2**: `src/app/api/trading/conditional-order/route.ts`

Finn alle:
```typescript
.from("positions")
.eq("session_id", ...)
```

Erstatt med:
```typescript
.from("positions")
.eq("user_id", userId)  // eller .eq("user_id", session.user_id)
```

---

### Agent 3 — Fix `stripe_subscription_id` i `user_profiles`

**Rotproblem**: `user_profiles` har IKKE `stripe_subscription_id`. Verdien ligger i `subscriptions`-tabellen.  
**Fil**: `src/app/api/webhooks/stripe/route.ts`

Finn alle UPDATE-kall som setter `stripe_subscription_id` på `user_profiles`:
```typescript
await supabase
  .from("user_profiles")
  .update({ stripe_subscription_id: subscriptionId, ... })
  .eq("id", userId);
```

Erstatt: Fjern `stripe_subscription_id` fra `update({})`-objektet.
```typescript
await supabase
  .from("user_profiles")
  .update({ 
    subscription_tier: planType,
    subscription_status: "active",
    stripe_customer_id: customerId,
    // stripe_subscription_id: FJERNET — kolonnen finnes ikke
    updated_at: new Date().toISOString(),
  })
  .eq("id", userId);
```

---

### Agent 4 — Vercel force-deploy etter alle fikser

Kjør etter at Agent 1, 2 og 3 er ferdige:

```bash
cd /Users/taj/klarpakke

# 1. TypeScript-verifisering
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TSC FEIL — STOPP, fiks før push"
  exit 1
fi
echo "✅ TSC OK"

# 2. Next build (samme som Vercel kjører)
SKIP_LINT_IN_BUILD=true npx next build 2>&1 | tail -5
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "❌ NEXT BUILD FEIL — STOPP"
  exit 1
fi
echo "✅ NEXT BUILD OK"

# 3. Commit og push
git add \
  src/lib/trading/safety/risk-validator.ts \
  src/app/api/trading/conditional-order/route.ts \
  src/app/api/webhooks/stripe/route.ts

git commit -m "fix(types): positions.session_id + stripe_subscription_id in user_profiles

Fixer 3 gjenstående Supabase-kolonne-feil:
1. risk-validator.ts: positions.eq(session_id) → eq(user_id)
2. conditional-order: positions.eq(session_id) → eq(user_id)
3. stripe/route.ts: fjernet stripe_subscription_id fra user_profiles UPDATE

Ingen migrasjoner. Ingen breaking changes. [skip ci]"

git push origin main

# 4. Force-deploy til Vercel produksjon
vercel deploy --prod --force
echo "✅ Vercel force-deploy sendt"
```

---

## 📌 ETTER PUSH: 2 manuelle steg i nettleser

Disse KAN IKKE automatiseres via CLI — gjøres én gang:

### Steg A — Vercel Dashboard
```
https://vercel.com/klarpakke/klarpakke/settings/git

Ignored Build Step:
  bash scripts/vercel-ignored-build-step.sh

[Lagre] → Deployments → [Trigger Manual Redeploy]
```

### Steg B — GitHub Branch Protection
```
https://github.com/tajlive/KP/settings/branches

main → Add rule:
  ☑ Require status checks to pass
  ☑ Status check: "TypeScript Check (Blocking) / tsc --noEmit"
  ☑ Require branches to be up to date
[Lagre]
```

---

## ✅ VERIFISERING — Slik vet du at Vercel er grønn

```bash
cd /Users/taj/klarpakke

# Poll til grønn eller rød
for i in $(seq 1 10); do
  STATUS=$(vercel list 2>&1 | head -6 | grep -E 'Ready|Error|Building|Queued' | head -1)
  echo "[$i] $STATUS"
  echo "$STATUS" | grep -q 'Ready' && echo "🟢 GRØNN! Done." && break
  echo "$STATUS" | grep -q 'Error' && echo "🔴 RØD — ny feil" && break
  sleep 30
done
```

---

## 🔴 Hvis Vercel fortsatt feiler etter dette

Hent ny feil-logg og start ny runde:
```bash
vercel list 2>&1 | head -4
# Finn siste Error-URL
vercel inspect <URL> 2>&1 | grep -A3 'Builds'
```

Lim inn feilen i ny KIMI-sesjon med:
> "Les .klarpakke-memory.md. Ny Vercel-feil: [FEIL HER]. Fiks og push."

---

## 🧠 INVARIANTER (aldri bryt)

```
positions         → IKKE session_id → bruk user_id
user_profiles     → IKKE stripe_subscription_id → bruk subscriptions.user_id
strategies        → IKKE status (string) → bruk is_active (bool)
tsc --noEmit      → MÅ være exit 0 FØR git push
next build        → MÅ være exit 0 FØR git push
bot-commits       → ALLTID [skip ci] i commit-message
nye migrasjoner   → ALDRI uten eksplisitt godkjenning fra Tomar
```
