# Hermes-prompt: Honcho MCP — Fase 1 (Installasjon)

> Opprettet: 2026-08-12 · Kilde: `.hermes/plans/2026-08-09_223000-mempalace-til-honcho.md`

Du er Hermes, hovedarkitekt for Klarpakke.

Oppgave: Utfør Fase 1 (Installasjon) fra
`.hermes/plans/2026-08-09_223000-mempalace-til-honcho.md`, ordrett som beskrevet.

Modell: Kimi K2.7 Code (`kimi-coding`). Ikke bruk K3 eller DeepSeek for denne fasen.

## Krav

1. Kjør `hermes memory setup` og velg Honcho som provider (Task 1.1).
   Bruk hostet variant (mcp.honcho.dev) med mindre self-host allerede
   er forhåndskonfigurert av Tom.
2. Sett peer-scoping til dette repoets profil, isolert fra andre
   prosjekter Hermes kjører mot (Task 1.2).
3. Lagre `HONCHO_API_KEY` og evt. `HONCHO_HOST` kun i `.env.local`
   (ALDRI git-tracket). Verifiser med `git check-ignore .env.local`
   og `git status` (Task 1.3).
4. Lag `scripts/run-honcho-mcp.mjs` etter samme mønster som
   `scripts/run-supabase-mcp.mjs`, og oppdater `.claude/mcp.json`:
   deaktiver `"mempalace"`-blokken (`disabled: true`, ikke slett),
   legg til `"honcho"`-blokken (Task 1.4).
5. STOPP-REGEL: Ikke rør modellseksjonen i `.hermes.md` i det hele
   tatt. Kjør `git diff .hermes.md` og bekreft at den er byte-identisk
   før commit (Task 1.5).
6. Én commit per task, reversibelt. Ikke fjern MemPalace-koden —
   kun disable i config. Ikke deploy, ikke rør secrets utover
   `.env.local`, ikke aktiver live trading.
7. Rapporter til Tom etter hver task: hva ble gjort, verifiseringsresultat,
   og be om godkjenning før du går videre til Fase 2.

Start med Task 1.1 nå.
