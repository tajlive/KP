# Trading Robot v3 Complete Upgrade Plan

## Status
✅ Fikset: risk-state, audit-store, outbox-recovery (type casts)
🔴 Blocker: 39 TS errors i API routes (Supabase upserts)

## Full Plan for KIMI
1. `npm run db:gen-types`
2. Fix TS errors med Zod + type guards
3. Feature flag + tests
4. Deploy preview

**Kjør sekvensielt. Rapporter etter hver steg.**