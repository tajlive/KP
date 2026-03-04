# 🚀 Deployment Guide: Vercel

Dette prosjektet er nå konfigurert for **Vercel**. Vi bruker Vercel CLI for å distribuere koden direkte fra din lokale maskin, noe som omgår eventuelle begrensninger på GitHub.

## 🛠️ Slik ruller du ut endringer (Deploy)

Hver gang du har gjort kodeendringer og vil ha dem live på [www.klarpakke.no](https://www.klarpakke.no):

1.  Åpne terminalen i prosjektmappen.
2.  Kjør følgende kommando:
    ```bash
    vercel --prod
    ```
3.  Vercel vil nå bygge og rulle ut nettsiden automatisk.

## 📋 Miljøvariabler (Environment Variables)

Alle hemmelige nøkler (Supabase, Resend, Perplexity) lagres nå sentralt i Vercel. 

- **Endre nøkler**: Gå til [Vercel Dashboard](https://vercel.com/tom-jensens-projects/klarpakke/settings/environment-variables).
- **Legge til via CLI**: 
  ```bash
  vercel env add MIN_NYE_NOKKEL production
  ```

## 🔗 Supabase & Google Konfigurasjon

For at innlogging skal fungere perfekt:

### Supabase
- **Site URL**: `https://www.klarpakke.no`
- **Redirect URIs**: `https://www.klarpakke.no/**`

### Google Cloud Console
- **Authorized Redirect URIs**:
  - `https://www.klarpakke.no/no/auth/callback`
  - `https://www.klarpakke.no/en/auth/callback`

## 🧹 Filer som ikke lenger trengs
Du kan trygt slette disse filene (de er fjernet fra Vercel-builden):
- `wrangler.toml`
- `open-next.config.ts`
- `scripts/deploy-cloudflare-pages.sh`

**Lykke til med beta-lanseringen!** 🏆
