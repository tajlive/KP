# Onboarding redesign — Phase 1 implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) task-by-task. Stegene bruker checkbox (`- [ ]`) syntaks.

**Goal:** Erstatte dagens 3-stegs onboarding med en 5-stegs edu-fintech-flyt: AI-kartlegging → nivåvalg → paper-oppsett → første guidede paper trade → fullført. Flyten skal bruke Nordic Trust + Live Accents-tokens, være mobilførst og WCAG 2.1 AA-vennlig.

**Architecture:** App Router med én klient-side side per steg under `src/app/[locale]/(onboarding)/onboarding/`. Tilstand lagres i `user_profiles.onboarding_step`. Fellekomponenter (`Button`, `Card`, `RiskBadge`, `AnimatedNumber`, `LivePill`) ligger i `@/shared/ui`. AI-kartleggingsspørsmål mellomlagres i `localStorage` under `kp-onboarding-answers` for å kunne anbefale nivå på steg 2 uten database-migrasjon.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind v4, next-intl, Supabase JS, Framer Motion (sparsomt), `@/shared/ui/*`, `@/lib/design/tokens`.

---

## Filstruktur (endelig)

| Fil | Ansvar |
|---|---|
| `src/app/[locale]/(onboarding)/onboarding/step1-welcome/page.tsx` | Velkomst + AI-kartlegging (2 spørsmål) |
| `src/app/[locale]/(onboarding)/onboarding/step2-level/page.tsx` | Nivåvalg (beginner/intermediate/expert) |
| `src/app/[locale]/(onboarding)/onboarding/step3-trading-mode/page.tsx` | Paper-oppsett (100 000 kr saldo) |
| `src/app/[locale]/(onboarding)/onboarding/step4-first-trade/page.tsx` | Første guidede BTC-paper-trade |
| `src/app/[locale]/(onboarding)/onboarding/step5-complete/page.tsx` | Fullført (eksisterende, stiljusteres) |
| `src/app/[locale]/(onboarding)/onboarding/page.tsx` | Redirect-logikk til riktig steg |
| `src/app/[locale]/(onboarding)/onboarding/layout.tsx` | Onboarding-skall med progress (5 steg) |
| `src/app/api/onboarding/first-paper-trade/route.ts` | Plasser første paper trade + oppdater `onboarding_step=4` |
| `src/features/onboarding/AIMappingChat.tsx` | Gjenbrukbar AI-chat-komponent |
| `messages/no/onboarding.json` | Norske tekster |
| `messages/en/onboarding.json` | Engelske tekster |
| `e2e/critical/onboarding-redesign.spec.ts` | E2E-smoke for hele flyten |

---

## Konstantverdier

```ts
// Brukes på tvers av stegene
const ONBOARDING_TOTAL_STEPS = 5;
const PAPER_START_BALANCE = 100_000;
const FIRST_TRADE_SYMBOL = "BTCUSDT";
const ONBOARDING_ANSWERS_KEY = "kp-onboarding-answers";
```

---

## Delte regler for alle steg-sider

1. **Auth-sjekk:** Hvis `supabase.auth.getUser()` returnerer `null`, redirect til `/${locale}/innlogging?next=/${locale}/onboarding/stepN`.
2. **Fullført:** Hvis `profile.onboarding_completed === true`, redirect til `/${locale}/dashboard`.
3. **Steg-guard:** Hvis brukeren er på feil steg, redirect til riktig side basert på `onboarding_step`:
   - `0` → `step1-welcome`
   - `1` → `step2-level`
   - `2` → `step3-trading-mode`
   - `3` → `step4-first-trade`
   - `4` → `step5-complete`
   - `>=5` → `dashboard`
4. **Tokens:** Bruk `var(--kp-ai)` for primær CTA, `var(--kp-bg-secondary)` for kort, `var(--kp-text-primary)` / `var(--kp-text-secondary)` for tekst.
5. **Touch-mål:** Alle klikkbare elementer minst 44×44 px (helst 48×48 px).
6. **Reduced motion:** Alle Framer Motion-komponenter respekterer `useReducedMotion()`.

