---
name: klarpakke-fact-audit
description: Use when auditing Klarpakke money-model bugs.
version: 1.0.0
author: Hermes Agent
whenToUse: Når bruker ber om revisjon av pengemodell-feil eller datakvalitet.
---

# Klarpakke FACT-AUDIT — pengebeløp & dataflyt

## 1. Konsument-sveip

Finn og klassifiser ALLE forbrukere av et datafelt:

```bash
rg -n "feltnavn" src/ -l | sort
```

| Klasse | Kriterium | Handling |
|--------|-----------|----------|
| (a) Per-sesjon OK | Labelt, ikke overskrift | Behold |
| (b) Rutes til konto | Overskrift/KPI | Bytt til `paper_accounts` |
| (c) Fjernet | Hardkodet feil | Fjern |

Prioritet: e-post og cron først.

---

## 2. Paper-accounts P/L

`paper_accounts` er eneste kilde for ALLE overskriftsbeløp:
```
konto-P/L = current_balance − initial_balance
konto-% = (current_balance − initial_balance) / initial_balance × 100
```

Σ sesjon-PnL på tvers er meningsløs (89 sesjoner med 8,2M printet kapital).

---

## 3. React pitfalls

**Framer Motion `m.div` + `<a>`:** `m.div` med `initial/animate` fanger klikk. Fiks: `<Link prefetch={false}>` som wrapper av hele kortet.

**Stale state:** `setState(x); fn(state)` i samme tick = gammel verdi. Fiks: `const v = ...; setState(v); fn(v)`.

**i18n namespace:** `useTranslations("portfolio")` → root.nav-meny, nøkler under `dashboard.portfolio`. Fiks: fullt kvalifisert `useTranslations("dashboard.portfolio")`.

---

## 4. Verifikasjon

1. SQL → fasit
2. `curl /api/leaderboard` → seed-boter ekskludert?
3. `curl` landing → hero korrekt?
4. Innloggede skjermbilder
5. `bash scripts/deploy.sh`

---

## 5. Hero: beslutningsregel

1. Beregn `(current-initial)/initial*100`
2. Ekskluder BOT_NAMES + test + trades<1
3. Sorter på return_pct DESC
4. Vis KUN hvis ≥20%, ellers generisk subtitle
