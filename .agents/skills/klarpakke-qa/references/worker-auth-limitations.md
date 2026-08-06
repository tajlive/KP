# Cloudflare Worker auth-begrensninger

## requireAuth() krasjer i Worker

**Symptom:** Dashboard viser "Det oppstod en feil"  
**Server-side:** `requireAuth()` → `createServerClient()` → henger → 522 timeout

**Rotårsak:** Cloudflare Workers kan ikke lese httpOnly auth-cookies. Supabase server client prøver å lese cookies for å autentisere, men i Worker-miljøet er det ingen cookie-jar.

**Fiks — client-side auth:**

```tsx
// Server-side page.tsx (tidligere krasjet):
const { supabase, user } = await requireAuth(locale);  // ← krasjer

// Bytte til client-side:
"use client";
import { useAuth } from "@/lib/auth/new/AuthContext";
export default function Page() {
  const { user, loading } = useAuth();
  // ... bruk user direkte
}
```

**Fiks — API-ruter med timeout:**

```typescript
// FØR: createServerClient() kan henge i evigheter
const supabase = await createServerClient();

// ETTER: timeout guard
const supabase = await createServerClient().catch(() => null);
if (!supabase) {
  return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
}
```

## Server-only imports i client components

**Moduler som ikke kan importeres fra client:**
- `next/headers` — `draftMode`, `cookies`, `headers`
- `next/navigation` — `redirect` (server-side only)
- `@/server/*` — server-only funksjoner

**Fiks:** Dynamisk import med `await import(...)` i client-komponenten, eller bytt til API-endepunkt istedenfor direkte funksjonskall.

## API-endepunkt istedenfor server-funksjon

I client-komponenter, fetch metrics/data via API istedenfor å kalle server-funksjoner direkte:

```tsx
// FØR (krasjer i client):
const metrics = await getUserDashboardMetrics({ ... });

// ETTER (via API, fungerer):
const res = await fetch(`/api/dashboard/metrics?userId=${user.id}&mode=paper`);
const metrics = res.ok ? await res.json() : null;
```
