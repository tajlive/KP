# 🔑 Hvor skal keys ligge? - Klar oversikt

## Hurtigreferanse

```
┌─────────────────────────────────────────────────────────────────┐
│ SUPABASE ANON KEY (eyJ...)                                       │
│ → Webflow (frontend) ✅ PUBLIC                                  │
│ → JavaScript config ✅                                          │
├─────────────────────────────────────────────────────────────────┤
│ SUPABASE SERVICE ROLE KEY (eyJ...)                               │
│ → Supabase Secrets 🔒                                           │
│ → GitHub Secrets (CI/CD) 🔒                                     │
│ → .env (lokal) 🔒                                               │
│ → ALDRI frontend! ❌                                            │
├─────────────────────────────────────────────────────────────────┤
│ STRIPE SECRET KEY (sk_live_...)                                  │
│ → Supabase Secrets 🔒                                           │
│ → Edge Functions 🔒                                             │
│ → ALDRI frontend! ❌                                            │
├─────────────────────────────────────────────────────────────────┤
│ STRIPE PUBLISHABLE KEY (pk_live_...)                             │
│ → Webflow (frontend) ✅ PUBLIC                                  │
│ → JavaScript config ✅                                          │
├─────────────────────────────────────────────────────────────────┤
│ TELEGRAM BOT TOKEN                                               │
│ → Supabase Secrets 🔒                                           │
│ → ALDRI frontend/GitHub hvis public repo! ❌                    │
├─────────────────────────────────────────────────────────────────┤
│ SUPABASE ACCESS TOKEN                                            │
│ → GitHub Secrets 🔒                                             │
│ → Lokal .env 🔒                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Konkret for ditt prosjekt

### 1. GitHub Secrets (kun hvis du bruker GitHub Actions)
**Legg til:** https://github.com/tajlive/KP/settings/secrets/actions

```
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=abcdefghijklmnop
WEBFLOW_API_TOKEN=...
```

### 2. Supabase Secrets (backend)
**Legg til:** https://app.supabase.com/project/[ref]/settings/functions

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set TELEGRAM_BOT_TOKEN=...
supabase secrets set SITE_URL=https://klarpakke.no
```

### 3. Webflow Custom Code (frontend - PUBLIC!)
**Legg til:** Webflow → Site Settings → Custom Code → Footer

```html
<script>
  window.KLARPAKKE_CONFIG = {
    // KUN DISSE - PUBLIC KEYS:
    supabaseUrl: 'https://[din-ref].supabase.co',
    supabaseAnonKey: 'eyJhbGc...',  // Anon key (ikke service role!)
    stripePublishableKey: 'pk_live_...',  // Ikke secret key!
  };
</script>
```

### 4. Lokal utvikling
**Fil:** `.env` (ligger på din maskin, IKKE i Git)

```bash
SUPABASE_URL=https://[din-ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Kun lokal testing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Oppsummeringstabell

| Nøkkel | Type | Frontend | Supabase Secrets | GitHub Secrets | .env lokal |
|--------|------|----------|------------------|----------------|------------|
| Supabase Anon | Public | ✅ | - | - | ✅ |
| Supabase Service | Secret | ❌ | ✅ | ✅ | ✅ |
| Stripe Secret | Secret | ❌ | ✅ | ⚠️ | ✅ |
| Stripe Publishable | Public | ✅ | - | - | ✅ |
| Telegram Token | Secret | ❌ | ✅ | ⚠️ | ✅ |
| Supabase Token | Secret | ❌ | - | ✅ | ✅ |

**Legende:**
- ✅ = OK å ha her
- ❌ = ALDRI ha her
- ⚠️ = Kun hvis repo er private
- - = Ikke relevant

---

## Huskeregler

1. **Anon keys** = Frontend (bruker RLS for sikkerhet)
2. **Service keys** = Backend kun (admin-tilgang)
3. **Stripe secret** = Backend kun (kan ta betaling)
4. **Stripe publishable** = Frontend (viser betalingsskjema)
5. **Telegram token** = Backend kun (sender meldinger)

---

## Hva du har nå

### ✅ Riktig konfigurert:
- `.env` er i `.gitignore` (vil ikke committes)
- `.env.example` har dummy-verdier (kan committes)
- Ingen hardkodede secrets i JavaScript
- RLS (Row Level Security) på alle tabeller

### 🔒 Neste steg:
1. Opprett Supabase-prosjekt
2. Sett secrets i Supabase Dashboard
3. Legg til public keys i Webflow
4. Opprett `.env` for lokal utvikling

---

**Spørsmål?** Se `SECURITY-GUIDE.md` for detaljer.
