# KIMI OPPGAVE: Sprint 11 — Fiks ALLE i18n-stubs (Issue #16)

> **Les denne filen i sin helhet før du gjør noe.**
> Sist oppdatert: 2026-02-19

---

## 🎯 MÅL

Fiks alle ufullstendige i18n-namespace-filer slik at:
1. **Ingen `t('nøkkel')` kall i kildekoden mangler tilsvarende nøkkel** i JSON-filen
2. **Alle 4 språk finnes** og har identiske nøkkel-strukturer: `no`, `en`, `th`, `zh`
3. **CI-bygget passerer** (ingen manglende nøkler som bryter next-intl)

---

## 📜 ABSOLUTTE REGLER

- **ALDRI** lag opp nøkler med tom string `""` — skriv ekte oversatt tekst
- **ALDRI** slett eksisterende nøkler
- **ALLTID** bruk samme JSON-struktur (flat eller nestet) som allerede finnes i filen
- **ALLTID** push via MCP `push_files` — IKKE commit enkeltvis
- Grupper alle filer for ett språk i én `push_files`-kall
- Thai (`th`) og kinesisk (`zh`) må være ekte oversettelse, ikke latin/engelsk fallback
- Etter alle pushes: rapporter nøyaktig hvilke filer som ble oppdatert og hvilke nøkler som ble lagt til

---

## 🛠️ STEG-FOR-STEG ARBEIDSFLYT

### STEG 1: Les alle stubb-filer i `no`

Les følgende filer fra `messages/no/` (lav byte-telling = sannsynlig stub):

```
tradeHistory.json     (~83 bytes)
leagues.json          (~114 bytes)
pricing.json          (~138 bytes)
interestTest.json     (~146 bytes)
hero.json             (~171 bytes)
learning.json         (~256 bytes)
liveTrading.json      (~305 bytes)
orderHistory.json     (~316 bytes)
payment.json          (~341 bytes)
studieprogram.json    (~343 bytes)
gamification.json     (~383 bytes)
competition.json      (~399 bytes)
common.json           (~400 bytes)
binanceGuide.json     (~436 bytes)
contact.json          (~639 bytes)
```

For HVER fil: noter alle eksisterende nøkler.

---

### STEG 2: Les tilhørende kildekode-sider

For HVERT namespace, les kildefilen og finn alle `t('...')` og `useTranslations('namespace')` kall.

| Namespace | Kildefil(er) å lese |
|---|---|
| `tradeHistory` | `src/app/[locale]/handelshistorikk/page.tsx` |
| `leagues` | `src/app/[locale]/leagues/page.tsx` |
| `pricing` | `src/app/[locale]/priser/page.tsx`, `src/app/[locale]/pricing/page.tsx` |
| `interestTest` | `src/app/[locale]/interessetest/page.tsx` |
| `hero` | `src/components/hero/` eller `src/app/[locale]/(landing)/` |
| `learning` | `src/app/[locale]/akademi/page.tsx`, `src/app/[locale]/kurs/page.tsx` |
| `liveTrading` | `src/app/[locale]/live-trading/page.tsx` |
| `orderHistory` | `src/app/[locale]/handelshistorikk/` |
| `payment` | `src/app/[locale]/checkout/page.tsx`, `src/app/[locale]/vipps/page.tsx` |
| `studieprogram` | `src/app/[locale]/studieprogram/page.tsx` |
| `gamification` | `src/app/[locale]/leaderboard/page.tsx`, `src/components/gamification/` |
| `competition` | `src/app/[locale]/leagues/page.tsx`, `src/components/competition/` |
| `common` | Alle komponenter som bruker `useTranslations('common')` |
| `binanceGuide` | `src/app/[locale]/binance-guide/page.tsx` |
| `contact` | `src/app/[locale]/kontakt/page.tsx` |

**Hvis kildefilen ikke eksisterer på den angitte stien:** søk med `search_code` etter `useTranslations('<namespace>')` i repoet.

---

### STEG 3: Identifiser manglende nøkler

For hvert namespace: sammenlign nøklene fra kildekoden mot nøklene i `messages/no/<namespace>.json`.

Lag en liste:
```
[namespace] mangler: ['nøkkel1', 'nøkkel2', ...]
```

Hvis ingen mangler: skriv `[namespace] OK — ingen mangler`.

---

### STEG 4: Opprett komplett innhold for ALLE 4 språk

For hvert namespace MED mangler (eller som er for sparsom):

1. Bygg komplett JSON med **eksisterende nøkler beholdt** + **manglende nøkler lagt til**
2. Oversett til alle 4 språk:
   - `no` — Norsk (bokmål)
   - `en` — Engelsk
   - `th` — Thai (faktisk thai-skrift, eks: สัญญาณ)
   - `zh` — Forenklet kinesisk (faktisk kinesisk skrift, eks: 交易信号)

