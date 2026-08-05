/**
 * KLARPAKKE TRADING-AGENT — Par-kandidat-filter for live grid-utvidelse (Task 3)
 *
 * Kjører det rene trippel-filteret (velgParKandidater fra
 * src/lib/trading/par-kandidater.ts) mot faste data fra kveldens backtest
 * 2026-08-05 og skriver rapporten til reports/trading-agent/2026-08-05-par-univers.md.
 *
 * Filteret:
 * 1. OOS PF >= 1.1        (out-of-sample profit factor fra backtest)
 * 2. 24h-range >= 2.5 %   (volatilitet — grid trenger svingninger)
 * 3. ordremin × pris × 1.1 <= 8 USDC (dimensjonerbar med ~9 USDC-nivåer)
 *
 * BTC/ETH/SOL (XBT/ETH/SOL i Kraken-verden) er ALLTID med — allerede live.
 *
 * Kjør: npx tsx scripts/trading-agent/par-kandidater.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { velgParKandidater, type ParKandidat, type ParVurdering } from "../../src/lib/trading/par-kandidater";

// ── Faste data 2026-08-05 (kveldens backtest) ────────────────────────────────
// OOS PF (30 % walk-forward) fra grid-backtesten — Binance-symboler kartlagt til Kraken
const BACKTEST_OOS_PF: Record<string, number> = {
  XBTUSDC: 8.3, ETHUSDC: 9.91, SOLUSDC: 6.61, ADAUSDC: 4.49, AVAXUSDC: 3.03,
  DOTUSDC: 4.55, LINKUSDC: 5.39, DOGEUSDC: 7.86, UNIUSDC: 2.43, POLUSDC: 22.14,
};
// 24h-range % (live, 2026-08-05) — UNI/POL ikke målt → 1.0
const RANGE_24H_PCT: Record<string, number> = {
  XBTUSDC: 1.8, ETHUSDC: 3.8, SOLUSDC: 2.2, ADAUSDC: 5.2, AVAXUSDC: 2.5,
  DOTUSDC: 2.9, LINKUSDC: 2.0, DOGEUSDC: 1.8, UNIUSDC: 1.0, POLUSDC: 1.0,
};
// Ordremin (Kraken, live-verifisert) — i base-valuta
const ORDREMIN: Record<string, number> = {
  XBTUSDC: 0.00005, ETHUSDC: 0.001, SOLUSDC: 0.06, ADAUSDC: 20, AVAXUSDC: 0.5,
  DOTUSDC: 3.9, LINKUSDC: 0.55, DOGEUSDC: 50, UNIUSDC: 7, POLUSDC: 45,
};
// Nåpriser (USDC, 2026-08-05)
const PRISER_USDC: Record<string, number> = {
  XBTUSDC: 64900, ETHUSDC: 1920, SOLUSDC: 74.5, ADAUSDC: 0.19, AVAXUSDC: 6.7,
  DOTUSDC: 0.85, LINKUSDC: 8.2, DOGEUSDC: 0.0704, UNIUSDC: 2.6, POLUSDC: 0.32,
};

const ALLE_PAR = Object.keys(BACKTEST_OOS_PF);

function byggUnivers(): ParKandidat[] {
  return ALLE_PAR.map((par) => ({
    par,
    oosProfitFactor: BACKTEST_OOS_PF[par],
    rangePct: RANGE_24H_PCT[par],
    ordremin: ORDREMIN[par],
    prisUsdc: PRISER_USDC[par],
  }));
}

const RAPPORT_FIL = fileURLToPath(new URL("../../reports/trading-agent/2026-08-05-par-univers.md", import.meta.url));

function lagRapport(vurderinger: ParVurdering[]): string {
  const rader = vurderinger
    .map((v) => {
      const vurdering = v.godkjent
        ? v.par === "XBTUSDC" || v.par === "ETHUSDC" || v.par === "SOLUSDC"
          ? "✅ Alltid med (live)"
          : "✅ GODKJENT"
        : "❌ Avvist";
      const aarsak = v.avvisningsgrunner.length > 0 ? v.avvisningsgrunner.join("; ") : "—";
      return `| ${v.par} | ${v.oosProfitFactor.toFixed(2)} | ${v.rangePct.toFixed(1)} % | ${v.ordreminUsdc.toFixed(2)} | ${vurdering} | ${aarsak} |`;
    })
    .join("\n");

  const godkjente = vurderinger.filter((v) => v.godkjent);
  const nye = godkjente
    .filter((v) => v.par !== "XBTUSDC" && v.par !== "ETHUSDC" && v.par !== "SOLUSDC")
    .sort((a, b) => b.oosProfitFactor - a.oosProfitFactor); // rangert etter OOS PF

  return `# Klarpakke Trading-Agent — Par-univers for live grid-utvidelse

**Dato:** 2026-08-05
**Kilde:** Kveldens grid-backtest (OOS PF, 30 % walk-forward) + live 24h-range og Kraken ordremin
**Filter (Task 3):** OOS PF ≥ 1,1 · 24h-range ≥ 2,5 % · ordremin × pris × 1,1 ≤ 8 USDC
**Regel:** XBT/ETH/SOL er ALLTID med (allerede live) — filteret gjelder kandidat-par for utvidelse

---

## 1. Filtrering

| Par | OOS PF | 24h-range | Ordremin USDC | Vurdering | Årsak |
|---|---|---|---|---|---|
${rader}

**Oppsummering:** ${godkjente.length} av ${vurderinger.length} par godkjent — ${nye.length} nye kandidater (${nye.map((v) => v.par).join(", ") || "ingen"}).

---

## 2. Konklusjon — 5-par-utvidelsen ved 250 USDC

**Kvalifiserte kandidater: ${nye.map((v) => v.par).join(", ")}** (${nye.length} stk).

Alle tre kandidatene passerer filteret med god margin på ordremin (${nye.map((v) => `${v.par} ${v.ordreminUsdc.toFixed(2)} USDC`).join(", ")} — langt under taket på 8 USDC). Med 250 USDC fordelt på 5 par (3 live + 2 nye) gir ~50 USDC per par plass til ~6 nivåer à ~8 USDC — godt dimensjonerbart gitt minste-ordre-verdiene over.

**Anbefalte 2 av 3 for 5-par-universet (rangert etter OOS PF):**
1. **${nye[0]?.par ?? "—"}** — høyest OOS PF blant kandidatene (${nye[0]?.oosProfitFactor.toFixed(2) ?? "—"}), 24h-range ${nye[0]?.rangePct.toFixed(1) ?? "—"} %.
2. **${nye[1]?.par ?? "—"}** — OOS PF ${nye[1]?.oosProfitFactor.toFixed(2) ?? "—"}, og den klart høyeste volatiliteten av alle kandidatene (24h-range ${nye[1]?.rangePct.toFixed(1) ?? "—"} %) — best egnet for grid-svingninger.
3. **Reserve: ${nye[2]?.par ?? "—"}** — kvalifiserer også, men ligger på volatilitetsterskelen (range ${nye[2]?.rangePct.toFixed(1) ?? "—"} % = nøyaktig 2,5 %) og er dermed mest sårbar for volatilitetsfall.

**Avviste par og årsak:**
- **LINK, DOGE** — sterk OOS PF (5,39 / 7,86), men 24h-range 2,0 % / 1,8 % < 2,5 %: for rolige for grid.
- **UNI, POL** — OOS PF god (2,43 / 22,14), men både range 1,0 % (umålt) < 2,5 % OG ordremin 20,02 / 15,84 USDC > 8 USDC: for store minsteordrer relativt til nåpris.
- **XBT** — range 1,8 % < 2,5 %, men alltid med (allerede live).

> **Neste steg (Task 4+):** bygg kandidat-parret inn i live grid-manageren (Kraken), verifiser ordreplassering på ADA/AVAX/DOT med ~50 USDC per par, og overvåk fills i 48 t før endelig utvidelse.

---

*Generert av Klarpakke Trading-Agent (Task 3 — par-kandidat-filter) — 2026-08-05.*
*Ren funksjon: \`src/lib/trading/par-kandidater.ts\` (TDD, 8 tester i \`src/lib/trading/__tests__/par-kandidater.test.ts\`).*
`;
}

function main(): void {
  const vurderinger = velgParKandidater(byggUnivers());

  console.log("PAR-KANDIDAT-FILTER (Task 3) — 2026-08-05");
  console.log("par       | OOS PF | range | ordreminUSDC | vurdering");
  console.log("----------|--------|-------|--------------|------------------");
  for (const v of vurderinger) {
    const status = v.godkjent ? "GODKJENT" : "AVVIST";
    console.log(
      `${v.par.padEnd(9)} | ${v.oosProfitFactor.toFixed(2).padStart(6)} | ${v.rangePct.toFixed(1).padStart(5)} % | ${v.ordreminUsdc.toFixed(2).padStart(12)} | ${status} ${v.avvisningsgrunner.join("; ")}`,
    );
  }

  mkdirSync(dirname(RAPPORT_FIL), { recursive: true });
  writeFileSync(RAPPORT_FIL, lagRapport(vurderinger), "utf8");
  console.log(`\nRapport skrevet: ${RAPPORT_FIL}`);
}

main();
