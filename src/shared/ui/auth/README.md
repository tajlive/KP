# Shared Auth UI Shells

This directory contains layout shells used by public and admin auth flows.

## Components

- `AuthShell` — branded auth page layout shell (dark background, centered content, mode-aware styling).
- `AuthCard` — card container for auth forms with optional centered header.
- `AuthFormField` — reusable label + input + error component with public/admin variants and optional icon.

## Import

```ts
import { AuthShell, AuthCard, AuthFormField } from "@/shared/ui/auth";
```

## Modes

`AuthShell.mode` and `AuthCard.mode` accept one of:

```ts
"login" | "register" | "reset" | "update" | "admin-login" | "admin-forgot" | "admin-reset"
```

Admin modes render a gradient background and an admin-styled card, while public modes render the standard dark slate layout.

## Rules

- Shells stay focused on layout and presentation; auth logic lives in the pages that consume them.
- Do not import from feature code into these shells.
- Public and admin auth pages must both use `AuthShell`.
