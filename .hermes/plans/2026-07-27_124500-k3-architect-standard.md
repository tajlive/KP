# Arkitektonisk Overleveringsstandard 2026 — K3 → Implementasjon

> **For Hermes:** Bruk denne standarden ved alle arkitektoniske oppdrag. K3 tenker — DeepSeek bygger.

**Goal:** Definer en reproduserbar standard for arkitektonisk overlevering der Kimi K3 fungerer som hovedarkitekt for design, bilder og brukeropplevelse, og DeepSeek V4 Pro implementerer.

**Architecture:** To-modell arbeidsflyt. K3 (1M kontekst, reasoning_effort=max, temp=1) produserer en fullstendig arkitekturspesifikasjon i én økt. Denne spesifikasjonen blir det eneste input-dokumentet for implementasjonsmodellen (DeepSeek). Ingen frem-og-tilbake — K3 produserer, DeepSeek eksekverer.

**Tech Stack:** Kimi K3 (arkitekt), DeepSeek V4 Pro (implementasjon), Tailwind CSS, Next.js 16, React 19

---

## Hvorfor K3 som arkitekt?

| Egenskap | K3 | DeepSeek |
|---|---|---|
| Kontekst | 1 048 576 tokens | 131 072 tokens |
| Resonnering | `reasoning_effort: max` | Standard |
| Temperatur | 1 (kreativ) | 0.7 (presis) |
| Rolle | **Arkitekt** — helhetlig design, alle skjermer, alle tilstander | **Bygger** — én fil om gangen, presist |
| Sesjon | Alltid ny økt, aldri mid-session | Kontinuerlig |

---

## Standarden: Arkitekturoppdrag i 4 faser

### Fase 0: Brief (DeepSeek forbereder)

DeepSeek samler all kontekst K3 trenger. Dette skjer i gjeldende økt.

**Hva som samles (maks 100K tokens):**
1. **Eksisterende designfiler** — `tailwind.config.ts`, `globals.css`, fargepalett, typografiskala
2. **Komponenter som skal redesignes** — full kildekode for hver fil
3. **Skjermbilder av nåværende tilstand** — `computer_use` captures av hver side
4. **Design-referanser** — URL-er til konkurrenter/eksempler brukeren liker
5. **Krav** — hva skal endres, hvorfor, for hvem

**Output:** Én markdown-fil: `.hermes/briefs/YYYY-MM-DD_HHMMSS-<slug>.md`

### Fase 1: Arkitektur (K3 — ny økt)

K3 mottar briefen og produserer en fullstendig arkitekturspesifikasjon.

**K3 får:**
- Brief-filen (komplett kontekst)
- Instruks: "Du er hovedarkitekt for Klarpakke. Produser en fullstendig arkitekturspesifikasjon for følgende oppdrag."

**K3 produserer:**
```
.hermes/architecture/
├── YYYY-MM-DD_HHMMSS-<slug>/
│   ├── SPEC.md              # Hovedspesifikasjon — alle skjermer, alle tilstander
│   ├── components/          # Komponentspesifikasjoner — én per komponent
│   │   ├── hero-section.md
│   │   ├── dashboard-shell.md
│   │   └── ...
│   ├── design-tokens.json   # Farger, spacing, typografi, shadows, radii
│   └── assets.md            # Bildebehov: dimensjoner, format, plassering, alt-tekst
```

**SPEC.md må inneholde:**
1. Designsystem — tokens, komponentbibliotek, conventions
2. Hver side — wireframe-struktur, komponent-tre, responsiv oppførsel
3. Hver komponent — props, tilstander (loading, empty, error, success, edge cases)
4. Interaksjoner — hover, focus, active, disabled, animasjoner, overganger
5. Accessibility — fargekontrast, tastaturnavigasjon, skjermleser, focus management

### Fase 2: Generering (DeepSeek + evt. bildegenerering)

DeepSeek leser K3s spesifikasjon og implementerer. Én komponent om gangen.

**Implementasjonsregler:**
1. **Følg SPEC.md nøyaktig** — ikke improviser
2. **Tailwind kun** — ingen inline styles, ingen CSS modules med mindre spesifisert
3. **Mobile-first** — alle komponenter starter på 375px viewport
4. **Tilstander først** — loading, empty, error FØR success
5. **Commit per komponent** — atomiske commits

**Bildebehov fra assets.md:**
- Hvis K3 spesifiserer bilder → generer med `computer_use` (Capture fra referanser) eller finn fra Unsplash/Pexels
- Plasser i `public/images/` med navn spesifisert av K3
- Bruk `<Image>` fra `next/image` med eksplisitte width/height

### Fase 3: Verifisering (DeepSeek)

Etter all implementasjon:

