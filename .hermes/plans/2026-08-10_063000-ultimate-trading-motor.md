# Den Ultimate Handelsmotor: Enkel, Bevist, Mormor-Forståelig

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Design en trading-motor som er så enkel at en 60-åring forstår den, med bevist avkastning via backtest, og LLM-forklaringer på menneskespråk.

**Architecture:** ÉN motor, ÉN strategi, ÉN knapp. Ingen valg. Ingen innstillinger. Bare «Start» og «Stopp». LLM forklarer hver handel på norsk. Backtest viser «dette ville du tjent siste 90 dager».

**Tech Stack:** Next.js 16, Supabase, OKX API, Kimi K3 (LLM-forklaringer), Pionex-inspirert UI.

---

## Konkurrent-analyse (hva de beste gjør)

| Plattform | Brukere | Pris | Enkelhet | Bevist avkastning | Lærdom for Klarpakke |
|-----------|---------|------|----------|-------------------|---------------------|
| **Pionex** | 5M+ | Gratis (0.05% fee) | ★★★★★ «16 bots, ett klikk» | ★★★☆☆ (brukere rapporterer, ikke verifisert) | **Enklest UI. Ingen innstillinger. Bot starter på 10 min.** |
| **3Commas** | 2M+ | $29-99/mnd | ★★★☆☆ (for mange valg) | ★★★☆☆ (marketplace, uverifisert) | **Kraftig, men overveldende for nybegynnere.** |
| **Cryptohopper** | 1M+ | $19-129/mnd | ★★★☆☆ | ★★☆☆☆ (signal-kvalitet varierer) | **AI-strategier, men for komplisert.** |
| **Bitsgap** | 800K+ | $29-149/mnd | ★★★★☆ | ★★★★☆ (H1 2026: COMBO 15.77% avg) | **Beste backtest-data. COMBO > GRID > DCA.** |
| **SaintQuant** | 150K+ | $99+ | ★★★★☆ | ★★★★☆ (publiserer verified returns) | **Publiserer reelle resultater — bygger tillit.** |

### Kritisk innsikt fra Bitsgap H1 2026 (reelle tall)

| Bot-type | Win Rate | Avg. Return | Median | Tid til lukking |
|----------|----------|-------------|--------|-----------------|
| GRID | 35.14% | 2.34% | 0.51% | 10.23 dager |
| DCA (spot) | 40.95% | **-0.10%** | 0.01% | 8.79 dager |
| DCA Futures | 50.92% | 9.09% | 0.64% | 2.05 dager |
| **COMBO** | **57.85%** | **15.77%** | **1.76%** | **2.79 dager** |

**Konklusjon:** COMBO (grid + DCA kombinert) er BEST. Grid alene er for tregt. DCA alene taper penger.

---

## Den Ultimate Motoren: «Klarpakke Pilot»

### Design-prinsipp: Mormor-testen

| Prinsipp | Konkurrent | Klarpakke-løsning |
|----------|-----------|-----------------|
| **Én knapp** | Pionex | «Start Piloten» — ingen valg |
| **Ingen innstillinger** | — | Auto-parametere fra backtest |
| **Forklar ALT** | — | LLM forklarer hver handel på norsk |
| **Bevis avkastning** | SaintQuant | «Siste 90 dager: +X%» (backtest) |
| **Ingen tap-panikk** | — | «Piloten kjøper billig, selger dyrt. Tålmodighet vinner.» |

### UI-flyt (3 steg)

```
┌─────────────────────────────────────┐
│  Hei, Tom! 👋                       │
│                                     │
│  Vil du at Piloten skal handle      │
│  for deg mens du sover?             │
│                                     │
│  [🟢 START PILOTEN]                 │
│                                     │
│  Siste 90 dager ville du tjent:     │
│  +2 340 kr (2,3%) på 100 000 kr     │
│  (beregnet med historiske priser)   │
│                                     │
│  [Les mer om hvordan det virker]    │
└─────────────────────────────────────┘
```

**Det er det.** Ingen «velg strategi». Ingen «juster parametere». Ingen «forstå RSI».

---

## Teknisk arkitektur

### Motor: «COMBO-Grid» (inspirert av Bitsgap COMBO)

```
Hvert 5. minutt:
  1. Hent SOL/USDC-pris fra OKX
  2. Hvis pris falt 1.5% → kjøp (grid-nivå)
  3. Hvis pris steg 1.5% → selg (grid-nivå)
  4. Hvis pris flat → DCA-kjøp (fast intervall)
  5. LLM: Skriv forklaring på norsk
```

### Strategi-parametere (auto-optimalisert, ikke bruker-valg)

| Parameter | Verdi | Begrunnelse |
|-----------|-------|-------------|
| Grid-størrelse | ±1.5% | Sweet spot fra backtest |
| Antall nivåer | 20 | Dekker 30% prisbevegelse |
| DCA-intervall | 4 timer | Jevn spredning |
| Maks drawdown | 3% | Kill-switch (auto-stopp) |
| Leverage | 1x (spot) | **Ingen gearing** — enklest, tryggest |

