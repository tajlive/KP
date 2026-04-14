# KIMI CODE PROMPT — paper-trading init 500 + i18n toasts fix

> Generert: 2026-04-14 17:17 | Prioritet: P0+P1 | Commit-target: fix(paper-trading): init 500 + missing i18n namespaces

---

## 🧠 MEM/PALACE — Lagre disse fakta i minnet FØR du starter

```
MEMORY[1] = API-rute: src/app/api/paper-trading/init/route.ts → kaller getOrCreatePaperTradingSession()
MEMORY[2] = DB-lib:  src/lib/supabase/paper-trading.ts → createPaperTradingSession() mangler felt: total_trades, winning_trades, losing_trades, pnl
MEMORY[3] = DB-lib:  getPaperTradingSession() bruker .single() → krasjer ved duplikat-rader → bytt til .maybeSingle()
MEMORY[4] = i18n:    messages/no/ og messages/en/ mangler toasts.json fullstendig
MEMORY[5] = i18n:    messages/no/threeSteps.json mangler ctaButtonLoggedIn + ctaSubtextLoggedIn
MEMORY[6] = i18n:    messages/en/dashboard.json mangler sidebar.paper + sidebar.courses
MEMORY[7] = Konvensjon: alle flat messages/ bruker no.json og en.json som fallback-rot
MEMORY[8] = Prosjekt:  /Users/taj/klarpakke — Next.js 15, next-intl, Supabase, TypeScript strict
```

---

## 🤖 AGENT-INSTRUKSJONER

Du er en multi-agent orchestrator. Spawn følgende agenter sekvensielt:

### AGENT 1 — «DB-FIX» (src/lib/supabase/paper-trading.ts)
**Mål:** Fiks insert-payload + .maybeSingle() race condition

Åpne MEMORY[2] og MEMORY[3]. Gjør disse eksakte endringene i `src/lib/supabase/paper-trading.ts`:

**Endring A — createPaperTradingSession():**
Legg til manglende felt i `.insert({...})`:
```typescript
// LEGG TIL disse fire feltene i insert-objektet:
total_trades: 0,
winning_trades: 0,
losing_trades: 0,
pnl: 0,
```

**Endring B — getPaperTradingSession():**
Bytt `.single()` → `.maybeSingle()` slik at null returneres i stedet for error ved 0 rader:
```typescript
// FØR:
.single();

// ETTER:
.maybeSingle();
```
Fjern deretter `PGRST116`-spesialsjekken siden `.maybeSingle()` aldri returnerer error for 0 rader.

**Verifiser** at TypeScript-typen fortsatt er riktig etter endringen.

---

### AGENT 2 — «I18N-TOASTS» (messages/no/toasts.json + messages/en/toasts.json)
**Mål:** Opprett manglende toasts-namespace

Åpne MEMORY[4]. Opprett disse to nye filene:

**`messages/no/toasts.json`** — opprett fra scratch:
```json
{
  "paperBot": {
    "startedTitle": "Strategi startet",
    "startedDesc": "Boten kjører nå i øvingsmodus",
    "stoppedTitle": "Strategi stoppet",
    "stoppedDesc": "Strategien ble avsluttet",
    "errorTitle": "Kunne ikke starte strategi",
    "errorDesc": "Prøv igjen eller kontakt support"
  },
  "session": {
    "createdTitle": "Øvingsøkt opprettet",
    "createdDesc": "Du kan nå handle med virtuell kapital",
    "errorTitle": "Kunne ikke opprette økt",
    "errorDesc": "Sjekk tilkoblingen og prøv igjen"
  }
}
```

**`messages/en/toasts.json`** — opprett fra scratch:
```json
{
  "paperBot": {
    "startedTitle": "Strategy started",
    "startedDesc": "The bot is now running in paper mode",
    "stoppedTitle": "Strategy stopped",
    "stoppedDesc": "The strategy has been stopped",
    "errorTitle": "Could not start strategy",
    "errorDesc": "Please try again or contact support"
  },
  "session": {
    "createdTitle": "Paper session created",
    "createdDesc": "You can now trade with virtual capital",
    "errorTitle": "Could not create session",
    "errorDesc": "Check your connection and try again"
  }
}
```

