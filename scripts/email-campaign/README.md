# 📧 E-POST KAMPANJE - 100 STUDENTER PÅ 24 TIMER

## Rask start (5 minutter)

```bash
# 1. Eksporter LinkedIn-nettverk
# Gå til: https://www.linkedin.com/mypreferences/d/download-my-data
# Last ned Connections.csv

# 2. Importer kontakter
npx ts-node scripts/email-campaign/index.ts --import ~/Downloads/Connections.csv

# 3. Send kampanje
npx ts-node scripts/email-campaign/index.ts --send

# 4. Se statistikk
npx ts-node scripts/email-campaign/index.ts --stats
```

---

## Oppsett (kun første gang)

### 1. Database
Kjør SQL i Supabase:
```bash
# Gå til Supabase Dashboard → SQL Editor
# Kopier innholdet fra scripts/email-campaign/setup.sql
```

### 2. Environment variables
Sørg for at `.env.local` har:
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Verifiser Resend
```bash
# Sjekk at Resend er konfigurert
npx ts-node -e "console.log(process.env.RESEND_API_KEY ? '✅ OK' : '❌ Mangler')"
```

---

## Forventet resultat

| Metrikk | Typisk | Mål |
|---------|--------|-----|
| Sendt | 500-1000 | 1000 |
| Åpnet | 30-40% | 350 |
| Klikket | 5-10% | 75 |
| Registrert | 3-5% | 40-60 |

---

## Oppfølgingssekvens

E-postene sendes automatisk i sekvens:

1. **Dag 0:** Introduksjon (hoved-e-post)
2. **Dag 2:** Påminnelse ("Fortsatt interessert?")
3. **Dag 5:** Siste sjanse ("12 plasser igjen")

---

## Kommandoer

| Kommando | Beskrivelse |
|----------|-------------|
| `--import <csv>` | Importer LinkedIn CSV |
| `--send` | Send til alle ventende |
| `--stats` | Vis kampanje-statistikk |
| `--reset` | Slett all data (⚠️) |

---

## Dashboard

Se statistikk i Supabase:
```sql
SELECT * FROM campaign_stats;
```

Eller i appen:
- Gå til `/admin/campaign` (kommer snart)

---

**Spørsmål?** Sjekk `LINKEDIN_EXPORT_GUIDE.md` for LinkedIn-tips.
