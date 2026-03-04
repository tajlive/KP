# 🌐 Custom Domain Setup - klarpakke.no

**Domain:** klarpakke.no  
**Target:** Cloudflare Pages (klarpakke-trading.pages.dev)  
**SSL:** Automatic (Cloudflare Universal SSL)  
**Estimated time:** 5-10 minutes

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
# Test root domain
curl -I https://klarpakke.no
# Expected: HTTP/2 200

# Test www subdomain
curl -I https://www.klarpakke.no
# Expected: HTTP/2 200 or 301 redirect

# Test HTTP redirect
curl -I http://klarpakke.no
# Expected: 301 redirect to https://
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
# Check CNAME record
dig klarpakke.no CNAME +short
# Expected: klarpakke-trading.pages.dev

# Check SSL certificate
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

# Check SSL certificate
curl -vI https://klarpakke.no 2>&1 | grep -i ssl

# Test from different location
curl -H "Host: klarpakke.no" https://klarpakke-trading.pages.dev

# Verify HTTP → HTTPS redirect
curl -I http://klarpakke.no | grep -i location

# Check response time
curl -o /dev/null -s -w 'Total: %{time_total}s\n' https://klarpakke.no
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

**Status:** Ready for setup  
**Estimated time:** 5-10 minutes  
**Next:** Follow Method 1 (Cloudflare Dashboard)
