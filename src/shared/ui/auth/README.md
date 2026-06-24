# Shared Auth UI Shells

This directory contains thin layout shells used by public and admin auth flows.
They export TypeScript interfaces and minimal placeholder implementations so
other agents can import them without circular dependencies.

## Components

- `AuthShell` — branded auth page layout shell.
- `AuthCard` — card container for auth forms.
- `AuthFormField` — reusable form field shell for auth forms.

## Import

```ts
import { AuthShell, AuthCard, AuthFormField } from "@/shared/ui/auth";
```

## Modes

`AuthShell.mode` accepts one of:

```ts
"login" | "register" | "reset" | "update" | "admin-login" | "admin-forgot" | "admin-reset"
```

## Rules

- Shells must stay thin: only layout and interfaces, no auth logic or data
  fetching.
- Do not import from feature code into these shells.
- Public and admin auth pages must both use `AuthShell`.
