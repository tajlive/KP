# K3 Arkitekt — Overleveringsstandard 2026

**Sesjon:** 2026-07-27

## Mønster: To-modell arbeidsflyt for design/arkitektur

Bruk Kimi K3 som hovedarkitekt for design og visuell kvalitet. DeepSeek V4 Pro implementerer.

### Hvorfor K3 som arkitekt

| Egenskap | K3 | DeepSeek |
|---|---|---|
| Kontekst | 1 048 576 tokens | 131 072 tokens |
| Resonnering | `reasoning_effort: max` | Standard |
| Temperatur | 1 (kreativ) | 0.7 (presis) |
| Rolle | Arkitekt — helhetlig design | Bygger — én fil om gangen |
| Sesjon | Alltid ny økt | Kontinuerlig |

### Før K3-økten: DeepSeek samler brief

Lag en fil `.hermes/architecture/k3-handover/BRIEF.md` med:
1. Hva er produktet (1-2 avsnitt)
2. Fullt designsystem (tokens, farger, typografi, shadows, animasjoner)
3. Nåværende problemer per side/komponent — med konkrete filreferanser
4. Konkurrent-referanser (hva brukeren liker)
5. K3s oppdrag — konkrete krav per side
6. Output-krav — nøyaktig hvilke filer K3 skal produsere
7. Tekniske begrensninger (Tailwind v4 CSS-first, next-intl, next/image, Framer Motion)
8. Suksesskriterier

### Under K3-økten

K3 kjører i Kimi Desktop / Pi CLI:
```bash
pi chat --model kimi-coding/k3
```

Lim inn hele BRIEF.md. K3 leser alt (1M kontekst). K3 produserer:
```
.hermes/architecture/k3-handover/
├── SPEC.md
├── design-tokens.json
├── pages/
│   ├── homepage.md
│   └── jokertrade.md
├── components/
│   ├── hero-section.md
│   └── ...
└── assets.md
```

### Etter K3-økten: DeepSeek implementerer

1. Les SPEC.md
2. Implementer komponent for komponent — følg spesifikasjonen nøyaktig
3. Verifiser med skjermbilder (computer_use)
4. Commit per komponent

### Harde K3-regler

1. Alltid ny økt — aldri `/kimi` midt i en DeepSeek-økt
2. temperature=1 — K3 KREVER dette
3. reasoning_effort=max
4. K3 produserer spesifikasjoner, endrer ALDRI filer
5. Én spesifikasjon per oppdrag

### Verifisering av brief før K3 startes

Før K3-økten startes: verifiser briefen mot kodebasen. Sjekk at:
- Tailwind-versjon er korrekt (v4 CSS-first, ikke v3 JS-config)
- Alle filstier eksisterer
- Farge/font-påstander stemmer (fonts lastes faktisk)
- Konsistens i tall/tekst (ikke "64K" ett sted og "65K" et annet)
- Alle nødvendige begrensninger er dokumentert (auth-hooks, locales, hardkodede hex-verdier)

Se `.hermes/plans/2026-07-27_124500-k3-architect-standard.md` for komplett standard.
Se `.hermes/architecture/k3-handover/BRIEF.md` for eksempel på ferdig brief (hjemmeside + JokerTrade redesign).
