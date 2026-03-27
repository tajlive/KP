# Migration Policy — Klarpakke

Dokument for håndtering av migrasjoner, legacy-filer og db status-gate.

---

## Legacy 999-placeholder

### 999_fix_materialized_view.sql

- **Fil:** `supabase/migrations/999_fix_materialized_view.sql`
- **Type:** Pre-timestamp-era migrasjon (historisk legacy)
- **Status:** `frozen` / applied på remote
- **Fritak:** Eksplisitt allowlist i `scripts/db-status-gate.mjs`

### Regler

1. **Skal IKKE renames eller endres** uten fullstendig remote `migration repair`-sekvens
2. **Skal IKKE slettes** — filen er allerede applied på produksjon
3. **Idempotent:** Kan kjøres flere ganger uten skade
4. **Header:** Filen har fryse-header som markerer status tydelig

### Post-launch oppgave (P2)

Vurder rename til `19700101000000_legacy_placeholder.sql` + repair-sekvens:

```bash
# 1. Verifiser at migrasjonen er applied på remote
supabase db status --linked

# 2. Repair (kun hvis nødvendig)
supabase migration repair 19700101000000_legacy_placeholder --status applied

# 3. Rename filen lokalt
mv 999_fix_materialized_view.sql 19700101000000_legacy_placeholder.sql

# 4. Push og verifiser
supabase db push
```

**Risiko:** Lav, men krever koordinering. Utfør kun i lavtrafikk-periode.

---

## db:status Gate

Se `scripts/db-status-gate.mjs` for implementasjon.

### Allowlist

Følgende ignoreres i status-gate:

| Mønster                     | Grunn                              |
| --------------------------- | ---------------------------------- |
| `999_fix_materialized_view` | Legacy placeholder, frozen         |
| `999.*placeholder`          | Fremtidige 999-placeholder mønstre |

### Bruk

```bash
# Normal (allowlist tillatt)
npm run db:status:gate

# Strict (exit 1 på alle funn, inkludert allowlist)
npm run db:status:gate -- --strict
```

### Exit codes

| Code | Betydning                                                        |
| ---- | ---------------------------------------------------------------- |
| 0    | Ingen blockerende migrasjons-issues                              |
| 1    | Blockerende issues funnet (utenfor allowlist, eller strict mode) |

---

## Generelle retningslinjer

1. **Nye migrasjoner:** Bruk alltid timestamp-prefix (`YYYYMMDD_HHMMSS_*.sql`)
2. **Idempotent:** Alle migrasjoner skal være idempotente (bruk `IF EXISTS` / `IF NOT EXISTS`)
3. **RLS:** RLS-policyer skal være med i migrasjoner der relevant
4. **Verifisering:** Kjør `npm run db:lint` før push

---

_Sist oppdatert: 2026-03-27_
