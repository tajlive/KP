# Klarpakke Milestones & Roadmap

Dette dokumentet beskriver de aktive milestones og hvordan de synkroniseres med issues.

## 🎯 Aktive Milestones

### 1. MVP Launch (Due: 2026-02-02)
**Status:** 🔴 Nesten ferdig - krever testing

**Innhold:**
- ✅ Backend (Supabase, 25 Edge Functions)
- ✅ Frontend MVP (Login, Signup, Dashboard)
- ✅ DNS & Custom domain (klarpakke.no)
- ✅ Epost (Domeneshop + Cloudflare)
- ⏳ Testing & verifisering
- ⏳ Analytics (Google Analytics 4)

**Issues:**
- #72 - MVP Testing
- #32 - Testing & Prod deploy checklist

---

### 2. Week 2: Småsparer-first (Due: 2026-02-09)
**Status:** 🟡 Planlagt

**Innhold:**
- Password reset-side
- Email verification
- Terms of Service
- Privacy Policy
- Feilsider (404, 403, 500)

**Issues:**
- #66 - Småsparer-first

---

### 3. Klarpakke 2.0 Roadmap (Due: 2026-02-28)
**Status:** 🔵 Fremtidig

**Innhold:**
- Trading history
- User profile
- Notifications
- Realtime updates
- Help & Support
- SEO optimization
- Performance audit
- Beta testing

**Issues:**
- #54 - Klarpakke 2.0 roadmap

---

## 🔄 Automatisk Synkronisering

### Manuel kjøring via GitHub Actions

1. Gå til **Actions** fanen i GitHub repo
2. Velg **"Sync milestones"** workflow
3. Klikk **"Run workflow"**

### Lokal kjøring

```bash
# Krever GitHub CLI og jq installert
gh auth login

# Kjør scriptet
./scripts/sync-milestones.sh
```

### Hva scriptet gjør

1. **Oppretter milestones** hvis de ikke finnes:
   - MVP Launch (2026-02-02)
   - Week 2: Småsparer-first (2026-02-09)
   - Klarpakke 2.0 Roadmap (2026-02-28)

2. **Assigner issues** til riktig milestone:
   - #72 → MVP Launch
   - #32 → MVP Launch
   - #66 → Week 2: Småsparer-first
   - #54 → Klarpakke 2.0 Roadmap

---

## 📋 Oppdatere Milestones

For å legge til nye milestones eller endre datoer:

1. Rediger `scripts/sync-milestones.sh`
2. Endre `ensure_milestone` kallene
3. Kjør scriptet på nytt

Eksempel:
```bash
ensure_milestone "Ny Milestone" "2026-03-15T23:59:59Z"
assign_issue 99 "Ny Milestone"
```

---

*Sist oppdatert: 1. februar 2026*
