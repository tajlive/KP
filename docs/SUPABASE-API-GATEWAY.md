# 🚀 Supabase API Gateway

> Din `api-server.js` - nå i skyen som Edge Function!

## Hva er dette?

**api-gateway** er en Supabase Edge Function som erstatter din lokale `api-server.js`. Nå er API-en din:
- ✅ Alltid tilgjengelig (24/7)
- ✅ Gratis (innenfor 500K requests/måned)
- ✅ Ingen lokal server å vedlikeholde
- ✅ Tilgjengelig fra hvor som helst

---

## 🎯 Hva du får

| Funksjon | Endepunkt | Beskrivelse |
|----------|-----------|-------------|
| Health | `/health` | Sjekk at tjenesten kjører |
| Git Status | `/git/status` | Siste commits og branch info |
| Git Log | `/git/log` | Commit historikk |
| Project Info | `/project/info` | package.json info |
| Build | `/build` | Trigger Vercel deploy |
| File Read | `/file/read?path=...` | Les fil fra GitHub |
| File List | `/file/list?path=...` | List filer |
| Cache Clear | `/cache/clear` | Tøm cache |

---

## 🔧 Oppsett

### Steg 1: Hent GitHub Token (for git/fil-operasjoner)

1. Gå til https://github.com/settings/tokens
2. Klikk "Generate new token (classic)"
3. Velg scopes:
   - ✅ `repo` (for private repos)
   - ✅ `read:org` (hvis relevant)
4. Kopier token

### Steg 2: Sett Secrets i Supabase

```bash
# GitHub token (for å lese repo/filer)
supabase secrets set GITHUB_TOKEN=ghp_din_token_her --project-ref vuxbjlykgmzskxbclquf

# API Gateway auth token
supabase secrets set API_GATEWAY_TOKEN=klarpakke-dev-token --project-ref vuxbjlykgmzskxbclquf

# Vercel token (optional - for build trigger)
supabase secrets set VERCEL_TOKEN=vercel_token_her --project-ref vuxbjlykgmzskxbclquf
```

### Steg 3: Deploy

```bash
supabase functions deploy api-gateway --project-ref vuxbjlykgmzskxbclquf
```

---

## 🧪 Testing

### Test med curl

```bash
# Health check
curl https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/health \
  -H "Authorization: Bearer klarpakke-dev-token"

# Git status
curl https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/git/status \
  -H "Authorization: Bearer klarpakke-dev-token"

# Prosjekt info
curl https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/project/info \
  -H "Authorization: Bearer klarpakke-dev-token"

# Les fil
curl "https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/file/read?path=package.json" \
  -H "Authorization: Bearer klarpakke-dev-token"

# List filer
curl "https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/file/list?path=src" \
  -H "Authorization: Bearer klarpakke-dev-token"
```

### Test i nettleser

```javascript
// JavaScript fetch eksempel
const API_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway';
const TOKEN = 'klarpakke-dev-token';

async function getGitStatus() {
  const res = await fetch(`${API_URL}/git/status`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  return res.json();
}

getGitStatus().then(console.log);
```

---

## 📱 Bruk i KIMI CLI

### Oppdater .kimi/prompt.md

```markdown
## API Commands (SUPABASE EDGE FUNCTIONS)
Base: https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway
Auth: Bearer klarpakke-dev-token

### Endepunkter:
- /health         - Sjekk helse
- /git/status     - Git status
- /git/log        - Git log
- /project/info   - Prosjekt info
- /file/read?path - Les fil
- /file/list?path - List filer
```

### Bruk i KIMI

```bash
# KIMI vil nå bruke sky-API istedenfor lokal server
kimi "sjekk git status"
# -> Kaller: https://.../functions/v1/api-gateway/git/status
```

---

## 🎭 Sammenligning: Lokal vs Sky

| | Lokal Server (api-server.js) | Supabase API Gateway |
|---|------------------------------|----------------------|
| **Tilgjengelighet** | Kun når du starter den | Alltid på (24/7) |
| **Hastighet** | ~10ms | ~100-300ms (cold start) / ~50ms (warm) |
| **Vedlikehold** | Må startes manuelt | Ingen |
| **Kostnad** | $0 | $0 (500K/måned) |
| **Tilgang** | Kun localhost | Fra hvor som helst |

---

## 🔥 Avansert: Webhook Integrasjon

### GitHub Webhook → Supabase

Få automatisk oppdatering når du pusher til GitHub:

1. I GitHub repo: Settings → Webhooks → Add webhook
2. Payload URL:
   ```
   https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/webhook/github
   ```
3. Content type: `application/json`
4. Velg events: `Pushes`, `Pull requests`
5. Add webhook

### Vercel Deploy Hook

Automatisk deploy når du pusher:

1. I Vercel: Project Settings → Git → Deploy Hooks
2. Lag en hook: `https://api.vercel.com/v1/integrations/deploy/...`
3. Legg til i Supabase secrets som `VERCEL_DEPLOY_HOOK`

---

## 📊 Monitoring

### Sjekk logs i Supabase Dashboard

```
https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/functions/api-gateway/logs
```

### Metrics

```bash
# Antall kall
curl https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/health \
  -H "Authorization: Bearer klarpakke-dev-token"
```

---

## 🚀 Oppsummering

Du har nå:
1. ✅ API Gateway som Edge Function
2. ✅ Alltid tilgjengelig (ingen lokal server nødvendig)
3. ✅ Tilgang fra hvor som helst
4. ✅ Gratis inntil 500K requests/måned

**Slik bruker du det:**
```bash
# Gammelt (lokal server):
node api-server.js

# Nytt (skyen):
# Ingenting! Det kjører allerede 🎉

# Kall API:
curl https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/health \
  -H "Authorization: Bearer klarpakke-dev-token"
```

**Neste steg:**
- Deploy funksjonen: `supabase functions deploy api-gateway`
- Sett GitHub token for full funksjonalitet
- Oppdater KIMI prompt til å bruke sky-API

---

*Ingen mer `node api-server.js` - velkommen til skyen!* ☁️🚀
