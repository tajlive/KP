# 🔐 Klarpakke Auth og Middleware

> **Sist oppdatert:** 20. Februar 2026  
> **Viktig:** Bruker `getUser()` (aldri `getSession()`) for å unngå auth loops

---

## Oversikt

Klarpakke bruker **Supabase Auth** med følgende komponenter:

- **Auth Provider:** Supabase Auth (Google OAuth + Email/Password)
- **Session Management:** JWT tokens (access + refresh)
- **Middleware:** Next.js middleware for rute-beskyttelse
- **Client:** `@supabase/ssr` for server-side auth

---

## Middleware-arkitektur

### Fil: `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Ruter som krever autentisering
const PROTECTED_ROUTES = [
  '/no/dashboard',
  '/en/dashboard',
  '/no/trading',
  '/en/trading',
  '/no/kurs',
  '/en/courses',
  '/no/profil',
  '/en/profile',
  '/no/innstillinger',
  '/en/settings',
  '/no/admin',
  '/en/admin',
  '/no/paper-trading',
  '/en/paper-trading',
  '/no/auto-trading',
  '/en/auto-trading',
  '/no/konto',
  '/en/account',
]

// Ruter som alltid er tilgjengelig
const PUBLIC_ROUTES = [
  '/no/innlogging',
  '/en/login',
  '/no/signup',
  '/en/signup',
  '/no/glemt-passord',
  '/en/forgot-password',
  '/no/verify',
  '/en/verify',
  '/no',
  '/en',
  '/th',
  '/zh',
  '/api',
  '/_next',
  '/favicon',
  '/manifest',
  '/robots',
  '/sitemap',
]

// Statiske assets (skip middleware)
const STATIC_ASSETS = [
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/icons',
  '/images',
  '/assets',
]
```

### Viktig: getUser() vs getSession()

```typescript
// ✅ RIKTIG - Bruk getUser() server-side
const { data: { user }, error } = await supabase.auth.getUser()

// ❌ FEIL - Aldri bruk getSession() server-side
const { data: { session } } = await supabase.auth.getSession()
```

**Hvorfor?** `getSession()` kan returnere en utdatert session fra cookies, mens `getUser()` validerer tokenet mot Supabase Auth.

---

## Auth Flow

### 1. Login

```
Bruker → /no/innlogging
  ↓
Supabase auth.signInWithPassword() eller auth.signInWithOAuth()
  ↓
JWT access token + refresh token
  ↓
Cookies settes (supabase-auth-token)
  ↓
Redirect til dashboard
```

### 2. Middleware-sjekk

```
Request → Middleware
  ↓
Skip? (Static asset / Public route)
  ↓ Ja → Fortsett til page
  ↓ Nei
Sjekk: Er dette en protected route?
  ↓ Ja
    createServerClient()
    getUser() for å validere JWT
    ↓
    Gyldig? → Fortsett til page
    Ugyldig? → Redirect til /innlogging
```

### 3. Token Refresh

```
Access token utløper (1 time)
  ↓
@supabase/ssr auto-refresh
  ↓
Ny access token + refresh token
  ↓
Oppdaterte cookies
```

---

## Auth Loop Fix

### Problem

Bruker logger inn → Redirectes tilbake til login → Uendelig loop

### Årsak

Supabase SSR cookies settes ikke riktig i Cloud Run. Krever:
1. `NEXTAUTH_SECRET` satt
2. `NEXTAUTH_URL=https://www.klarpakke.no` satt
3. `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` satt

### Rask Fix

```bash
cd ~/klarpakke

# Generer NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Hent env vars
export NEXT_PUBLIC_SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2)
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env | cut -d'=' -f2)

# Deploy med auth env vars
gcloud run services update klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --update-env-vars="NEXTAUTH_URL=https://www.klarpakke.no,NEXTAUTH_SECRET=$NEXTAUTH_SECRET,NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Se [.kimi/FIX_AUTH_LOOP.md](../.kimi/FIX_AUTH_LOOP.md) for full debug-prosedyre.

---

## Konfigurasjon i Supabase Dashboard

### Site URL

1. Gå til: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/url-configuration
2. Sett **Site URL** til: `https://www.klarpakke.no`
3. Legg til **Redirect URLs**:
   - `https://www.klarpakke.no/**`
   - `https://www.klarpakke.no/no/**`
   - `https://www.klarpakke.no/en/**`
   - `https://www.klarpakke.no/th/**`
   - `https://www.klarpakke.no/zh/**`

