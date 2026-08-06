# Kraken symbols.ts — implementasjonsstatus 2026-08-05 (fix APPLIED)

Audit-funnet i `references/kraken-verified-pair-data.md` er nå implementert i
`src/lib/exchanges/kraken/symbols.ts`. Koden er IKKE lenger feil — re-audit
kreves kun ved symbol-univers-endringer eller live-aktivering.

## KRAKEN_MIN_ORDER (verifisert, 2026-08-05)

```ts
export const KRAKEN_MIN_ORDER: Record<string, string> = {
  XBTUSDT: "0.00005", ETHUSDT: "0.001", SOLUSDT: "0.06", AVAXUSDT: "0.5",
  XDGUSDT: "50", LINKUSDT: "0.55", ADAUSDT: "20", DOTUSDT: "3.9",
  POLUSD: "70", USDTUSD: "5", USDTEUR: "5",
};
export function krakenMinOrder(pair: string): string {
  return KRAKEN_MIN_ORDER[pair] ?? "0.0001";
}
```

Merknader:
- DOGE-key er `XDGUSDT` (ikke `DOGEUSDT`) — Kraken-navnet.
- POL har ingen USDT: `POLUSD` (ordermin 70). Fiat-konverteringspar: `USDTUSD` og `USDTEUR` (ordermin 5, og EUR-paret heter USDTEUR — IKKE USDTZEUR).

## Symbol-mapping (bidirectional)

- Forward (`KRAKEN_SYMBOL_MAP`): `DOGEUSDT → XDGUSDT`. POLUSDT fjernet (finnes ikke på Kraken).
- Reverse (`KRAKEN_REVERSE_MAP`): `XDGUSDT → DOGEUSDT`, `POLUSD → POLUSDT`. POLUSDT fjernet.

## TS-felle: string-keyed lookup på konstante-tabell

Å indeksere `KRAKEN_MIN_ORDER[pair]` med `pair: string` feiler med TS7053
("Element implicitly has an 'any' type") under strict/noImplicitAny HVIS
konstanten er deklarert uten type. Fiks: deklarer alltid
`export const KRAKEN_MIN_ORDER: Record<string, string> = {...}` når en
helper skal slå opp med runtime-string. Uten helperen holder en uspesifisert
objektliteral — ved første string-indeksering feiler tsc.

## Verifikasjon for denne typen endring

```bash
npx tsc --noEmit --pretty 2>&1 | head -20   # 0 feil
npx eslint src/lib/exchanges/kraken/symbols.ts  # 0 warnings
npx vitest run src/lib/exchanges/kraken/__tests__/client.test.ts  # 8/8
```

`test:smoke`-stien i package.json (`symbols-registry.test.ts`) er STALE (filen
finnes ikke lenger) — finn ekte tester med `search_files` på modul-referanser
i stedet.

## Sibling-subagent skriver i samme fil samtidig (2026-08-05)

Oppstår når forelder-agenten dispatcher flere subagenter parallelt på samme
repo (eksempel: `symbols.ts` + `client.ts` i samme git diff).

**Symptom:** `patch`-verktøyet returnerer `_warning: "... was modified by
sibling subagent ..."`; en patch som nettopp var unik feiler med "Found 2
matches" / "Could not find a match" (sibling har forskjøvet konteksten);
sibling kan STILLE ha fjernet innhold oppgaven krever (POLUSD→POLUSDT i
reverse forsvant i denne økten — patchen "gikk gjennom" tidligere, men filens
endelige tilstand manglet den).

**Fiks-sekvens:**
1. Ved `_warning` om sibling-modifikasjon: LES FILEN PÅ NYTT før neste patch — aldri patch videre på gammel kontekst.
2. Etter hver runde: verifiser at ALLE task-krav er på plass i filen, linje for linje mot task-spesifikasjonen — ikke bare at dine patcher "gikk gjennom".
3. Sibling-endringer i ANDRE filer er legitime parallell-endringer — ikke revert dem (`git diff` viser hva som hører til hvem).
4. Kjør full verifikasjon helt til slutt mot ENDELIG on-disk-tilstand (tsc → eslint på fil → modulens vitest).
