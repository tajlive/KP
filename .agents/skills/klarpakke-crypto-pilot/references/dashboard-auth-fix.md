# Dashboard Auth Fix (2026-07-29)

## Problem

JokerTrade dashboard (`/dashboard/jokertrade`) viste "Unauthorized" fordi client-side `fetch("/api/jokertrade")` ikke sendte auth-cookies. Supabase auth er cookie-basert — Next.js middleware setter cookies, men client-side fetch må inkludere dem eksplisitt.

## Solution: `credentials: "include"`

```tsx
// src/app/[locale]/(user)/dashboard/jokertrade/page.tsx
useEffect(() => {
  fetch("/api/jokertrade", { credentials: "include" })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(d => setData(d.analytics))
    .catch(e => setError(String(e)))
    .finally(() => setLoading(false));
}, []);
```

## Why

- Next.js server-side `createClient().auth.getUser()` leser cookies automatisk (Request Cookie header)
- Client-side `fetch()` i browser sender IKKE cookies med mindre `credentials: 'include'` er satt
- Uten dette får API 401 → "Unauthorized"

## Remember

**ALL client-side fetch til autentiserte API-endepunkter må ha `credentials: "include"`.** Dette gjelder alle dashboard-sider, widgets, og komponenter som bruker `useEffect` + `fetch` mot `/api/*`.