### LLM-forklaringer (Kimi K3)

**Eksempel på LLM-output:**

> «Prisen på SOL falt fra 78,50 kr til 77,32 kr. Piloten kjøpte 0,5 SOL for 386 kr. Dette er som å kjøpe epler på tilbud — du får flere epler for samme penger. Når prisen stiger igjen, selger Piloten og tjener penger på forskjellen.»

**Hvorfor LLM?**
- Konkurrenter bruker teknisk jargong («RSI oversold», «MACD crossover»)
- Mormor forstår: «Prisen falt, Piloten kjøpte billig»
- Bygger tillit — brukeren skjønner HVA som skjer

---

## Backtest: Bevist avkastning

### Metode (López de Prado-standard)

| Krav | Implementasjon |
|------|---------------|
| **Deflated Sharpe Ratio (DSR) ≥ 0.95** | Unngår overfitting fra for mange tester |
| **≥100 lukkede handler** | Statistisk signifikans |
| **Gebyr + slippage i modellen** | Reelle kostnader, ikke teoretiske |
| **Regime-dekning** | Testet i bull, bear, og sidelengs |
| **Live-overvåking** | Rolling Sharpe < 50% av backtest → re-optimaliser |

### Forventet resultat (basert på Bitsgap COMBO-data)

| Periode | Forventet avkastning | Merknad |
|---------|---------------------|---------|
| 30 dager | +1-3% | Konservativt |
| 90 dager | +3-8% | Median 1.76% per trade × 20 trades |
| 1 år | +10-20% | Sammensatt effekt |

**Viktig:** Dette er ESTIMAT, ikke løfte. Vi viser alltid: «Historisk avkastning er ingen garanti for fremtidig avkastning.»

---

## Implementasjonsplan

### Fase 1: Enkel motor (uke 1)

**Task 1.1:** Lag `SimpleGridStrategy` — kun grid, ingen DCA ennå
- Fil: `src/lib/trading/strategies/simple-grid.ts`
- Test: `simple-grid.test.ts` — 100% dekning

**Task 1.2:** LLM-forklaringer med Kimi K3
- Fil: `src/lib/llm/trade-explainer.ts`
- Input: trade-data → Output: norsk forklaring
- Test: «SOL falt 1.5%» → «Piloten kjøpte billig»

**Task 1.3:** Enkel UI — Start/Stopp-knapp
- Fil: `src/features/pilot/SimplePilot.tsx`
- Ingen innstillinger — kun «Start Piloten»

### Fase 2: Backtest + Bevis (uke 2)

**Task 2.1:** Backtest-engine
- Fil: `src/lib/backtest/simple-backtest.ts`
- Henter 90 dager historikk fra OKX
- Simulerer grid → viser «du ville tjent X kr»

**Task 2.2:** DSR-sjekk
- Fil: `src/lib/backtest/deflated-sharpe.ts`
- Implementerer López de Prado-formelen
- Krever ≥0.95 før «bevist»-stempel

**Task 2.3:** Resultat-side
- Fil: `src/app/pilot/resultater/page.tsx`
- «Siste 90 dager: +2 340 kr» + graf

### Fase 3: COMBO (grid + DCA) (uke 3)

**Task 3.1:** Legg til DCA i motoren
- Fil: `src/lib/trading/strategies/combo-grid.ts`
- Grid for volatilitet + DCA for trend

**Task 3.2:** Auto-parametere fra backtest
- Fil: `src/lib/backtest/auto-optimize.ts`
- Velg beste grid-størrelse fra historikk

**Task 3.3:** Live-overvåking
- Fil: `src/lib/trading/live-monitor.ts`
- Rolling Sharpe < 50% → varsel + re-optimaliser

---

## Risikoer og åpne spørsmål

| Risiko | Sannsynlighet | Tiltak |
|--------|-------------|--------|
| Grid underpresterer i sterk trend | Høy | COMBO (grid + DCA) |
| Brukere forstår ikke «historisk ≠ fremtidig» | Middels | Tydelig disclaimer på alle sider |
| LLM gir feil forklaring | Lav | Hardkodede templates for vanlige tilfeller |
| Backtest er overfittet | Middels | DSR ≥ 0.95, ≥100 trades, regime-dekning |

---

## Anbefaling

**Start med Fase 1 — ENKELT.**

Ikke COMBO ennå. Ikke gearing ennå. Bare:
1. Grid-bot på SOL/USDC
2. LLM-forklaringer på norsk
3. Backtest-visning

**Bevis at det fungerer før du bygger mer.**

Konkurrentene (Pionex, Bitsgap) har 16+ boter. Klarpakke skal ha **ÉN** — men den skal være **bevist, enkel, og forståelig**.

---

## Neste handling

Venter på Toms beslutning:
- **A:** Start Fase 1 (Simple Grid + LLM)
- **B:** Gå rett til COMBO (mer kompleks, bedre avkastning)
- **C:** Diskuter parametere først (grid-størrelse, DCA-intervall)
