# 🔐 Security Setup Guide - Klarpakke

> **Komplett guide for å sikre Cloudflare Pages og Supabase i produksjon**

## 📋 Innholdsfortegnelse

1. [Cloudflare Security Setup](#cloudflare-security-setup)
2. [Supabase Security Configuration](#supabase-security-configuration)
3. [API Protection](#api-protection)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Checklist](#security-checklist)

---

## 🛡️ Cloudflare Security Setup

### 1. Security Headers (✅ Implementert)

Vi har allerede lagt til `public/_headers` med:

- **Content-Security-Policy (CSP)**: Blokkerer XSS-angrep
- **HSTS**: Tvinger HTTPS i 1 år
- **X-Frame-Options**: Forhindrer clickjacking
- **X-Content-Type-Options**: Stopper MIME-sniffing
- **Permissions-Policy**: Begrenser tilgang til kamera, mikrofon, etc.

### 2. Cloudflare WAF (Web Application Firewall)

#### Aktivere Managed Rulesets:

```bash
# Via Cloudflare Dashboard:
1. Gå til Security > WAF
2. Aktiver "Cloudflare Managed Ruleset"
3. Aktiver "OWASP Core Ruleset"
4. Sett Sensitivity til "Medium" for start
```

#### Custom Rules for API Protection:

**Rate Limiting på Auth endpoints:**
```
(http.request.uri.path eq "/api/auth/signin" or 
 http.request.uri.path eq "/api/auth/signup") and 
(ip.geoip.country ne "NO" and ip.geoip.country ne "SE" and ip.geoip.country ne "DK")
```
**Action**: Challenge (Captcha)

**Blokkere SQL Injection forsøk:**
```
(http.request.uri.query contains "union" or 
 http.request.uri.query contains "select" or 
 http.request.uri.query contains "drop") and 
 http.request.uri.path contains "/api/"
```
**Action**: Block

### 3. Rate Limiting

**Anbefalt konfigurasjon:**

| Endpoint | Rate Limit | Tidsvindu |
|----------|------------|------------|
| `/api/auth/*` | 5 requests | 1 minutt |
| `/api/checkout/*` | 3 requests | 5 minutter |
| `/api/signals` | 60 requests | 1 minutt |
| `/api/*` (general) | 100 requests | 1 minutt |

**Implementering:**
```javascript
// Via Cloudflare Workers (hvis nødvendig):
export default {
  async fetch(request, env) {
    const rateLimiter = new RateLimiter({
      key: request.headers.get('cf-connecting-ip'),
      limit: 100,
      window: 60
    });
    
    if (!await rateLimiter.check()) {
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    return fetch(request);
  }
};
```

### 4. Bot Protection

**Aktiver Bot Fight Mode:**
```bash
1. Gå til Security > Bots
2. Aktiver "Bot Fight Mode" (gratis tier)
3. For Pro: Aktiver "Super Bot Fight Mode"
```

**JavaScript Challenge for suspicious traffic:**
- Aktiverer automatisk Captcha for bots
- Blokkerer kjente dårlige bots

### 5. DDoS Protection

**Cloudflare's HTTP DDoS Attack Protection** (aktivert automatisk):
- Layer 7 DDoS mitigation
- Adaptive rate limiting
- Challenge bad actors

### 6. HSTS Configuration

**Aktiver HSTS (HTTP Strict Transport Security) i Cloudflare:**

```bash
1. Gå til SSL/TLS > Edge Certificates
2. Skru på "Always Use HTTPS"
3. Aktiver "Automatic HTTPS Rewrites"
4. Under "HSTS" → Enable HSTS
   - Max-Age: 31536000 (1 år)
   - Include subdomains: ✅
   - No-Sniff: ✅
```

**Sjekk:** `curl -I https://klarpakke.no | grep -i strict-transport`

---

## 🗄️ Supabase Security Configuration

### 1. Row Level Security (RLS)

**KRITISK:** Alle tabeller MÅ ha RLS aktivert!

```sql
-- Aktiver RLS på alle tabeller
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Eksempel: Users kan bare se sine egne data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Eksempel: Users kan bare oppdatere sine egne data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Eksempel: Kun autentiserte users kan lese trades
CREATE POLICY "Authenticated users can read trades"
  ON trades FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

### 2. Authentication Settings

**Anbefalt konfigurasjon i Supabase Dashboard:**

```yaml
Authentication Settings:
  Email Confirmations: ✅ Enabled
  Email Change Confirmations: ✅ Enabled
  Password Requirements:
    Minimum Length: 12 characters
    Require Uppercase: ✅
    Require Lowercase: ✅
    Require Numbers: ✅
    Require Special Characters: ✅
  
  Session Settings:
    JWT Expiry: 3600 (1 hour)
    Refresh Token Rotation: ✅ Enabled
    Reuse Interval: 10 seconds
  
  Security:
    Enable Captcha: ✅ (for signup/signin)
    Max Password Attempts: 5
    Lockout Duration: 600 seconds (10 min)
```

### 3. API Keys & Secrets

**ALDRI eksponere disse i frontend:**
- ❌ `SUPABASE_SERVICE_ROLE_KEY` (kun backend!)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (OK i frontend)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (OK i frontend)

**Lagre secrets som environment variables:**
```bash
# .env.local (ALDRI commit til Git!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare Pages Environment Variables:
# Dashboard > Settings > Environment Variables
```

### 4. Database Network Security

**Supabase Dashboard > Settings > Database:**

```yaml
Network Restrictions:
  Enable SSL: ✅ Required
  Connection Pooling: ✅ Enabled (Mode: Transaction)
  
  IP Allowlist (optional):
    - Cloudflare IP ranges only
    - Your office IP
    - CI/CD pipeline IPs
```

### 5. Storage Security

```sql
-- Lag policies for storage buckets
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**Storage buckets configuration:**
```yaml
Bucket: user-uploads
  Public: ❌ Private
  File Size Limit: 5 MB
  Allowed MIME Types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  
Bucket: public-assets
  Public: ✅ Public
  File Size Limit: 2 MB
  Allowed MIME Types: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
```

---

## 🛡️ API Protection

### 1. Input Validation

```typescript
// Bruk Zod for validering
import { z } from 'zod';

const tradeSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/),
  quantity: z.number().positive().max(10000),
  price: z.number().positive(),
  type: z.enum(['BUY', 'SELL']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = tradeSchema.parse(body); // Throws if invalid
    
    // Continue with validated data...
  } catch (error) {
    return new Response('Invalid input', { status: 400 });
  }
}
```

### 2. Authentication Middleware

```typescript
// src/lib/auth-middleware.ts
import { createServerClient } from '@supabase/ssr';

export async function requireAuth(request: Request) {
  const supabase = createServerClient(/*...*/);
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  return session;
}

// Bruk i API routes:
export async function GET(request: Request) {
  const session = await requireAuth(request);
  if (session instanceof Response) return session; // Auth failed
  
  // Continue with authenticated request...
}
```

### 3. CORS Configuration

```typescript
// Kun tillat requests fra ditt domene
const allowedOrigins = [
  'https://klarpakke.no',
  'https://www.klarpakke.no',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean);

export function corsHeaders(origin: string | null) {
  if (!origin || !allowedOrigins.includes(origin)) {
    return {}; // No CORS headers for disallowed origins
  }
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
```

---

## 📊 Monitoring & Alerts

### 1. Cloudflare Analytics

**Overvåk:**
- Requests per minutt
- Bandwidth usage
- Threat score distribution
- Top blocked IPs/countries
- Bot traffic patterns

### 2. Supabase Monitoring

**Dashboard > Database > Logs:**
- Failed authentication attempts
- Slow queries (> 1s)
- RLS policy violations
- Unusual data access patterns

### 3. Alerts (GitHub Actions)

Vi har allerede satt opp monitoring som sjekker:
- ✅ Site uptime (hver 15 min)
- ✅ SSL certificate expiry
- ✅ API endpoint health
- ✅ Response times

---

## ✅ Security Checklist

### Cloudflare
- [x] Security headers konfigurert (`_headers` file)
- [ ] WAF Managed Rulesets aktivert
- [ ] Rate limiting konfigurert for API endpoints
- [ ] Bot Fight Mode aktivert
- [ ] DDoS protection verifisert
- [ ] Custom firewall rules for geo-blocking
- [ ] SSL/TLS set to "Full (strict)"
- [ ] Always Use HTTPS aktivert
- [ ] HTTP Strict Transport Security (HSTS) aktivert

### Supabase
- [ ] RLS aktivert på ALLE tabeller
- [ ] RLS policies testet og verifisert
- [ ] Email confirmation påkrevd
- [ ] Sterke passord-krav konfigurert
- [ ] JWT expiry satt til 1 time
- [ ] Refresh token rotation aktivert
- [ ] Service Role Key KUN i backend
- [ ] Storage bucket policies konfigurert
- [ ] Database SSL påkrevd
- [ ] IP allowlist vurdert (optional)

### Application
- [x] Input validation på alle API endpoints
- [x] Authentication middleware implementert
- [ ] CORS korrekt konfigurert
- [ ] Error messages skjuler sensitive data
- [ ] Secrets lagret som environment variables
- [ ] Rate limiting på auth endpoints
- [ ] Logging av security events
- [ ] Regular dependency updates

### Monitoring
- [x] GitHub Actions monitoring aktivert
- [x] Health checks hver 15 min
- [ ] Sentry error tracking (TODO)
- [ ] Uptime monitoring (UptimeRobot/Better Uptime)
- [ ] Security alerts til Slack/Discord
- [ ] Regular security audits scheduled

---

## 🚀 Implementering

### 1. Deploy Security Headers
```bash
git pull origin main
npm run build
npm run deploy
```

### 2. Konfigurer Cloudflare (via Dashboard)
1. Gå til https://dash.cloudflare.com/
2. Velg klarpakke.no domenet
3. Følg stegene ovenfor for WAF, Rate Limiting, og Bot Protection

### 3. Konfigurer Supabase (via Dashboard)
1. Gå til https://supabase.com/dashboard/
2. Velg klarpakke project
3. Følg stegene ovenfor for RLS, Auth, og Storage

### 4. Verifiser Security Headers
```bash
curl -I https://klarpakke.no | grep -i 'security\|frame\|content'
```

---

## 📚 Ressurser

- [Cloudflare Security Best Practices](https://developers.cloudflare.com/fundamentals/basic-tasks/protect-your-site/)
- [Supabase Security Guide](https://supabase.com/docs/guides/platform/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)

---

**Sist oppdatert:** 02.02.2026  
**Vedlikeholdt av:** Klarpakke Autonomous AI Agent