Etter opprettelse: sjekk om `next-intl` config-filen (typisk `src/i18n/routing.ts` eller `i18n.ts`) trenger oppdatering med `'toasts'` namespace-entry. Legg til hvis nødvendig.

---

### AGENT 3 — «I18N-THREESTEPS» (messages/no/threeSteps.json)
**Mål:** Legg til manglende LoggedIn-varianter av CTA-knapp

Åpne MEMORY[5]. Finn `messages/no/threeSteps.json` og legg til disse to nøklene på rotnivå, rett etter `"ctaSubtext"`:

```json
"ctaButtonLoggedIn": "Gå til dashboard",
"ctaSubtextLoggedIn": "Du er allerede logget inn · Fortsett der du slapp"
```

Gjør det samme i `messages/en/threeSteps.json` (har allerede `ctaButton` og `ctaSubtext`):
```json
"ctaButtonLoggedIn": "Go to dashboard",
"ctaSubtextLoggedIn": "You're already logged in · Pick up where you left off"
```

---

### AGENT 4 — «I18N-DASHBOARD-SIDEBAR» (messages/en/dashboard.json)
**Mål:** Legg til manglende sidebar-nøkler i engelsk versjon

Åpne MEMORY[6]. Finn `messages/en/dashboard.json`. Legg til `sidebar`-objekt. Sjekk først om `messages/no/dashboard.json` har en `sidebar`-seksjon — bruk den som mal for engelsk oversettelse.

Hvis `no/dashboard.json` har:
```json
"sidebar": {
  "paper": "Øvingshandel",
  "courses": "Kurs",
  ...
}
```

Legg til tilsvarende i `en/dashboard.json`:
```json
"sidebar": {
  "paper": "Paper Trading",
  "courses": "Courses"
}
```

Hvis `no/dashboard.json` IKKE har en `sidebar`-seksjon: opprett den i begge filer med fornuftige verdier basert på eksisterende nøkler i filen.

---

### AGENT 5 — «VERIFY» (sjekk alt etter endringene)
**Mål:** Verifiser at ingen TypeScript-feil er introdusert

Etter alle agentene er ferdige:
1. Søk etter alle steder som bruker `useTranslations('toasts')` i `src/` og verifiser at nøklene matcher det som ble lagt til i AGENT 2
2. Sjekk om `src/features/paper-trading/` har noen komponent som kaller `/api/paper-trading/init` og at error-håndteringen er fornuftig
3. Verifiser at `messages/no/toasts.json` og `messages/en/toasts.json` er gyldig JSON (ingen trailing commas)
4. Rapporter alle endrede filer i en liste

---

## 📋 FORVENTEDE ENDREDE FILER

```
src/lib/supabase/paper-trading.ts          ← AGENT 1
messages/no/toasts.json                    ← AGENT 2 (NY FIL)
messages/en/toasts.json                    ← AGENT 2 (NY FIL)
messages/no/threeSteps.json                ← AGENT 3
messages/en/threeSteps.json                ← AGENT 3
messages/en/dashboard.json                 ← AGENT 4
messages/no/dashboard.json                 ← AGENT 4 (hvis mangler)
```

## ✅ DONE-KRITERIER

- [ ] POST /api/paper-trading/init returnerer 200 (ikke 500)
- [ ] Toast viser «Strategi startet» (ikke rå nøkkel)
- [ ] Ingen MISSINGMESSAGE i console for dashboard.sidebar.paper/courses
- [ ] Ingen MISSINGMESSAGE for threeSteps.ctaButtonLoggedIn
- [ ] `npx tsc --noEmit` går gjennom uten nye feil

## 🚀 COMMIT ETTER FERDIG

```bash
git add -A && git commit -m "fix(paper-trading): init 500 + missing toasts i18n namespace + sidebar/threeSteps keys"
git push origin main
```
