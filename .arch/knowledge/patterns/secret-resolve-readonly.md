# Pattern: Secret resolve (read-only)

Bruk når: Et script trenger en secret-verdi uten å hardkode den.

Implementasjon: `scripts/arch/secret-resolve.mjs` (`secret://`-oppslag, `--check`
validerer kun env.local) + `scripts/arch/secret-audit.mjs` (scan + allowlist).

Regler:

- **Verdi ALDRI i kode/dokumentasjon/chat** — kun `secret://`-referanse.
- Resolver og audit er **read-only** (skriver aldri verdier).
- Registry (`.arch/secrets/registry.yaml`) inneholder **referanser, aldri verdier**.
- Verdier bor i env.local / BWS / wrangler / GitHub Actions.

Kilde: KLA-276 Secret Governance v2.
