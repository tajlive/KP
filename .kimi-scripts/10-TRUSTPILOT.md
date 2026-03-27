# Script 10: Trustpilot Integration

## Overview
Full Trustpilot Business integration for Klarpakke landing page with mock data fallback, caching, and SEO structured data.

## Files Created

### Components

| File | Description |
|------|-------------|
| `src/components/trustpilot/TrustBoxMini.tsx` | Horizontal strip widget for footer/header |
| `src/components/trustpilot/TrustBoxCarousel.tsx` | Carousel with 3-5 reviews, responsive |
| `src/components/trustpilot/TrustBoxWidget.tsx` | Large widget for dedicated reviews section |
| `src/components/trustpilot/TrustpilotJsonLd.tsx` | JSON-LD structured data for SEO |
| `src/components/trustpilot/index.ts` | Component exports |
| `src/components/landing/TrustpilotSection.tsx` | Landing page section with carousel |

### Services

| File | Description |
|------|-------------|
| `src/lib/trustpilot/api.ts` | API client with caching |
| `src/lib/trustpilot/mock-reviews.ts` | 8 realistic Norwegian mock reviews |

### Integration

| File | Change |
|------|--------|
| `src/components/landing/Footer.tsx` | Added TrustBoxMini to brand section |
| `src/lib/i18n/translations.ts` | Added `trustpilot` namespace (no/en) |

## Features

### TrustBox Mini
- Shows stars + score (e.g., 4.9/5)
- Links to Trustpilot profile
- Demo badge when using mock data
- Dark/light theme support

### TrustBox Carousel
- Horizontal scroll on mobile (touch-swipe)
- 1 card (mobile), 2 (tablet), 3+ (desktop)
- Navigation arrows on desktop
- Dot indicators
- Framer Motion animations

### TrustBox Widget
- Full reviews grid (2 columns)
- Summary header with TrustScore
- "Read all reviews" CTA
- Verified badges

### API Service
- Fetches from Trustpilot API if `TRUSTPILOT_API_KEY` is set
- Falls back to mock data with demo badge
- 1-hour caching via Redis/memory
- Error handling

### Mock Reviews
8 realistic Norwegian reviews covering:
- Crypto learning journey
- Paper trading praise
- Norsk support appreciation
- Risk management learning
- Feature requests

## Environment Variables

```bash
# Optional - for real Trustpilot data
TRUSTPILOT_API_KEY=your_api_key
TRUSTPILOT_API_SECRET=your_api_secret
TRUSTPILOT_BUSINESS_UNIT_ID=your_business_unit_id
```

Without these, the integration uses mock data marked with "Demo" badge.

## Usage

### TrustBox Mini (Footer)
```tsx
import { TrustBoxMini } from "@/components/trustpilot";

<TrustBoxMini variant="dark" />
```

### TrustBox Carousel (Landing)
```tsx
import { TrustBoxCarousel } from "@/components/trustpilot";

<TrustBoxCarousel maxReviews={5} />
```

### TrustBox Widget (Full)
```tsx
import { TrustBoxWidget } from "@/components/trustpilot";

<TrustBoxWidget maxReviews={6} />
```

### Trustpilot Section (Pre-built)
```tsx
import { TrustpilotSection } from "@/components/landing/TrustpilotSection";

<TrustpilotSection />
```

### JSON-LD Structured Data
```tsx
import { TrustpilotJsonLd } from "@/components/trustpilot";

// In page.tsx (Server Component)
<TrustpilotJsonLd maxReviews={3} />
```

## i18n Keys

```typescript
trustpilot: {
  reviews: "anmeldelser",
  verified: "Verifisert",
  demo: "Demo",
  trustScore: "TrustScore",
  readAllReviews: "Les alle anmeldelser",
  mini: {
    ariaLabel: "{stars} av 5 stjerner basert på {count} anmeldelser",
  },
  section: {
    badge: "Excellent på Trustpilot",
    title: "Dette sier våre kunder",
    subtitle: "Les hva norske tradere mener om Klarpakke",
    cta: "Les alle anmeldelser på Trustpilot",
  },
}
```

## Performance

- **Lazy loaded**: Components use dynamic data fetching
- **Cached**: 1-hour cache via Redis/memory
- **No layout shift**: Fixed dimensions during loading state
- **Responsive**: Mobile-first design with touch support

## Next Steps

1. **Get Trustpilot Business account** at trustpilot.com
2. **Add environment variables** to Vercel
3. **Verify integration** works with real data
4. **Remove demo badge** once live

## Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Check build
npm run build
```
