# Enterprise Transform - Agent Arbeidsfordeling

## KIMI (Hovedarkitekt)
- Koordinere alle agenter
- Kode review og merge
- Arkitektur-beslutninger
- Kvalitetskontroll

## Claude OPU (Senior Arkitekt)
- Designe core entities
- Type system arkitektur
- Komplekse refaktoringer
- Pattern-definisjoner

## Agent 1: Core Domain
**Ansvar:** src/core/entities/ og usecases/
- User, Trade, Session entities
- Pure business logic
- Type definitions
- Unit tests

## Agent 2: Infrastructure  
**Ansvar:** src/infrastructure/
- Supabase repositories
- Redis cache
- External API clients
- Error handling

## Agent 3: Presentation
**Ansvar:** src/presentation/
- Next.js route handlers
- React components
- Form validation (Zod)
- Loading states

## Agent 4: Testing & Quality
**Ansvar:** tests/ og quality gates
- Test utilities
- Mock factories
- E2E scenarios
- Performance tests

## Daglig Rutine
1. 09:00 - Standup (alle agenter rapporterer)
2. 12:00 - Code review runde
3. 15:00 - Integrasjon og testing
4. 17:00 - Dokumentasjon og status