**Eksempel på korrekt utfylling for `tradeHistory`:**

```json
// messages/no/tradeHistory.json
{
  "title": "Handelshistorikk",
  "subtitle": "Din komplette trading-historikk",
  "noTrades": "Ingen handler ennå",
  "date": "Dato",
  "pair": "Par",
  "side": "Side",
  "buy": "Kjøp",
  "sell": "Salg",
  "entryPrice": "Inngangs-kurs",
  "exitPrice": "Utgangs-kurs",
  "quantity": "Mengde",
  "pnl": "P&L",
  "pnlPct": "P&L %",
  "mode": "Modus",
  "paper": "Papir",
  "live": "Live",
  "strategy": "Strategi",
  "status": "Status",
  "open": "Åpen",
  "closed": "Lukket",
  "exportCsv": "Eksportér CSV",
  "filterAll": "Alle",
  "filterPaper": "Kun papir",
  "filterLive": "Kun live",
  "totalPnl": "Total P&L",
  "winRate": "Vinnrate",
  "totalTrades": "Antall handler"
}
```

---

### STEG 5: Push per språk

Etter at innholdet er klart for alle namespaces:

**Push 1:** Alle oppdaterte filer i `messages/no/` i én commit
```
Message: "fix(i18n/no): fyll ut ufullstendige namespace-filer [Sprint 11]"
```

**Push 2:** Alle oppdaterte filer i `messages/en/` i én commit
```
Message: "fix(i18n/en): fyll ut ufullstendige namespace-filer [Sprint 11]"
```

**Push 3:** Alle oppdaterte filer i `messages/th/` i én commit
```
Message: "fix(i18n/th): fyll ut ufullstendige namespace-filer [Sprint 11]"
```

**Push 4:** Alle oppdaterte filer i `messages/zh/` i én commit
```
Message: "fix(i18n/zh): fyll ut ufullstendige namespace-filer [Sprint 11]"
```

---

### STEG 6: Oppdater KIMI.md

Etter fullført push av alle 4 språk:

1. Les `.kimi/KIMI.md`
2. Oppdater sprint-oversikten:

```markdown
| Sprint 11 | ✅ Ferdig | `strategy-runner` EF + signal/position/push implementations + i18n komplett |
```

3. Oppdater `> Sist oppdatert:` til `2026-02-19 (v3.1 — Sprint 11 fullført)`
4. Push `.kimi/KIMI.md` med message: `docs(kimi): oppdater sprint-oversikt til Sprint 11 ferdig`

---

### STEG 7: Lukk Issue #16

Legg til kommentar på Issue #16:

```
✅ Sprint 11 i18n-fix fullført.

Alle namespace-filer < 700 bytes er gjennomgått og oppdatert i alle 4 språk (no, en, th, zh).
Manglende nøkler identifisert via kildekode-analyse og lagt til.

Oppdaterte filer:
[liste filene her]

CI-bygget bør nå passere uten manglende i18n-nøkler.
```

---

## ⚠️ FEILHÅNDTERING

| Problem | Løsning |
|---|---|
| Kildefil finnes ikke på forventet sti | Søk med `search_code` etter `useTranslations('<namespace>')` |
| Nestet JSON-struktur i eksisterende fil | Bruk SAMME nesting i alle språk |
| `th`/`zh`-mappe mangler filen helt | Opprett ny fil med `push_files` |
| `push_files` feiler på SHA-konflikt | Les filen på nytt før push for å få korrekt SHA |
| Namespace brukes ikke i noen kildefil | Behold eksisterende nøkler, legg til rimelige placeholders |

---

## 📋 SJEKKLISTE FØR DU ER FERDIG

- [ ] Alle 15 namespace-filer er gjennomgått i `no`
- [ ] Alle identifiserte mangler er fylt ut i `no`, `en`, `th`, `zh`
- [ ] Ingen nøkler har tom string `""`
- [ ] Thai-tekst er faktisk thai-skrift
- [ ] Kinesisk tekst er faktisk forenklet kinesisk
- [ ] 4 push-commits er gjort (en per språk)
- [ ] KIMI.md er oppdatert med Sprint 11 ✅
- [ ] Issue #16 har avslutningskommentar
- [ ] Rapport: hvilke filer ble endret, hvilke nøkler ble lagt til per fil

---

## 🚀 START HER

Begynn med STEG 1: les alle 15 stubb-filer fra `messages/no/` via MCP `get_file_contents`.
Deretter STEG 2: les tilhørende kildekode for hvert namespace.
NOTA: ikke anta — les alltid før du skriver.
