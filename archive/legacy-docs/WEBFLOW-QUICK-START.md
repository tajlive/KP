# Webflow Quick Start - Klarpakke MVP

## Steg-for-steg oppsett

### 1. Opprett prosjekt
- Gå til [webflow.com](https://webflow.com)
- Opprett nytt prosjekt
- Velg "Blank site"

### 2. Global Custom Code

**Site Settings → Custom Code → Head:**
```html
<script>
  window.KLARPAKKE = {
    supabaseUrl: 'https://DIN-PROSJEKT.supabase.co',
    supabaseAnonKey: 'DIN-ANON-KEY',
    siteUrl: window.location.origin,
    version: '1.5.0'
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

### 3. Opprett sider

| Side | Type | Auth |
|------|------|------|
| `/` | Home | Nei |
| `/pricing` | Static | Nei |
| `/leaderboard` | Dynamic | Nei |
| `/onboarding` | Static | Nei |
| `/signup` | Auth | Nei |
| `/login` | Auth | Nei |
| `/app/dashboard` | App | Ja |
| `/app/paywall` | App | Ja |
| `/app/settings` | App | Ja |
| `/app/billing` | App | Ja |
| `/app/referrals` | App | Ja |
| `/app/leaderboard` | App | Ja |
| `/quiz/futures` | Quiz | Ja |

### 4. Legg til DOM-ankere

Hver side må ha riktig `id` og `data-*` attributter. Se `WEBFLOW-SETUP-GUIDE.md` for detaljer.

**Viktigste ankere per side:**

**Alle sider:**
```html
<div id="klarpakke-[page]-root" data-kp-root="[page]">
  <!-- Side innhold her -->
</div>
```

**Paywall spesifikke:**
```html
<div data-plan="standard" data-paywall-upgrade-btn>...</div>
<div data-plan="pluss" data-paywall-upgrade-btn>...</div>
<div data-plan="vip_ekstrem" data-paywall-upgrade-btn>...</div>
```

**Quiz spesifikke:**
```html
<div data-question-container>...</div>
<div data-answer-options>...</div>
<button data-submit-answer>...</button>
```

### 5. Legg til scripts

**Per side - Head Code:**

```html
<!-- Alle sider -->
<script src="https://cdn.klarpakke.no/auth.js"></script>

<!-- App-sider (legg til) -->
<script src="https://cdn.klarpakke.no/app-with-auth.js"></script>

<!-- Spesifikke sider -->
<script src="https://cdn.klarpakke.no/paywall.js"></script>  <!-- /app/paywall -->
<script src="https://cdn.klarpakke.no/quiz.js"></script>    <!-- /quiz/futures -->
<script src="https://cdn.klarpakke.no/billing.js"></script> <!-- /app/billing -->
```

### 6. Publiser

1. Klikk **Publish**
2. Velg domene
3. Vent på publisering
4. Test alle sider

---

## Testing

### Test autentisering
1. Gå til `/signup`
2. Opprett konto
3. Sjekk at du redirectes til `/app/dashboard`
4. Sjekk at profile ble opprettet i Supabase

### Test paywall
1. Gå til Supabase → SQL Editor
2. Kjør:
```sql
UPDATE profiles 
SET trial_ends_at = NOW() - INTERVAL '1 day' 
WHERE user_id = 'DIN-USER-ID';
```
3. Refresh `/app/dashboard`
4. Skal redirecte til `/app/paywall`

### Test quiz
1. Gå til `/quiz/futures`
2. Svar på spørsmål
3. Verifiser at du får score
4. Sjekk at quiz_attempts oppdateres

---

## Viktige filer

| Fil | Hva |
|-----|-----|
| `webflow/contract/klarpakke-pages.v1.json` | Alle DOM-ankere |
| `docs/WEBFLOW-SETUP-GUIDE.md` | Full guide |
| `docs/SITE-MAP.md` | Arkitektur |

---

## Support

Se full guide i `docs/WEBFLOW-SETUP-GUIDE.md`
