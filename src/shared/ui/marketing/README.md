# Shared Marketing UI Shells

This directory contains thin layout shells used by marketing and landing pages.
They export TypeScript interfaces and minimal placeholder implementations so
other agents can import them without circular dependencies.

## Components

- `MarketingPageShell` — page-level wrapper for marketing pages.
- `LegalPageShell` — page-level wrapper for legal pages.

## Import

```ts
import {
  MarketingPageShell,
  LegalPageShell,
  generateMarketingMetadata,
  generateLegalMetadata,
} from "@/shared/ui/marketing";
```

## Rules

- Shells must stay thin: only layout and interfaces, no business logic or data
  fetching.
- Do not import from feature code into these shells.
- Concrete content is passed via `children` or configured in the consuming
  feature/page.
