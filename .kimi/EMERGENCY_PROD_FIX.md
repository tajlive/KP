# 🚨 KIMI EMERGENCY TASK - GET ALL PAGES LIVE NOW!

**STATUS:** 🔴 KRITISK - Nettsider er nede eller fungerer ikke
**TIDSFRIST:** ⚡ SÅ FORT SOM MULIG
**MÅL:** ✅ Alle nettsider skal være oppe og funksjonelle på https://www.klarpakke.no

---

## 📋 OPPGAVEOVERSIKT

### Del 1: DIAGNOSE (5 min)
1. Sjekk produksjonsstatus
2. Identifiser hvilke sider som er nede
3. Finn feilårsaker

### Del 2: FIKS (30 min)
1. Fiks alle build/deploy-blokkere
2. Fiks alle i18n-mangler
3. Fiks alle TypeScript-feil

### Del 3: DEPLOY (10 min)
1. Push til GitHub
2. Verifiser GitHub Actions
3. Test produksjon

### Del 4: VERIFISER (5 min)
1. Alle sider returnerer 200
2. Ingen JavaScript-feil
3. All funksjonalitet virker

---

## 🔍 DEL 1: DIAGNOSE - KJØR DISSE KOMMANDOENE

### 1.1 Sjekk GitHub Actions status
```bash
gh run list --repo tomarnejensen/klarpakke --limit 5
```

**Forventet:** Siste run skal være ✅ grønn
**Hvis rød:** Se logs med `gh run view --log`

### 1.2 Test produksjonsider
```bash
# Test hovedside
curl -sI https://www.klarpakke.no/no | head -1

# Test alle kritiske sider
for path in "" "priser" "kalkulator" "om-oss" "hjelp" "kurs" "dashboard" "innlogging"; do
  status=$(curl -sI "https://www.klarpakke.no/no/$path" 2>/dev/null | head -1 | awk '{print $2}')
  echo "$path: $status"
done
```

**Forventet:** Alle skal returnere `200`
**Hvis 404/500:** Side feiler - se logs

### 1.3 Sjekk build lokalt
```bash
npm run build 2>&1 | tee build.log
```

**Forventet:** `✓ Compiled successfully`
**Hvis feil:** Fiks før push!

### 1.4 Valider i18n
```bash
node scripts/validate-i18n.js 2>&1 | tee i18n-validation.log
```

**Forventet:** `✅ All keys validated successfully!`
**Hvis feil:** Fiks manglende nøkler

---

## 🔧 DEL 2: FIKS - PRIORITERT REKKEFØLGE

### 2.1 Fiks kritiske build-feil (FØRST)

**Problem A: TypeScript-feil**
```bash
# Finn TypeScript-feil
npm run type-check 2>&1 | grep "error TS"
```

**Vanlige feil og løsninger:**

#### Feil: `params is not a Promise`
```typescript
// ❌ Gammelt (Next.js 14)
export default function Page({ params }: { params: { locale: string } }) {
  const t = useTranslations(params.locale);
}

// ✅ Nytt (Next.js 15)
export default async function Page({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
}
```

**Fiks ALLE pages i:**
- `src/app/[locale]/*/page.tsx`
- `src/app/[locale]/dashboard/*/page.tsx`

#### Feil: `getTranslations is not a function`
```typescript
// ❌ Feil import
import { useTranslations } from 'next-intl';

// ✅ Riktig for Server Components
import { getTranslations } from 'next-intl/server';

// ✅ Riktig for Client Components  
'use client';
import { useTranslations } from 'next-intl';
```

### 2.2 Fiks manglende i18n-nøkler

**Sjekk validation output:**
```bash
node scripts/validate-i18n.js 2>&1 | grep "Missing keys"
```

**For HVER manglende nøkkel:**
1. Finn hvilken side som bruker den: `grep -r "t('nøkkel')" src/app/`
2. Legg til i `messages/{locale}/{namespace}.json` for ALLE 4 språk (no, en, th, zh)

**Eksempel:**
```json
// messages/no/pricing.json
{
  "title": "Priser",
  "description": "Velg rett plan for deg",
  "tiers": {
    "basic": {
      "name": "Gratis",
      "price": "0",
      "features": [
        "Papirhandel",
        "Grunnleggende analyse",
        "Historiske data (30 dager)"
      ]
    }
  }
}
```

**Kritiske filer å sjekke:**
- `pricing.json` (priser-side)
- `dashboard.json` (dashboard)
- `common.json` (brukes overalt)
- `navigation.json` (meny)
- `footer.json` (footer)

### 2.3 Fiks Supabase auth middleware

**Problem:** Middleware blokkerer alle requests

