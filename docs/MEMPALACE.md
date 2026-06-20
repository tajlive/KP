# 🏛️ Klarpakke Mempalace - Dokumentasjonsnav

## Navigasjonsprinsipp
Hvert "rom" i palasset inneholder et tema. Bruk visuell assosiasjon for å huske.

---

## 🏛️ Hovedhall (README + Oversikt)
**Inngangsdøren** → `README.md`
- Velkomst, prosjektoversikt
- Hurtigstart-guide
- Lenker til alle andre rom

**Vegg 1:** Arkitektur-diagram
**Vegg 2:** Tech stack
**Vegg 3:** Kontakt/info

---

## 🏺 Arkivet (Arkitektur & Design)
**Plassering:** Vestfløyen, bak tremdører
```
docs/architecture/
├── ROUTE-INVENTORY-2026.md     ← "Rutekart over byen"
├── KLA-91-ROADMAP-CURSOR.md    ← "Byggeplaner"
├── TYPE-DEBT-ROADMAP-2026.md   ← "Gjeldsbøker"
└── *.md
```

**Husk:** Arkivet = All teknisk design og beslutninger

---

## 🔒 Skattekammeret (Sikkerhet & Auth)
**Plassering:** Under bakken, ståldør
```
docs/security/
├── GITHUB-OPERATING-MODEL.md   ← "Vaktinstruks"
├── SENTRY-PROD.md              ← "Alarm-system"
└── auth-storage.md             ← "Nøkkelskap"
```

**Husk:** Skattekammeret = Sensitiv info, hemmeligheter, sikkerhet

---

## 🧪 Laboratoriet (Testing & Kvalitet)
**Plassering:** Østfløyen, glassvegger
```
docs/testing/
├── TEST-CALIBRATION-2026.md    ← "Testresultater"
├── WATCHDOG-EXTERNAL-USER.md   ← "Vakthundinstruks"
└── *.test.ts                   ← "Eksperimentprotokoller"
```

**Husk:** Laboratoriet = Alle tester, kvalitetsmålinger, eksperimenter

---

## 🏭 Smia (DevOps & Infrastruktur)
**Plassering:** Uthus, ild og damp
```
.github/workflows/              ← "Maskineriet"
docs/automation/
├── FULL-AUTOMATION-PLAYBOOK.md ← "Driftsmanual"
└── DEPLOYMENT.md               ← "Utskipningsprosedyrer"
```

**Husk:** Smia = CI/CD, deploy, automatisering

---

## 📚 Biblioteket (Kode & API)
**Plassering:** Nordfløyen, høye bokhyller
```
src/                           ← "Boksamlingen"
docs/api/
└── api-routes.md               ← "Innholdsfortegnelse"
```

**Husk:** Biblioteket = All kildekode og API-dokumentasjon

---

## 🎯 Strategirummet (Product & Roadmap)
**Plassering:** Tårnet, panoramautsikt
```
docs/product/
├── product-principles-2026.md  ← "Grunnloven"
├── TARGET-AUDIENCE.md          ← "Befolkningsregister"
└── pricing/                    ← "Skatteregister"
```

**Husk:** Strategirummet = Visjon, mål, produktbeslutninger

---

## 🎭 Teateret (UX & Design)
**Plassering:** Sentrum, røde gardiner
```
docs/ux/
├── MOBILE-UA-SWEEP-2026.md     ← "Scenografi"
└── MICROCOPY-I18N-OBSERVABILITY-2026.md  ← "Manus"
```

**Husk:** Teateret = Brukeropplevelse, design, tekster

---

## 🗺️ Kartografens Kontor (Database & Skjema)
**Plassering:** Ved siden av arkivet
```
supabase/migrations/            ← "Kart over terrenget"
docs/
├── SUPABASE-MIGRASJONER-VARIG-LOSNING.md
└── CRON-SOURCE-OF-TRUTH.md
```

**Husk:** Kartografen = Database-skjema, migrasjoner, dataflyt

---

## 🚨 Kommandosentralen (Incident & Drift)
**Plassering:** Midt i bygningen, skjermer overalt
```
docs/incidents/
├── INCIDENT-SUMMARY-2026-03-28.md  ← "Krøniker"
└── ROLLBACK.md                     ← "Nødprotokoll"
```

**Husk:** Kommandosentralen = Hendelser, hendelseshåndtering, drift

---

## 🔄 Roterende Arkiv (Changelog & Versjonering)
**Plassering:** Heisen mellom etasjer
```
CHANGELOG.md                    ← "Dagbok"
```

**Husk:** Rullerende oppdatering av endringer

---

## Hvordan Navigere

### For Utviklere:
1. **Ny i teamet?** → Hovedhall → Biblioteket
2. **Skal deploye?** → Smia → Kommandosentralen
3. **Bug i produksjon?** → Kommandosentralen → Skattekammeret
4. **Ny feature?** → Strategirummet → Arkivet → Biblioteket

### For Arkitekter:
1. **Vurderer endring?** → Arkivet → Kartografen → Laboratoriet

### For Produkt:
1. **Planlegger kvartal?** → Strategirummet → Teateret

---

## 🔌 SessionEnd Hook

KIMI SessionEnd-hooken for dette prosjektet ligger i:

```
/Users/taj/klarpakke/.kimi/hooks/mempalace-smart-exit.sh
```

Den konfigureres i `~/.kimi/config.toml` under `[[hooks]]` / `event = "SessionEnd"`. Endringer i prosjekthooken vil derfor automatisk gjelde for alle sesjoner så lenge config peker på filen over.

## Vedlikehold
- **Hver commit:** Oppdater relevant "rom"
- **Hver uke:** Sjekk at lenker fungerer
- **Hver måned:** Arkiver utdatert informasjon
- **Hver kvartal:** Review og restrukturering

---

**Husk:** Mempalace fungerer kun hvis du "besøker" rommene regelmessig!
