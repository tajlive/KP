# Cursor Cloud Agent – oppsett for Klarpakke

Kort steg-for-steg for å aktivere Cursor Cloud Agents på dette repoet.

**Repo:** [github.com/tajlive/KP](https://github.com/tajlive/KP)

## 1. Onboarding (første gang)

1. Gå til **[cursor.com/onboard](https://cursor.com/onboard)**.
2. Koble til **GitHub** og velg repoet **tajlive/KP** (klarpakke). Du trenger **ikke** GitHub PAT for å koble – Cursor bruker OAuth.
3. **Secrets:** Legg inn miljøvariabler under Cloud Agents → Secrets. Minimum for at `npm ci` og `npm run dev` skal kjøre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`  
     Full liste: `docs/ENV-MCP-CLI-API-AUDIT.md`. Merk hemmelige nøkler som **redacted** så de ikke committes.  
     **Valgfritt:** Hvis agenten skal pushe commits eller lage PR fra cloud-VM, legg til `GITHUB_TOKEN` (PAT med `repo`) og marker som redacted.
4. La Cursor **installere avhengigheter** og verifisere at koden kjører (agent-driven setup).
5. **Lagre VM-snapshot** når du er fornøyd, så senere cloud-agenter starter raskere.

## 2. Repo-konfigurasjon (allerede satt opp)

- **`.cursor/environment.json`**
  - `install`: `npm ci` (kjøres ved hver oppstart).
  - `terminals`: ett vindu med `npm run dev` (Next.js).
- **AGENTS.md**
  - Seksjonen «Cursor Cloud–spesifikke instruksjoner» beskriver hva agenten skal gjøre i cloud (tester, build, secrets, cron).

## 3. Resolusjon av miljø

Cursor bruker denne rekkefølgen (første treff gjelder):

1. Team-miljø (Cursor Dashboard)
2. Personlig miljø (Cursor Dashboard)
3. `.cursor/environment.json` i repo

Du kan overstyre lokalt i Cursor uten å endre repo-filen.

## 4. Nyttige kommandoer i cloud

| Oppgave      | Kommando                                         |
| ------------ | ------------------------------------------------ |
| Enhetstester | `npm run test:unit`                              |
| Lint         | `npm run lint`                                   |
| Type-sjekk   | `npm run type-check`                             |
| Build        | `SKIP_LINT_IN_BUILD=true npm run build`          |
| E2E (lokalt) | Start `npm run dev`, deretter `npm run test:e2e` |

## 5. Feilsøking: «Connection failed»

Hvis du får **«Connection failed. Please try again, or contact support if the issue persists»**:

1. **Prøv igjen** – feilen kan være midlertidig (server-side).
2. **Slå av HTTP/2:** Cursor Settings → søk «HTTP/2» → skru på **Disable HTTP/2** → start Cursor på nytt.
3. **Nettverk:** Prøv uten VPN, eller bytt nett (f.eks. mobil hotspot).
4. **MCP:** Midlertidig slå av alle MCP-servere: Cursor Settings → Features → MCP Servers.
5. **Utvidelser:** Start Cursor med `--disable-extensions` eller slå av utvidelser som kan påvirke nettverk.
6. **Modell:** Bytt fra AUTO til en spesifikk modell (f.eks. Opus 4.5 eller Sonnet).
7. **Diagnostikk:** Cursor Settings → Network → **Run Diagnostics**.
8. **Cursor-versjon:** Kjente problemer i noen versjoner (f.eks. 2.4.21); vurder oppdatering eller rollback.

Hvis setup feiler på **«Validate Setup»** / «Failed to open environment window», er det ofte samme årsaker; prøv steg 1–3 og restart.

- Forum: [Connection failed msg](https://forum.cursor.com/t/connection-failed-msg/148122), [Cloud Agent setup fails](https://forum.cursor.com/t/cursor-cloud-agent-setup-fails-every-time/152242).

## 6. Dokumentasjon

- **Setup (Cursor):** [cursor.com/docs/cloud-agent/setup](https://cursor.com/docs/cloud-agent/setup)
- **Best practices:** [cursor.com/docs/cloud-agent/best-practices](https://cursor.com/docs/cloud-agent/best-practices)
- **AGENTS.md** i repo: PL/pgSQL-regler, status, Cursor Cloud-seksjon.
