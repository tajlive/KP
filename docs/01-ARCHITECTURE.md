# Architecture

> **Versjon:** 1.0.0  
> **Oppdatert:** 2026-02-10  
> **For:** Utviklere, AI-agenter

---

## Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Klient (Bruker)                          │
│                     Next.js 15 + React 18                       │
│                   TypeScript Strict + Tailwind                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                             │
│                 CDN + DDoS + SSL + Edge                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Platform                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Auth      │  │  Postgres   │  │   Realtime  │             │
│  │  (OAuth)    │  │  (RLS)      │  │  (WebSocket)│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Stripe (Payments)                             │
│              Subscriptions + Webhooks                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Choices

### Frontend

| Teknologi | Versjon | Begrunnelse |
|-----------|---------|-------------|
| Next.js | 15.2.2 | App Router, SSG/SSR hybrid, beste Cloudflare-støtte |
| React | 18.2.0 | Concurrent features, Suspense |
| TypeScript | 5.3.0 | Strict mode, type safety |
| Tailwind CSS | 3.4.0 | Utility-first, konsistent design |
| next-intl | 4.8.2 | i18n med App Router |

**Hvorfor Next.js App Router?**
- Se [ADR-001: Next.js over Remix](adr/001-next-vs-remix.md)

### Backend

| Teknologi | Versjon | Begrunnelse |
|-----------|---------|-------------|
| Supabase | Latest | Postgres + Auth + Realtime i ett |
| PostgreSQL | 15+ | ACID, RLS, JSON support |
| Row Level Security | Native | Database-level access control |

**Hvorfor Supabase?**
- Se [ADR-002: Supabase over Firebase](adr/002-supabase-vs-firebase.md)

### Infrastructure

| Teknologi | Bruk |
|-----------|------|
| Cloudflare Pages | Hosting, CDN, SSL |
| Supabase | Database, Auth, Edge Functions |
| Stripe | Betalinger |
| Resend | Transactional email |

**Deploy:** Manuell fra lokal maskin via Wrangler CLI

**Hvorfor Cloudflare?**
- Se [ADR-003: Cloudflare over Vercel](adr/003-cloudflare-vs-vercel.md)

---

## Data Flow

### Typical Request Flow

```
1. Bruker besøker www.klarpakke.no
        ↓
2. Cloudflare Pages serverer Next.js (SSG/SSR)
        ↓
3. Next.js rendrer side (Server Component)
        ↓
4. Hvis data trengs:
   a. Server Component kaller Supabase
   b. Supabase Auth validerer JWT
   c. RLS policies sjekkes
   d. Query kjøres på Postgres
        ↓
5. Data returneres til komponent
        ↓
6. HTML sendes til bruker (hydrated av React)
```

### Authentication Flow

```
1. Bruker logger inn (email/password eller OAuth)
        ↓
2. Supabase Auth validerer credentials
        ↓
3. JWT token genereres (1 uke expiry)
        ↓
4. Token lagres i httpOnly cookie
        ↓
5. Ved hver request:
   a. Token sendes i Authorization header
   b. Supabase validerer token
   c. auth.uid() er tilgjengelig i RLS
```

---

## Project Structure

```
klarpakke/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/          # i18n routes (no, en)
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── dashboard/
│   │   │   ├── priser/
│   │   │   ├── simulator/
│   │   │   └── ...
│   │   └── admin/             # Admin dashboard
│   │       ├── layout.tsx     # Admin layout med auth
│   │       ├── page.tsx       # Admin dashboard
│   │       ├── students/
│   │       ├── auto-trading/
│   │       └── ...
│   ├── components/            # React komponenter
│   │   ├── ui/               # Shadcn/ui komponenter
│   │   ├── layout/           # Layout-komponenter
│   │   └── ...
│   ├── lib/                   # Utilities
│   │   ├── supabase/         # Supabase clients
│   │   ├── portfolio.ts      # Portfolio queries
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript types
├── supabase/
│   └── migrations/            # Database migrations
│       ├── 001_profiles.sql
│       └── ...
├── scripts/                   # Automation scripts
│   ├── full-deploy.sh
│   ├── test-migrations.sh
│   └── ...
├── tests/
│   └── e2e/                  # Playwright tests
├── docs/                      # Dokumentasjon
├── .ai/                       # AI context
└── messages/                  # i18n translations
    ├── no.json
    └── en.json
```

