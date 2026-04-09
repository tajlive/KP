# OAuth Session og /paper 404 Fix - 2026-04-08

## Problemer Identifisert

### 1. `/paper` 404 Error
**Funn fra browser console:**
```
GET https://www.klarpakke.no/paper?_rsc=7y9e7 404 (Not Found)
```

**Årsak:** Koden bruker `/paper` som URL, men den faktiske ruten er `/paper-trading`.

**Filer med feil referanse:**
- `middleware/i18n.ts` linje 53 - redirect fra `/beta/live-trading` gikk til `/paper`
- `middleware/onboarding.ts` linje 12 - inkluderer `/paper` i protected paths
- `middleware/auth-guard.ts` linje 12 - inkluderer `/paper` i protected paths  
- `app/sitemap.ts` linje 8 - inkluderer `/paper` i sitemap
- `shared/layout/MarketingNavigation.tsx` linje 25
- `features/landing/*.tsx` - flere komponenter
- `features/dashboard/*.tsx` - flere komponenter
- `features/paper-trading/*.tsx` - flere komponenter

**Løsning:** Lagt til redirect i `middleware/i18n.ts`:
```typescript
const CANONICAL_REDIRECTS: { [key: string]: string } = {
  // ... eksisterende redirects
  "/paper": "/paper-trading",  // NY
};
```

Også fikset linje 53:
```typescript
// FØR:
url.pathname = localizedPathname(locale, "/paper");

// ETTER:
url.pathname = localizedPathname(locale, "/paper-trading");
```

### 2. OAuth Session Redirect Loop

**Funn fra research:**
- Supabase auth session persisterer ikke alltid etter OAuth callback
- `exchangeCodeForSession` må kalles i callback route
- `router.push()` + `router.refresh()` nødvendig for å oppdatere Server Components

**Relevante GitHub Issues:**
- supabase/auth#2344 - Regression i v2.91.0 som fører til session persistence failure
- vercel/community#27731 - Supabase auth på Vercel krever dobbel login i produksjon

**Løsninger å vurdere:**
1. Sjekk at `/auth/callback` route kaller `exchangeCodeForSession`
2. Sjekk at `router.refresh()` kalles etter `router.push()`
3. Vurder å pinne `@supabase/supabase-js` til v2.90.1 hvis problemet vedvarer

**Auth callback route må inneholde:**
```typescript
// app/[locale]/auth/callback/route.ts
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=auth_failed', request.url)
  )
}
```

**Client-side redirect må inneholde:**
```typescript
router.push('/dashboard')
router.refresh()  // KRITISK for Server Components
```

## Oppsummering

| Problem | Status | Fix |
|---------|--------|-----|
| `/paper` 404 | ✅ Fikset | Lagt til redirect til `/paper-trading` |
| `/beta/live-trading` redirect | ✅ Fikset | Endret til `/paper-trading` |
| OAuth session loop | 🔄 Under etterforskning | Sjekk callback route og client refresh |

## Ressurser

### Nyttige Lenker
- https://www.iloveblogs.blog/post/supabase-auth-redirect-fix
- https://github.com/supabase/auth/issues/2344
- https://community.vercel.com/t/supabase-auth-on-vercel-requires-double-login-in-production/27731

### Next.js Auth Patterns
- https://beyondit.blog/blogs/nextjs-16-1-migration-middleware-to-proxy
- https://nextjslaunchpad.com/article/nextjs-middleware-proxy-complete-guide-edge-logic-security-migration

---
Opprettet: 2026-04-08
Kategori: Bug Fix, Auth
Prioritet: P0 (Production Blocker)
