# Klarpakke API-ruter

> Dokumentasjon: API-ruteoversikt og sikkerhetsstatus  
> Oppdatert: 2026-03-15 (KLA-168, MCP/CLI/CI)  

---

## Admin-ruter (krever admin-rolle)

| Rute | Metode(r) | Auth | Admin | Status | Notater |
|------|-----------|------|-------|--------|---------|
| `/api/admin/cron-trigger` | POST | ✅ | ✅ | ✅ Prod | |
| `/api/admin/errors` | GET | ✅ | ✅ | ✅ Prod | |
| `/api/admin/github-health` | GET | ✅ | ✅ | ✅ Prod | |
| `/api/admin/kla130` | POST | ✅ | ✅ | ✅ Prod | KLA-108: Lagt til admin-sjekk |
| `/api/admin/resend-health` | GET | ✅ | ✅ | ✅ Prod | |
| `/api/admin/sessions` | GET | ✅ | ✅ | ✅ Prod | |
| `/api/admin/stats` | GET | ✅ | ✅ | ✅ Prod | |
| `/api/admin/stripe-health` | GET | ✅ | ✅ | ✅ Prod | |
| `/api/admin/system-health` | GET | ✅ | ✅ | ✅ Prod | |
| `/api/admin/verify` | GET | ✅ | ✅ | ✅ Prod | |

---

## Linear-ruter (krever admin-rolle)

| Rute | Metode(r) | Auth | Admin | Status | Notater |
|------|-----------|------|-------|--------|---------|
| `/api/linear/issues` | GET, POST | ✅ | ✅ | ✅ Prod | KLA-108: Lagt til auth + admin |
| `/api/linear/me` | GET | ✅ | ✅ | ✅ Prod | KLA-108: Lagt til auth + admin |
| `/api/linear/teams` | GET | ✅ | ✅ | ✅ Prod | KLA-108: Lagt til auth + admin |

---

## Beskyttede ruter (krever innlogging)

| Rute | Metode(r) | Auth | Status | Notater |
|------|-----------|------|--------|---------|
| `/api/onboarding/complete` | POST | ✅ | ✅ Prod | Oppretter trading session |
| `/api/referral` | GET, POST | ✅ | ✅ Prod | |
| `/api/risk-profiles` | GET, POST | ✅ | ✅ Prod | |
| `/api/send-email` | POST | ✅ | ✅ Prod | |
| `/api/tax-report` | GET | ✅ | ✅ Prod | |
| `/api/trading/*` | diverse | ✅ | ✅ Prod | |

---

## Offentlige ruter (ingen auth kreves)

| Rute | Metode(r) | Status | Notater |
|------|-----------|--------|---------|
| `/api/health` | GET | ✅ Prod | Health check (DB, KV, env) |
| `/api/status` | GET | ✅ Prod | System status |
| `/api/pricing` | GET | ✅ Prod | Prisdata |
| `/api/sentry` | POST | ✅ Prod | Sentry tunnel (client events) |
| `/api/test-sentry` | GET | ✅ Prod | Server-side test-event (kun prod + DSN); brukes av dashboard/sentry-test |
| `/api/stripe/*` | POST | ✅ Prod | Webhooks |
| `/api/webhooks/*` | POST | ✅ Prod | Ekstern integrasjon |

---

## Dev-only ruter (blokkert i prod)

| Rute | Status | Notater |
|------|--------|---------|
| `/api/debug-headers` | ⚠️ Dev only | KLA-108: Prod-guard lagt til |
| `/api/test/*` | ⚠️ Dev only | KLA-108: Sjekk at prod-guard er på plass |
| `/api/demo/*` | ⚠️ Dev only | KLA-108: Sjekk at prod-guard er på plass |

---

## Slettede duplikater (KLA-108)

| Rute | Aksjon | Erstattet av |
|------|--------|--------------|
| `/api/sentry-test` | ❌ Slettet | `/api/sentry` |
| `/api/test-sentry` | ✅ Gjenopprettet (KLA-168) | GET: sender server-side test-event i prod når DSN er satt. Brukes av `/dashboard/sentry-test`. |

---

## Cron (Vercel)

| Rute | Schedule | Beskrivelse |
|------|----------|-------------|
| `/api/cron/keepalive` | `0 6 */5 * *` (06:00 hver 5. dag) | Keepalive |
| `/api/cron/update-usdt-nok` | `0 6 * * *` (06:00 daglig) | Oppdaterer `global_settings.usdt_nok_rate` for paper trading (USDT ≈ USD). Appen bruker: env `USDT_NOK_RATE` → DB `global_settings.usdt_nok_rate` → fallback 10.8. Se `src/lib/trading/currency.ts`. |

---

## Spesielle ruter

### `/api/ws/prices`
- **Type**: SSE (Server-Sent Events)
- **Status**: ✅ Prod
- **Notat**: Fungerer på Vercel med 30s timeout. Client reconnecter automatisk.
- **Erstatter**: WebSocket (ikke støttet på Vercel serverless)

---

## Sikkerhetssjekkliste (KLA-108)

- [x] Alle admin-ruter sjekker `role === 'admin'`
- [x] Alle Linear-ruter krever admin-tilgang
- [x] Dev-ruter har prod-guard (`NODE_ENV === 'production'`)
- [x] Ingen stack traces eksponeres til klient
- [x] Duplikater fjernet
- [x] Auth-guard på beskyttede ruter

---

## Feilhåndtering

Alle ruter returnerer standardiserte feil:

```typescript
// 401 - Ikke autentisert
{ error: 'Ikke autentisert' }

// 403 - Ingen tilgang (ikke admin)
{ error: 'Ingen tilgang' }

// 404 - Ikke funnet
{ error: 'Not found' }

// 500 - Serverfeil (ingen stack trace i prod)
{ error: 'Ukjent feil' }
```

---

## Testing

```bash
# Dev-ruter skal returnere 404 i prod
curl https://klarpakke.no/api/debug-headers
# → {"error":"Not found"}

# Uten auth skal returnere 401
curl https://klarpakke.no/api/admin/stats
# → {"error":"Ikke autentisert"}

# Som vanlig bruker skal returnere 403
curl -H "Authorization: Bearer USER_TOKEN" \
  https://klarpakke.no/api/admin/stats
# → {"error":"Ingen tilgang"}
```
