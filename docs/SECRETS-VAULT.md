# 🔐 Local Secrets Vault

The local secrets vault encrypts values from `.env.local` with AES-256-GCM and
stores the ciphertext in the MemPalace knowledge graph (`.mempalace/kg.json`).
This lets AI agents recover environment secrets from local MemPalace without
committing plaintext secrets to Git.

> **Security note:** The master key (`KLARPAKKE_VAULT_KEY`) lives only in
> `.env.local` and is **never** synced to MemPalace. Back it up securely.

---

## Security warnings

- **Never commit** `.env*.local`, `*.key`, `.mempalace/kg.json`, or
  `.mempalace/kg.json.bak`. They contain plaintext secrets or ciphertext.
- **Never pass secret values as CLI arguments.** `vault:encrypt` reads the value
  from stdin or an interactive hidden prompt so it does not appear in shell
  history or `ps`.
- `--dry-run` restore prints **masked** values only.
- The master key `KLARPAKKE_VAULT_KEY` is the only way to decrypt MemPalace-stored
  secrets. Back it up securely; losing it makes the secrets unrecoverable.

## Setup

1. Generate a vault key (idempotent — loads existing key if present):

   ```bash
   npm run vault:key
   ```

   This appends `KLARPAKKE_VAULT_KEY=<64-char-hex>` to `.env.local`.

2. Verify encryption works (pipe value to avoid shell history):

   ```bash
   BLOB=$(echo -n "value123" | npm run vault:encrypt -- TEST)
   echo "$BLOB"
   npm run vault:decrypt -- TEST "$BLOB"
   ```

---

## Sync environment to MemPalace

Encrypt every entry in `.env.local` (except `KLARPAKKE_VAULT_KEY`) and store
it in MemPalace KG:

```bash
npm run vault:sync:env
```

Use a different file:

```bash
npm run vault:sync:env -- --env-path .env.test.local
```

Dry-run (prints facts without writing):

```bash
npm run vault:sync:env -- --dry-run
```

---

## Restore environment from MemPalace

Decrypt secrets from MemPalace and write them to an env file:

```bash
npm run vault:sync:mempalace -- --env-path .env.restored.local --force
```

`--force` is required when the target file already exists.

Dry-run:

```bash
npm run vault:sync:mempalace -- --env-path .env.restored.local --dry-run
```

---

## Encrypt / decrypt single secrets

```bash
# Encrypt (interactive hidden prompt)
npm run vault:encrypt -- MY_SECRET

# Encrypt from a script (pipe value, avoid CLI args)
echo -n "my value" | npm run vault:encrypt -- MY_SECRET

# Decrypt (name is required as AAD)
npm run vault:decrypt -- MY_SECRET '{"iv":"...","authTag":"...","encrypted":"...","aad":"...","version":2}'
```

---

## File overview

| File | Purpose |
|------|---------|
| `scripts/vault/lib/crypto.mjs` | AES-256-GCM encrypt/decrypt |
| `scripts/vault/lib/env.mjs` | `.env` parser/writer |
| `scripts/vault/lib/mempalace.mjs` | KG read/write wrapper |
| `scripts/vault/vault-key.mjs` | Load or generate `KLARPAKKE_VAULT_KEY` |
| `scripts/vault/encrypt-secret.mjs` | Encrypt one secret |
| `scripts/vault/decrypt-secret.mjs` | Decrypt one secret |
| `scripts/vault/sync-env-to-mempalace.mjs` | Env → MemPalace |
| `scripts/vault/sync-mempalace-to-env.mjs` | MemPalace → env |

---

## KG format

Secrets are stored under the subject `secret:<KEY_NAME>` with these predicates:

- `encrypted_value` — the AES-256-GCM ciphertext blob
- `source` — path to the env file that was synced
- `updated_at` — ISO timestamp of the last sync

Example:

```json
{
  "secret:MY_API_KEY": [
    {
      "predicate": "encrypted_value",
      "object": "{\"iv\":\"...\",\"authTag\":\"...\",\"encrypted\":\"...\",\"version\":1}",
      "validFrom": "2026-06-20T21:30:00.000Z"
    },
    {
      "predicate": "source",
      "object": "/Users/taj/klarpakke/.env.local",
      "validFrom": "2026-06-20T21:30:00.000Z"
    },
    {
      "predicate": "updated_at",
      "object": "2026-06-20T21:30:00.000Z",
      "validFrom": "2026-06-20T21:30:00.000Z"
    }
  ]
}
```

---

## Constraints

- `KLARPAKKE_VAULT_KEY` is **never** stored in MemPalace.
- The vault uses Node.js `crypto` only — no external dependencies.
- Ciphertext includes AAD (associated data) bound to `secret:<KEY_NAME>`, so a
  blob cannot be swapped between secrets without breaking the auth tag.
- Real `.env*.local` files, `*.key` files, and `.mempalace/kg.json` are ignored
  by `.gitignore`.
- Back up `KLARPAKKE_VAULT_KEY` separately; losing it makes MemPalace-stored
  secrets unrecoverable.
