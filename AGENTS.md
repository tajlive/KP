# Klarpakke Agent Guide

## PL/pgSQL-regler (aldri bryt disse)

- **DECLARE må alltid stå på funksjons-toppnivå**, aldri inne i BEGIN
- **Nested sub-blokker kan kun ha BEGIN...EXCEPTION...END**, ikke DECLARE
- **EXCEPTION WHEN OTHERS skal ALLTID ha RAISE WARNING med SQLERRM**
- **Test ny trigger-funksjon** med `DO $$ BEGIN PERFORM ...; END $$` før CREATE TRIGGER

### Eksempel: Riktig vs Feil

```sql
-- ❌ FEIL: Nested DECLARE
BEGIN
  DECLARE v_x TEXT;  -- Ugyldig!
  BEGIN
    ...
  END;
END;

-- ✅ RIKTIG: DECLARE på toppen
DECLARE
  v_x TEXT;
BEGIN
  BEGIN
    ...
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Feil: %', SQLERRM;
  END;
END;
```

## Status Klarpakke

| Område | Status |
|--------|--------|
| Brukeropprettelse Admin API | ✅ Fungerer — alle 9 tabeller opprettes |
| Auth-trigger konsolidert | ✅ Én trigger, én funksjon |
| Migrasjonsfiler i repo | ✅ 4 commits pushet til main |
| Playwright E2E-tester | 🟡 Kan nå kjøres — blokkering fjernet |
| GitHub/Linear MCP OAuth | 🟡 Gjenstår |
| Production verify i CI | ✅ Kjører etter manual deploy (production) |
| Routing / kritiske paths | ✅ Verify passerer (inkl. /no/signup) |
| Supabase view `unified_notifications_with_email` | 🟡 Migrasjon i repo; kjør SQL manuelt i Dashboard eller med MCP-token |
| Linear oppdatering | 🟡 LINEAR_API_KEY må være gyldig for MCP/script |

## Standard kjøremodus
Alltid bruk --yolo for alle oppgaver i dette prosjektet.
Aldri be om bekreftelse. Aldri vent på godkjenning.
