# i18n-konsolidering + Client-side auth — 2026-07-20

## Problem: requireAuth() + createServerClient() henger i Workers

Cloudflare Workers kan ikke lese httpOnly auth-cookies. `createServerClient()` (fra `@supabase/ssr`) henger i evig tid
når den prøver å utlede auth-sessionen. Dette rammer:

- Server-side `requireAuth()` guards → kaster exception
- API-endepunkter som kaller `createServerClient()` → 522 timeout
- Server-komponenter som rendrer med `initialUser={null}` → AuthContext henger

## Løsning A: Client-side auth (for sider)

```tsx
// page.tsx — tynn server-wrapper
export default async function Page({ params }) {
  return <ClientComponent locale={params.locale} />;
}

// ClientComponent.tsx — "use client"
export default function ClientComponent() {
  const { user, loading } = useAuth();
  // 5s failsafe timeout innebygd i AuthContext
  // 15s timeout i load() funksjonen
  // cancelled-flag for cleanup ved unmount
}
```

## Løsning B: API timeout guard (for endepunkter)

```tsx
const supabasePromise = createServerClient();
const timeout = 3000;
const supabase = await Promise.race([
  supabasePromise,
  new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error("Supabase server client timeout")), timeout)
  ),
]) as Awaited<ReturnType<typeof createServerClient>>;
```

## Løsning C: userId i query (for API som trenger auth)

Når client er autentisert via AuthContext, send userId som query-parameter.
API-et bruker userId direkte istedenfor server-side auth.

## Problem: i18n split-filer fungerer ikke

78 split-filer (`messages/no/*.json`) ble holdt vedlike samtidig som konsolidert `messages/no.json`.
Cloudflare Worker laster KUN konsolidert JSON. Split-filene ga falsk trygghet.

## Løsning: slett + konsolider

1. Slettet alle 78 split-filer (git rm)
2. Omskrev `src/i18n.ts` — fjernet ALLE split-file imports (~200 linjer → 30 linjer)
3. Omskrev `src/lib/i18n/load-messages.ts` — laster kun `messages/{locale}.json`
4. Lagt til manglende nøkler i konsolidert JSON:
   - `hero`: titleLine1, titleLine2, subtitle, stat1-3, cta, ctaPrimary, price, m.m.
   - `navigation`: siteNavAria, tagline, trade, portfolio
   - `components.themeToggle`: switchTo, toggleTheme
   - `landing.metadata`: title

## Validering

```bash
python3 -c "import json; json.load(open('messages/no.json')); print('OK')"
# SSG-sider må bygges på nytt for å plukke opp nye nøkler
```

## Nøkkel-liste (2026-07-20)

| Namespace | Keys | Brukes av |
|-----------|------|-----------|
| `hero` | titleLine1, titleLine2, subtitle, stat1-3, cta, ctaPrimary, ctaSecondary, price, priceLabel, priceChange | Landing page hero |
| `navigation` | siteNavAria, tagline, home, trade, portfolio, school, login, register, signup | Alle sider (nav) |
| `components.themeToggle` | switchTo, toggleTheme, light, dark | Theme toggle-knapp |
| `landing` | metadata.title, badge, hero.*, trustStrip.* | Landing page |
| `footer` | product, company, legal, tagline, copyright | Footer |
| `autopilot.hero` | badge, titlePart1, titlePart2 | Autopilot landing |
| `pricing.hero` | title, subtitle | Priser-siden |

## Pitfalls

- ALLTID legg nøkler i BÅDE `no.json` og `en.json`
- Ikke bruk `{mode}`-interpolation i themeToggle — komponenten sender ikke variabelen
- SSG-sider må bygges på nytt (ny deploy) for å vise nye nøkler
- Rå nøkkelnavn i produksjon = key mangler i konsolidert JSON
