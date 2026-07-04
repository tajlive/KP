# Cloudflare Deploy Reliability

> **Status:** 2026-07-04
> **Primary deploy:** `git push origin main` triggers **Cloudflare Workers Builds**.
> **Backup / emergency only:** `npm run cf:deploy` or `npm run deploy:backup`.

## Root cause of the routes API 403

`npx wrangler deploy` deploys the Worker script successfully, then falls back to the zone-based routes API because the API token lacks **All Zones** permissions. It then calls:

```text
GET /zones/328d7de7e8e48308fd4f9d760da5b18f/workers/routes
```

and receives `HTTP 403 Forbidden`. Wrangler reports:

```text
Some triggers failed to deploy for klarpakke:
  - A request to the Cloudflare API (/zones/.../workers/routes) failed.
```

The token used by `CLOUDFLARE_API_TOKEN` currently has **Cloudflare Workers Scripts: Edit** (account) but is missing either:

- `Zone:Workers Routes: Edit` scoped to zone `328d7de7e8e48308fd4f9d760da5b18f` (preferred, least-privilege), OR
- `All Zones` permission for the `Zone:Workers Routes` permission group.

Workers Builds does **not** use this local token for routing, so normal pushes to `main` still deploy correctly.

## Required API token permissions (minimum)

| Permission group | Resource | Level | Why |
|---|---|---|---|
| Cloudflare Workers Scripts | Account `80d5b1d56a3e907150ba7348b6182894` | Edit | Upload worker script |
| Zone:Workers Routes | Zone `328d7de7e8e48308fd4f9d760da5b18f` (`klarpakke.no`) | Edit | Attach/detach worker routes |
| Cloudflare Workers KV | Account | Edit | Read/write KV namespaces |
| Zone:Zone | Zone `klarpakke.no` | Read | Resolve zone |
| Zone:Cache Purge | Zone `klarpakke.no` | Edit | Purge cache (used by cache scripts) |

> **Do not share tokens or commit them.** Rotate via `scripts/rotate-cloudflare-token.mjs` (reads `CLOUDFLARE_API_TOKEN` from env) after updating the token in `.env.local`.

## Dashboard steps to fix the token

1. Open [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens).
2. Create a new **Custom token** (or edit the existing `Klarpakke deploy` token):
   - **Token name:** e.g. `Klarpakke deploy + routes`
   - **Permissions:** add the permission groups listed above.
   - **Account resources:** include `KLARPAKKE` account.
   - **Zone resources:** include zone `klarpakke.no`.
3. Copy the token.
4. Update `.env.local`:
   ```bash
   export CLOUDFLARE_API_TOKEN=<new-token>
   ```
5. Rotate locally:
   ```bash
   node scripts/rotate-cloudflare-token.mjs
   # or
   echo "<new-token>" | node scripts/rotate-cloudflare-token.mjs
   ```
6. Verify:
   ```bash
   npx wrangler whoami
   npm run deploy:status
   ```

## Primary vs backup workflow

### Normal push (always use this)

```bash
npm run type-check
npm run lint:gate
# optional: npm run test:unit
git add -A
git commit -m "type: description"
git push origin main
# Cloudflare Workers Builds auto-deploys in ~2–3 min
npm run deploy:status
```

### Emergency backup (only when Workers Builds is down)

```bash
npm run deploy:backup
# equivalent: npm run cf:deploy
npm run deploy:status
```

## Verification scripts

- `npm run deploy:status` — lists latest Cloudflare deployments and fetches `/api/health`.
- `npm run deploy:health` — fetches production health JSON.
- `npm run deploy:check` — fetches production HTTP headers.

## Note on GitHub Actions

GitHub Actions is disabled for the `tajlive-KP` org due to a zero-dollar budget. The active deploy pipeline is **Cloudflare Workers Builds** (Git integration). GitHub Actions workflows are archived in `.github/workflows/archived/` for reference only.