---

## Security Layers

```
Layer 1: Cloudflare
├── DDoS protection
├── Rate limiting
├── SSL/TLS
└── WAF rules

Layer 2: Next.js
├── Middleware (auth redirects)
├── Route protection
└── CSRF protection

Layer 3: Supabase
├── JWT validation
├── Row Level Security (RLS)
├── Prepared statements (SQL injection protection)
└── Connection pooling

Layer 4: Application
├── Input validation (Zod)
├── Output encoding
└── Error handling (ikke leak sensitive info)
```

---

## Key Architectural Decisions

### 1. Server Components by Default

```typescript
// ✅ Good - Server Component (default)
export default async function DashboardPage() {
  const user = await getUser();
  const portfolio = await getPortfolio(user.id);
  return <Dashboard data={portfolio} />;
}

// Client Component kun når nødvendig
"use client";
export function InteractiveChart() {
  const [data, setData] = useState();
  // ...
}
```

**Begrunnelse:**
- Mindre JavaScript til klient
- Direkte database-tilgang fra server
- Bedre SEO
- Enklere data fetching

### 2. RLS for Authorization

```sql
-- Policy eksempel
CREATE POLICY "Users can only see own data"
ON portfolios FOR SELECT
USING (auth.uid() = user_id);
```

**Begrunnelse:**
- Database-level sikkerhet
- Kan ikke bypasses av bugs i applikasjon
- Se [ADR-005: RLS over middleware](adr/005-rls-vs-middleware.md)

### 3. i18n med next-intl

```typescript
// [locale]/layout.tsx
export default async function LocaleLayout({
  children,
  params: { locale }
}) {
  const messages = await import(`@/messages/${locale}.json`);
  return (
    <NextIntlClientProvider messages={messages.default}>
      {children}
    </NextIntlClientProvider>
  );
}
```

**Begrunnelse:**
- SEO-vennlig (subpaths: /no/, /en/)
- Server-side rendering
- Type-safe translations

---

## Performance Considerations

### Static Generation (SSG)
- Landing pages
- Priser
- Dokumentasjon

### Server-Side Rendering (SSR)
- Dashboard (bruker-spesifikk data)
- Admin panel
- Kurs-sider med progress

### Client-Side Rendering (CSR)
- Simulator (sanntids-data)
- Charts
- Interactive widgets

### Caching Strategy

```typescript
// Static page
export const revalidate = 3600; // 1 time

// Dynamic page
export const dynamic = 'force-dynamic';

// API route
export const revalidate = 0; // Ingen cache
```

---

## Scalability

### Horizontal Scaling
- Cloudflare Pages: Auto-scale
- Supabase: Connection pooling

### Database
- Indexer på alle foreign keys
- Partial indexes for filtrerte queries
- Materialized views for leaderboard

### Future Considerations
- Redis for caching (hvis nødvendig)
- CDN for assets
- Image optimization (Next.js Image)

---

## Monitoring

### Health Checks
- `/api/health` - Database + API status
- GitHub Actions - Automated testing
- Cloudflare Analytics - Traffic

### Error Tracking
- Sentry (planlagt)
- Supabase Logs
- Cloudflare Logs

---

## Related Documents

- [DATABASE.md](02-DATABASE.md) - Schema details
- [SECURITY.md](09-SECURITY.md) - Security deep-dive
- [DEPLOYMENT.md](04-DEPLOYMENT.md) - Deploy process
