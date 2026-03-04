# ADR-005: RLS over Middleware

**Status:** Accepted  
**Dato:** 2026-02-01  
**Beslutningstaker:** Taj + KIMI Code

## Kontekst

Vi måtte velge autorisasjonsstrategi for data-tilgang.

## Vurdering

**Alternativer:**
1. Supabase RLS (Row Level Security)
2. Next.js Middleware
3. API Routes med custom auth
4. Service layer med auth

**Kriterier:**
- Sikkerhet
- Performance
- Maintainability
- Feil-sikkerhet

## Beslutning

Vi valgte **Supabase RLS**.

### Fordeler

- ✅ **Database-level:** Kan ikke bypasses av bugs
- ✅ **Performance:** Ingen ekstra round-trips
- ✅ **Maintainability:** SQL policies, ikke kode
- ✅ **Fail-safe:** Default deny, eksplisitt allow

### Ulemper

- Læringskurve for SQL policies
- Vanskeligere å debugge
- Mere komplekse queries

## Eksempel

**RLS Approach:**
```sql
-- Policy i database
CREATE POLICY "Users can only see own data"
ON portfolios FOR SELECT
USING (auth.uid() = user_id);

-- I kode: Ingen ekstra sjekk nødvendig
const { data } = await supabase
  .from('portfolios')
  .select();
-- RLS filtrerer automatisk
```

**Middleware Approach (ikke valgt):**
```typescript
// I middleware: Må sjekke hver request
export function middleware(request) {
  const user = await getUser();
  if (!user) return redirect('/login');
  // Men: Kan fortsatt lekke data fra DB!
}
```

## Konsekvenser

**Positive:**
- Sikkerhet uavhengig av applikasjonskode
- Consistent enforce på alle queries
- Lett å auditere

**Negative:**
- Må lære RLS syntax
- Vanskeligere å teste
- Kan påvirke query performance (hvis ikke indeksert)

## Best Practices Vi Følger

1. **Enable RLS på alle tabeller:**
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

2. **Default deny:**
   ```sql
   -- Ingen policy = ingen tilgang
   -- Eksplisitt tillat
   CREATE POLICY "allow_own_data" ON table FOR ALL USING (...);
   ```

3. **Test policies:**
   ```bash
   bash scripts/test-rls.sh
   ```

## Revidering

Denne beslutningen skal revurderes hvis:
- RLS blir performance-flaskehals
- Vi trenger kompleks business logic i auth
- Vi bytter til annen database uten RLS

## Referanser

- https://supabase.com/docs/guides/auth/row-level-security
