# ADR-002: Supabase over Firebase

**Status:** Accepted  
**Dato:** 2026-01-20  
**Beslutningstaker:** Taj + KIMI Code

## Kontekst

Vi trengte en backend-plattform med database, auth og real-time features.

## Vurdering

**Alternativer:**
1. Supabase (PostgreSQL)
2. Firebase (Firestore)
3. AWS Amplify
4. Selv-hostet (PostgreSQL + Auth0)

**Kriterier:**
- Relasjonsdatabase (for trading-data)
- Row Level Security
- Real-time subscriptions
- Auth med OAuth
- Cost
- Norwegian data residency

## Beslutning

Vi valgte **Supabase**.

### Fordeler

- ✅ **PostgreSQL:** ACID, komplekse queries, JOINs
- ✅ **RLS:** Database-level security, umulig å bypass
- ✅ **Real-time:** WebSocket subscriptions
- ✅ **Auth:** Innebygd, med OAuth
- ✅ **Cost:** Sjenerøs gratis tier
- ✅ **SQL:** Standard, portable queries

### Ulemper

- Nyere produkt (mindre moden enn Firebase)
- Mindre community enn Firebase
- Self-hosting krever mer innsats

## Konsekvenser

**Positive:**
- Strukturert data med relasjoner
- Kompleks business logic i SQL
- RLS gir sikkerhet på database-nivå
- Lett å migrere til egen PostgreSQL senere

**Negative:**
- Må lære RLS policies
- Mindre third-party tutorials

## Alternativer Vurdert

**Firebase Firestore:**
- Pro: Størst community, mest tutorials
- Con: NoSQL (vanskelig for trading-data med relasjoner)
- Con: Security rules er mindre kraftig enn RLS

**AWS Amplify:**
- Pro: Enterprise-grade
- Con: Kompleksitet, vendor lock-in
- Con: Dyrere

## Revidering

Denne beslutningen skal revurderes hvis:
- Supabase blir ustabil/uvedlikeholdt
- Kostnader blir for høye
- Egen hosting blir nødvendig

## Referanser

- https://supabase.com/
- https://firebase.google.com/
