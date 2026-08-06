# Subagent Strategier

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 5. Subagent-strategi for parallelle oppgaver

**Når:** 3+ uavhengige filer endres med samme mønster, eller 3+ uavhengige driftsoppgaver må kjøres samtidig.

**Gjør:**
1. Skriv plan med eksakt kode per fil → `.hermes/plans/`
2. Dispatch `delegate_task` med tasks-array (max 4 samtidig)
3. Etter alle er ferdige: kjør `npx eslint` på alle endrede filer
4. Sjekk `git diff` — subagenter kan lyve om "file written"
5. Bygg og deploy

**4-agent fan-out for driftsoppgaver (2026-07-29):** Ved 4+ uavhengige forbedringer på tvers av domener, dispatcher 4 leaf-agenter parallelt i én `delegate_task` med `tasks`-array. Alle fullfører på ~6 min (vs ~22 min sekvensielt). Oppskrift: A1=cron/scripts, A2=API/alarms, A3=UI/i18n, A4=features/UX. Hver agent får én veldefinert oppgave med eksakte filstier, kontekst, og verktøy.

**Fallgruver:**
- Flere subagenter på SAMME fil → overskriving. Aldri dispatche til samme fil.
- Subagenter rapporterer suksess uten å ha skrevet filen. Verifiser alltid.
- De har ikke `clarify` — all kontekst må sendes i dispatch.