---

## Task 11: Refactor onboarding step 1 — AI mapping

**Files:**
- Modify: `src/app/[locale]/(onboarding)/onboarding/step1-welcome/page.tsx`
- Create: `src/features/onboarding/AIMappingChat.tsx`
- Modify: `messages/no/onboarding.json`
- Modify: `messages/en/onboarding.json`

- [ ] **Step 1: Slett eksisterende "trading experience"-velger fra `step1-welcome/page.tsx`.**

Fjern `EXPERIENCE_OPTIONS`, `selected`-state, `handleContinue` og den andre return-blokken. Behold auth-sjekk og redirect-guard.

- [ ] **Step 2: Lag `AIMappingChat.tsx`.**

Komponenten skal:
- Ta props:
  ```ts
  interface AIMappingChatProps {
    onComplete: (answers: { goal: string; timeHorizon: string }) => void;
  }
  ```
- Vise en AI-coach-boble med tittel og undertittel.
- Stille to spørsmål sekvensielt med horisontale "quick reply"-chips:
  1. Mål: `sparing` | `vekst` | `trading`
  2. Tidshorisont: `under1ar` | `1til3ar` | `over3ar`
- Etter siste svar, aktiver en primær CTA "Fortsett".
- Bruk Framer Motion `AnimatePresence` med `useReducedMotion()`.
- `aria-live="polite"` på nye meldinger.

```tsx
// src/features/onboarding/AIMappingChat.tsx (utdrag)
"use client";
import { useState } from "react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Sparkles } from "lucide-react";

const QUESTIONS = [
  { id: "goal", options: ["sparing", "vekst", "trading"] },
  { id: "timeHorizon", options: ["under1ar", "1til3ar", "over3ar"] },
] as const;
```

- [ ] **Step 3: Integrer `AIMappingChat` i `step1-welcome/page.tsx`.**

```tsx
// I page.tsx
import { AIMappingChat } from "@/features/onboarding/AIMappingChat";

const handleComplete = async (answers: { goal: string; timeHorizon: string }) => {
  localStorage.setItem("kp-onboarding-answers", JSON.stringify(answers));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("user_profiles")
    .update({ onboarding_step: 1, onboarding_started_at: new Date().toISOString() })
    .eq("id", user.id);
  router.push(`/${locale}/onboarding/step2-level`);
};
```

- [ ] **Step 4: Oppdater i18n for AI-mapping.**

```json
{
  "aiMapping": {
    "coachName": "Klara",
    "title": "La meg bli kjent med deg",
    "subtitle": "To raske spørsmål, så får du en læringssti skreddersydd for deg.",
    "typing": "Klara skriver...",
    "questions": {
      "goal": {
        "label": "Hva er hovedmålet ditt?",
        "options": {
          "sparing": { "label": "Sparing", "description": "Bygge formue over tid" },
          "vekst": { "label": "Vekst", "description": "Balansert risiko og avkastning" },
          "trading": { "label": "Trading", "description": "Aktiv handel med høyere risiko" }
        }
      },
      "timeHorizon": {
        "label": "Hvor lenge vil du spare/trade?",
        "options": {
          "under1ar": { "label": "Under 1 år" },
          "1til3ar": { "label": "1–3 år" },
          "over3ar": { "label": "Over 3 år" }
        }
      }
    },
    "cta": "Fortsett",
    "skip": "Hopp over kartlegging"
  }
}
```

- [ ] **Step 5: Kjør TypeScript-sjekk og lint.**

Run: `npm run type-check && npm run lint`
Expected: Ingen nye feil.

- [ ] **Step 6: Commit.**

```bash
git add src/app/\[locale\]/\(onboarding\)/onboarding/step1-welcome/page.tsx src/features/onboarding/AIMappingChat.tsx messages/no/onboarding.json messages/en/onboarding.json
git commit -m "feat(onboarding): redesign step 1 as AI mapping chat"
```

---

