# Client-side Supabase → API Migration (2026-07-21)

## Problem

Dashboard og portefølje henger i produksjon — viser "Laster..." evig. Ingen console-feil, ingen API-feil, ingen timeout-feilmelding. Siden laster aldri data.

## Rotårsak

`getSupabaseClient()` (client-side Supabase) kaller Supabase REST API direkte fra nettleseren uten noen timeout. Hvis:
- Supabase er treg (cold start, høy belastning)
- Nettverket er dårlig (mobil, VPN, firewall)
- DNS resolve feiler midlertidig

...henger spørringen evig. React-komponenten viser "Laster..." for alltid.

**Hvorfor ingen feilmelding:** Supabase JS-klienten har ingen innebygd timeout. Den venter på HTTP-response for alltid.

## Fiks

Bytt ALLE client-side data-fetching til API-endepunkter med server-side timeout.

### API-endepunkt (`/api/user/profile/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Create Supabase client with 5s timeout
    const supabasePromise = import("@/lib/supabase/server").then(m => m.createServerClient());
    const supabase = await Promise.race([
      supabasePromise,
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      ),
    ]) as Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerClient>>;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Ikke innlogget" }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get("userId") || user.id;

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, display_name, paper_balance, tier, preferred_trading_mode, onboarding_completed, created_at, is_priority")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
    }

    // Fetch wallets
    const { data: wallets } = await supabase
      .from("wallets")
      .select("id, currency, balance")
      .eq("user_id", userId);

    return NextResponse.json({
      ok: true,
      profile,
      wallets: wallets || [],
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
```

### Client-side endring

**FØR (DashboardClient.tsx):**
```typescript
const supabase = getSupabaseClient();
const { data: profile } = await supabase
  .from("user_profiles")
  .select("paper_balance, tier, preferred_trading_mode, onboarding_completed, display_name, created_at, is_priority")
  .eq("id", user.id)
  .single();
```

**ETTER:**
```typescript
const res = await fetch(`/api/user/profile?userId=${user.id}`);
const data: ProfileResponse = await res.json();
if (!data.ok || !data.profile) {
  setState(s => ({ ...s, loading: false, error: data.error || "Kunne ikke laste profil" }));
  return;
}
const profile = data.profile;
```

## Regel

**ALDRI bruk `getSupabaseClient()` for data-fetching i client components.**

`getSupabaseClient()` er KUN for:
- Auth (login, logout, session refresh)
- Real-time subscriptions (Supabase Realtime)

**For ALL data-fetching:** Bruk API-endepunkter med timeout guard.

## Verifisering

1. Sjekk at API-endepunktet returnerer 401 uten auth: `curl https://klarpakke.no/api/user/profile`
2. Sjekk at det returnerer 200 med auth (krever innlogging)
3. Test dashboard — skal laste data, ikke henge på "Laster..."
4. Test portefølje — skal vise balanse

## Berørte filer (2026-07-21)

- `src/app/api/user/profile/route.ts` — NY API-endepunkt
- `src/app/[locale]/(user)/dashboard/DashboardClient.tsx` — byttet til API
- `src/features/portfolio/PortfolioClientPage.tsx` — byttet til API
