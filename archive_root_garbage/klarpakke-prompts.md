# Klarpakke — Eksakte prompts for Kimi Code & Antigravity

> Kopier hver prompt NØYAKTIG som den står. Rekkefølgen er kritisk.
> Kjør Kimi Code-promptene FØRST (fikser bygget), deretter Antigravity (visuelt).

---

## 🔧 KIMI CODE — Prompt 1: Fix build-breaking errors

```
Åpne prosjektet ~/klarpakke (Next.js 15, Tailwind, Supabase, Framer Motion).

Prosjektet feiler på `npm run build`. Fiks ALLE disse feilene:

1. src/components/auth/LoginForm.tsx linje ~62:
   - `variant="danger"` finnes ikke i shadcn Alert
   - Endre til `variant="destructive"`

2. src/components/RealTradingDashboard.tsx linje ~66:
   - React Hook useEffect har missing dependency 'fetchData'
   - Wrap fetchData i useCallback og legg den i dependency array

3. src/components/landing/Testimonials.tsx:
   - Uescaped quotes i teksten
   - Erstatt alle " med &ldquo; og &rdquo;

4. src/components/auth/AuthPage.tsx linje ~82-83:
   - Samme problem med uescaped quotes
   - Erstatt med &ldquo; og &rdquo;

5. next.config.js:
   - Har warning om 'serverExternalPackages' under experimental
   - Flytt serverExternalPackages ut av experimental (det er top-level i Next.js 15.5+)

6. package.json:
   - @next/swc er 15.5.7 men next er 15.5.11
   - Oppdater: npm install @next/swc@15.5.11 --save-exact

Etter ALLE fiks: kjør `npm run build` og bekreft at det passerer uten feil.
Kjør også `npm run lint` og fiks eventuelle gjenstående warnings.
Commit: "fix: resolve all TypeScript and ESLint build errors"
```

---

## 🔧 KIMI CODE — Prompt 2: Fix OAuth callback URLs

```
I prosjektet ~/klarpakke, fiks OAuth-login som er broken.

Problemet: Etter migrering fra Cloudflare Pages til Vercel peker callback-URLs feil.

Gjør følgende:

1. Sjekk at denne filen eksisterer, og lag den hvis ikke:
   src/app/auth/callback/route.ts

   Innhold skal være:
   ```typescript
   import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
   import { cookies } from 'next/headers'
   import { NextResponse } from 'next/server'

   export async function GET(request: Request) {
     const requestUrl = new URL(request.url)
     const code = requestUrl.searchParams.get('code')

     if (code) {
       const cookieStore = cookies()
       const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
       await supabase.auth.exchangeCodeForSession(code)
     }

     return NextResponse.redirect(new URL('/no/dashboard', request.url))
   }
   ```

2. Sjekk også at locale-versjonen finnes:
   src/app/[locale]/auth/callback/route.ts
   (Samme innhold, men redirect til `/${params.locale}/dashboard`)

3. Sjekk at NEXT_PUBLIC_SITE_URL er satt riktig i .env.local:
   NEXT_PUBLIC_SITE_URL=https://www.klarpakke.no

4. Sjekk alle steder i koden der Supabase auth.signInWithOAuth kalles.
   redirect-URL SKAL være: `${window.location.origin}/auth/callback`
   IKKE hardkodet til Cloudflare eller localhost.

5. Finn og fiks alle referanser til gamle Cloudflare-URLs:
   - Søk etter "klarpakke-trading.pages.dev" → erstatt med "www.klarpakke.no"
   - Søk etter "cloudflare" i hele prosjektet og fjern/oppdater

6. Test at auth-flyten kompilerer: npm run build

Commit: "fix: OAuth callback URLs for Vercel deployment"
```

---

## 🔧 KIMI CODE — Prompt 3: Koble dashboard til ekte data

