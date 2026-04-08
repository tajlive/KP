# TypeScript Technical Debt Tracker

## Innført 2026-04-08 (Workflow-konsolidering)

### Høy prioritet
- [ ] `sanity/schemas/*.ts` - Rule: any istedenfor unknown
- [ ] `src/lib/trading/core/outbox-recovery.ts` - item: any casting
- [ ] `src/lib/trading/risk/risk-state-store.ts` - state: unknown casting

### Medium prioritet  
- [ ] `src/app/[locale]/(user)/dashboard/bot/[session_id]/page.tsx` - Trade[] casting
- [ ] `src/app/api/cron/mifid2-export/route.ts` - store: unknown

### Løsningsstrategi
1. Definer interfaces for database-responser
2. Bruk zod for runtime validering
3. Fjern `any` gradvis ved refaktoring

**Mål:** 0 `any` innen Q3 2026
