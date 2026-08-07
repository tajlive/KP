# Klarpakke Infrastruktur-kostnader

> Faktiske tall — verifisert mot Stripe + Moonshot + DeepSeek dashboards. Juli 2026.

---

## Totalt — $559/mnd ($6,708/år)

| Plattform           | Månedlig | Andel |
| ------------------- | -------- | ----- |
| Kimi Vivace         | $199     | 36%   |
| Kimi API (Moonshot) | $178     | 32%   |
| Kimi Extra Usage    | $80      | 14%   |
| DeepSeek            | $72      | 13%   |
| Supabase Pro        | $25      | 4%    |
| CF Workers Paid     | $5       | 1%    |
| **Totalt**          | **$559** |       |

---

## Kimi API — Moonshot dashboard ($5.93/dag)

| Produkt              | Daglig         | Månedlig |
| -------------------- | -------------- | -------- |
| auto-caching         | $3.94          | $118     |
| prompt (input)       | $1.42          | $43      |
| completion           | $0.57          | $17      |
| Vivace abb.          | $6.63          | $199     |
| Extra usage (Stripe) | —              | $80      |
| **Sum Kimi**         | **$12.56/dag** | **$457** |

Tokenforbruk: ~1.5M input + ~0.14M output per dag. Helt normalt.

---

## DeepSeek ($72/mnd)

| Dato       | Beløp | Metode |
| ---------- | ----- | ------ |
| 2026-07-30 | $20   | PayPal |
| 2026-07-29 | $2    | PayPal |
| 2026-07-26 | $10   | Card   |
| 2026-07-12 | $20   | Card   |
| 2026-07-08 | $10   | Card   |
| 2026-07-07 | $10   | Card   |

---

## Infrastruktur ($30/mnd)

| Plattform       | Pris | Bruksgrad |
| --------------- | ---- | --------- |
| Supabase Pro    | $25  | ~25%      |
| CF Workers Paid | $5   | ~15%      |
| GitHub Free     | $0   | ~10%      |

---

## Optimalisering — potensiell besparelse $227/mnd

| Tiltak                                | Nå             | Etter    | Spar      |
| ------------------------------------- | -------------- | -------- | --------- |
| Kortere samtaler (/new oftere)        | $118/mnd cache | $30      | -$88      |
| Flytt rutinekall Kimi→DeepSeek        | $178/mnd       | $50      | -$128     |
| DeepSeek auto-topup (slutt $2/$10 tx) | —              | —        | —         |
| CF Workers AI (gratis)                | $0             | $0       | —         |
| **Mål**                               | **$457**       | **$230** | **-$227** |

---

## Oppsummering

- **Nå:** $559/mnd ($6,708/år)
- **Etter optimalisering:** $330/mnd ($3,960/år)
- **Besparelse:** $227/mnd ($2,724/år)