```
I prosjektet ~/klarpakke, fjern all mock/hardkodet data fra dashboardet.

Nåværende problem: RealTradingDashboard.tsx viser hardkodede BTC/ETH-verdier
i stedet for ekte handler fra Supabase.

Gjør følgende:

1. I src/components/RealTradingDashboard.tsx:
   - Fjern all hardkodet portfolio-data og trades
   - Koble til Supabase med createClientComponentClient
   - Hent trades fra tabellen som matcher: trades eller paper_trades
   - Bruk Supabase Realtime for live-oppdatering:
     ```typescript
     const channel = supabase
       .channel('trades-realtime')
       .on('postgres_changes', {
         event: 'INSERT',
         schema: 'public',
         table: 'trades',
         filter: `user_id=eq.${user.id}`
       }, (payload) => {
         setTrades(prev => [payload.new, ...prev])
       })
       .subscribe()
     ```

2. Legg til en tom-tilstand:
   Hvis ingen trades finnes, vis:
   "Ingen handler ennå. Start din første auto-trading strategi! →"
   med en knapp som linker til /no/paper-trading

3. Sjekk at Supabase-klienten importeres riktig:
   ```typescript
   import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
   ```
   Hvis denne pakken ikke er installert: npm install @supabase/auth-helpers-nextjs

4. Portfolio-verdier (total verdi, daglig endring, etc.) skal beregnes
   fra faktiske trades, ikke hardkodes.

5. Test med: npm run build

Commit: "feat: connect dashboard to Supabase Realtime, remove mock data"
```

---

## 🔧 KIMI CODE — Prompt 4: Lag manglende page-routes