## Task 12: Create onboarding step 2 — level selection

**Files:**
- Create: `src/app/[locale]/(onboarding)/onboarding/step2-level/page.tsx`
- Modify: `messages/no/onboarding.json`
- Modify: `messages/en/onboarding.json`

- [ ] **Step 1: Opprett sidefilen.**

```tsx
// src/app/[locale]/(onboarding)/onboarding/step2-level/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { RiskBadge } from "@/shared/ui/RiskBadge";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, BookOpen, TrendingUp, Award } from "lucide-react";

const LEVELS = [
  { id: "beginner", icon: BookOpen, risk: "low", time: "10 min/dag" },
  { id: "intermediate", icon: TrendingUp, risk: "medium", time: "20 min/dag" },
  { id: "expert", icon: Award, risk: "high", time: "40+ min/dag" },
] as const;
```

- [ ] **Step 2: Implementer steg-guard, valg og lagring.**

Sidefilen skal:
1. Ved mount: sjekk auth og profil; redirect dersom feil steg.
2. Lese `kp-onboarding-answers` fra `localStorage` og velge anbefalt nivå:
   - `goal === "sparing"` eller `timeHorizon === "over3ar"` → `beginner`
   - `goal === "vekst"` eller `timeHorizon === "1til3ar"` → `intermediate`
   - `goal === "trading"` eller `timeHorizon === "under1ar"` → `expert`
3. Vise tre `Card`-varianter med ikon, nivånavn, beskrivelse, `RiskBadge`, tidsanslag.
4. Vise "Anbefalt for deg"-badge på anbefalt nivå.
5. Ved klikk på "Fortsett":
   - Oppdater `user_profiles` med `trading_experience: selectedLevel` og `onboarding_step: 2`.
   - Naviger til `/onboarding/step3-trading-mode`.
6. Tilbake-knapp til `/onboarding/step1-welcome`.

- [ ] **Step 3: Oppdater i18n for nivåvalg.**

```json
{
  "level": {
    "title": "Velg ditt nivå",
    "subtitle": "Du kan endre dette senere i innstillingene.",
    "recommended": "Anbefalt for deg",
    "back": "Tilbake",
    "continue": "Fortsett",
    "loading": "Lagrer...",
    "error": "Kunne ikke lagre nivå. Prøv igjen.",
    "levels": {
      "beginner": {
        "label": "Nybegynner",
        "description": "Lær grunnleggende trading med små, trygge steg."
      },
      "intermediate": {
        "label": "Middels",
        "description": "Du kjenner begrepene og vil lære mer avanserte strategier."
      },
      "expert": {
        "label": "Ekspert",
        "description": "Aktiv trading med høy risiko og høyt potensial."
      }
    }
  }
}
```

- [ ] **Step 4: Verifiser.**

Run: `npm run type-check && npm run lint`
Expected: Ingen nye feil.

- [ ] **Step 5: Commit.**

```bash
git add src/app/\[locale\]/\(onboarding\)/onboarding/step2-level/page.tsx messages/no/onboarding.json messages/en/onboarding.json
git commit -m "feat(onboarding): add step 2 level selection"
```

---

## Task 13: Refactor onboarding step 3 — paper setup

**Files:**
- Modify: `src/app/[locale]/(onboarding)/onboarding/step3-trading-mode/page.tsx`
- Modify: `messages/no/onboarding.json`
- Modify: `messages/en/onboarding.json`

- [ ] **Step 1: Oppdater import og styling.**

Erstatt eksisterende import med:
```tsx
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { RiskBadge } from "@/shared/ui/RiskBadge";
import { Gamepad2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
```

- [ ] **Step 2: Bytt til nye design-tokens.**

- Ytterste container: `min-h-full flex flex-col gap-6`.
- Paper-kort: `bg-[var(--kp-bg-secondary)] border border-[var(--kp-border)] rounded-2xl p-6`.
- Saldo-tall: `<AnimatedNumber value={paperBalance} prefix="" suffix=" kr" decimals={0} className="text-4xl font-bold text-[var(--kp-text-primary)]" />`.
- "Paper Trading"-badge: `<RiskBadge level="low" />` med i18n-tekst, eller en egen `<span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--kp-positive)]/10 text-[var(--kp-positive)] px-2.5 py-1 text-xs font-medium">`.

