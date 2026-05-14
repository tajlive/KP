# 🌐 Custom Domain Setup - klarpakke.no

> ⚠️ **MIGRERT TIL FLY.IO (2026-05-14)**  
> Tidligere target var Cloudflare Pages (`klarpakke-trading.pages.dev`).  
> Nåværende setup: **Fly.io** (`klarpakke.fly.dev`) via Cloudflare DNS (proxied).

**Domain:** klarpakke.no  
**Target:** Fly.io (`klarpakke.fly.dev`)  
**SSL:** Let's Encrypt (managed by Fly.io) + Cloudflare Universal SSL  
**Estimated time:** 5-10 minutes

---

## 🗺️ Arkitektur (Gjeldende)

```
Bruker → Cloudflare Proxy (CDN/DDoS) → Fly.io Edge (TLS termination)
                                      → Fly.io App (klarpakke)
                                      → Region: arn (Stockholm)
```

**DNS-konfigurasjon:**
| Type | Name | Target | Proxy |
|---|---|---|---|
| A | `@` | `66.241.125.203` | 🟠 Orange |
| AAAA | `@` | `2a09:8280:1::115:823c:0` | 🟠 Orange |
| CNAME | `www` | `ro0w9zm.klarpakke.fly.dev` | 🟠 Orange |

**Redirect:** `klarpakke.no` → `www.klarpakke.no` (301)

---

## 📋 Prerequisites

- ✅ Cloudflare Pages deployment live (klarpakke-trading.pages.dev)
- ✅ Domain registered: klarpakke.no
- ✅ Access to domain registrar (Domeneshop)

---

## 🎯 METHOD 1: Via Cloudflare Dashboard (Recommended)

### Step 1: Add Custom Domain in Cloudflare Pages

1. Go to: **https://dash.cloudflare.com**
2. Navigate to: **Workers & Pages** → **klarpakke-trading**
3. Click the **Custom domains** tab
4. Click **Set up a custom domain**
5. Enter: `klarpakke.no`
6. Click **Continue**

### Step 2: Verify Domain Ownership

Cloudflare will show you DNS records to add:

**Option A: If klarpakke.no is already on Cloudflare:**
- DNS records will be added automatically ✅
- Skip to Step 3

**Option B: If klarpakke.no is NOT on Cloudflare:**
- You'll need to add DNS records manually at Domeneshop
- See "DNS Configuration" section below

### Step 3: DNS Configuration (Manual - if needed)

If domain is at **Domeneshop** (or other registrar):

1. Log in to: **https://www.domeneshop.no**
2. Go to: **DNS settings** for klarpakke.no
3. Add these records:

```dns
# Root domain
Type: CNAME
Name: @
Target: klarpakke-trading.pages.dev
TTL: 3600 (1 hour)

# WWW subdomain
Type: CNAME
Name: www
Target: klarpakke-trading.pages.dev
TTL: 3600 (1 hour)
```

**Important Notes:**
- Some DNS providers don't allow CNAME on root (@)
- If CNAME fails, use A records instead:
  - Cloudflare will provide IP addresses
  - Usually shown in Pages dashboard

### Step 4: Wait for DNS Propagation

**Typical times:**
- Cloudflare: 2-5 minutes ⚡
- Domeneshop: 5-15 minutes ⏱️
- Full global propagation: Up to 48 hours (rare)

**Check propagation:**
```bash
# Check DNS resolution
dig klarpakke.no
nslookup klarpakke.no

# Check specific nameserver
dig @8.8.8.8 klarpakke.no

# Online tool
# https://www.whatsmydns.net/#CNAME/klarpakke.no
```

### Step 5: Verify SSL Certificate

1. Cloudflare automatically provisions SSL certificate
2. Wait 2-5 minutes after DNS propagation
3. Test: **https://klarpakke.no**
4. You should see 🔒 green padlock