**Fiks i `src/middleware.ts`:**
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // ✅ VIKTIG: Bruk getUser(), IKKE getSession()
  const { data: { user } } = await supabase.auth.getUser();

  // Protekter kun /dashboard og /admin
  if (!user && (request.nextUrl.pathname.includes('/dashboard') || 
                request.nextUrl.pathname.includes('/admin'))) {
    return NextResponse.redirect(new URL('/innlogging', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 2.4 Fiks Stripe config (build-time error)

**Problem:** `STRIPE_SECRET_KEY is not set` ved build

**Fiks i `src/lib/stripe/config.ts`:**
```typescript
import Stripe from 'stripe';

// ❌ ALDRI dette (feiler ved build-tid)
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ✅ Lazy initialization
let stripeInstance: Stripe | null = null;

export const getStripe = () => {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(key, { 
      apiVersion: '2024-12-18.acacia' 
    });
  }
  return stripeInstance;
};

// Bruk: const stripe = getStripe();
```

---

## 🚀 DEL 3: DEPLOY

### 3.1 Test lokalt FØR push
```bash
# ALLE disse må være grønne
npm run test:unit
npm run build
node scripts/validate-i18n.js
```

### 3.2 Commit og push
```bash
git add -A
git commit -m "fix: critical production fixes - all pages now working

- Fixed Next.js 15 async params in all pages
- Added missing i18n keys for all languages
- Fixed Supabase auth middleware (use getUser())
- Fixed Stripe lazy initialization
- Validated all translations

Closes #16"

git push origin main
```

### 3.3 Monitor deployment
```bash
# Watch live
gh run watch

# Eller poll hvert 10. sekund
while true; do
  status=$(gh run list --limit 1 --json status,conclusion -q '.[0].status')
  echo "Status: $status"
  [[ "$status" == "completed" ]] && break
  sleep 10
done

gh run list --limit 1 --json conclusion -q '.[0].conclusion'
```

**Forventet:** `success`
**Hvis `failure`:** Se logs med `gh run view --log`

---

## ✅ DEL 4: VERIFISER PRODUKSJON

### 4.1 Test alle sider
```bash
#!/bin/bash
echo "Testing all pages..."

PAGES=(
  "" "priser" "kalkulator" "om-oss" "hjelp" "kurs" 
  "varsler" "innstillinger" "innlogging" "kontakt"
  "personvern" "vilkar" "binance-guide" "simulator"
)

for page in "${PAGES[@]}"; do
  url="https://www.klarpakke.no/no/$page"
  status=$(curl -sI "$url" 2>/dev/null | head -1 | awk '{print $2}')
  size=$(curl -sL "$url" 2>/dev/null | wc -c)
  
  if [[ "$status" == "200" ]] && [[ $size -gt 10000 ]]; then
    echo "✅ $page - OK ($status, ${size} bytes)"
  else
    echo "❌ $page - FAIL ($status, ${size} bytes)"
  fi
done
```

### 4.2 Test API health
```bash
curl -s https://www.klarpakke.no/api/health | jq .
```

**Forventet:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T15:16:00.000Z"
}
```

### 4.3 Test i nettleser
1. Åpne https://www.klarpakke.no/no
2. Sjekk console for JavaScript-feil (F12)
3. Test navigasjon mellom sider
4. Test innlogging/signup
5. Test dashboard (hvis innlogget)

---

## 📊 SUKSESSKRITERIER - ALLE MÅ VÆRE GRØNNE

- [ ] `npm run build` → ✅ ingen feil
- [ ] `npm run test:unit` → ✅ alle tester grønne
- [ ] `node scripts/validate-i18n.js` → ✅ ingen manglende nøkler
- [ ] GitHub Actions CI → ✅ grønn
- [ ] GitHub Actions Deploy → ✅ grønn
- [ ] Alle sider returnerer HTTP 200
- [ ] Sidestørrelse > 10KB (ikke tom HTML)
- [ ] Ingen JavaScript-feil i console
- [ ] Innlogging fungerer
- [ ] Dashboard fungerer (for innlogget bruker)

---

## 🚨 HVIS TING FORTSATT FEILER

### Quick rollback
```bash
# Gå tilbake til siste fungerende commit
git log --oneline -10  # finn SHA
git revert <SHA>
git push origin main
```

### Emergency hotfix branch
```bash
git checkout -b hotfix/critical-prod-fix
# Gjør endringer
git push origin hotfix/critical-prod-fix
gh pr create --title "HOTFIX: Critical production fix" --body "Emergency fix"
```

---

## 📞 KONTAKT VED KRITISKE PROBLEMER

**GitHub Issue:** https://github.com/tomarnejensen/klarpakke/issues/16
**Status dashboard:** https://github.com/tomarnejensen/klarpakke/actions

---

## 🎯 HUSKELISTE FOR KIMI

1. ✅ Les **WORKFLOW_RULES.md** først
2. ✅ Kjør diagnostikk-kommandoene
3. ✅ Fiks én ting av gangen (ikke alt på en gang)
4. ✅ Test lokalt før push
5. ✅ Commit med beskrivende melding
6. ✅ Monitor deployment
7. ✅ Verifiser i produksjon
8. ✅ Oppdater Issue #16 med status

---

## ⚡ QUICK WIN - START HER

Hvis du ikke vet hvor du skal starte, gjør dette:

```bash
# 1. Sjekk hva som feiler
npm run build 2>&1 | grep "error"

# 2. Fiks den første feilen
# (TypeScript-feil er vanligst)

# 3. Test
npm run build

# 4. Gjenta til build er grønn

# 5. Push
git add -A && git commit -m "fix: resolve build errors" && git push
```

**GO! GO! GO! 🚀**