1. `npx tsc --noEmit` — 0 feil
2. `npm run lint` — 0 errors, 0 warnings
3. Visuell verifisering — `computer_use` capture av hver side i 3 viewport-bredder (375, 768, 1440)
4. Sammenlign capture med K3s spesifikasjon
5. Avvik → fiks → recommit

---

## Konkret eksempel: Hjemmeside-redesign

### Fase 0: DeepSeek samler brief

```
✅ Leser: tailwind.config.ts, globals.css, HeroSection.tsx, page.tsx
✅ Leser: TradingModesExplainer.tsx (nettopp lagt til)
✅ Tar screenshots: /no (mobil + desktop)
✅ Noterer: brukeren vil ha "Revolut/OKX-inspired dark design"
✅ Spør: "Hvilke 2-3 krypto-sider liker du designet på?"
```

→ Lagrer `.hermes/briefs/2026-07-27_120000-redesign-homepage.md`

### Fase 1: K3 produserer spesifikasjon

K3 mottar briefen i ny økt. Med 1M kontekst kan den lese ALLE eksisterende komponenter, ALLE screenshots, og ALLE designreferanser. Den produserer:

```
.hermes/architecture/2026-07-27_120000-redesign-homepage/
├── SPEC.md              # 5 sider: hero, trading modes, testimonials, footer, mobil
├── components/
│   ├── hero-section.md  # Layout, animasjon, CTA-plassering, mobil vs desktop
│   ├── mode-cards.md    # 3 kort: Manuell, Auto, JokerTrade
│   └── price-ticker.md  # Live pris-stripe
├── design-tokens.json   # {
│   "colors": {
│     "bg": "#0A0B0D",
│     "surface": "#111318",
│     "accent": "#F59E0B",
│     ...
│   },
│   "spacing": { "section": "py-20", "card": "p-6" },
│   "typography": { "h1": "text-4xl font-black", "body": "text-sm" }
│ }
└── assets.md            # Hero-bakgrunn: 1440x900, gradient mesh
                         # Mode-illustrasjoner: 3x SVG ikoner (hånd, robot, joker)
                         # Logo: 120x40, dark mode variant
```

### Fase 3: DeepSeek implementerer

Leser SPEC.md → implementerer komponent for komponent → verifiserer.

---

## K3-regler (harde)

1. **Alltid ny økt** — aldri `/kimi` midt i en DeepSeek-økt. K3 starter frisk hver gang.
2. **temperature=1** — K3 KREVER dette. Ikke endre.
3. **reasoning_effort=max** — K3 skal tenke grundig.
4. **K3 kjører kun via Pi CLI** — `pi chat --model kimi-coding/k3`
5. **K3 produserer, implementerer IKKE** — K3 endrer aldri filer. Kun spesifikasjoner.
6. **Én spesifikasjon per oppdrag** — K3 får ett oppdrag, produserer én spesifikasjon.

## DeepSeek-regler (harde)

1. **Følg spesifikasjonen** — ikke forbedre, ikke kritisere, ikke improvisere
2. **Spør kun hvis spesifikasjonen er tvetydig** — ellers implementer som spesifisert
3. **Verifiser med skjermbilder** — ikke stol på at koden "ser riktig ut"

---

## Verktøy som trengs

| Verktøy | Hvorfor |
|---|---|
| `pi chat --model kimi-coding/k3` | K3-økter |
| `computer_use` | Screenshots av nåværende tilstand + referanser |
| `write_file` | Lagre briefs, spesifikasjon, tokens |
| `read_file` | Lese eksisterende komponenter for kontekst |
| Terminal: `npx tsc --noEmit`, `npm run lint` | Verifisering |

---

## Når brukes denne standarden?

- **Nytt design** — hjemmeside, dashboard, landingssider
- **Redesign** — eksisterende sider som trenger løft
- **Designsystem** — etablere eller oppdatere komponentbibliotek
- **Bilder/illustrasjoner** — når visuell kvalitet er kritisk
- **UX-flyt** — onboarding, checkout, trading-flyt

## Når brukes den IKKE?

- **Bugfikser** — bruk DeepSeek direkte
- **Enkle komponenter** — ett felt, én knapp
- **Backend/API** — K3 er for visuelt design, ikke infrastruktur
- **Haster** — K3-økter tar 5-15 minutter, ikke for raske fikser

---

## Oppsummering: 2026-standarden på 3 linjer

1. **DeepSeek samler** → brief med all kontekst (skjermbilder, kode, krav, referanser)
2. **K3 tenker** → komplett spesifikasjon i ny økt (designsystem, alle skjermer, alle tilstander)
3. **DeepSeek bygger** → implementerer spesifikasjonen nøyaktig, verifiserer med skjermbilder
