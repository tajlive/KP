# Node.js Policy for Klarpakke

## Sannhetskilde

**.nvmrc** er eneste sannhetskilde for Node-versjon i hele repoet.

```bash
# Sjekk gjeldende versjon
cat .nvmrc
# Output: 24
```

## Konfigurasjonsoversikt

| Miljø | Konfigurasjon | Verdi |
|-------|---------------|-------|
| **Lokal utvikling** | `.nvmrc` | `24` |
| **GitHub Actions** | `node-version-file: '.nvmrc'` | Leser fra .nvmrc |
| **Vercel Dashboard** | Project Settings → Node.js Version | `24.x` |
| **package.json** | `engines.node` | `"24.x"` |

## Huskeordning

```
.nvmrc ──────┬──► GitHub Actions (CI)
     │       │
     │       └──► Vercel (production)
     │
     └──► Lokale utviklere (nvm/nodenv)
```

## For utviklere

### Sette opp lokalt

```bash
# Bruk nvm (anbefalt)
nvm use
# Output: Now using node v24.x.x

# Eller spesifikk versjon
nvm install 24
nvm use 24
```

### Verifisere før commit

```bash
# Sjekk Node-versjon
node -v  # Skal være v24.x.x

# Kjør Node-policy sjekk
npm run node:policy
```

## For CI/GitHub Actions

Alle workflows SKAL bruke:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v5
  with:
    node-version-file: '.nvmrc'  # ✅ Korrekt
    cache: 'npm'

# ❌ IKKE bruk hardkodet versjon:
# node-version: '24'  
# node-version: '24.x'
```

### Guard-script

```bash
# Validerer at ingen workflows har hardkodet node-version
npm run node:policy
```

Feiler med tydelig feilmelding hvis noen har introdusert `node-version: "xx"`.

## For Vercel

1. Gå til [vercel.com/dashboard](https://vercel.com/dashboard)
2. Velg `klarpakke`-prosjektet
3. **Settings** → **Build & Deployment** → **Node.js Version**
4. Velg `24.x`

Dette sikrer at:
- Build-steget kjører på Node 24.x
- Serverless Functions bruker Node 24.x-runtime
- Vercel ruller automatisk ut nye 24.x-patchversjoner

## Runtime-verifisering

Alle produksjonsworkflows logger Node-versjon tidlig i bygget:

```yaml
- name: 🖥️ Runtime-verifisering
  run: |
    echo "Node: $(node -v)"
    echo "npm: $(npm -v)"
```

Output eksempel:
```
Node: v24.14.0
npm: 11.9.0
```

## Feilsøking

### "Node version mismatch"

Sjekk at alle tre steder er synkronisert:
1. `.nvmrc` - skal være `24`
2. `package.json` engines.node - skal være `"24.x"`
3. Vercel Dashboard - skal være `24.x`

### "npm run node:policy feiler"

En workflow har hardkodet `node-version:`. Rett til:
```yaml
node-version-file: '.nvmrc'
```

---

**Sist oppdatert:** 2026-03-27  
**Eier:** Platform Team  
**Kontakt:** #klarpakke-dev
