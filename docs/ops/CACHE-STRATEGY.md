# Cache-strategi for Klarpakke

> Sist: 2026-07-07 av Hermes Lead Architect

## Nåværende

| Lag | Status |
|-----|--------|
| **ISR** | `revalidate: 3600` på `/priser`, `/om-oss`, `/kontakt` |
| **Statisk** | Alle markedsføringssider regenereres hver time |
| **CDN** | Cloudflare cache (default edge cache) |
| **Bilder** | AVIF/WEBP, 30-dagers cache, Cloudflare Images loader |
| **Font** | Geist via `next/font/google`, `display: swap`, `preload: true` |

## Fremtidig (aktiveres når Cloudflare-resurser er klare)

```bash
# .env.local — for R2 Incremental Cache + D1 Tag Cache
OPENNEXT_ENABLE_R2_CACHE=true
```

**Krav før aktivering:**
1. R2 bucket: `NEXT_INC_CACHE_R2_BUCKET`
2. D1 database: `NEXT_TAG_CACHE_D1`
3. DO revalidation queue (valgfri): `WORKER_SELF_REFERENCE`

**Forventet effekt:**
- ~40% raskere ISR-regenerering
- ~60% færre origin-requests
- Side-last <200ms for returnerende besøkende
