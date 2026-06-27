# Chrome Control — Browser automation fra KIMI CLI

Lokal nettleserautomasjon for KIMI CLI via MCP. Brukes til å navigere på klarpakke.no, ta screenshots, fylle ut skjema, kjøre JavaScript i siden og andre oppgaver der det ikke finnes et API.

## Hvordan det fungerer

En dedikert MCP-server (`scripts/chrome-mcp-server.mjs`) starter en ekte Chrome-vindu via Playwright og eksponerer verktøy KIMI kan kalle. Nettleseren bruker en persistent profil under `.chrome-profile/` slik at innlogginger overleverer mellom kjøringer.

Serveren kjører som **lokal stdio MCP-server** — ingen åpen nettverksport og ingen `npx`-oppstart.

## Sikkerhetsmodell

- **Kun lokal**: stdio MCP-transport; ingen åpen port.
- **Godkjenningsgate**: lesende verktøy (`navigate`, `snapshot`, `screenshot`, `extract`, `console`) kjører automatisk; skrivende verktøy (`click`, `fill`, `type`, `select`, `press`, `hover`, `scroll`, `evaluate`) pauses til brukeren godkjenner med `chrome_approve({approve:true})`. Alle pending-handlinger (inkludert navigering til ikke-allowlistede domener og JS-evaluering) bruker en felles kø: kall `chrome_approve` én gang per handling.
- **Domene-gate**: kun HTTPS-URL-er på allowlist eller session-godkjente domener kan åpnes. Standard allowlist: `klarpakke.no`, `www.klarpakke.no`. Utvid via `CHROME_MCP_ALLOWLIST=example.com,another.com`.
- **Audit log**: hvert verktøykall skrives til `logs/chrome-mcp.log`.
- **Ingen passord-autofill fra KIMI**: KIMI skal aldri fylle passord-felt. Brukeren logger inn manuelt én gang; persistent profil holder sesjonen. Med systemprofil-modus kan eksisterende lagrede passord og sesjoner fra brukerens ekte Chrome brukes.

## Profil-moduser

`chrome_start` støtter flere måter å håndtere profil på:

| Modus | Beskrivelse | Når å bruke |
|-------|-------------|-------------|
| `clean` (standard) | Starter med en isolert, tom `.chrome-profile/`. | Standard. Trygt, ingen import. |
| `copy` | Kopierer hele systemets Chrome-profil inn i `.chrome-profile/` før start. | Du vil gjenbruke passord, cookies og sesjoner fra din vanlige Chrome. Krever at Chrome er lukket. |
| `storage` | Samme som `copy`, men dokumentert som fokus på lagring/sesjon. | Samme som over. |
| `cdp` | Kobler til en allerede kjørende Chrome-instans via Chrome DevTools Protocol. | Du vil bruke den *aktive* Chrome-vinduet med alle åpne faner og innlogginger. Krever `--remote-debugging-port`. |

Legg merke til at `useSystemProfile: true` fortsatt fungerer og er det samme som `profileMode: "copy"`.

### Modus 1: `clean` (standard)

```text
chrome_start
chrome_navigate https://www.klarpakke.no/no
```

### Modus 2: `copy` — gjenbruk passord og sesjoner

Kopierer brukerens system-Chrome-profil (inkludert passord, cookies, localStorage, etc.) til `.chrome-profile/`. Passordene er kryptert mot OS-nøkkelringen (macOS Keychain / Windows DPAPI / Linux keyring), så dette fungerer bare på samme maskin og samme brukerkonto.

Forutsetning: **Chrome må være helt lukket** (ingen SingletonLock).

```text
chrome_start profileMode="copy"
chrome_navigate https://www.klarpakke.no/no/login
```

Du kan også importere profilen på forhånd via kommandolinjen:

```bash
node scripts/chrome-mcp-import-session.mjs
# eller
node scripts/chrome-mcp-import-session.mjs --mode=storage
```

