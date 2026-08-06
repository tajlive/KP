# Rollback etter fjernet UI-modus — verifiser komponent-signaturen (2026-08-03)

Tillegg til SKILL.md §35 («Fjerning av en UI-modus/feature i prod»).

## Fallet: props i git-historikken matcher ikke dagens signatur

Ved gjenoppretting av Pilot-fanen etter Tom-reaksjonen («Alt er jo borte») ble render-koden kopiert fra git-historikken:

```tsx
{mode === "pilot" && <PilotDashboard onStartPilot={() => {
  const el = document.getElementById("manual-order");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}} />}
```

→ tsc-feil: `Type '{ onStartPilot: () => void; }' is not assignable to type 'IntrinsicAttributes'`.

`PilotDashboard` tar **ingen props** lenger — `onStartPilot` ble fjernet i en refaktor etter at den gamle render-koden ble skrevet.

**Regel:** Ved rollback/gjenoppretting av UI-kode fra git-historikk: sjekk komponent-signaturen i DAGENS kode (les filen, ikke historikken) før du limer inn props. Komponent-API-er endrer seg; historikken lyver om nåtiden.

**Fiks som ble brukt:** stripp propsene — `<PilotDashboard />` (tsc grønn, 76/76 trading-tester, full suite 1724 grønne, deployet som `63c47b0c4`).

## Rollback-rekkefølgen som fungerte (minimal diff, rask deploy)

1. TradeMode-union: legg tilbake `"pilot"`
2. MODES-array: legg tilbake Pilot-entry (violet accent)
3. Import: `import { PilotDashboard } from "..."`
4. Render: `{mode === "pilot" && <PilotDashboard />}` (uten props!)
5. Mode-beskrivelse: `{mode === "pilot" && "AI-en analyserer og handler automatisk"}`
6. URL-håndtering: `tab === "pilot" || tab === "joker"` → `setMode("pilot")`, `?first=1` → `setMode("pilot")`
7. tsc + vitest + eslint → commit → deploy

Ingen `git revert` nødvendig — punktene 1–6 er små, lesbare patch-er. Revert hadde dratt med seg andre endringer (AI-forklaringer i Statistikk-fanen) som skulle beholdes.