```
I prosjektet ~/klarpakke finnes mange komponenter uten tilhørende routes.

Lag disse page.tsx-filene (alle under src/app/[locale]/ for i18n):

1. src/app/[locale]/dashboard/page.tsx
   → Importer og vis RealTradingDashboard
   → Krev auth (redirect til /login hvis ikke innlogget)

2. src/app/[locale]/paper-trading/page.tsx
   → Importer PaperTradingDashboard
   → Krev auth

3. src/app/[locale]/live-trading/page.tsx
   → Importer RealTradingDashboard med mode="live"
   → Krev auth

4. src/app/[locale]/login/page.tsx
   → Importer LoginForm
   → Redirect til /dashboard hvis allerede innlogget

5. src/app/[locale]/settings/page.tsx
   → Importer SettingsForm
   → Krev auth

6. src/app/[locale]/signals/page.tsx
   → Importer SignalTable
   → Krev auth

For auth-sjekk, bruk dette mønsteret i hver page:
```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: { locale: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/${params.locale}/login`)
  }

  return <DashboardComponent />
}
```

Sørg for at alle routes fungerer med Next.js 15 App Router.
Test: npm run build

Commit: "feat: add all missing page routes with auth guards"
```

---

## 🔧 KIMI CODE — Prompt 5: Onboarding + AI-trener backend

```
I prosjektet ~/klarpakke, lag backend for onboarding og AI-trener.

DEL A — Supabase SQL (kjør i Supabase SQL Editor):

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  step_1_started boolean DEFAULT false,
  step_1_completed_at timestamptz,
  step_2_completed_at timestamptz,
  step_3_completed_at timestamptz,
  step_4_completed_at timestamptz,
  step_5_completed_at timestamptz,
  onboarding_complete boolean GENERATED ALWAYS AS (
    step_1_completed_at IS NOT NULL AND
    step_2_completed_at IS NOT NULL AND
    step_3_completed_at IS NOT NULL AND
    step_4_completed_at IS NOT NULL AND
    step_5_completed_at IS NOT NULL
  ) STORED,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own progress" ON public.onboarding_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.onboarding_progress
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert" ON public.onboarding_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create progress row on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.onboarding_progress (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_onboarding();

DEL B — Lag Edge Function for AI-trener:

Opprett filen: supabase/functions/explain-trade/index.ts

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { trade_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: trade } = await supabase
      .from('trades')
      .select('*')
      .eq('id', trade_id)
      .single()

    if (!trade) {
      return new Response(JSON.stringify({ error: 'Trade not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `Du er en norsk krypto-tradinglerer for Klarpakke.
Forklar handler enkelt på norsk. Maks 3 setninger.
Unngå fagspråk — bruk "automatisk brems" i stedet for "stop loss".
Vær oppmuntrende men ærlig om tap.`
        }, {
          role: 'user',
          content: `Forklar denne handelen for en nybegynner:
Par: ${trade.symbol}
Retning: ${trade.side}
Beløp: ${trade.amount} NOK
Strategi: ${trade.strategy_type}
Resultat: ${trade.pnl > 0 ? 'Gevinst' : 'Tap'} ${Math.abs(trade.pnl).toFixed(0)} NOK
Pris ved kjøp: ${trade.entry_price}
Pris nå: ${trade.current_price || trade.exit_price}`
        }],
        max_tokens: 200,
        temperature: 0.7
      })
    })

    const aiData = await response.json()

    return new Response(JSON.stringify({
      explanation: aiData.choices[0].message.content,
      trade_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

Deploy med: supabase functions deploy explain-trade
Legg til OPENAI_API_KEY i Supabase secrets:
  supabase secrets set OPENAI_API_KEY=sk-...

Commit: "feat: onboarding progress table + AI trade explainer Edge Function"
```

---

## 🎨 ANTIGRAVITY — Prompt 1: Paper/Live tvillingmodus-toggle

> Kjør ETTER Kimi Code-promptene er ferdige og bygget passerer.

```
Open the project ~/klarpakke. This is a Next.js 15 app with Tailwind CSS
and Framer Motion (framer-motion ^12.34.0) already installed.

Create a component: src/components/TradingModeToggle.tsx

Requirements:
- A pill-shaped toggle that switches between "📄 Paper" and "💰 Live" modes
- Paper mode: blue/teal color scheme (#0EA5E9 primary)
- Live mode: green/gold color scheme (#10B981 primary)
- Spring animation on the toggle knob (stiffness: 500, damping: 30)
- Cross-fade background color transition (0.3s ease)
- In Paper mode, show a subtle paper texture overlay (CSS noise pattern)
- The toggle sits in a nav bar and is always visible
- Uses React Context to share trading mode across the app:
  - Create src/context/TradingModeContext.tsx
  - Provider wraps the app in layout.tsx
  - Any component can use: const { mode, setMode } = useTradingMode()
- When switching modes, show a brief toast notification:
  "Byttet til Paper Trading" / "Byttet til Live Trading"
- The toggle should be ~200px wide, 40px tall, with rounded-full corners
- Use only Tailwind classes + Framer Motion. No additional dependencies.
- TypeScript strict mode compatible.
- Include the toggle in the existing Navigation component.

The component must export default and work standalone without required props.
```

---

## 🎨 ANTIGRAVITY — Prompt 2: Trade card-animasjon med konfetti

```
Open the project ~/klarpakke. Next.js 15, Tailwind, Framer Motion,
react-confetti (^6.4.0) already installed.

Create: src/components/trading/TradeCard.tsx

Requirements:
- An animated notification card that appears when a new trade executes
- Card springs in from the right side with Framer Motion:
  initial: { x: 400, opacity: 0 }
  animate: { x: 0, opacity: 1 }
  transition: { type: "spring", stiffness: 300, damping: 25 }
- Card shows:
  - Trade pair icon (BTC, ETH, etc) with colored circle background
  - Pair name (e.g. "BTC/USDT")
  - Direction badge: green "KJØP" or red "SALG"
  - Amount in NOK
  - P&L percentage with color (green positive, red negative)
  - Strategy name (DCA, Trend, Grid Bot)
  - Timestamp (relative: "2 min siden")
- If trade is profitable (pnl > 0):
  - Card border glows green briefly
  - Trigger react-confetti burst from the card's position
  - Confetti: 50 pieces, gravity 0.3, 2 second duration
- If trade is a loss:
  - Subtle red pulse on the border, no confetti
- Card auto-dismisses after 5 seconds with exit animation:
  exit: { x: 400, opacity: 0 }
- Stack multiple cards vertically with AnimatePresence
- Dark theme: bg-slate-800 card on bg-slate-900 background
- Include an AI explanation section at the bottom of the card:
  - Small text area showing the AI trainer's explanation
  - Fades in 1 second after card appears
  - Placeholder: "AI-treneren analyserer..."
- TypeScript, Tailwind only, no extra dependencies.

Props interface:
{
  trade: {
    id: string
    symbol: string
    side: 'buy' | 'sell'
    amount: number
    pnl: number
    pnl_pct: number
    strategy: string
    timestamp: string
    ai_explanation?: string
  }
  onDismiss: (id: string) => void
}
```

---

## 🎨 ANTIGRAVITY — Prompt 3: Onboarding flow med scroll-animasjoner

```
Open ~/klarpakke. Next.js 15, Tailwind, Framer Motion installed.

Create: src/components/onboarding/OnboardingFlow.tsx

Requirements:
- A 5-step onboarding wizard for new paper traders
- Full-screen overlay that shows after first login
- Progress bar at the top: 5 circles connected by a line, filled as steps complete
- Each step is a card that slides in from the bottom with spring animation

Step 1: "Start din første strategi"
  - Icon: 🚀
  - Description: "Velg en auto-trading strategi og sett et beløp"
  - Action button: "Velg strategi →"
  - Links to strategy selector

Step 2: "La strategien jobbe"
  - Icon: ⏳
  - Description: "Strategien din kjører automatisk. Kom tilbake om 3 dager."
  - Shows a countdown timer (3 days from activation)
  - Auto-completes when 3 days pass

Step 3: "Forstå en vinnerhandel"
  - Icon: 🎯
  - Description: "AI-treneren forklarer din første lønnsomme handel"
  - Shows a trade card (green) with AI explanation
  - Action: "Jeg forstår ✓"

Step 4: "Forstå en tapshandel"
  - Icon: 📉
  - Description: "Tap er en del av trading. AI-treneren forklarer hvorfor."
  - Shows a trade card (red) with AI explanation
  - Action: "Jeg forstår ✓"

Step 5: "Sammenlign med andre"
  - Icon: 🏆
  - Description: "Se hvordan din strategi matcher leaderboardet"
  - Shows a mini-leaderboard with the user highlighted
  - Action: "Fullfør onboarding 🎉"

Completion state:
  - Confetti burst (react-confetti)
  - Large text: "Du er klar for live trading!"
  - Badge animation: "🌱 Nybegynner"-badge fades in with scale spring
  - Button: "Fortsett til dashboard →" and "Prøv live trading →"

Visual:
  - Dark theme matching existing site (slate-900 background)
  - Cards: slate-800 with subtle border
  - Green accent for completed steps
  - Smooth AnimatePresence transitions between steps
  - Mobile-first: works on 375px screens

State management:
  - Reads/writes to Supabase table 'onboarding_progress'
  - Uses the existing Supabase client from the project
  - Each step completion updates the corresponding column

TypeScript strict, Tailwind only, Framer Motion for all animations.
```

---

## 🎨 ANTIGRAVITY — Prompt 4: Risikojustert leaderboard

```
Open ~/klarpakke. Next.js 15, Tailwind, Framer Motion, recharts installed.

Create: src/components/leaderboard/Leaderboard.tsx

Requirements:
- A risk-adjusted leaderboard showing top paper traders
- Default sort: risk-adjusted score (Sharpe-like ratio), NOT raw returns
- User can toggle sort: "Risikojustert" | "Avkastning" | "Lavest risiko"

Each row is a card showing:
  - Rank number with medal emoji for top 3 (🥇🥈🥉)
  - Display name (anonymized: "Trader_47" style)
  - Total return %: colored green/red
  - Risk score: 1-3 stars (⭐⭐⭐ = low risk, ⚠️ = high risk)
  - Max drawdown %
  - Strategy type badge (DCA, Trend, Grid)
  - Small sparkline chart (last 30 days P&L) using recharts
  - "Kopier" button (copy trade - links to copy trading feature)

Animations:
  - When sort changes, rows animate to new positions using layoutId
  - Spring physics: stiffness 400, damping 35
  - Rows that move UP glow green briefly
  - Rows that move DOWN pulse red briefly
  - New entries slide in from the left
  - Staggered entrance animation on initial load (50ms delay per row)

Special features:
  - Current user's row is highlighted with a blue border
  - "Du" label next to current user
  - If user is not in top 20, show their position at bottom with
    "... Du er på plass #47" separator

Data source: Supabase table 'leaderboard' (or mock data for now)

Visual:
  - Dark theme (slate-900/800)
  - Cards with subtle glassmorphism
  - Mobile responsive (stack columns on <640px)
  - Norwegian text throughout

TypeScript, Tailwind, Framer Motion, recharts for sparklines.
```

---

## 🎨 ANTIGRAVITY — Prompt 5: Landingsside med scroll-animasjoner

```
Open ~/klarpakke. Next.js 15, Tailwind, Framer Motion.

Redesign: src/components/landing/LandingPage.tsx

Keep the existing structure but add Apple-style scroll animations.
The page already has: Navigation, Hero, Features, SocialProof,
Testimonials, TrustBadges, Footer — all accepting a 'language' prop.

Add these scroll-triggered animations:

1. Hero section:
   - Title text reveals word-by-word with staggered fade-in
   - Subtitle fades in 0.3s after title
   - CTA buttons scale up with spring from 0.8 to 1.0
   - Background: animated gradient mesh that slowly shifts colors
   - Paper trading preview card floats in from the right with parallax

2. Features section:
   - Each feature card fades in and slides up when scrolled into view
   - Use Intersection Observer + Framer Motion whileInView
   - Stagger: 100ms between each card
   - Cards have subtle hover lift effect (translateY -4px)

3. Stats counter:
   - Numbers count up from 0 when scrolled into view
   - "25+ kurstimer" counts from 0 to 25
   - "1M kr virtuell kapital" counts from 0 to 1,000,000
   - Use requestAnimationFrame for smooth counting

4. Testimonials:
   - Cards slide in from alternating sides (left, right, left)
   - Subtle rotation on entry (-2deg to 0deg)

5. CTA section:
   - Sticky as user scrolls near bottom
   - Pulsing glow effect on the main CTA button
   - Confetti burst when user clicks "Start gratis"

Performance:
  - Use will-change: transform on animated elements
  - Lazy load below-fold sections
  - All animations respect prefers-reduced-motion

Keep ALL existing text content and translations.
Keep ALL existing component props and interfaces.
Only ADD animations — don't remove or restructure.

Norwegian language, dark theme, mobile-first.
```

---

## ⚡ KJØREREKKEFØLGE

```
DAG 1 (Kimi Code — fiks bygget):
  □ Prompt 1: Fix build errors          → npm run build passerer
  □ Prompt 2: Fix OAuth callbacks        → Login fungerer
  □ Prompt 3: Koble dashboard til data   → Ekte trades vises
  □ Prompt 4: Lag manglende routes       → Alle sider tilgjengelig
  □ git push → Vercel deployer → TEST LOGIN

DAG 2 (Kimi Code backend + Antigravity visuelt):
  □ Prompt 5: Onboarding + AI backend    → Supabase tabeller klare
  □ AG Prompt 1: Tvillingmodus-toggle    → Paper/Live switcher
  □ AG Prompt 2: Trade cards             → Animerte handelskort
  □ git push → TEST FULL FLOW

DAG 3 (Antigravity visuelt):
  □ AG Prompt 3: Onboarding flow         → 5-stegs wizard
  □ AG Prompt 4: Leaderboard             → Risikojustert ranking
  □ git push → TEST MED VENN

DAG 4 (Antigravity polish):
  □ AG Prompt 5: Landingsside animasjoner → Wow-faktor
  □ git push → SOFT LAUNCH
```

---

## 🔑 VIKTIG: Supabase Dashboard (manuelt, ikke Kimi/AG)

Disse MÅ gjøres manuelt i Supabase Dashboard parallelt med dag 1:

```
1. Authentication → URL Configuration:
   Site URL:        https://www.klarpakke.no
   Redirect URLs:   https://www.klarpakke.no/auth/callback
                    https://www.klarpakke.no/no/auth/callback
                    https://www.klarpakke.no/en/auth/callback
                    http://localhost:3000/auth/callback

2. Authentication → Providers:
   Google: Verifiser at Client ID + Secret er riktig
   GitHub: Verifiser callback URL

3. Google Cloud Console → APIs & Services → Credentials:
   Authorized redirect URIs:
     https://swfyuwkptusceiouqlks.supabase.co/auth/v1/callback

4. Vercel Dashboard → Settings → Environment Variables:
   Sjekk at disse finnes og er riktige:
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     NEXT_PUBLIC_SITE_URL = https://www.klarpakke.no
   Fjern alt som refererer til Cloudflare.
```
