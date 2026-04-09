# Next.js 16 proxy.ts Warning - DO NOT MIGRATE

## Status
⚠️ **VIKTIG**: Behold `middleware.ts` til tross for deprecation warning

## Bakgrunn
Next.js 16 har introdusert `proxy.ts` som erstatter `middleware.ts`, men:

### Prøvd og feilet (2026-04-08)
- Migrert til `proxy.ts` etter Next.js 16.1 docs
- Resultat: **Auth/session brøt fullstendig**
- OAuth login fungerte ikke
- Session persisterte ikke etter refresh
- Måtte revert til `middleware.ts`

## Hvorfor ikke migrere ennå

| Problem | Årsak |
|---------|-------|
| Session ikke persistert | `proxy.ts` håndterer cookies annerledes |
| OAuth callback feiler | Cookie sync mellom request/response fungerer ikke |
| Supabase SSR inkompatibel | `@supabase/ssr` forventer middleware.ts pattern |

## Når kan vi migrere?

1. **Venter på**: Offisiell Supabase-støtte for `proxy.ts`
2. **Eller**: Next.js fikser cookie handling i proxy.ts
3. **Inntil da**: `middleware.ts` fungerer perfekt

## Deprecation Warning

Warningen er ikke kritisk:
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**Fakta:**
- `middleware.ts` vil støttes i mange måneder til
- Det er en "soft deprecation" - koden fungerer 100%
- Migrering nå = ødelagt auth

## Konklusjon

**Behold `middleware.ts`**. Ikke bry deg om warningen. Vi migrerer når:
1. Supabase offisielt støtter proxy.ts, ELLER
2. Vi har tid til å teste grundig med backup-plan

---
Dokumentert: 2026-04-09
Status: BLOCKED - vent på Supabase/Next.js fix
