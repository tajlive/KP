# 📚 Komplett Supports dokumentasjon - 9. April 2026

**Hentet fra:** Offisielle supportsider for alle tjenester
**Status:** ✅ Fullstendig lagret

---

## 📑 Innholdsfortegnelse

1. [Supabase](#supabase)
2. [Next.js](#nextjs)
3. [Vercel](#vercel)
4. [GitHub Actions](#github-actions)
5. [Resend](#resend)
6. [Stripe](#stripe)

---

## 🗄️ Supabase

### Quickstart: Next.js med Supabase

#### Opprette Supabase-prosjekt

```bash
# Via web
https://database.new

# Via Management API
export SUPABASE_ACCESS_TOKEN="your-access-token"

# List organisasjoner
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://api.supabase.com/v1/organizations

# Opprett prosjekt
curl -X POST https://api.supabase.com/v1/projects \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "<org-id>",
    "name": "My Project",
    "region": "us-east-1",
    "db_pass": "<your-secure-password>"
  }'
```

#### SQL Setup

```sql
-- Opprett tabell
create table instruments (
  id bigint primary key generated always as identity,
  name text not null
);

-- Sett inn data
insert into instruments (name)
values ('violin'), ('viola'), ('cello');

-- Aktiver RLS
alter table instruments enable row level security;

-- Policy for lesing
create policy "public can read instruments"
on public.instruments
for select to anon
using (true);
```

#### Next.js Setup

```bash
# Opprett Next.js app med Supabase
npx create-next-app -e with-supabase
```

**Miljøvariabler (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=<SUBSTITUTE_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<SUBSTITUTE_SUPABASE_PUBLISHABLE_KEY>
```

**Server Component:**
```tsx
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function InstrumentsData() {
  const supabase = await createClient();
  const { data: instruments } = await supabase.from("instruments").select();
  return <pre>{JSON.stringify(instruments, null, 2)}</pre>;
}

export default function Instruments() {
  return (
    <Suspense fallback={<div>Loading instruments...</div>}>
      <InstrumentsData />
    </Suspense>
  );
}
```

### Viktige lenker
- [Supabase Docs](https://supabase.com/docs)
- [API Reference](https://supabase.com/docs/reference)
- [Auth Guides](https://supabase.com/docs/guides/auth)

---

## ⚡ Next.js

### Deployment Options

| Deployment Option | Feature Support |
|------------------|-----------------|
| Node.js server | All |
| Docker container | All |
| Static export | Limited |
| Adapters | Platform-specific |

#### Node.js Server

**package.json:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

**Bygg og start:**
```bash
npm run build
npm run start
```

### Viktige konsepter

#### 1. Incremental Static Regeneration (ISR)

```typescript
// Revalider data uten redeploy
fetch('https://api.example.com/data', {
  next: { revalidate: 3600 } // Revalider hver time
});
```

**Fordeler med ISR:**
- Bedre ytelse med global CDN
- Zero-downtime rollouts
- Globale content updates på 300ms
- Cache + durable storage

#### 2. Server-Side Rendering (SSR)

- Scales to zero when not in use
- Scales automatically with traffic
- Zero-configuration Cache-Control headers
- Automatic Function creation

#### 3. Streaming

**Loading UI:**
```tsx
// loading.tsx - vises mens data lastes
export default function Loading() {
  return <div>Loading...</div>;
}
```

**Suspense:**
```tsx
import { Suspense } from 'react';

<Suspense fallback={<Loading />}>
  <SlowComponent />
</Suspense>
```

#### 4. Partial Prerendering (PPR) - Experimental

- Static shell serves umiddelbart
- Dynamic content streams inn
- Bra for dashboards

#### 5. Image Optimization

```tsx
import Image from 'next/image';

<Image 
  src="/photo.jpg" 
  alt="Photo" 
  width={800} 
  height={600} 
/>
```

#### 6. Font Optimization

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Layout({ children }) {
  return <body className={inter.className}>{children}</body>;
}
```

#### 7. OG Image Generation

```tsx
// app/api/og/route.tsx
import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    <div style={{ fontSize: 40 }}>Hello OG</div>,
    { width: 1200, height: 630 }
  );
}
```

#### 8. Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Kjører før hver request
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
```

### Templates
- [Docker](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
- [DigitalOcean](https://github.com/vercel/next.js/tree/canary/examples/with-docker-multi-env)
- [Fly.io](https://fly.io/docs/languages-and-frameworks/nextjs/)
- [Google Cloud Run](https://github.com/vercel/next.js/tree/canary/examples/with-google-cloud-run)
- [Render](https://github.com/render-examples/nextjs-hello-world)

### Viktige lenker
- [Next.js Docs](https://nextjs.org/docs)
- [App Router](https://nextjs.org/docs/app)
- [API Reference](https://nextjs.org/docs/api-reference)

---

## ▲ Vercel

### Next.js på Vercel

#### Komme i gang

**Eksisterende prosjekt:**
```bash
npm i -g vercel
vercel
```

**Nytt prosjekt:**
- Clone et Next.js example
- Deploy med Vercel-knappen

#### Preview Deployments

- Automatisk for hver pull request
- Unik URL for hver branch
- Produksjons-paritet

### Core Features

#### 1. Incremental Static Regeneration (ISR)

```typescript
// pages/index.tsx eller app/page.tsx
export async function getStaticProps() {
  const data = await fetchData();
  return {
    props: { data },
    revalidate: 60, // Sekunder
  };
}
```

**Vercel-fordeler:**
- Global CDN
- Zero-downtime rollouts
- 300ms global updates
- Durable storage

#### 2. Server-Side Rendering (SSR)

- Scales to zero
- Auto-scaling
- Smart Cache-Control

#### 3. Streaming

**Loading.tsx:**
```tsx
export default function Loading() {
  return <div>Loading data...</div>;
}
```

**Suspense:**
```tsx
<Suspense fallback={<Loading />}>
  <DataComponent />
</Suspense>
```

#### 4. Image Optimization

- On-demand optimization
- Modern formats (WebP, AVIF)
- Zero konfigurasjon

#### 5. Font Optimization

- Automatic self-hosting
- Zero layout shift
- Google Fonts support

#### 6. OG Image Generation

```tsx
// app/api/og/route.js
import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    <div>Hello World</div>,
    { width: 1200, height: 630 }
  );
}
```

**Fordeler:**
- Ingen headless browsers
- Automatisk CDN-caching
- Co-located med kode

#### 7. Middleware

```typescript
// middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  const { geo } = req;
  return NextResponse.next();
}
```

**Features:**
- Global deployment
- Geolocation
- Rewrites/redirects

#### 8. Draft Mode

- Preview CMS content
- Sikker (krever Vercel auth)
- Toolbar integration

#### 9. Web Analytics

```bash
npm install @vercel/analytics
```

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
      <Analytics />
    </html>
  );
}
```

**Metrics:**
- Top pages
- Referrers
- User demographics
- OS/browser/geolocation

#### 10. Speed Insights

```tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <SpeedInsights />
    </>
  );
}
```

**Web Vitals:**
- First Contentful Paint
- First Input Delay
- Core Web Vitals score

#### 11. Integrations

- MongoDB
- Sanity
- Andre tredjepartstjenester

### Viktige lenker
- [Vercel Docs](https://vercel.com/docs)
- [Next.js på Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Functions](https://vercel.com/docs/functions)

---

## 🐙 GitHub Actions

### Introduction

GitHub Actions er en CI/CD-plattform for automatisering av build, test og deployment.

### Quickstart

#### 1. Opprett workflow-fil

**`.github/workflows/github-actions-demo.yml`:**
```yaml
name: GitHub Actions Demo
run-name: ${{ github.actor }} is testing out GitHub Actions 🚀
on: [push]
jobs:
  Explore-GitHub-Actions:
    runs-on: ubuntu-latest
    steps:
      - run: echo "🎉 The job was automatically triggered by a ${{ github.event_name }} event."
      - run: echo "🐧 This job is now running on a ${{ runner.os }} server hosted by GitHub!"
      - run: echo "🔎 The name of your branch is ${{ github.ref }} and your repository is ${{ github.repository }}."
      - name: Check out repository code
        uses: actions/checkout@v5
      - run: echo "💡 The ${{ github.repository }} repository has been cloned to the runner."
      - run: echo "🖥️ The workflow is now ready to test your code on the runner."
      - name: List files in the repository
        run: |
          ls ${{ github.workspace }}
      - run: echo "🍏 This job's status is ${{ job.status }}."
```

#### 2. Workflow templates

GitHub tilbyr preconfigured templates:
- **CI** - Continuous Integration
- **Deployments** - Deployment workflows
- **Automation** - Automatisering
- **Code Scanning** - Sikkerhetsskanning
- **Pages** - Statisk hosting

#### 3. Se workflow results

1. Gå til repository på GitHub
2. Klikk **Actions** tab
3. Velg workflow i venstre sidebar
4. Klikk på run-navnet
5. Klikk på job-navnet under **Jobs**
6. Utvid steg for detaljer

### Viktige konsepter

- **Workflows** - Automatiserte prosesser
- **Events** - Triggers (push, PR, schedule)
- **Jobs** - Parallelle eller sekvensielle oppgaver
- **Steps** - Individuelle oppgaver i en job
- **Actions** - Gjenbrukbare komponenter
- **Runners** - Servere som kjører workflows

### Viktige lenker
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Starter workflows](https://github.com/actions/starter-workflows)

---

## 📧 Resend

### Introduction

Resend er en email API for utviklere.

### Quickstarts

#### Node.js

```bash
npm install resend
```

```javascript
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxx');

await resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'user@example.com',
  subject: 'Hello World',
  html: '<p>It works!</p>',
});
```

#### Next.js

```tsx
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  const { data, error } = await resend.emails.send({
    from: 'Acme <onboarding@resend.dev>',
    to: ['user@example.com'],
    subject: 'Hello world',
    react: EmailTemplate({ firstName: 'John' }),
  });

  if (error) return Response.json({ error }, { status: 500 });
  return Response.json(data);
}
```

### Features

#### Emails
- Visualisering av all aktivitet
- Sendegrad tracking
- Email previews

#### Domains
- Custom domains
- DNS konfigurasjon
- Deliverability monitoring

#### Webhooks
- Real-time events
- Bounce handling
- Delivery confirmations

### Viktige lenker
- [Resend Docs](https://resend.com/docs)
- [API Reference](https://resend.com/docs/api-reference)
- [SDKs](https://resend.com/docs/sdks)

---

## 💳 Stripe

### Stripe.js

#### Setup

**Inkludere Stripe.js:**
```html
<script src="https://js.stripe.com/v3/"></script>
```

**Initialisere:**
```javascript
const stripe = Stripe('pk_test_xxxxxxxx');
```

### Elements

#### Payment Element

```javascript
const elements = stripe.elements();
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');
```

#### Express Checkout Element

```javascript
const expressCheckout = elements.create('expressCheckout');
expressCheckout.mount('#express-checkout');
```

### React Stripe.js

```tsx
import { Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_xxxxxxxx');

function App() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}

function CheckoutForm() {
  return <PaymentElement />;
}
```

### Payment Intents

**Bekrefte betaling:**
```javascript
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://example.com/success',
  },
});
```

### Checkout

**Embedded Checkout:**
```javascript
const checkout = await stripe.initEmbeddedCheckout({
  clientSecret: 'pi_xxx_secret_xxx',
});

checkout.mount('#checkout');
```

### Viktige lenker
- [Stripe Docs](https://stripe.com/docs)
- [Stripe.js Reference](https://stripe.com/docs/js)
- [React Stripe.js](https://stripe.com/docs/stripe-js/react)

---

## 📝 Oppsummering

| Tjeneste | Hovedbruksområde | MCP Support |
|----------|-----------------|-------------|
| **Supabase** | Database, Auth, Realtime | ✅ |
| **Next.js** | React framework | N/A |
| **Vercel** | Hosting, CDN, Analytics | ✅ |
| **GitHub Actions** | CI/CD | ✅ |
| **Resend** | Email API | ✅ |
| **Stripe** | Betalinger | ✅ |

### Rask referanse

```bash
# Supabase
supabase db push
supabase functions deploy

# Next.js
npm run dev
npm run build
npm run start

# Vercel
vercel
vercel --prod

# GitHub Actions
# .github/workflows/*.yml

# Resend
npm install resend

# Stripe
npm install @stripe/stripe-js @stripe/react-stripe-js
```

---

*Dokumentasjon hentet: 9. April 2026*
*Kilder: Offisielle dokumentasjonssider*
