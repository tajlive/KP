# Selv-hostet infrastruktur for Klarpakke

> **⚠️ ARKIVERT — IKKE BRUK FOR NYOPPSØT**
>  
> **Sist oppdatert:** 2026-06-29 av Lead Architect  
> **Gjelder ikke lenger:** Klarpakke kjører nå på **Cloudflare Workers** (OpenNext.js + Wrangler), ikke Hetzner + Coolify.
>  
> Denne filen er bevart som historisk referanse. For gjeldende oppsett, se:
> - [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — systemarkitektur
> - [`.kimi/WORKFLOW_RULES.md`](../.kimi/WORKFLOW_RULES.md) — deploy og arbeidsflyt
> - [`docs/adr/ADR-2026-06-29-hosting-cloudflare-workers.md`](./adr/ADR-2026-06-29-hosting-cloudflare-workers.md) — beslutningslogg

---

## Historikk

Klarpakke har hatt følgende hosting-arkitekturer:

| Periode | Plattform | CI/CD | Status |
|---|---|---|---|
| 2024–2026-Q1 | Vercel | GitHub Actions / Vercel Git Integration | Utdatet |
| 2026-Q2 | Hetzner VPS + Coolify + Woodpecker CI | Woodpecker CI | **Denne guiden** |
| 2026-Q2–nå | Cloudflare Workers (OpenNext.js + Wrangler) | Cloudflare Workers Builds | **Gjeldende** |

## Gjeldende stack

```
Bruker
  ↓
Cloudflare DNS / CDN / Proxy (klarpakke.no)
  ↓
Cloudflare Workers (OpenNext.js + Wrangler)
  ↓
Supabase (database / auth)
```

## Gjeldende deploy

```bash
# Push til main → Cloudflare Workers Builds deployer automatisk
git push origin main

# Verifiser deployment
npx wrangler deployments list

# Manuell backup-deploy (kun nødsituasjon)
npm run cf:deploy
```

## Gjeldende secrets management

Cloudflare Worker secrets settes via Wrangler:

```bash
npx wrangler secret put MY_SECRET
```

## Hva ble fjernet

Følgende komponenter fra denne guiden er ikke lenger i bruk:

- Hetzner VPS
- Coolify
- Woodpecker CI (`.woodpecker/` er fjernet)
- Docker-basert deploy med `npm start`
- `ci.klarpakke.no` (Woodpecker UI)

## Bevarte detaljer

Hvis du leter etter spesifikke konfigurasjonsdetaljer fra den gamle Hetzner/Coolify-epoken, se commit-historikken før 2026-06-25 eller kontakt prosjekteier.

---

**For all fremtidig drift og utvikling: følg Cloudflare Workers-dokumentasjonen lenket over.**
