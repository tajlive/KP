# Shared Marketing UI Shells

This directory contains thin layout shells used by marketing and landing pages.
They export TypeScript interfaces and minimal placeholder implementations so
other agents can import them without circular dependencies.

## Components

- `MarketingPageShell` — page-level wrapper for marketing pages.
- `Hero` — hero section layout shell.
- `CTASection` — call-to-action section layout shell.
- `FeatureGrid` — responsive feature grid layout shell.
- `TrustBadges` — trust badge / social proof section layout shell.

## Import

```ts
import {
  MarketingPageShell,
  Hero,
  CTASection,
  FeatureGrid,
  TrustBadges,
} from "@/shared/ui/marketing";
```

## Rules

- Shells must stay thin: only layout and interfaces, no business logic or data
  fetching.
- Do not import from feature code into these shells.
- Concrete content is passed via `children` or configured in the consuming
  feature/page.
