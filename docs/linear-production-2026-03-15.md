# Linear – produksjon 2026-03-15

**Bruk:** Lim inn som kommentar på en relevant Linear-oppgave, eller opprett en ny oppgave «Production deploy 2026-03-15» og lim inn under beskrivelse.

---

## Produksjonsdeploy 2026-03-15

**Branch:** `chore/landing-2026-deploy`  
**Commit:** `74185b9` (+ onboarding force-dynamic, ESLint Next først)  
**Repo:** tajlive/KP

**Levert:**
- Auth: bootstrap-rens av korrupt localStorage (UTF-8) før Supabase-klient → færre «Invalid UTF-8 sequence»
- Zustand: shim for default-import → ingen deprecation-warning i prod
- Onboarding: `force-dynamic` på layout + page → build feiler ikke lenger på «Missing Supabase environment variables» under prerender
- ESLint: Next-plugin flyttet øverst i flat config (kosmetisk Next-advarsel kan fortsatt vises)
- Remote `production` (tombomann) fjernet fra git; kun `origin` (tajlive/KP) brukes

**Vercel:** Deploy til produksjon kjørt; bygg fra `chore/landing-2026-deploy`.

**Linear MCP:** Returnerte ugyldig tool-response ved kall – oppdater Linear manuelt. For automatisk oppdatering: sjekk `LINEAR_API_KEY` i Cursor/MCP-oppsett og at team-ID er riktig.

---

## Hva bør være i orden i Linear under produksjon

| Sjekk | Beskrivelse |
|-------|-------------|
| Ingen blokkere | Ingen åpne issues merket «Block production» / «Must fix before launch» som fortsatt gjelder |
| Release sporet | Én oppgave eller epic som beskriver denne releasen (f.eks. «Production deploy 2026-03-15») – for historikk og rollback-referanse |
| Kritisk feil | Issues for kjente produksjonsfeil (Sentry e.l.) opprettet og prioritert, ikke glemt i backlog |
| LINEAR_API_KEY | Hvis du vil at MCP/script skal oppdatere Linear: gyldig API-nøkkel i miljø (Cursor/Vercel env). Ikke påkrevd for selve deploy |

Linear blokkerer ikke Vercel-deploy; det er sporingsverktøy. Overvåk Sentry, Vercel og Supabase for faktisk produksjonshelse.
