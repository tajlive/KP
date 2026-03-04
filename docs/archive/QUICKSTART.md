# 🎓 KLARPAKKE UNIVERSITET (MEMORY)

> **Crypto-trading læringsplattform** - Lær å trade på 4 uker  
> **Pris:** 399 kr/mnd (14 dagers gratis prøve)

## 🚀 RASKESTE MÅTE Å KOMME I GANG

```bash
# 1. Klon
git clone https://github.com/tombomann/klarpakke.git
cd klarpakke

# 2. Installer
npm install

# 3. Env
cp .env.local.example .env.local
# Fyll inn verdier fra 1Password/Bitwarden

# 4. Kjør lokalt
npm run dev

# 5. Bygg for produksjon
npm run build  # Output til out/ for Cloudflare Pages
```

## 💰 FORRETNINGSMODELL

| Plan | Pris | Inkluderer |
|------|------|------------|
| **Gratis smakebit** | 0 kr | 1 modul, 1 quiz, 5 trades |
| **Full tilgang** | **399 kr/mnd** | Alle kurs, ubegrenset quiz, simulator, alt |

- **14 dagers gratis prøveperiode** (ingen kredittkort nødvendig)
- Ingen bindingstid - kanseller når som helst
- Prøv gratis før du betaler

## 🧪 TEST-KOMMANDOER

| Kommando | Når | Hva |
|----------|-----|-----|
| `npm run test:ci` | **CI/CD** | Lint + TS + Playwright mot **lokal build** |
| `npm run test:auth:prod` | **Post-deploy** | Smoke mot **produksjon** |
| `npm run test:full` | **Lokal** | Full test (env + build + Playwright) |
| `npm run test:auth:dev` | **Lokal** | Dev-tester mot localhost |

**VIKTIG:** `test:ci` (pre-deploy) tester **lokal build**, ikke produksjon!

## 📁 NØKKELFILER

```
├── next.config.js              # Static export for Cloudflare Pages
├── .gitlab-ci.yml              # CI/CD: build→test→deploy→smoke
├── src/lib/subscription.ts     # Subscription & access control
├── src/app/priser/page.tsx     # Pricing page (399 kr/mnd)
├── scripts/docs-lint.sh        # Lint against old trading terms
├── docs/KIMI-PROMPT-UNIVERSITET.md  # AI-agent prompt (v2)
└── docs/GITLAB-RUNNER-SETUP.md      # Lokal runner guide
```

## 🔄 CI/CD PIPELINE

```
GitHub Actions → Build → Test → Deploy → Smoke
           ↓       ↓       ↓        ↓
        (out/)  (lokal)  (live)  (prod)
```

**Guard mot 0 tester:** I både test og smoke steg.

## 🛡️ KIMI PROMPT (lim inn først)

```
DU ER: KIMI – senior Next.js/TypeScript + DevOps for Klarpakke.

VIKTIG: Produktet er en læringsplattform (kurs, quiz, simulator).
IKKE: Trading-abonnement med AI-signaler.

SVARFORMAT (MÅ brukes):
1) Gjenta problemet i én setning
2) Rotårsak (maks 2 setninger)
3) Fiks nå (maks 6 steg)
4) Kodeendringer (git diff)
5) Automasjon (CI/Mac M1)

Regler: Mobile-first, 95% norsk, TS strict.
```

Full versjon: `docs/KIMI-PROMPT-UNIVERSITET.md`

## 🖥️ LOKAL RUNNER (optional)

```bash
brew install gitlab-runner
gitlab-runner register --url https://gitlab.com/ --executor shell --tag-list "macos"
gitlab-runner install && gitlab-runner start
```

Se: `docs/GITLAB-RUNNER-SETUP.md`

## 🌐 PRODUKSJON

- **URL:** https://www.klarpakke.no
- **Deploy:** Git push til main → auto-deploy via GitHub Actions
- **Hosting:** Cloudflare Pages (static export)
- **Database:** Supabase
- **CI/CD:** GitHub Actions → Cloudflare Pages

## ⚡ ALIAS (Mac M1)

```bash
echo "alias kpcheck='npm run lint && npm run build && npm run test:ci'" >> ~/.zshrc
source ~/.zshrc
kpcheck  # Kjør før hver commit
```

## 🆘 FEILSØKING

| Problem | Løsning |
|---------|---------|
| 0 tester funnet | Sjekk `grepInvert` i playwright config |
| CI feiler | Se `test-results/` artifacts i GitHub Actions |
| Deploy feiler | Sjekk at `out/` mappen finnes etter bygg |
| Gamle sider vises | Hard refresh (Ctrl+Shift+R) eller vent 5 min (Cloudflare cache) |
| Lokal runner offline | `gitlab-runner restart` |

---
**Sist oppdatert:** 2026-02-08 (oppdatert med 399 kr/mnd prising)
**Versjon:** 3.0.0 (Universitet-modell)
