# Klarpakke Trading-Agent — Par-univers for live grid-utvidelse

**Dato:** 2026-08-05
**Kilde:** Kveldens grid-backtest (OOS PF, 30 % walk-forward) + live 24h-range og Kraken ordremin
**Filter (Task 3):** OOS PF ≥ 1,1 · 24h-range ≥ 2,5 % · ordremin × pris × 1,1 ≤ 8 USDC
**Regel:** XBT/ETH/SOL er ALLTID med (allerede live) — filteret gjelder kandidat-par for utvidelse

---

## 1. Filtrering

| Par | OOS PF | 24h-range | Ordremin USDC | Vurdering | Årsak |
|---|---|---|---|---|---|
| XBTUSDC | 8.30 | 1.8 % | 3.57 | ✅ Alltid med (live) | — |
| ETHUSDC | 9.91 | 3.8 % | 2.11 | ✅ Alltid med (live) | — |
| SOLUSDC | 6.61 | 2.2 % | 4.92 | ✅ Alltid med (live) | — |
| ADAUSDC | 4.49 | 5.2 % | 4.18 | ✅ GODKJENT | — |
| AVAXUSDC | 3.03 | 2.5 % | 3.69 | ✅ GODKJENT | — |
| DOTUSDC | 4.55 | 2.9 % | 3.65 | ✅ GODKJENT | — |
| LINKUSDC | 5.39 | 2.0 % | 4.96 | ❌ Avvist | 24h-range 2.0 % er under kravet 2.5 % |
| DOGEUSDC | 7.86 | 1.8 % | 3.87 | ❌ Avvist | 24h-range 1.8 % er under kravet 2.5 % |
| UNIUSDC | 2.43 | 1.0 % | 20.02 | ❌ Avvist | 24h-range 1.0 % er under kravet 2.5 %; ordremin 20.02 USDC er over taket 8.00 USDC |
| POLUSDC | 22.14 | 1.0 % | 15.84 | ❌ Avvist | 24h-range 1.0 % er under kravet 2.5 %; ordremin 15.84 USDC er over taket 8.00 USDC |

**Oppsummering:** 6 av 10 par godkjent — 3 nye kandidater (DOTUSDC, ADAUSDC, AVAXUSDC).

---

## 2. Konklusjon — 5-par-utvidelsen ved 250 USDC

**Kvalifiserte kandidater: DOTUSDC, ADAUSDC, AVAXUSDC** (3 stk).

Alle tre kandidatene passerer filteret med god margin på ordremin (DOTUSDC 3.65 USDC, ADAUSDC 4.18 USDC, AVAXUSDC 3.69 USDC — langt under taket på 8 USDC). Med 250 USDC fordelt på 5 par (3 live + 2 nye) gir ~50 USDC per par plass til ~6 nivåer à ~8 USDC — godt dimensjonerbart gitt minste-ordre-verdiene over.

**Anbefalte 2 av 3 for 5-par-universet (rangert etter OOS PF):**
1. **DOTUSDC** — høyest OOS PF blant kandidatene (4.55), 24h-range 2.9 %.
2. **ADAUSDC** — OOS PF 4.49, og den klart høyeste volatiliteten av alle kandidatene (24h-range 5.2 %) — best egnet for grid-svingninger.
3. **Reserve: AVAXUSDC** — kvalifiserer også, men ligger på volatilitetsterskelen (range 2.5 % = nøyaktig 2,5 %) og er dermed mest sårbar for volatilitetsfall.

**Avviste par og årsak:**
- **LINK, DOGE** — sterk OOS PF (5,39 / 7,86), men 24h-range 2,0 % / 1,8 % < 2,5 %: for rolige for grid.
- **UNI, POL** — OOS PF god (2,43 / 22,14), men både range 1,0 % (umålt) < 2,5 % OG ordremin 20,02 / 15,84 USDC > 8 USDC: for store minsteordrer relativt til nåpris.
- **XBT** — range 1,8 % < 2,5 %, men alltid med (allerede live).

> **Neste steg (Task 4+):** bygg kandidat-parret inn i live grid-manageren (Kraken), verifiser ordreplassering på ADA/AVAX/DOT med ~50 USDC per par, og overvåk fills i 48 t før endelig utvidelse.

---

*Generert av Klarpakke Trading-Agent (Task 3 — par-kandidat-filter) — 2026-08-05.*
*Ren funksjon: `src/lib/trading/par-kandidater.ts` (TDD, 8 tester i `src/lib/trading/__tests__/par-kandidater.test.ts`).*
