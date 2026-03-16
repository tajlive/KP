
## [1.2.0] - 2026-02-10

### Security
- 🔒 Fjernet alle hardkodede secrets fra Git-historikk (Cloudflare token)
- 🔒 Lagt til pre-commit hooks med gitleaks
- 🔒 Oppdatert .gitignore (build-artefakter, secrets)
- 🔒 Renset Git-historikk med BFG Repo-Cleaner

### Changed
- 🔄 Migrert fra GitLab til GitHub (https://github.com/tajlive/KP)
- 🔄 Byttet GitLab CI til GitHub Actions
- 🔄 Oppdatert Cloudflare Pages git source til GitHub

### Documentation
- 📚 Oppdatert alle 20+ dokumenter med GitHub-lenker (KIMI Phase 5)
- 📚 Lagt til sikkerhetsseksjon i README
- 📚 Opprettet .env.example template

### Infrastructure
- ✅ GitHub Actions workflow for CI/CD
- ✅ Pre-commit hooks blokkerer secrets
- ✅ Repository satt til PRIVATE
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-10

### Changed

- 🔄 **GitHub Migration:** Full migration fra GitLab til GitHub
  - Repository: `gitlab.com/tomarnejensen/klarkpakke` → `github.com/tajlive/KP`
  - CI/CD: GitLab CI → GitHub Actions (`.github/workflows/`)
  - Dokumentasjon oppdatert i alle 10+ docs-filer
  - Arkiverte GitLab-spesifikke filer (`GITLAB-RUNNER-SETUP.md`)

### Security

- 🔒 Secrets management via GitHub Actions secrets (erstatter GitLab CI variables)

---

## [1.0.0] - 2026-02-10

### Added

**Plattform:**
- ✨ Komplett Next.js 15 App Router setup
- ✨ Supabase integration med RLS på alle tabeller
- ✨ i18n (norsk + engelsk) via next-intl
- ✨ Cloudflare Pages deployment med OpenNext

**Features:**
- ✨ Dashboard med porteføljeoversikt
- ✨ Simulator for paper trading (1M kr virtuell kapital)
- ✨ Kurs-plattform med 3 læringsspor (14 moduler totalt)
- ✨ Admin-dashboard med brukeradministrasjon
- ✨ TAJ Robot (auto-trading bot) med kontrollpanel
- ✨ Beta-program med søknadsskjema
- ✨ Stripe subscriptions (4 prisnivåer)
- ✨ Leaderboard med badges
- ✨ Gamification (streaks, achievements)

**Infrastructure:**
- ✨ 67 automation scripts (deploy, testing, migrations)
- ✨ GitHub Actions workflow (db, verify, build)
- ✨ E2E testing suite (Playwright)
- ✨ Link checker
- ✨ RLS test suite
- ✨ Database consistency checker

**Documentation:**
- 📚 Komplett docs/ (10 kjernedokumenter)
- 📚 5 Architecture Decision Records (ADRs)
- 📚 4 Runbooks (deploy, rollback, etc.)
- 📚 .ai/ for AI-agent context

### Fixed

- 🐛 Leaderboard JOIN-feil (pt.user_id → paper_accounts)
- 🐛 Courses migration duplicate key på lessons
- 🐛 ESLint flat config issues (Next.js 15 compatibility)
- 🐛 Jest missing types (@types/jest-dom)
- 🐛 Broken links (registrering → opptak, kurs-route)

### Security

- 🔒 RLS policies på alle 35+ tabeller
- 🔒 Role-based access control (admin, analyst, trader, student)
- 🔒 Audit logging på alle admin-actions
- 🔒 Secrets management via GitHub Actions secrets
- 🔒 HTTPS enforced via Cloudflare

### Changed

- 🔄 Migrert fra CRA til Next.js 15 App Router
- 🔄 Moderniserte ESLint til flat config
- 🔄 Alle migrasjoner gjort idempotente (IF NOT EXISTS, ON CONFLICT)
- 🔄 Arkiverte gamle failed migrations til archive/

## [0.1.0] - 2026-01-15

### Added

- 🎉 Initial commit
- 🏗️ Project setup med Next.js, Supabase, Cloudflare
- 🎨 Basic landing page
- 🔐 Supabase Auth setup

---

For full commit-historikk, se GitHub: https://github.com/tajlive/KP/commits/main
