# 🚀 GO LIVE - Sjekkliste

> Følg denne listen for å aktivere hele systemet

---

## ✅ DEL 1: Deploy (Gjør dette først!)

### [ ] Steg 1.1: Deploy API Gateway
```bash
# Alternativ A: Terminal
supabase functions deploy api-gateway --project-ref vuxbjlykgmzskxbclquf

# Alternativ B: Dashboard
# https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/functions
```

### [ ] Steg 1.2: Sett Secrets
```bash
# API Gateway auth
supabase secrets set API_GATEWAY_TOKEN=klarpakke-dev-token --project-ref vuxbjlykgmzskxbclquf

# Moonshot AI (hent fra https://platform.moonshot.cn/)
supabase secrets set MOONSHOT_API_KEY=sk-din-key --project-ref vuxbjlykgmzskxbclquf

# GitHub (optional - for git/fil funksjoner)
supabase secrets set GITHUB_TOKEN=ghp-din-token --project-ref vuxbjlykgmzskxbclquf
```

### [ ] Steg 1.3: Verifiser Deploy
```bash
# Test at API fungerer
curl https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/health \
  -H "Authorization: Bearer klarpakke-dev-token"
```

Forventet svar:
```json
{
  "status": "ok",
  "service": "api-gateway",
  "version": "2.0"
}
```

---

## ✅ DEL 2: Testing (Etter deploy)

### [ ] Steg 2.1: Kjør automatisk test
```bash
cd ~/klarpakke
bash scripts/test-live-system.sh
```

### [ ] Steg 2.2: Manuell test - Moonshot AI
```bash
# Test AI chat
curl -X POST \
  https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/moonshot-chat \
  -H "Authorization: Bearer klarpakke-dev-token" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hva er Bitcoin?"}'
```

### [ ] Steg 2.3: Test snarveier
```bash
# Aktiver cloud aliases (arkivert)
# source scripts/archive/klarpakke-cloud-aliases.sh

# Test med curl
curl -s https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/health \
  -H "Authorization: Bearer klarpakke-dev-token"
```

---

## ✅ DEL 3: Taj-Motoren (24/7 Trading)

### [ ] Steg 3.1: Verifiser at Taj kan lese configs
```sql
-- Kjør i Supabase SQL Editor
SELECT * FROM user_auto_trading_configs 
WHERE user_id = 'din-user-id';
```

### [ ] Steg 3.2: Test Taj Trade Engine
```bash
# Manuell test
curl https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/taj-trade-engine \
  -H "Authorization: Bearer klarpakke-dev-token"
```

### [ ] Steg 3.3: Sett opp Cron (Valgfritt)
Hvis du vil at Taj skal kjøre automatisk hver time:

```sql
-- Kjør i Supabase SQL Editor
SELECT cron.schedule(
  'taj-trade-every-hour',
  '0 * * * *',  -- Hver time
  $$SELECT net.http_get(
    url:='https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/taj-trade-engine',
    headers:='{"Authorization": "Bearer klarpakke-dev-token"}'::jsonb
  )$$
);
```

---

## ✅ DEL 4: Dashboard UI

### [ ] Steg 4.1: Legg til Moonshot Chat i Dashboard
```tsx
// I din dashboard-side (f.eks. app/dashboard/page.tsx)
import { MoonshotChat } from '@/components/ai/MoonshotChat';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* ...andre komponenter... */}
      
      {/* AI Chat */}
      <MoonshotChat />
    </div>
  );
}
```

### [ ] Steg 4.2: Test i browser
1. Start dev server: `npm run dev`
2. Gå til: http://localhost:3000/dashboard
3. Se at AI-chat vises og fungerer

---

## 🎯 HVIS ALT ER ✅

Da er systemet **LIVE**! 🎉

### Hva fungerer nå:
- ✅ API Gateway i skyen (alltid tilgjengelig)
- ✅ Moonshot AI chat for brukere
- ✅ Taj-motoren kan trade
- ✅ Alle Edge Functions deployed

---

## 🔧 Feilsøking

### Problem: "Unauthorized"
**Løsning:** Sjekk at `API_GATEWAY_TOKEN` secret er satt korrekt

### Problem: "GitHub token not configured"
**Løsning:** Sett `GITHUB_TOKEN` secret for å aktivere git/fil funksjoner

### Problem: "MOONSHOT_API_KEY not configured"
**Løsning:** Sett `MOONSHOT_API_KEY` for å aktivere AI chat

### Se Logs
```
https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/functions/api-gateway/logs
```

---

**Når du har ✅ på alle punkter over, si ifra så går vi videre til E-post Kampanjer!** 📧
