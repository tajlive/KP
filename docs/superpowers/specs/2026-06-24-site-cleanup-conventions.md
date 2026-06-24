# Site Cleanup Conventions — 2026-06-24

> Cross-cutting conventions for the Klarpakke site cleanup/refactoring effort.
> Applies to all domain agents working on marketing pages, auth flows, landing
> pages and shared UI shells.

## 1. Shell Components

All page-level layout and repeated section components must be imported from the
shared shells created in this task. Do not re-implement wrappers, heroes, CTAs,
feature grids or trust badges inside individual features.

### 1.1 Marketing Page Shell

Location: `src/shared/ui/marketing/MarketingPageShell.tsx`

```ts
export type MarketingNamespace =
  | "landing"
  | "pricing"
  | "about"
  | "contact"
  | "calculator"
  | "help";

export interface MarketingPageShellProps {
  /** i18n namespace used for page-level keys. */
  namespace: MarketingNamespace;
  /** Page content. */
  children: React.ReactNode;
  /** Optional additional className for the root element. */
  className?: string;
  /** Whether the global footer CTA should be rendered. */
  withCTA?: boolean;
}
```

Rules:

- The shell owns the page `<main>` wrapper, SEO metadata helpers and the global
  footer CTA when `withCTA` is true.
- Marketing pages must render their content as children of this shell.
- No hardcoded section titles or CTAs inside individual pages.

### 1.2 Auth Shell

Location: `src/shared/ui/auth/AuthShell.tsx`

```ts
export type AuthMode =
  | "login"
  | "register"
  | "reset"
  | "update"
  | "admin-login"
  | "admin-forgot"
  | "admin-reset";

export interface AuthShellProps {
  /** Which auth flow is being rendered. */
  mode: AuthMode;
  /** Form or content rendered inside the auth card. */
  children: React.ReactNode;
  /** Optional additional className for the root element. */
  className?: string;
}
```

Rules:

- The shell owns the branded auth layout, background and card container.
- Public and admin auth pages must both use this shell.
- Mode-specific copy and links are derived from the `mode` prop via i18n.

## 2. i18n Key Naming Convention

All new or refactored i18n keys must follow this convention:

- Use **camelCase**.
- Prefix keys with their **section** and then their **concept**.
- Prefer dot-notation namespaces.

Examples:

```json
{
  "pages": {
    "pricing": {
      "title": "Priser",
      "metaDescription": "Oversikt over priser og pakker."
    }
  },
  "sections": {
    "hero": {
      "headline": "Automatiser handelen",
      "subheadline": "Klarpakke gjør det enkelt."
    },
    "cta": {
      "primary": "Kom i gang",
      "secondary": "Se priser"
    }
  },
  "forms": {
    "email": {
      "label": "E-post",
      "placeholder": "din@epost.no"
    }
  }
}
```

Namespaces used by the shells:

- `marketing` — shared marketing copy (hero, CTA, features, trust badges)
- `auth` — shared auth copy (labels, errors, links)
- Page-specific namespaces: `landing`, `pricing`, `about`, `contact`,
  `calculator`, `help`.

## 3. Path Helpers

**No hardcoded route strings** are allowed in page components, CTAs, forms,
navigation or auth redirects.

All routes must be built with centralized helpers. During this refactor:

1. Create or extend `src/lib/navigation/paths.ts` with helpers such as:

   ```ts
   export const paths = {
     home: (locale: string) => `/${locale}`,
     pricing: (locale: string) => `/${locale}/priser`,
     about: (locale: string) => `/${locale}/om-oss`,
     contact: (locale: string) => `/${locale}/kontakt`,
     calculator: (locale: string) => `/${locale}/kalkulator`,
     help: (locale: string) => `/${locale}/hjelp`,
     login: (locale: string) => `/${locale}/login`,
     register: (locale: string) => `/${locale}/registrer`,
     resetPassword: (locale: string) => `/${locale}/glemt-passord`,
     updatePassword: (locale: string) => `/${locale}/oppdater-passord`,
     adminLogin: (locale: string) => `/${locale}/admin/login`,
     adminForgot: (locale: string) => `/${locale}/admin/glemt-passord`,
     adminReset: (locale: string) => `/${locale}/admin/tilbakestill-passord`,
   };
   ```

2. Import helpers from `@/lib/navigation/paths` (or the agreed module) in every
   page, component and navigation config.
3. Replace any inline `` `/${locale}/...` `` strings when touching a file.

## 4. Commit Message Format

Use the conventional commit format:

```
type(scope): description
```

Allowed types:

- `feat` — new feature or shell added
- `fix` — bug fix
- `refactor` — restructuring without behavior change
- `docs` — documentation or conventions
- `test` — tests only
- `chore` — tooling, deps, config

Scopes for this cleanup:

- `marketing` — marketing pages and components
- `landing` — landing page specific work
- `auth` — auth flows and shells
- `ui` — shared UI shells
- `i18n` — translation keys/namespaces
- `nav` — navigation config

Examples:

```
refactor(marketing): use MarketingPageShell on pricing page
feat(auth): add admin-login mode to AuthShell
refactor(ui): replace duplicated HeroSection with Hero shell
```

## 5. Agent Status Reporting

When finishing a sub-task, each domain agent must report one of the following
statuses:

| Status | Meaning |
|--------|---------|
| `DONE` | Task completed, verification passed, no blockers. |
| `DONE_WITH_CONCERNS` | Task completed, but with non-blocking concerns that the lead should review. |
| `NEEDS_CONTEXT` | Task cannot proceed without clarification or additional context. |
| `BLOCKED` | Task is blocked by another task, dependency or external issue. |

Include in the report:

1. Status.
2. Summary of files created/modified.
3. Concerns or blockers (if any).
4. Output of `npm run lint:gate`, `npm run type-check` and `npm run test:unit`,
   or confirmation that they passed.

## 6. Directory Ownership

| Directory | Owner | Purpose |
|-----------|-------|---------|
| `src/shared/ui/marketing/*` | Marketing / Landing agents | Reusable marketing section shells. |
| `src/shared/ui/auth/*` | Auth agent | Reusable auth layout and form shells. |
| `src/lib/navigation/*` | Navigation agent | Centralized path helpers and nav config. |
| `src/features/marketing/*` | Marketing agent | Concrete marketing page sections. |
| `src/features/landing/*` | Landing agent | Landing-page-specific sections. |
| `src/app/[locale]/*` | Page agents | Next.js App Router pages. |

## 7. Rules of the Refactor

1. **Shells stay thin.** Do not add business logic, data fetching or complex
   animation to the shells in `src/shared/ui/`. They only own layout and
   exported interfaces.
2. **No circular imports.** Shared shells must not import from feature code.
   Feature code may import shells.
3. **Preserve existing behavior.** Refactor existing pages one at a time; do
   not change user-visible behavior in this cleanup pass.
4. **Verify before reporting.** Run `npm run lint:gate`, `npm run type-check`
   and `npm run test:unit` after changes.