### Providers

- **Google OAuth**: Enabled
- **Email/Password**: Enabled
- **Email confirmations**: Required (production)

---

## Rute-beskyttelse

### Protected Routes (krever auth)

```typescript
const PROTECTED_ROUTES = [
  '/no/dashboard',      // Bruker dashboard
  '/en/dashboard',
  '/no/auto-trading',   // Auto Trade
  '/en/auto-trading',
  '/no/paper-trading',  // Paper Trading
  '/en/paper-trading',
  '/no/admin',          // Admin-panel
  '/en/admin',
  '/no/profil',         // Profil-innstillinger
  '/en/profile',
  // ... se middleware.ts for full liste
]
```

### Public Routes (ingen auth nødvendig)

```typescript
const PUBLIC_ROUTES = [
  '/no/innlogging',     // Login
  '/en/login',
  '/no/signup',         // Signup
  '/en/signup',
  '/no/glemt-passord',  // Glemt passord
  '/en/forgot-password',
  '/no', '/en', '/th', '/zh',  // Landing pages
  '/api',               // API routes (håndterer auth selv)
]
```

---

## Brukerroller

### Roller i profiles-tabell

```sql
-- profiles-tabell
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  subscription_tier TEXT DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

| Rolle | Tilgang |
|-------|---------|
| `user` | Standard bruker, eget dashboard |
| `admin` | Admin-dashboard, alle brukere |

### Subscription Tiers

| Tier | Auto Trade Limit | Live Trading |
|------|-----------------|--------------|
| `student` | 1 (paper only) | ❌ |
| `bachelor` | 1 | ✅ |
| `master` | 3 | ✅ |
| `professor` | Ubegrenset | ✅ |

---

## Client-side Auth

### Supabase Client

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Bruk i komponenter

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export default function Dashboard() {
  const supabase = createClient()
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/no/innlogging'
  }
  
  // ...
}
```

---

## Server-side Auth

### Server Client

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
```

### Bruk i Server Components

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/no/innlogging')
  }
  
  // ...
}
```

---

## Feilsøking

### "AuthApiError: Invalid Refresh Token"

```bash
# Bruker må logge ut og inn igjen
# Eller: Tøm cookies for www.klarpakke.no
```

### "JWT expired"

```bash
# Token auto-refreshes vanligvis
# Hvis ikke: Sjekk at SUPABASE_SERVICE_ROLE_KEY er satt
```

### "User not found" etter login

```bash
# Sjekk at profiles-raden eksisterer
supabase sql "SELECT * FROM profiles WHERE id = '<user_id>';"

# Hvis mangler: Opprett rad
supabase sql "INSERT INTO profiles (id, email) VALUES ('<user_id>', '<email>');"
```

### Middleware redirect loop

```bash
# Sjekk env vars i Cloud Run
gcloud run services describe klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --format="value(spec.template.spec.containers[0].env)"

# Forventet: NEXTAUTH_URL, NEXTAUTH_SECRET, NEXT_PUBLIC_SUPABASE_*
```

---

## Sikkerhetssjekkliste

- [ ] `getUser()` brukes server-side (ikke `getSession()`)
- [ ] `NEXTAUTH_SECRET` er satt i Cloud Run
- [ ] `NEXTAUTH_URL` er korrekt (https://www.klarpakke.no)
- [ ] Supabase Site URL er konfigurert
- [ ] RLS er aktivert på alle tabeller
- [ ] API routes validerer auth individuelt
- [ ] Cookies er secure i produksjon

---

## Kilder

- [.kimi/FIX_AUTH_LOOP.md](../.kimi/FIX_AUTH_LOOP.md) — Auth loop fix-prosedyre
- [architecture.md](./architecture.md) — Systemarkitektur
- Supabase Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
