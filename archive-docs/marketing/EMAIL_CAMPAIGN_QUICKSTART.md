# 🚀 E-POST KAMPANJE - QUICKSTART (5 min)

## Mål: 100 studenter på 24 timer via automatisk e-post

---

## ⚡ STEG 1: Oppsett (2 min)

### A) Database i Supabase
```bash
# Gå til: https://supabase.com/dashboard
# Velg ditt prosjekt → SQL Editor
# Lim inn og kjør: scripts/email-campaign/setup.sql
```

### B) Environment
```bash
# Sjekk at .env.local har:
RESEND_API_KEY=re_xxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Verifiser:
npx ts-node scripts/email-campaign/test.ts
```

---

## 📥 STEG 2: Hent LinkedIn-nettverk (2 min)

### Alternativ 1: Offisiell LinkedIn export
1. Gå til: https://www.linkedin.com/mypreferences/d/download-my-data
2. Velg **"Connections"** → **CSV**
3. Klikk **"Request archive"**
4. Vent på e-post (kan ta 24t)

### Alternativ 2: Hurtig Chrome Extension
1. Installer: "LinkedIn Email Extractor" (Chrome Web Store)
2. Gå til: LinkedIn → My Network → Connections
3. Klikk extension-ikonet
4. Last ned CSV umiddelbart

---

## 📤 STEG 3: Send kampanje (1 min)

```bash
# 1. Importer kontakter
npx ts-node scripts/email-campaign/index.ts --import ~/Downloads/Connections.csv

# 2. Send e-poster
npx ts-node scripts/email-campaign/index.ts --send

# 3. Se statistikk
npx ts-node scripts/email-campaign/index.ts --stats
```

---

## 📊 Forventet resultat

| Med 500 kontakter | Antall | % |
|-------------------|--------|---|
| Sendt | 500 | 100% |
| Åpnet | 175 | 35% |
| Klikket | 40 | 8% |
| **Registrert** | **20-30** | **4-6%** |

| Med 1000 kontakter | Antall | % |
|--------------------|--------|---|
| Sendt | 1000 | 100% |
| Åpnet | 350 | 35% |
| Klikket | 75 | 7.5% |
| **Registrert** | **40-60** | **4-6%** |

---

## 🎯 Mål: 100 studenter

**Hva trenger du:**
- ~1700 LinkedIn-kontakter (ved 6% konvertering)
- ELLER ~850 kontakter + andre kanaler (Facebook, Reddit)

---

## ⚙️ Kommandoer

| Kommando | Hva skjer |
|----------|-----------|
| `--import <csv>` | Leser CSV, lagrer kontakter |
| `--send` | Sender til alle `pending` kontakter |
| `--stats` | Viser åpninger, klikk, konvertering |
| `--reset` | Sletter alt (⚠️) |

---

## 🔍 Overvåking

### Dashboard i Supabase
```sql
SELECT * FROM campaign_stats;
```

### E-poster som ikke ble sendt
```sql
SELECT email, first_name 
FROM campaign_contacts 
WHERE status = 'bounced';
```

### Beste leads (klikket men ikke registrert)
```sql
SELECT email, first_name, clicked_at
FROM campaign_contacts 
WHERE clicked_at IS NOT NULL 
  AND status != 'registered'
ORDER BY clicked_at DESC;
```

---

## ✅ Pre-flight sjekkliste

Før du sender:

- [ ] LinkedIn CSV lastet ned
- [ ] `npx ts-node scripts/email-campaign/test.ts` viser ✅
- [ ] SQL kjørt i Supabase
- [ ] Test-sendt til deg selv først
- [ ] Landing page fungerer (test signup)

---

## 🆘 Feilsøking

### "RESEND_API_KEY mangler"
```bash
export RESEND_API_KEY=re_xxxxxxxxxxxx
```

### "Ingen kontakter funnet"
Sjekk at CSV har kolonnen "Email" (stor E).

### "Rate limit exceeded"
Resend gratis: 100 e-poster/dag. Vent 24t.

### "Bounced emails"
Normalt 5-10%. Gamle e-poster fra LinkedIn.

---

## 🎓 Tips for suksess

1. **Send på tirsdag/torsdag kl 09:00** - beste åpningstall
2. **Subject line med fornavn** - allerede satt opp
3. **Følg opp de som åpnet men ikke klikket** - manuelt
4. **Svar på alle svar** - øker konvertering

---

**KLAR? Start med:**
```bash
npx ts-node scripts/email-campaign/test.ts
```

Så viser jeg deg neste steg!
