# Homepage Bundle Analysis - FASE 1 Complete

**Date:** 2026-03-09  
**Analyst:** KIMI Code CLI  
**Status:** ✅ Analysis Complete

---

## Executive Summary

### Root Cause Identified: TTFB (Time to First Byte)

**LCP Breakdown (Lighthouse Mobile):**
| Subpart | Duration | Status |
|---------|----------|--------|
| Time to First Byte (TTFB) | **4541 ms** | 🔴 CRITICAL |
| Element Render Delay | 823 ms | 🟡 Moderate |
| **Total LCP** | **~6200 ms** | 🔴 Fails target (<2500ms) |

**Key Finding:** TTFB på 4.5s er hovedårsaken til dårlig LCP, ikke JavaScript bundle size.

---

## Bundle Size Analysis

### JavaScript Chunks (Top 10)
| Chunk | Size | Notes |
|-------|------|-------|
| 2818-*.js | 408 KB | Main app bundle (React, Next.js core) |
| 9159-*.js | 287 KB | Secondary bundle |
| 5497-*.js | 188 KB | Components bundle |
| framework-*.js | 185 KB | React + Next.js framework |
| 4bd1b-*.js | 169 KB | Shared utilities |
| ca377-*.js | 157 KB | Additional components |
| main-*.js | 157 KB | Main entry point |
| d0709-*.js | 149 KB | Feature bundle |
| 4492-*.js | 116 KB | UI components |
| 2441-*.js | 114 KB | Charts/graphs (recharts?) |
| polyfills-*.js | 109 KB | Browser polyfills |
| **Total JS** | **~1.9 MB** | Uncompressed |

### CSS Size
| File | Size | Status |
|------|------|--------|
| Main CSS | 190 KB | ✅ Optimized (was 336 KB) |

---

## FASE 2A: LiveTicker Removal Test

**Hypothesis:** LiveTicker (WebSocket client component) is causing LCP delay

**Test:** Removed LiveTicker temporarily and re-tested

**Results:**
| Metric | With LiveTicker | Without LiveTicker | Delta |
|--------|-----------------|-------------------|-------|
| LCP | 6.4s | 6.0s | -0.4s (6%) |
| Performance | 65/100 | 63/100 | -2 points |
| TBT | 170ms | 270ms | +100ms |

**Conclusion:** LiveTicker is NOT the main LCP blocker. Impact is minimal.

---

## Real Root Cause: Server-Side TTFB

### Evidence
```
Lighthouse (Mobile, USA):
  TTFB: 4541 ms

curl (Europe):
  TTFB: 75 ms
```

### Diagnosis
1. **Geographic Distance:** Lighthouse runs from USA, Vercel functions from EU
2. **Cold Start:** `x-vercel-cache: MISS` indicates function cold starts
3. **ISR Not Working:** `cache-control: private, no-cache` suggests ISR not caching properly
4. **next-intl + Edge:** Edge runtime with next-intl may prevent static optimization

---

## Recommendations (Priority Order)

### P0 - Fix TTFB
1. **Enable Vercel Edge Network Caching**
   - Add `export const runtime = 'edge'` if compatible
   - Or fix ISR caching headers

2. **Reduce Server Work**
   - Minimize `generateMetadata` async work
   - Cache `getMessages()` calls
   - Avoid heavy computations in server components

3. **CDN Optimization**
   - Vercel Pro plan for better Edge Network
   - Or migrate to Cloudflare Pages

### P1 - Reduce JS (Secondary)
1. **Lazy Load DashboardPreview**
   - Already done ✅
   
2. **Remove framer-motion from Hero**
   - DashboardPreview imports framer-motion
   - Move animations to CSS-only

3. **Tree-shake lucide-react**
   - Use direct imports: `import { X } from 'lucide-react/dist/esm/icons/x'`
   - Or switch to SVG sprites

### P2 - Optimize CSS Further
- Current: 190 KB (acceptable)
- Target: <100 KB (nice to have)

---

## Test Results Log

| Test | LCP | Performance | TTFB | Notes |
|------|-----|-------------|------|-------|
| Baseline | 6.4s | 65/100 | 4541ms | Original state |
| CSS optimized | 6.4s | 67/100 | ~4500ms | CSS 336→190KB |
| Without LiveTicker | 6.0s | 63/100 | ~4500ms | Minimal impact |
| Target | <2.5s | >90/100 | <200ms | Goal |

---

## Next Steps

**Immediate:**
1. Fix ISR/static generation for homepage
2. Add aggressive server-side caching
3. Test with `stale-while-revalidate` headers

**Short-term:**
1. Migrate to Edge runtime if possible
2. Optimize next-intl initialization
3. Add Redis/caching layer for i18n messages

**Long-term:**
1. Consider Cloudflare Pages for better global performance
2. Implement proper SSG without dynamic rendering

---

## Files Analyzed
- `src/app/[locale]/page.tsx` - Homepage component
- `src/components/landing/LiveTicker.tsx` - Price ticker (WebSocket)
- `src/components/landing/DashboardPreview.tsx` - Uses framer-motion
- `next.config.mjs` - Build configuration

## Tools Used
- `@next/bundle-analyzer` - JS chunk analysis
- Lighthouse CI - Performance metrics
- curl - TTFB measurement
- Chrome DevTools - Network analysis

---

*Report generated: 2026-03-09*  
*Status: Ready for FASE 2 (TTFB Optimization)*