- [ ] **Step 3: Oppdater redirect og lagring.**

Ved klikk på CTA:
```ts
await supabase
  .from("user_profiles")
  .update({ onboarding_step: 3, paper_balance: PAPER_START_BALANCE })
  .eq("id", user.id);
router.push(`/${locale}/onboarding/step4-first-trade`);
```

- [ ] **Step 4: Oppdater i18n under `paperSetup` ( behold gammel `step3` om nødvendig for andre referanser ).**

```json
{
  "paperSetup": {
    "title": "Øv med lekepenger",
    "subtitle": "Du får 100 000 kr i virtuelle midler. Ingen ekte penger er i spill.",
    "badge": "Paper Trading",
    "balanceLabel": "Din start-saldo",
    "virtual": "Virtuell valuta",
    "tooltip": "Lekepenger simulerer ekte markedsforhold, men du taper aldri ekte penger.",
    "whatIs": "Hva er lekepenger?",
    "cta": "Start første trade",
    "loading": "Lagrer..."
  }
}
```

- [ ] **Step 5: Verifiser.**

Run: `npm run type-check && npm run lint`
Expected: Ingen nye feil.

- [ ] **Step 6: Commit.**

```bash
git add src/app/\[locale\]/\(onboarding\)/onboarding/step3-trading-mode/page.tsx messages/no/onboarding.json messages/en/onboarding.json
git commit -m "feat(onboarding): redesign step 3 paper setup with new tokens"
```

---

## Task 14: Create onboarding step 4 — first guided paper trade

**Files:**
- Create: `src/app/[locale]/(onboarding)/onboarding/step4-first-trade/page.tsx`
- Create: `src/app/api/onboarding/first-paper-trade/route.ts`
- Modify: `messages/no/onboarding.json`
- Modify: `messages/en/onboarding.json`

- [ ] **Step 1: Opprett API-route.**

```ts
// src/app/api/onboarding/first-paper-trade/route.ts
import { NextRequest } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";
import { jsonSuccess, unauthorized, internalError, badRequest } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  symbol: z.string().min(1).default("BTCUSDT"),
  amount: z.number().positive().max(100_000),
});

export async function POST(request: NextRequest) {
  const response = new Response();
  const supabaseAuth = createServerClient(request, response);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) return unauthorized("Ikke autentisert");

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Ugyldig handel");

  const { symbol, amount } = parsed.data;
  const supabase = createClient();

  // Hent siste pris fra Binance
  const binanceRes = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
    { next: { revalidate: 0 } },
  );
  if (!binanceRes.ok) {
    return internalError("Kunne ikke hente markedspris");
  }
  const binanceData = (await binanceRes.json()) as { lastPrice?: string };
  const requestedPrice = Number(binanceData.lastPrice) || 0;

  const { data: tradeRows, error: rpcError } = await supabase.rpc(
    "place_paper_trade_with_slippage",
    {
      p_user_id: user.id,
      p_symbol: symbol,
      p_side: "buy",
      p_order_type: "market",
      p_amount: amount,
      p_requested_price: requestedPrice,
    }
  );

  if (rpcError || !tradeRows?.length) {
    console.error("[first-paper-trade] RPC failed:", rpcError);
    return internalError("Kunne ikke gjennomføre paper trade");
  }

  const trade = tradeRows[0];

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({ onboarding_step: 4 })
    .eq("id", user.id);

  if (updateError) {
    console.error("[first-paper-trade] profile update failed:", updateError);
    return internalError("Kunne ikke oppdatere onboarding-status");
  }

  return jsonSuccess({
    tradeId: trade.trade_id,
    executionPrice: trade.execution_price,
    slippageBps: trade.slippage_bps,
    symbol,
    amount,
  });
}
```

