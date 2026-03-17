# Sjekkliste: Nåværende plan (sider, tekster, knapper)

Bruk denne listen for å sikre at alle sider, tekster og knapper følger gjeldende produktplan.

**Kilde:** `docs/product-principles-2026.md`, `docs/PRICING.md`, `src/lib/pricing/tiers.ts`, `AGENTS.md`

---

## 1. Tier-navn (bruk overalt)

| Slug     | Visningsnavn |
|----------|----------------|
| student  | Student        |
| bachelor | Bachelor       |
| master   | Master         |
| phd      | PhD            |
| professor| Professor      |

- **Ikke bruk:** Pro, Elite, Gratis (som plannavn), BETA (som tier), Starter, PRO.
- **Gratis:** Kun som beskrivelse for Student (f.eks. "Student (Gratis)").

---

## 2. Navigasjon og lenker

| Handling        | Rute              | Merknad                    |
|----------------|-------------------|----------------------------|
| Registrer / Start gratis | `/[locale]/signup` | Ikke `/beta/apply` som hoved-CTA |
| Logg inn       | `/[locale]/innlogging` | |
| Priser         | `/[locale]/priser` | |
| Lær / Kurs     | `/[locale]/kurs` eller `/akademi` | |
| Handle (paper) | `/[locale]/paper-trading` | |
| Auto-trade / Bots | `/[locale]/dashboard/auto-trade` | Bots i toppnav → redirect hit |
| Min side       | `/[locale]/dashboard` | |

---

## 3. Knapper og CTA

- **Gratis start:** "Start gratis" → `/signup` (eller "Registrer" der det passer).
- **Betalende plan:** "Velg plan" → `/priser` eller checkout.
- **Oppgrader:** "Oppgrader til [Bachelor/Master/PhD/Professor]" med tier-navn, ikke "Pro" eller "Elite".

---

## 4. Prisintervall i copy

- Bachelor 249 kr, Master 499 kr, PhD 999 kr, Professor 1 999 kr (fra `tiers.ts`).
- Ved "månedlig pris" eller sammenligning: "249–1 999 kr" eller "Fra 249 kr/mnd".

---

## 5. Lenker som skal peke på signup (ikke beta/apply)

- Mobilmeny "Start gratis" / signup
- Enkle landingssider (CTA)
- Studieprogram CTA
- Lotto-/kalkulator-CTA med locale: `/${locale}/signup`

---

## 6. Beta

- `/beta/apply` er egen kampanje/onboarding; bruk der det er bevisst "beta"-registrering.
- Hovedflyt for ny bruker: **Registrer** → `/[locale]/signup`.

---

## Andre runde (full sjekk)

- **Registrer/signup:** `/registrer` redirecter til `/signup` (page). Robots/auth-guard har `/registrer` i liste – OK.
- **beta/apply:** Brukes bevisst i beta-kampanje (BetaApplyClient, BetaDashboardClient, referral). Hoved-CTA (mobilmeny, landingsider) peker nå på `/signup`.
- **PRO/Elite/Starter:** Brukervendt copy rettet (PRO-strategier → avanserte strategier, AI-prompt tier-navn). "PRO" i kode: Perplexity PRO (API), PROFIT (e-post), PRESET_PROFILES (variabelnavn) – beholdt. "Starter..." på knapper = norsk "Starting..." – OK.
- **Tier-visning:** `getTierDisplayName` i `types/subscription.ts` bruker Student/Bachelor/Master/PhD/Professor – korrekt. Legacy `lib/subscription.ts` (gratis/basis/komplett/pro) brukes i andre deler av systemet – ikke endret.
- **Metadata og beta-pris:** `messages/no/metadata.json` og `no.json` metadata: fjernet "Beta-pris: 249 kr (var 499 kr). Kun 50 plasser." → "Student gratis, Bachelor fra 249 kr/mnd." FinalCTASection og SocialProofSection: "Beta-priser..." erstattet med plan-aligned copy.
- **100 000 kr:** Brukes konsekvent som standard lekepenger – i tråd med plan. Ikke endret.

*Sist oppdatert: mars 2026.*
