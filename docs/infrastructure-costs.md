# Klarpakke Infrastruktur-kostnader

> Sist oppdatert: 2026-08-07. Faktiske tall fra Stripe + Moonshot + DeepSeek dashboards.

---

## Totalkostnad — faktisk juli 2026

| Plattform               | Fast/mnd | API/dag | **Faktisk juli** | **Estimert/mnd** |
| ----------------------- | -------- | ------- | ---------------- | ---------------- |
| **Kimi API (Moonshot)** | —        | $41.50  | ~$1,245          | **$1,245**       |
| **Kimi Vivace**         | $199     | —       | $199             | **$199**         |
| **DeepSeek API**        | —        | ~$2.40  | ~$72             | **~$72**         |
| **Supabase Pro**        | $25      | —       | $25              | **$25**          |
| **Cloudflare Workers**  | $5       | —       | $5               | **$5**           |
| **GitHub**              | $0       | —       | $0               | **$0**           |
| **Totalt**              | **$229** |         |                  | **~$1,546/mnd**  |

**Årlig: ~$18,550**

---

## Kimi API — Moonshot dashboard (daglig)

| Produkt              | Type            | Daglig     | Månedlig   | Andel |
| -------------------- | --------------- | ---------- | ---------- | ----- |
| **auto-caching**     | Context Caching | **$27.60** | $828       | 56%   |
| prompt               | Input tokens    | $9.93      | $298       | 20%   |
| completion           | Output tokens   | $3.97      | $119       | 8%    |
| Kimi Vivace          | Abonnement      | $6.63      | $199       | 13%   |
| Extra usage (Stripe) | Overforbruk     | —          | $50        | 3%    |
| **Sum Kimi**         |                 | **$48.13** | **$1,494** |       |

> **auto-caching er 56% av API-kostnaden.** Hver Hermes-samtale med 100K+ tokens kontekst lagres i cache og faktureres per time.

### Token-estimat (K2.7 Code: $0.95/$4.00/$0.19)

- Input: $9.93/dag ÷ $0.95 = **~10.5M tokens/dag**
- Output: $3.97/dag ÷ $4.00 = **~1.0M tokens/dag**
- Cache lagret: $27.60/dag ÷ $0.19 = **~145M tokens/dag**

---

## DeepSeek API — betalingshistorikk

| Dato           | Beløp      | Metode | Status     |
| -------------- | ---------- | ------ | ---------- |
| 2026-07-30     | $20.00     | PayPal | ✅ Success |
| 2026-07-29     | $2.00      | PayPal | ✅ Success |
| 2026-07-26     | $10.00     | Card   | ✅ Success |
| 2026-07-12     | $20.00     | Card   | ✅ Success |
| 2026-07-08     | $10.00     | Card   | ✅ Success |
| 2026-07-07     | $10.00     | Card   | ✅ Success |
| **Juli total** | **$72.00** |        |            |

> Flere forsøk på $2/$10 ble kansellert (kort avvist). Bruker nå PayPal.

### Token-estimat (V4 Pro: $0.435/$0.87)

- $72/mnd ÷ $0.435-0.87 ≈ **~5M input + 1M output per dag**

---

## Kimi Stripe — betalingshistorikk

| Dato           | Type        | Beløp    |
| -------------- | ----------- | -------- |
| 2026-07-31     | Vivace      | $199.00  |
| 2026-07-31     | Extra Usage | $20.00   |
| 2026-07-30     | Extra Usage | $20.00   |
| 2026-07-30     | Extra Usage | $20.00   |
| 2026-07-26     | Extra Usage | $10.00   |
| 2026-07-22     | Allegro     | $99.00   |
| 2026-07-22     | Extra Usage | $10.00   |
| 2026-07-17     | Allegretto  | $39.00   |
| 2026-06-11     | Allegro     | $99.00   |
| 2026-06-06     | Allegretto  | $39.00   |
| **Juli total** |             | **$417** |

---

## Kostnadsoptimalisering

### 🔴 P0: Eliminer auto-caching ($828/mnd — 56% av totalen)

**Hvorfor:** Hver Hermes-samtale med stor kontekst lagres i Kimi cache. Ved 145M tokens/dag i cache tilsvarer dette ~560 fulle 256K-kontekster lagret samtidig.

| Tiltak                                                  | Besparelse    |
| ------------------------------------------------------- | ------------- |
| `/new` oftere — ikke la samtaler vokse til 100K+ tokens | -$15-20/dag   |
| Deaktiver caching for samtaler < 10K tokens             | -$5-10/dag    |
| **Mål:** $27.60/dag → $5/dag                            | **-$675/mnd** |

### 🟡 P1: Flytt volum til DeepSeek ($72/mnd vs $1,245/mnd)

DeepSeek V4 Pro er **2.2x billigere input og 4.6x billigere output** enn Kimi K2.7 Code. Cache hits: $0.0036 vs $0.19 (53x).

| Tiltak                                                   | Besparelse    |
| -------------------------------------------------------- | ------------- |
| Rutinekall → DeepSeek, K3 kun til tung analyse           | -$5-10/dag    |
| Enable DeepSeek context caching ($0.0036/M tok)          | -$3-5/dag     |
| **Mål:** $41.50/dag → $15/dag (Kimi) + $5/dag (DeepSeek) | **-$645/mnd** |

### 🟢 P2: Gratis tjenester du ikke bruker

- GitHub Actions CI/CD — auto-deploy (2000 min/mnd)
- Supabase Realtime — live UI (500 conn)
- CF Workers AI — gratis edge-AI

---

## Projeksjon

| Scenario                     | Kimi API | DeepSeek | Totalt/mnd | Årlig   |
| ---------------------------- | -------- | -------- | ---------- | ------- |
| **Nå**                       | $1,494   | $72      | **$1,546** | $18,552 |
| **P0** (cache fix)           | $750     | $72      | **$1,051** | $12,612 |
| **P0+P1** (cache + DS shift) | $300     | $150     | **$679**   | $8,148  |
| **Mål**                      | $200     | $150     | **$579**   | $6,948  |

**Potensiell årlig besparelse: $11,604**

---

## Oppsummering

| Plattform     | Mnd        | Årlig       | %   |
| ------------- | ---------- | ----------- | --- |
| Kimi API      | $1,245     | $14,940     | 81% |
| Kimi Vivace   | $199       | $2,388      | 13% |
| DeepSeek      | $72        | $864        | 5%  |
| Supabase + CF | $30        | $360        | 2%  |
| **Totalt**    | **$1,546** | **$18,552** |     |

**$1,546/mnd = ~15,500 kr/mnd.** Auto-caching alene koster $828/mnd — mer enn husleien til et serverrom.

Skal jeg begynne å optimalisere? Første steg: umiddelbar reduksjon av auto-caching ved kortere samtaler og trimming av system-prompts.