### Modus 3: `cdp` — koble til kjørende Chrome

Denne er den mest pålitelige måten å bruke en aktiv Chrome-sesjon på, fordi du slipper å kopiere profilen. Du får tilgang til samme vindu, faner, cookies og passord som allerede er åpne.

1. Start Chrome med remote debugging (lukk alle Chrome-vinduer først):

   **macOS:**
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/Library/Application Support/Google/Chrome"
   ```

   **Linux:**
   ```bash
   google-chrome \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.config/google-chrome"
   ```

   **Windows (PowerShell):**
   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" `
     --remote-debugging-port=9222 `
     --user-data-dir="$env:LOCALAPPDATA\Google\Chrome\User Data"
   ```

2. Sett eventuelt `CHROME_CDP_URL` i `.env.local` (valgfritt):
   ```bash
   CHROME_CDP_URL=http://127.0.0.1:9222
   ```

3. I KIMI:
   ```text
   chrome_start profileMode="cdp"
   chrome_navigate https://www.klarpakke.no/no/dashboard
   ```

## Oppsett

1. Sørg for at Playwright Chromium er installert:

   ```bash
   npx playwright install chromium
   ```

2. `MCP_API_KEY` må være satt i `.env.local` (brukes av wrapperen).

3. Chrome MCP-serveren er aktivert i `.kimi/mcp-config.json` (synkronisert til `.mcp/mcp_config.json` etc. via `npm run mcp:sync`).

4. (Valgfritt) Sett standard profil-modus i `.env.local`:

   ```bash
   # Standardmodus for chrome_start når den ikke angir profileMode
   CHROME_MCP_PROFILE_MODE=copy
   # Valgfritt CDP-endepunkt
   CHROME_CDP_URL=http://127.0.0.1:9222
   ```

5. Start serveren manuelt eller la KIMI starte den via MCP:

   ```bash
   npm run chrome:mcp
   # eller KIMI-alias:
   kimi browser
   kimi chrome
   ```

## Tilgjengelige verktøy

| Verktøy | Klasse | Beskrivelse |
|---------|--------|-------------|
| `chrome_start` | auto | Start Chrome (headed by default). Støtter `profileMode`: clean/copy/cdp/storage. |
| `chrome_stop` | auto | Lukk Chrome. |
| `chrome_get_info` | auto | Vis systemprofil, lokal profil, sesjon og miljøvariabler. |
| `chrome_import_session` | auto | Kopier systemprofilen til `.chrome-profile/` uten å starte Chrome. |
| `chrome_navigate` | auto | Gå til HTTPS-URL; pauser hvis domenet ikke er allowlistet. |
| `chrome_snapshot` | auto | Returner accessibility tree / AOM-snapshot med referanser. |
| `chrome_screenshot` | auto | Ta base64 PNG av viewport eller hele siden. |
| `chrome_extract` | auto | Hent tekst/attributt eller side-tittel + synlig tekst. |
| `chrome_wait` | auto | Vent på selector, nettverksidle eller timeout. |
| `chrome_console` | auto | Hent nylige konsoll-meldinger. |
| `chrome_pdf` | auto | Generer PDF av siden som base64. |
| `chrome_click` | confirm | Klikk element; krever godkjenning. |
| `chrome_fill` | confirm | Fyll input; krever godkjenning. |
| `chrome_type` | confirm | Tast inn tekst tegn for tegn; krever godkjenning. |
| `chrome_select` | confirm | Velg dropdown-option; krever godkjenning. |
| `chrome_press` | confirm | Trykk en tast; krever godkjenning. |
| `chrome_hover` | confirm | Hovre over element; krever godkjenning. |
| `chrome_scroll` | confirm | Scroll side eller element; krever godkjenning. |
| `chrome_evaluate` | confirm | Kjør JS i side-kontekst; krever godkjenning. |
| `chrome_approve` | auto | Godkjenn/avvis pending handling eller navigering. |