**If SSL fails:**
- Go to: Cloudflare → SSL/TLS → Overview
- Set mode to: **Full (strict)**
- Enable: **Always Use HTTPS**
- Wait 5 minutes and retry

---

## 🎯 METHOD 2: Via Wrangler CLI

```bash
# Add custom domain
wrangler pages domain add klarpakke.no --project-name klarpakke-trading

# List domains
wrangler pages domain list --project-name klarpakke-trading

# Verify status
wrangler pages domain get klarpakke.no --project-name klarpakke-trading
```

---

## 🎯 METHOD 3: Automated Script

I've created an automated setup script:

```bash
# From your klarpakke directory
chmod +x scripts/setup-domain.sh
./scripts/setup-domain.sh
```

The script will:
1. ✅ Verify Cloudflare credentials
2. ✅ Add custom domain via API
3. ✅ Configure DNS (if possible)
4. ✅ Enable SSL
5. ✅ Verify setup

---

## ✅ Verification Checklist

### Test All URLs:

```bash
# Test root domain (should redirect to www)
curl -I https://klarpakke.no
# Expected: HTTP/2 301 → https://www.klarpakke.no/

# Test www subdomain
curl -I https://www.klarpakke.no
# Expected: HTTP/2 200

# Test HTTP redirect
curl -I http://klarpakke.no
# Expected: 301 redirect to https://

# Verify Fly.io origin response
curl -I https://klarpakke.fly.dev/no/
# Expected: HTTP/2 200
```

### Fly.io Certificate Status:

```bash
# Check certificate validation
flyctl certs check klarpakke.no --app klarpakke
flyctl certs check www.klarpakke.no --app klarpakke

# List all certificates
flyctl certs list --app klarpakke

# Check app status
flyctl status --app klarpakke
```

### Browser Tests:

- [ ] Open https://klarpakke.no - works ✅
- [ ] Open https://www.klarpakke.no - works ✅
- [ ] Open http://klarpakke.no - redirects to HTTPS ✅
- [ ] Green padlock (SSL) visible 🔒
- [ ] Logo displays correctly
- [ ] Favicon shows in tab
- [ ] Mobile responsive (test on phone)

### DNS Verification:

```bash
# Check A record (returns Cloudflare edge IPs when proxied)
dig klarpakke.no A +short

# Check AAAA record
dig klarpakke.no AAAA +short

# Check www CNAME
dig www.klarpakke.no CNAME +short
# Expected: ro0w9zm.klarpakke.fly.dev

# Check SSL certificate (Fly.io Let's Encrypt)
openssl s_client -connect klarpakke.no:443 -servername klarpakke.no < /dev/null 2>/dev/null | openssl x509 -noout -dates
# Should show valid dates
```

---

## 🔧 Troubleshooting

### Problem: DNS not resolving

**Solution:**
```bash
# Clear local DNS cache
# macOS:
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Windows:
ipconfig /flushdns

# Linux:
sudo systemd-resolve --flush-caches
```

### Problem: SSL certificate error

**Solution:**
1. Cloudflare Dashboard → SSL/TLS
2. Set to: **Full (strict)**
3. Edge Certificates → Enable:
   - Always Use HTTPS ✅
   - Automatic HTTPS Rewrites ✅
   - Opportunistic Encryption ✅
4. Wait 5 minutes

### Problem: "Too many redirects" error

**Solution:**
- Cloudflare SSL mode is wrong
- Change to: **Full** or **Full (strict)**
- NOT "Flexible"

### Problem: Domain shows Cloudflare default page

**Solution:**
1. Verify custom domain is added in Pages dashboard
2. Check DNS CNAME points to correct target
3. Wait 5-10 minutes for changes to propagate

---

## 🚀 Post-Setup Optimization

### 1. Enable Cloudflare Performance Features

**Go to:** Cloudflare Dashboard → klarpakke.no domain

