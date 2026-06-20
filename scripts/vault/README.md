# Klarpakke Local Secrets Vault

This directory contains a **local, offline, AES-256-GCM secrets vault** that encrypts values from `.env.local` and stores them in the MemPalace knowledge graph (`.mempalace/kg.json`).

> **Design principle:** The master key (`KLARPAKKE_VAULT_KEY`) lives only in `.env.local`. MemPalace stores the encrypted values, not the key. This lets you restore a fresh `.env.local` from MemPalace as long as you have the master key.

---

## Files

| File | Purpose |
|------|---------|
| `vault-key.mjs` | Generate or load the 256-bit hex master key from `.env.local`. |
| `encrypt-secret.mjs` | Encrypt a single secret value (read from stdin or hidden prompt). |
| `decrypt-secret.mjs` | Decrypt a single secret stored in MemPalace. |
| `sync-env-to-mempalace.mjs` | Encrypt every entry in `.env.local` (except the master key) and write to MemPalace KG. |
| `sync-mempalace-to-env.mjs` | Decrypt secrets from MemPalace KG and write them back to an env file. |
| `lib/crypto.mjs` | AES-256-GCM with AAD bound to `secret:<NAME>`. |
| `lib/env.mjs` | Minimal `.env` parser/writer with atomic writes and `0o600` permissions. |
| `lib/mempalace.mjs` | Read/write wrapper around `.mempalace/kg.json`. |

---

## Quick start

### 1. Ensure the master key exists

```bash
npm run vault:key
```

This prints the key. It should already be set as `KLARPAKKE_VAULT_KEY` in `.env.local`. If it is missing, add it:

```bash
# Generate a fresh key (only if you do not already have one)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Sync `.env.local` to MemPalace

```bash
npm run vault:sync:env
```

This encrypts every variable in `.env.local` except `KLARPAKKE_VAULT_KEY` and stores them in `.mempalace/kg.json` under `secret:<NAME>`.

### 3. Restore `.env.local` from MemPalace

```bash
npm run vault:sync:mempalace
```

By default this runs in **dry-run mode** and prints masked values. To actually write the file:

```bash
npm run vault:sync:mempalace -- --force
```

> **Warning:** This overwrites the target env file. Make sure you have a backup or version control is not tracking `.env.local`.

---

## Encrypting / decrypting a single secret

```bash
# Encrypt (value read from hidden prompt)
npm run vault:encrypt -- MY_SECRET_NAME

# Decrypt
npm run vault:decrypt -- MY_SECRET_NAME
```

You can also pipe a value in:

```bash
cat api-key.txt | npm run vault:encrypt -- BINANCE_API_KEY
```

---

## Security notes

- **Master key isolation:** `KLARPAKKE_VAULT_KEY` is never synced to MemPalace. Keep it in `.env.local` and back it up offline (1Password, hardware token, etc.). Losing this key means losing all encrypted secrets.
- **AAD binding:** Each ciphertext includes AAD (`secret:<NAME>`), so a ciphertext cannot be swapped between secret names.
- **File permissions:** Env files and `.mempalace/kg.json` are written with `0o600` permissions.
- **Atomic writes:** All writes use a temp file + rename to avoid partial writes.
- **Git hygiene:** `.env.local` and `.mempalace/kg.json` are ignored by `.gitignore`. Never commit real secrets or the encrypted vault.

---

## Disaster recovery

If you lose `.env.local` but still have `KLARPAKKE_VAULT_KEY` and `.mempalace/kg.json`:

1. Create a new `.env.local` with only the master key:
   ```bash
   echo 'KLARPAKKE_VAULT_KEY=<your-key>' > .env.local
   chmod 600 .env.local
   ```
2. Restore the rest:
   ```bash
   npm run vault:sync:mempalace -- --force
   ```

If you lose the master key, the encrypted values in MemPalace cannot be decrypted. Rotate all secrets and start over.

---

## npm scripts

| Script | Command |
|--------|---------|
| `npm run vault:key` | Show / verify the master key. |
| `npm run vault:encrypt` | Encrypt a single secret. |
| `npm run vault:decrypt` | Decrypt a single secret. |
| `npm run vault:sync:env` | Encrypt `.env.local` → MemPalace. |
| `npm run vault:sync:mempalace` | Decrypt MemPalace → `.env.local` (dry-run by default). |

---

## Inventory

See `docs/SECRETS-INVENTORY.md` for the authoritative list of every environment variable used by Klarpakke.