- [ ] **Step 2: Opprett step4-siden.**

Siden skal:
1. Sjekke auth og `onboarding_step === 3`.
2. Hente `paper_balance` fra profil.
3. Hente BTC-pris fra `/api/market/snapshot` (klient-side fetch) hvert 30. sekund.
4. Vise forhåndsvalgte beløpsknapper: `1000`, `5000`, `10000`, `20000`.
5. Tillate egendefinert beløp, maks `paper_balance`.
6. Ved klikk på "Kjøp BTC":
   - POST `/api/onboarding/first-paper-trade` med `{ amount, symbol: "BTCUSDT" }`.
   - Ved suksess: vis suksess-view med confetti (respekter `prefers-reduced-motion`) og CTA "Fullfør onboarding" → `/onboarding/step5-complete`.
   - Ved feil: vis feilmelding fra API.
7. Vise en "Paper Trading"-badge (eget i18n-nøkkel `badge`) og `RiskBadge level="medium"` fordi krypto er volatilt.

```tsx
// src/app/[locale]/(onboarding)/onboarding/step4-first-trade/page.tsx (utdrag)
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import { createClient } from "@/lib/supabase/client";
import confetti from "canvas-confetti";

const PRESETS = [1000, 5000, 10000, 20000];
```

- [ ] **Step 3: Oppdater i18n.**

```json
{
  "firstTrade": {
    "title": "Din første paper trade",
    "subtitle": "Kjøp litt Bitcoin med lekepenger. Ingen ekte penger er i spill.",
    "badge": "Paper Trading",
    "balance": "Tilgjengelig",
    "price": "BTC-pris",
    "amountLabel": "Hvor mye vil du kjøpe for?",
    "presets": { "1000": "1 000 kr", "5000": "5 000 kr", "10000": "10 000 kr", "20000": "20 000 kr" },
    "custom": "Annet beløp",
    "max": "Maks",
    "buyCta": "Kjøp BTC",
    "buying": "Gjennomfører...",
    "success": {
      "title": "Gratulerer! 🎉",
      "description": "Du har gjort din første paper trade. Nå er du klar for å fortsette.",
      "cta": "Fullfør onboarding"
    },
    "error": "Kunne ikke gjennomføre trade. Prøv igjen."
  }
}
```

- [ ] **Step 4: Verifiser API og side.**

Run: `npm run type-check && npm run lint`
Expected: Ingen nye feil.

- [ ] **Step 5: Commit.**

```bash
git add src/app/\[locale\]/\(onboarding\)/onboarding/step4-first-trade/page.tsx src/app/api/onboarding/first-paper-trade/route.ts messages/no/onboarding.json messages/en/onboarding.json
git commit -m "feat(onboarding): add step 4 first guided paper trade"
```

---

## Task 15: Onboarding E2E test

**Files:**
- Create: `e2e/critical/onboarding-redesign.spec.ts`

- [ ] **Step 1: Opprett testfilen.**

Testen skal:
1. Bruke en seedet testbruker via `loginAsTestUser()`-hjelper (se `e2e/critical/auth.spec.ts` for mønster) eller logge inn med miljøvariabler `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`.
2. Navigere til `/no/onboarding/step1-welcome`.
3. Fullføre AI-mapping: klikk gjennom to spørsmål og "Fortsett".
4. På `/no/onboarding/step2-level`: velg "Nybegynner" og "Fortsett".
5. På `/no/onboarding/step3-trading-mode`: klikk "Start første trade".
6. På `/no/onboarding/step4-first-trade`: velg 5 000 kr, klikk "Kjøp BTC", se suksess-view, klikk "Fullfør onboarding".
7. Verifiser at URL ender på `/no/onboarding/step5-complete` og at knappen "Gå til Dashboard" vises.
8. I `test.afterEach`: resett `user_profiles.onboarding_step` til `0`, `onboarding_completed` til `false`, slett `trading_sessions` og `paper_trades` for testbrukeren via Supabase API.

