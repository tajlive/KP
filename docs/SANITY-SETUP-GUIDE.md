# Sanity CMS Setup for Klarpakke

## ✅ Gjort (60%)

### 1. Avhengigheter installert
- `sanity` - Sanity Studio
- `next-sanity` - Next.js integrasjon
- `@sanity/vision` - GROQ query tool

### 2. Konfigurasjon opprettet
- `sanity.config.ts` - Studio konfigurasjon
- `sanity/schemas/` - 6 schema typer:
  - `page` - Dynamiske sider
  - `landingContent` - Landingsside innhold
  - `strategy` - Trading strategier
  - `tradeExplanation` - Trade forklaringer
  - `faq` - FAQ seksjon
  - `testimonial` - Kundeomtaler
- `sanity/lib/client.ts` - Sanity klient
- `src/app/studio/[[...tool]]/` - Studio route

## ❌ Mangler (40%)

### 1. Sanity Prosjekt (KRITISK)
Du må opprette prosjekt på sanity.io:

```bash
# 1. Gå til https://www.sanity.io/manage
# 2. Klikk "Create new project"
# 3. Velg "Blank project"
# 4. Prosjektnavn: "Klarpakke CMS"
# 5. Husk PROJECT_ID
```

### 2. Miljøvariabler (KRITISK)

Legg til i `.env.local`:

```bash
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-04-07
SANITY_API_READ_TOKEN=your_read_token_here
```

### 3. Komponenter som bruker Sanity (ANBEFALT)

Ingen komponenter henter data fra Sanity ennå. Du må:

1. Erstatte hardkodet tekst i komponenter
2. Bruke GROQ queries for å hente data

Eksempel:
```typescript
// src/features/landing/HeroSection.tsx
import { client } from '@/sanity/lib/client';

export default async function HeroSection() {
  const content = await client.fetch(`
    *[_type == "landingContent" && language == "no"][0]
  `);
  
  return (
    <h1>{content.heroTitle.line1}</h1>
    // ...
  );
}
```

## 🚀 Anbefaling

### Alternativ A: Fullfør nå (15 min ekstra)
1. Opprett prosjekt på sanity.io
2. Legg til miljøvariabler
3. Deploy
4. Redigér innhold i Studio

### Alternativ B: Vent til senere
- Koden er klar for Sanity
- Du kan aktivere når som helst
- Ingen breaking changes

## 📊 Hva får du med Sanity?

| Funksjon | Før (hardkodet) | Etter (Sanity) |
|----------|-----------------|----------------|
| Endre tekst | Kode + deploy | Studio + instant |
| A/B testing | Nei | Ja |
| Flere språk | Manuell | Easy |
| Non-tech editing | Nei | Ja |
| Bilder | Statisk | CDN |

## 🎯 Konklusjon

**Vi er 60% ferdig.** 

Du kan:
1. **Deploye nå** - Studio fungerer når du legger til prosjekt-ID
2. **Vent med komponent-integrasjon** - Kan gjøres gradvis etterpå

Vil du at jeg skal:
- A) Hjelpe deg med å opprette Sanity prosjektet?
- B) Lage eksempel-komponenter som henter data?
- C) Fullføre senere (nåværende kode er klar)?
