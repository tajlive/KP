# GitHub Secrets Setup

Dette dokumentet lister alle secrets som må konfigureres i GitHub for produksjonsdeploy.

## 📍 Hvordan legge til Secrets

1. Gå til GitHub repo: `github.com/[user]/klarpakke`
2. Klikk **Settings** (fanen øverst)
3. I venstre meny: **Secrets and variables** → **Actions**
4. Klikk **New repository secret**
5. Legg til hver secret nedenfor

---

## 🔐 Påkrevde Secrets

### Supabase

| Secret | Verdi | Hvor finner du den |
|--------|-------|-------------------|
| `SUPABASE_ACCESS_TOKEN` | `sbp_...` | Supabase Dashboard → Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | `swfyuwkptusceiouqlks` | Fra project URL |
| `SUPABASE_PROD_URL` | `https://swfyuwkptusceiouqlks.supabase.co` | Supabase Settings → API |
| `SUPABASE_PROD_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase Settings → API → anon key |
| `SUPABASE_PROD_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase Settings → API → service_role key |

### Stripe

| Secret | Verdi | Hvor finner du den |
|--------|-------|-------------------|
| `STRIPE_SECRET_KEY` | `sk_live_[your-key]` | Stripe Dashboard → Developers → API keys |
| `STRIGRAM_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Webhooks → Signing secret |

### Telegram

| Secret | Verdi | Hvor finner du den |
|--------|-------|-------------------|
| `TELEGRAM_BOT_TOKEN` | `123456789:ABCdef...` | @BotFather i Telegram |

### OpenAI

| Secret | Verdi | Hvor finner du den |
|--------|-------|-------------------|
| `OPENAI_API_KEY` | `sk-[your-api-key]` | OpenAI Dashboard → API keys |

---

## ✅ Verifikasjon

Etter at alle secrets er lagt til, test med:

```bash
# Trigger manuell deploy
github.com → Actions → Deploy to Supabase Production → Run workflow
```

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
