# TypeScript Feilretting Plan

## Prioritering

### 1. Fase: Supabase Client (TS2769 - 49 feil)
**Filer**: API routes med `createServerClient()`
**Løsning**: Legge til type assertion

### 2. Fase: Property Errors (TS2339 - 153 feil)
**Filer**: Diverse komponenter
**Løsning**: 
- Fikse database.types.ts videre
- Legge til @ts-expect-error der nødvendig
- Riktige typer

### 3. Fase: Andre feil (67 feil)
**Løsning**: Enkeltfikser per fil

## Fremgangsmåte
1. Start med API routes (kritiske for appen)
2. Deretter store (Zustand)
3. Til slutt komponenter
