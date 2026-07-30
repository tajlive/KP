# Design-gjennomgang: Klarpakke sosiale profiler

**Dato:** 29. juli 2026
**Profiler:** linkedin.com/company/111340815/ · facebook.com/profile.php?id=61592276566006
**Brand:** bakgrunn `#0a0b0d` · blå `#0052ff` · lys blå `#3d7aff` · grønn `#34d399` · font Inter

---

## Vurderte filer

| Fil | Format | Rolle |
|---|---|---|
| `sjekk-linkedin-side.jpg` | 2880×1384 | Skjermbilde LinkedIn admin-visning |
| `sjekk-fb-side.jpg` | 2880×1384 | Skjermbilde FB-side |
| `klarpakke-logo-ny.png` | 600×600 | Profilbilde begge flater |
| `klarpakke-cover.png` | 1128×191 | LinkedIn-banner (og tilsynelatende gjenbrukt på FB) |
| `public/og-image.png` | 1200×630 | OG-bilde (deployet – ikke endret) |

---

## Hva som fungerer

1. **Logo i rund crop:** `klarpakke-logo-ny.png` er full-bleed (blå bakgrunn helt ut), så FBs runde beskjæring kutter bare hjørner uten å ødelegge noe. K-en står sentrert og tåler det. Ser bra ut både i stor FB-avatar og i 32px nav-avatar.
2. **Kontrast og lesbarhet i logo:** Hvit K på blå gradient har sterk kontrast. Candlestick-detaljen i K-benen er lesbar ned til middels størrelser.
3. **Konsistent grafisk språk:** Blå gradient + svakt candlestick-motiv går igjen i cover og OG-bilde — god merkevarekonsistens.
4. **LinkedIn-bannerets budskap:** Tydelig hovedlinje + forklarende underlinje. Kontrasten er god.
5. **OG-bildets budskaps-hierarki:** Logo + navn, tagline, grønn GRATIS BETA-chip og faktalinje er ryddig strukturert.

## Problemer (prioritert)

### P1 — FB-forsidebilde fungerer ikke (fikset: `fb-cover.png`)
FB-banneret på siden fremstår som en tynn, nesten helt mørk stripe uten synlig innhold. Årsaken er format-mismatch: `klarpakke-cover.png` er 1128×191 (5,9:1), mens FBs forsidebilde-ramme er 820×312 (2,6:1). FB skalerer/beskjærer bildet til rammen, og alt budskap forsvinner.
**Løsning:** Nytt dedikert `fb-cover.png` i 820×312 med sentrert komposisjon. Alt kritisk innhold (logo, headline, badge, domene) ligger i midtre/sentrert sone — bunn-venstre hjørne er fritt for innhold slik at FBs runde profilbilde-overlapp ikke dekker noe.

### P2 — LinkedIn-banner: teksten tetter mot logo-overlappssonen (fikset: `linkedin-cover-v2.png`)
På skjermbildet av admin-visningen dekker logo-boksen venstre del av banneret, og «AI-drevet…» er delvis skjult bak logoen. Dagens tekstpanel starter ved x≈382 av 1128 — for langt til venstre. I smalere visninger (admin, mobil) vokser overlappssonen og kan dekke 2–3 tegn til.
**Løsning:** `linkedin-cover-v2.png` flytter panel og tekst til x≥440 — klart av logo-sonen (~0–400px). Venstre tredjedel har kun gradient + svakt chart-motiv, som tåler å ligge bak logoen uten informasjonstap.

### P3 — OG-bilde: tekstkollisjon nederst (IKKE fikset — deployet fil)
I `public/og-image.png` nederst kolliderer «Paper trading» og «klarpakke.no» visuelt: «Paper trading**klarpakke.no**» står uten mellomrom på samme linje. Filen er deployet og ble ikke rørt per instruks. Anbefaler å flytte `klarpakke.no` til egen posisjon (f.eks. høyrejustert med margin, eller opp på linjen over) i en fremtidig v2.

### P4 — Småting (ingen handling nødvendig)
- **Logo-wordmark i mini-størrelse:** «KLARPAKKE»-teksten nederst i logoen blir uleselig under ~48px. K-en bærer identiteten alene — akseptabelt, men vurder en ren K-variant (uten wordmark) som favicon/app-ikon.
- **FB bryter navnet:** «Klarpakk / e» på to linjer er FBs egen layout i smal kolonne — ikke et asset-problem, ingenting å gjøre.

## Nye filer

| Fil | Format | Formål |
|---|---|---|
| `fb-cover.png` | 820×312 | FB-forsidebilde. Sentrert: logo-chip, headline «AI-drevet trading for norske småsparere», faktalinje (gratis beta · 100 000 kr lekepenger · autonome AI-agenter), grønn GRATIS BETA-chip + klarpakke.no. Fri sone nede til venstre for profilbilde-overlapp. |
| `linkedin-cover-v2.png` | 1128×191 | LinkedIn-banner med innhold flyttet til høyre for logo-overlappssonen. Samme gradient/chart-språk som dagens. |

Begge er generert med Inter (SemiBold/Bold/Regular), brand-gradient samplet fra eksisterende cover (`#0a64be` → `#0c2e60`), 2x supersampling for skarp tekst, og verifisert visuelt etter lagring.

---

## Mal for post-bilder fremover (1200×627 LinkedIn / 1200×630 FB)

Lag én malfil i 1200×630 — den fungerer på begge plattformer (LinkedIn beskjærer 3px i høyden, ubetydelig).

**Layout (alle mål i px på 1200×630):**

```
┌──────────────────────────────────────────────────┐
│ [K-logo 64×64]  KLARPAKKE          (margin 80)   │  ← toppbånd, y≈70
│                                                  │
│ HOVEDBUDSKAP — maks 2 linjer, Inter Bold 56–64   │  ← midt-venstre, x=80, y≈240
│ Kort støttelinje, Inter Regular 28, #cfe0ff      │
│                                                  │
│ [GRATIS BETA-chip]  én fakta-chip, grønn #34d399 │  ← y≈440, valgfri
│                                                  │
│ JokerTrade · Autonome AI-agenter   klarpakke.no  │  ← bunnlinje y≈560, 24px
└──────────────────────────────────────────────────┘
```

**Regler:**
1. **Bakgrunn:** alltid brand-gradient (`#0a64be` → `#0c2e60`, mørkere mot bunn) + svakt candlestick-motiv (alpha ≤ 12 %) nederst. Aldri hvit bakgrunn.
2. **Étt budskap per bilde.** Maks 2 linjer headline. Post-teksten bærer resten.
3. **Kun verifiserbare fakta:** gratis beta, 100 000 kr lekepenger (JokerTrade), autonome AI-agenter, paper trading på ekte markedsdata, 5000 gratis KLT til de 100 første.
4. **Margins 80px** på alle sider — aldri tekst nær kanten (plattformene beskjærer ulikt i feed/mobil).
5. **Domene `klarpakke.no`** alltid med, egen posisjon bunn-høyre — aldri limt mot annen tekst (jf. P3).
6. **Kontrast:** hvit eller `#cfe0ff` tekst på mørk gradient; grønn `#34d399` kun til chips/CTA-accent, aldri som løpende tekst.
7. **Font:** Inter Bold til headline, Inter Regular til støttetekst. Minste tekst 24px — alt under blir uleselig i mobil-feed.
