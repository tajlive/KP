# Supabase GitHub-integrasjon – ett-klikks oppsett

**Mål:** Migrasjoner kjører automatisk ved push til `main`. Ingen manuell `db push`, ingen CI-secrets å vedlikeholde.

---

## Steg-for-steg (5 min)

### 1. Åpne Integrations

Gå til:  
**https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/settings/integrations**

(Erstatt `vuxbjlykgmzskxbclquf` med ditt prosjekt-ref hvis annet.)

### 2. Aktiver GitHub

- Klikk **GitHub**
- **Connect to GitHub** → autoriser Supabase
- Velg organization: `tajlive` (eller din org)
- Velg repo: `KP`

### 3. Konfigurer

| Felt | Verdi |
|------|-------|
| **Production branch** | `main` |
| **Supabase directory** | `./` (repo root – `supabase/` ligger her) |
| **Deploy migrations** | ✅ På |
| **Deploy Edge Functions** | ✅ På (valgfritt) |

### 4. Lagre

Klikk **Save** / **Enable**.

---

## Hva skjer etterpå

- Ved **push til `main`** (inkl. merge av PR): Supabase kjører `supabase db push` mot prod
- Migrasjoner fra `supabase/migrations/*.sql` appliseres automatisk
- Ingen egen GitHub Actions-job
- Ingen `SUPABASE_ACCESS_TOKEN` i CI

---

## Valgfritt: Required check i GitHub

For å hindre merge av feilende migrasjoner:

1. GitHub → Repo → **Settings** → **Branches**
2. **Add rule** for `main`
3. **Require status checks** → legg til Supabase sin check (f.eks. «Supabase – Migrations»)
4. **Require branches to be up to date** (valgfritt)

---

## Duplikat med db-push-on-merge?

Hvis du aktiverer Supabase GitHub-integrasjonen, vil **begge** kjøre migrasjoner ved push til main:

- **Supabase-integrasjon:** Kjører migrasjoner direkte
- **db-push-on-merge.yml:** Kjører `supabase db push` via GitHub Actions

Det er trygt – begge bruker samme migrasjonsfiler og historikk. Migrasjoner er idempotente (allerede-applisert blir hoppet over).

For å redusere duplikat kan du:

- **Alternativ A:** La begge være (ingen ulempe)
- **Alternativ B:** Disable `db-push-on-merge` når integrasjonen fungerer:
  - I `.github/workflows/db-push-on-merge.yml` legg til `if: false` på jobben, eller slett filen

---

## Feilsøking

| Feil | Løsning |
|------|---------|
| «Migrations failed» | Sjekk Supabase Dashboard → Database → Migrations. Kjør `supabase migration repair` ved mismatch. |
| Integrasjon vises ikke | Sjekk at GitHub-appen er autorisert for org/repo. |
| Gammel migrasjonshistorikk | Se `docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md` §6. |

---

## Relatert

- `docs/SUPABASE-MIGRASJONER-VARIG-LOSNING.md` – full oversikt og feilsøking
- `docs/AUTOMATISERE-DB-OG-MIGRASJONER.md` – hva som er automatisert i dag
