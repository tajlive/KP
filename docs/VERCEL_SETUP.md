# Vercel Production Setup Guide for Klarpakke

## 1. Domains

In Vercel Dashboard -> Settings -> Domains:

- Add `www.klarpakke.no` as standard.
- Add `klarpakke.no` with redirect to `www.klarpakke.no`.

## 2. DNS Configuration (Cloudflare)

Siden du bruker Cloudflare, må du sette opp følgende i Cloudflare Dashboard -> DNS -> Records:

### www.klarpakke.no

- **Type:** `CNAME`
- **Name:** `www`
- **Target:** `cname.vercel-dns.com` (Endre fra `a9c05bc93bdbef6b.vercel-dns-017.com`)
- **Proxy status:** `DNS only` (Grå sky)

### klarpakke.no (apex)

- **Type:** `A`
- **Name:** `@`
- **IP Address:** `76.76.21.21` (Endre fra `216.198.79.1`)
- **Proxy status:** `DNS only` (Grå sky)

> [!TIP]
> Du kan bruke scriptet `scripts/update-dns-vercel.sh` for å automatisere dette via Cloudflare API hvis du har satt `CLOUDFLARE_API_TOKEN` i `.env.local`.

## 3. Environment Variables

Sett variablene fra `.env.production.template` i Vercel Settings -> Environment Variables.

## 4. Sentry Integration

Aktiver Sentry i Vercel. Dette vil automatisk sette `SENTRY_AUTH_TOKEN`. Verifiser at `NEXT_PUBLIC_SENTRY_DSN` er satt.

## 5. Verification

Kjør `npm run verify` for å sjekke om alt fungerer.
