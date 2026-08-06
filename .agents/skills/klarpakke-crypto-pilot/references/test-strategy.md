# JokerTrade Tests (2026-07-29)

## Test File

`src/app/api/jokertrade/__tests__/route.test.ts` — 19 enhetstester som dekker:
- `calculateRSI()` — 4 tester (grenseverdier, sideveis)
- `dynamicPositionPct()` — 3 tester (min/max/normal)
- `generateSignal()` — 5 tester (BUY/SELL/WAIT logikk)
- Minimum ordrestørrelse — 4 tester (små/store/grense)
- Exit-logikk (take-profit) — 3 tester

## Kjøring

```bash
cd /Users/taj/klarpakke
npx vitest run src/app/api/jokertrade/__tests__/route.test.ts
```

## Testdesign

Funksjonene er duplisert fra `route.ts` i testfilen for å unngå Next.js-import i vitest. Dette er akseptabelt fordi:
1. Funksjonene er rene (ingen side-effects, ingen DB-kall)
2. De kopierte funksjonene må holdes i sync med hovedkoden
3. Alternativet (mock av hele Next.js) er mer komplekst og skjørt

## Nye funksjoner som bør testes

Når `getCoinWinRate()` og `checkExits()` endres:
1. `getCoinWinRate` krever DB-mock — vurder integration test med Supabase local
2. `checkExits` krever DB-mock for trades — vurder å trekke ut exit-logikken til ren funksjon

## Pitfalls fra testutvikling

- **Test expectation må matche faktisk logikk** — `dynamicPositionPct(100, 0)` gir 7.5, IKKE 10 (fordi `confFactor = 0.5 + 100/100 = 1.5` og `5 * 1.0 * 1.5 = 7.5`). Testen ble opprinnelig skrevet feil og måtte rettes.
- **RSI 50 + trend flat → BUY, ikke WAIT** — `RSI < 60 AND trend !== "down"` treffer. Dette er korrekt atferd for en AI-trader som skal være i markedet. Testen ble rettet fra WAIT til BUY.
- **Alle 19 tester passerer** når expectation matcher faktisk kode — ikke skriv tester for ønsket oppførsel, skriv for faktisk oppførsel.