**Speed:**
- [x] Auto Minify (HTML, CSS, JS)
- [x] Brotli compression
- [x] HTTP/3 (with QUIC)
- [x] 0-RTT Connection Resumption

**Caching:**
- [x] Caching Level: Standard
- [x] Browser Cache TTL: 4 hours
- [x] Always Online: On

### 2. Security Headers

Add to `public/_headers` (Cloudflare Pages):

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 3. SEO Configuration

**Update sitemap:**
- Ensure `sitemap.xml` uses https://klarpakke.no
- Submit to Google Search Console

**Update robots.txt:**
```
User-agent: *
Allow: /
Sitemap: https://klarpakke.no/sitemap.xml
```

---

## 📊 Analytics Setup

### Update Analytics with New Domain:

**Google Analytics:**
1. Admin → Data Streams
2. Update URL to: `https://klarpakke.no`

**PostHog:**
1. Project Settings → General
2. Update URL to: `https://klarpakke.no`

**Sentry:**
1. Project Settings → General
2. Add allowed domain: `klarpakke.no`

---

## 🔗 Useful Commands

```bash
# Check current DNS
dig klarpakke.no +short
dig www.klarpakke.no CNAME +short

# Check SSL certificate
curl -vI https://klarpakke.no 2>&1 | grep -i ssl

# Verify HTTP → HTTPS redirect
curl -I http://klarpakke.no | grep -i location

# Check response time via custom domain
curl -o /dev/null -s -w 'Total: %{time_total}s\n' https://www.klarpakke.no

# Check response time via Fly.io directly
curl -o /dev/null -s -w 'Total: %{time_total}s\n' https://klarpakke.fly.dev/no/

# Fly.io logs
flyctl logs --app klarpakke

# Fly.io deploy (from GitHub Actions)
# See: .github/workflows/deploy-fly.yml
```

---

## 📞 Support

**Cloudflare Issues:**
- Dashboard: https://dash.cloudflare.com
- Support: https://support.cloudflare.com
- Community: https://community.cloudflare.com

**Domeneshop Issues:**
- Support: https://domene.shop/support
- Phone: +47 72 47 47 00

**DNS Propagation Check:**
- https://www.whatsmydns.net
- https://dnschecker.org

---

## ✅ Success Criteria

- [x] https://klarpakke.no loads successfully
- [x] https://www.klarpakke.no works
- [x] HTTP redirects to HTTPS
- [x] SSL certificate valid (green padlock)
- [x] Logo and favicon display
- [x] Mobile responsive
- [x] Page load time < 2 seconds
- [x] All internal links work

---

## 🏗️ Build & Deploy Pipeline (Fly.io)

**Arkitektur:** GitHub Actions pre-build + runtime-only Dockerfile

```yaml
# .github/workflows/deploy-fly.yml
1. GitHub Actions runner: npm ci + npm run build (4096MB heap)
2. Dockerfile: kopierer .next/standalone (runtime-only)
3. flyctl deploy --remote-only (sender pre-built image)
4. Verifiserer: klarpakke.fly.dev + www.klarpakke.no
```

**Viktige env-variabler i build:**
- `NEXT_PUBLIC_APP_URL=https://www.klarpakke.no`
- `NODE_OPTIONS=--max-old-space-size=4096`
- `TURBOPACK=0`
- `FLY_IO=1`

**VM-konfigurasjon (fly.toml):**
- Memory: 4GB
- CPU: performance, 2 cores
- Region: arn (Stockholm)
- Auto-stop: enabled (scales to zero)

---

## 📜 Historikk

| Dato | Endring |
|---|---|
| 2026-02-20 | Opprinnelig setup: Cloudflare Pages |
| 2026-05-14 | **Migrert til Fly.io** — GitHub Actions pre-build + runtime Dockerfile |

---

**Status:** ✅ Active on Fly.io  
**Primary domain:** https://www.klarpakke.no  
**Fly.io domain:** https://klarpakke.fly.dev