## Eksempel: sjekk landingssiden

```text
chrome_start
chrome_navigate https://www.klarpakke.no/no
chrome_snapshot
chrome_screenshot
chrome_stop
```

## Eksempel: logg inn med eksisterende systemprofil

```text
chrome_start profileMode="copy"
chrome_navigate https://www.klarpakke.no/no/login
chrome_snapshot
chrome_stop
```

Hvis du allerede er logget inn i Chrome, vil du nå være logget inn her også.

## Eksempel: logg inn og naviger til dashboard (manuell flow)

```text
chrome_start
chrome_navigate https://www.klarpakke.no/no/login
chrome_fill selector="input[type=email]" value="deg@eksempel.no"
chrome_approve approve=true
chrome_fill selector="input[type=password]" value="(brukeren fyller dette selv)"
chrome_approve approve=true
chrome_click selector="button[type=submit]"
chrome_approve approve=true
chrome_navigate https://www.klarpakke.no/no/dashboard
chrome_snapshot
chrome_stop
```

## Manuell start

```bash
node scripts/run-chrome-mcp.mjs
```

Serveren kjører til den blir drept. Hold terminalen synlig så du kan godkjenne handlinger.

## Hjelpescripts

| Script | Bruk |
|--------|------|
| `node scripts/chrome-mcp-validate-profile.mjs` | Sjekk systemprofil, lokal profil, om Chrome kjører, og viktige filer. |
| `node scripts/chrome-mcp-validate-profile.mjs --copy` | Samme som over, pluss kopier systemprofilen umiddelbart. |
| `node scripts/chrome-mcp-import-session.mjs` | Kopier systemprofilen til `.chrome-profile/`. |
| `node scripts/chrome-mcp-import-session.mjs --mode=storage` | Samme som over, dokumentert som sesjonsimport. |

## Feilsøking

- **Chrome åpner ikke**: sjekk at Playwright Chromium er installert (`npx playwright install chromium`).
- **Domenet blokkert**: godkjenn det én gang med `chrome_approve({approve:true})` eller legg det til i `CHROME_MCP_ALLOWLIST`.
- **Pending handling henger**: kall `chrome_approve({approve:false})` for å avbryte, og prøv igjen.
- **MCP-serveren vises ikke i KIMI**: kjør `npm run mcp:sync` og start KIMI på nytt.
- **`profileMode='copy'` feiler med SingletonLock**: Chrome kjører allerede. Lukk Chrome helt, eller bruk `profileMode='cdp'` i stedet.
- **`profileMode='copy'` finner ikke passord**: Passord er kryptert mot OS-nøkkelringen. Sikre at du kjører på samme maskin/bruker som eier Chrome-profilen. På macOS kan du trenge å låse opp Keychain.
- **`profileMode='cdp'` feiler med connection refused**: Chrome er ikke startet med `--remote-debugging-port=9222`, eller porten er opptatt. Sjekk `chrome_get_info` for aktivt CDP-endepunkt.
- **Lokal profil ble ødelagt**: Ved hver `copy`-import tas en backup `.chrome-profile.backup-<timestamp>`. Stopp Chrome og bytt tilbake manuelt hvis nødvendig.

## Sikkerhetsmerknader

- `.chrome-profile/` inneholder sensitiv informasjon (cookies, passord-DB, localStorage). Ikke sjekk den inn i Git; den ligger allerede i `.gitignore`.
- Backup-mappene `.chrome-profile.backup-*` inneholder også sensitiv data. Rydd dem opp regelmessig.
- CDP-modus kobler til allerede kjørende Chrome og har tilgang til alle åpne faner. Bruk kun på lokal maskin.
- KIMI skal aldri fylle ut passordfelter automatisk. Systemprofil/CDP gjør at brukeren slipper å logge inn på nytt, men KIMI ber fortsatt ikke om eller skriver passord.