```ts
// e2e/critical/onboarding-redesign.spec.ts (utdrag)
import { test, expect } from "@playwright/test";

test.describe("Onboarding redesign", () => {
  test("completes 5-step edu onboarding", async ({ page }) => {
    await page.goto("/no/innlogging");
    // ... login flow or helper
    await page.goto("/no/onboarding/step1-welcome");

    await expect(page.getByRole("heading", { name: /La meg bli kjent med deg/ })).toBeVisible();
    await page.getByRole("button", { name: "Sparing" }).click();
    await page.getByRole("button", { name: "Over 3 år" }).click();
    await page.getByRole("button", { name: "Fortsett" }).click();

    await page.waitForURL("/no/onboarding/step2-level");
    await page.getByRole("button", { name: "Nybegynner" }).click();
    await page.getByRole("button", { name: "Fortsett" }).click();

    await page.waitForURL("/no/onboarding/step3-trading-mode");
    await page.getByRole("button", { name: "Start første trade" }).click();

    await page.waitForURL("/no/onboarding/step4-first-trade");
    await page.getByRole("button", { name: "5 000 kr" }).click();
    await page.getByRole("button", { name: "Kjøp BTC" }).click();
    await expect(page.getByRole("heading", { name: /Gratulerer/ })).toBeVisible();
    await page.getByRole("button", { name: "Fullfør onboarding" }).click();

    await page.waitForURL("/no/onboarding/step5-complete");
    await expect(page.getByRole("button", { name: /Gå til Dashboard/ })).toBeVisible();
  });
});
```

- [ ] **Step 2: Legg til testen i riktig Playwright-prosjekt.**

Filen ligger i `e2e/critical/`, så den kjøres automatisk av `critical-chromium`-prosjektet.

- [ ] **Step 3: Kjør testen lokalt.**

Run: `npm run test:e2e:critical -- e2e/critical/onboarding-redesign.spec.ts`
Expected: Testen består (forutsetter gyldige test-credentials).

- [ ] **Step 4: Commit.**

```bash
git add e2e/critical/onboarding-redesign.spec.ts
git commit -m "test(e2e): add onboarding redesign flow"
```

---

## Koordinering mellom stegene (ikke glem)

Etter at Task 11–14 er ferdige må følgende felles filer oppdateres **én gang** (gjør det i Task 11 hvis mulig, eller i en egen mini-task):

1. **`src/app/[locale]/(onboarding)/onboarding/layout.tsx`**
   - Endre `TOTAL_STEPS = 3` til `TOTAL_STEPS = 5`.
   - Endre `displayStep`-beregningen til å speile `onboarding_step` 0–4:
     ```ts
     const displayStep = Math.min(dbStep, TOTAL_STEPS - 1);
     ```
   - Keep the progress bar width formula `((displayStep + 1) / TOTAL_STEPS) * 100%`.

2. **`src/app/[locale]/(onboarding)/onboarding/page.tsx`**
   - Endre `steps`-array til:
     ```ts
     const steps = [
       "/onboarding/step1-welcome",
       "/onboarding/step2-level",
       "/onboarding/step3-trading-mode",
       "/onboarding/step4-first-trade",
       "/onboarding/step5-complete",
     ];
     const targetStep = Math.min(step, steps.length - 1);
     redirect(`/${locale}${steps[targetStep]}`);
     ```

3. **`src/app/api/onboarding/complete/route.ts`**
   - Sikre at `if ((profile.onboarding_step ?? 0) < 4)` fortsatt gjelder (allerede korrekt).

---

## Suksesskriterier

- [ ] Alle 5 onboarding-steg laster uten 404/500.
- [ ] `onboarding_step` oppdateres korrekt: 1 → 2 → 3 → 4 → 5.
- [ ] Step 2 viser "Anbefalt for deg" basert på svar fra step 1.
- [ ] Step 4 plasserer en paper trade og oppdaterer `onboarding_step` til 4.
- [ ] E2E-testen består lokalt.
- [ ] `npm run lint:gate`, `npm run type-check` og `npm run test:unit` er grønne.
