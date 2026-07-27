# FACT-AUDIT.md — Alle tall og påstander på klarpakke.no

> **Generert:** 2026-07-27 18:11 | **Sist oppdatert:** 2026-07-27 18:30
> **Deploy:** 05da9886d (verifisert live)
> **Regel:** Hvert tall på siten må kunne spores til en datakilde. Ingen unntak.

---

## 1. Avkastningstall

| # | Påstand | Status | Dato fikset | Commit |
|---|---|---|---|---|
| 1.1 | "+343% → +321% for våre beste brukere" | 🟢 **FIKSET** | 2026-07-27 | 09460dffc |
| 1.2 | Sketch-tall i arkitektur-spec | 🟢 **OK** — kun i .hermes/, ikke deployet | — | — |

---

## 2. Leaderboard

| # | Påstand | Status | Dato fikset | Commit |
|---|---|---|---|---|
| 2.1 | AI-genererte navn i leaderboard | 🟢 **FIKSET** — Anonymisert til `Trader***<uuid>` | 2026-07-27 | 05da9886d |
| 2.2 | Fake PnL i leaderboard | 🟢 **OK** — Underliggende handler er ekte (alle 11 har trades). Kun navn var problemet. | — | — |
| 2.3 | Verifisert-badge uten data | 🟢 **OK** — Badge er betinget (sjekker `trader.verified`), SocialProof er ikke deployet på noen side. | — | — |
| 2.4 | 37 ekte brukere | 🟢 **OK** | — | — |

---

## 3. Testimonials

| # | Påstand | Status | Dato fikset | Commit |
|---|---|---|---|---|
| 3.1 | "Marius L.", "Sigrid H." | 🟢 **FIKSET** — Fjernet fra JokerTradeLanding | 2026-07-27 | 09460dffc |

---

## 4. Teller-påstander

| # | Påstand | Status | Dato fikset | Commit |
|---|---|---|---|---|
| 4.1 | "100+ fornøyde studenter" | 🟢 **FIKSET** — Endret til "37+ norske brukere" | 2026-07-27 | 09460dffc |
| 4.2 | "65 000 kroner tapt" | 🟡 **PERSONLIG** — Toms historie, ikke markedsføringspåstand | — | — |
| 4.3 | "64 000 kr" gammel hero | 🟢 **OK** — Ikke i bruk på ny forside | — | — |

---

## 5. Live-verifisering (curl mot klarpakke.no)

| Test | Forventet | Faktisk | Status |
|---|---|---|---|
| `curl /en \| grep "+343%"` | Ingen treff | 0 treff | ✅ |
| `curl /en \| grep "+321%"` | +321% | +321% (×3) | ✅ |
| `curl /en \| grep "Marius L."` | 0 | 0 | ✅ |
| `curl /en/jokertrade \| grep "Sigrid H."` | 0 | 0 | ✅ |
| `curl /api/leaderboard \| grep "Anne Mo"` | False | False | ✅ |
| `curl /api/leaderboard \| python3` → names | Trader***XXXX | Trader***7734, Trader***4211, Trader***241e | ✅ |
| `curl / \| grep "Din personlige"` | "Din personlige" | "Din personlige" | ✅ |
| `curl / \| grep "64 000"` | Ingen treff | 0 treff | ✅ |

---

## Commit-historikk

```
05da9886d fix: leaderboard API — anonymiser AI-genererte display_name
09460dffc fix: FACT-AUDIT — fjernet falske tall og påstander  
5ca12f9eb feat: K3-arkitektur implementert — font-lasting, ny hero, mode-kort, i18n
```
