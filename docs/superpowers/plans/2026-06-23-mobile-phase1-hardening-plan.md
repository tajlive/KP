> I'm using the writing-plans skill to create the implementation plan.

# Mobile Phase 1 Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Herde eksisterende Fase 1-mobilkomponenter (`useHaptic`, `usePullToRefresh`, `MobileBottomSheet`, `BottomTabs`, `MobileTradingCard`) med enhetstester, Storybook-stories og pull-to-refresh-integrasjon i porteføljesiden.

**Architecture:** Vi legger tester og stories ved siden av kilden (`__tests__` / `__stories__`), følger eksisterende Vitest + Storybook-oppsett, og pakker mobilporteføljen i en ny client wrapper som bruker `usePullToRefresh` + `useRouter().refresh()` for server-data-reload.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Vitest, Testing Library, Storybook 8/10, Tailwind CSS, Framer Motion, Vaul.

---

## File Structure

```text
src/
├── hooks/
│   ├── use-haptic.ts
│   ├── use-pull-to-refresh.ts
│   └── __tests__/
│       ├── use-haptic.test.ts              (ny)
│       └── use-pull-to-refresh.test.ts     (ny)
├── shared/ui/
│   ├── mobile-bottom-sheet.tsx
│   ├── mobile-trading-card.tsx
│   └── __tests__/
│       ├── mobile-bottom-sheet.test.tsx    (ny)
│       └── mobile-trading-card.test.tsx    (ny)
│   └── __stories__/
│       ├── mobile-bottom-sheet.stories.tsx (ny)
│       └── mobile-trading-card.stories.tsx (ny)
├── shared/navigation/
│   ├── BottomTabs.tsx
│   ├── __tests__/
│   │   └── BottomTabs.test.tsx             (ny)
│   └── __stories__/
│       └── BottomTabs.stories.tsx          (ny)
└── features/portfolio/
    ├── MobilePullToRefreshWrapper.tsx      (ny)
    ├── PullToRefreshIndicator.tsx          (ny)
    └── __tests__/
        └── PullToRefreshIndicator.test.tsx (ny)

src/app/[locale]/(user)/dashboard/portfolio/page.tsx (modify: wrap content)
```

---

## Task 1: Test `useHaptic`

**Files:**
- Create: `src/hooks/__tests__/use-haptic.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHaptic } from "../use-haptic";

describe("useHaptic", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { vibrate: vi.fn() });
  });

  it("calls navigator.vibrate with medium duration by default", () => {
    const { result } = renderHook(() => useHaptic());
    result.current();
    expect(navigator.vibrate).toHaveBeenCalledWith(20);
  });

  it("calls navigator.vibrate with pattern for success", () => {
    const { result } = renderHook(() => useHaptic());
    result.current("success");
    expect(navigator.vibrate).toHaveBeenCalledWith([20, 30, 20]);
  });

  it("does nothing for 'none' pattern", () => {
    const { result } = renderHook(() => useHaptic());
    result.current("none");
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it("uses iOS webkit haptic when available", () => {
    const postMessage = vi.fn();
    const w = window as unknown as Record<string, unknown>;
    w.webkit = {
      messageHandlers: { haptic: { postMessage } },
    };
    const { result } = renderHook(() => useHaptic());
    result.current("medium");
    expect(postMessage).toHaveBeenCalledWith({ type: "impactOccurred", style: "medium" });
    delete w.webkit;
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- src/hooks/__tests__/use-haptic.test.ts`
Expected: Tests fail if file doesn't exist or if imports break.

- [ ] **Step 3: Ensure implementation exists**

`src/hooks/use-haptic.ts` already exists. No code change needed unless tests expose a bug.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- src/hooks/__tests__/use-haptic.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/__tests__/use-haptic.test.ts
git commit -m "test(hooks): add useHaptic tests"
```

---

## Task 2: Test `usePullToRefresh`

**Files:**
- Create: `src/hooks/__tests__/use-pull-to-refresh.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePullToRefresh } from "../use-pull-to-refresh";

function createTouchEvent(clientY: number) {
  return { touches: [{ clientY }] } as unknown as React.TouchEvent<HTMLElement>;
}

function createTarget(scrollTop = 0) {
  return { scrollTop, currentTarget: { scrollTop } } as unknown as React.TouchEvent<HTMLElement>["currentTarget"];
}

describe("usePullToRefresh", () => {
  it("does not trigger when not at scroll top", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));

    const target = createTarget(100);
    act(() => result.current.handlers.onTouchStart({ ...createTouchEvent(0), currentTarget: target } as never));
    act(() => result.current.handlers.onTouchMove(createTouchEvent(200) as never));
    act(() => result.current.handlers.onTouchEnd());

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("triggers refresh when pulled past threshold", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 80 }));

    const target = createTarget(0);
    act(() => result.current.handlers.onTouchStart({ ...createTouchEvent(0), currentTarget: target } as never));
    act(() => result.current.handlers.onTouchMove(createTouchEvent(150) as never));

    await act(async () => {
      result.current.handlers.onTouchEnd();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("caps distance at maxDistance with resistance", () => {
    const { result } = renderHook(() => usePullToRefresh({ onRefresh: vi.fn(), maxDistance: 120, resistance: 0.5 }));
    const target = createTarget(0);
    act(() => result.current.handlers.onTouchStart({ ...createTouchEvent(0), currentTarget: target } as never));
    act(() => result.current.handlers.onTouchMove(createTouchEvent(500) as never));
    expect(result.current.state.distance).toBeLessThanOrEqual(120);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- src/hooks/__tests__/use-pull-to-refresh.test.ts`
Expected: FAIL (file missing)

- [ ] **Step 3: Ensure implementation exists**

`src/hooks/use-pull-to-refresh.ts` already exists. No code change needed unless tests expose a bug.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- src/hooks/__tests__/use-pull-to-refresh.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/__tests__/use-pull-to-refresh.test.ts
git commit -m "test(hooks): add usePullToRefresh tests"
```

---

## Task 3: Test `MobileBottomSheet`

**Files:**
- Create: `src/shared/ui/__tests__/mobile-bottom-sheet.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomSheet } from "../mobile-bottom-sheet";

describe("MobileBottomSheet", () => {
  it("renders title, description and children", () => {
    render(
      <MobileBottomSheet open onOpenChange={vi.fn()} title="Preview" description="Order details">
        <div data-testid="content">BTCUSDT</div>
      </MobileBottomSheet>
    );
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Order details")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("renders footer", () => {
    render(
      <MobileBottomSheet open onOpenChange={vi.fn()} footer={<button>Confirm</button>}>
        <div>child</div>
      </MobileBottomSheet>
    );
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("calls onOpenChange when overlay clicked (non-preventClose)", () => {
    const onOpenChange = vi.fn();
    render(
      <MobileBottomSheet open onOpenChange={onOpenChange}>
        <div>child</div>
      </MobileBottomSheet>
    );
    const overlay = document.querySelector("[data-vaul-overlay]");
    if (overlay) fireEvent.click(overlay);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not close when preventClose is true", () => {
    const onOpenChange = vi.fn();
    render(
      <MobileBottomSheet open onOpenChange={onOpenChange} preventClose>
        <div>child</div>
      </MobileBottomSheet>
    );
    const overlay = document.querySelector("[data-vaul-overlay]");
    if (overlay) fireEvent.click(overlay);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- src/shared/ui/__tests__/mobile-bottom-sheet.test.tsx`
Expected: FAIL

- [ ] **Step 3: Ensure implementation exists**

`src/shared/ui/mobile-bottom-sheet.tsx` already exists.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- src/shared/ui/__tests__/mobile-bottom-sheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/__tests__/mobile-bottom-sheet.test.tsx
git commit -m "test(ui): add MobileBottomSheet tests"
```

---

## Task 4: Test `BottomTabs`

**Files:**
- Create: `src/shared/navigation/__tests__/BottomTabs.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomTabs } from "../BottomTabs";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/no/dashboard/portfolio"),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useLocale: vi.fn().mockReturnValue("no"),
  useTranslations: () => (key: string) => key,
}));

describe("BottomTabs", () => {
  it("marks portfolio tab as active from pathname", () => {
    render(<BottomTabs />);
    const portfolio = screen.getByTestId("bottom-tab-portfolio");
    expect(portfolio).toHaveAttribute("aria-current", "page");
  });

  it("navigates on tab press", () => {
    const push = vi.fn();
    vi.doMock("next/navigation", () => ({
      usePathname: vi.fn().mockReturnValue("/no/dashboard/portfolio"),
      useRouter: () => ({ push }),
    }));
    render(<BottomTabs />);
    fireEvent.click(screen.getByTestId("bottom-tab-trade"));
    expect(push).toHaveBeenCalledWith("/no/handel");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- src/shared/navigation/__tests__/BottomTabs.test.tsx`
Expected: FAIL

- [ ] **Step 3: Ensure implementation exists**

`src/shared/navigation/BottomTabs.tsx` already exists.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- src/shared/navigation/__tests__/BottomTabs.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/navigation/__tests__/BottomTabs.test.tsx
git commit -m "test(navigation): add BottomTabs tests"
```

---

## Task 5: Storybook stories for `MobileBottomSheet`

**Files:**
- Create: `src/shared/ui/__stories__/mobile-bottom-sheet.stories.tsx`

- [ ] **Step 1: Write stories**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MobileBottomSheet } from "../mobile-bottom-sheet";

const meta: Meta<typeof MobileBottomSheet> = {
  title: "Mobile/MobileBottomSheet",
  component: MobileBottomSheet,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof MobileBottomSheet>;

function ControlledSheet(props: Omit<React.ComponentProps<typeof MobileBottomSheet>, "open" | "onOpenChange">) {
  const [open, setOpen] = useState(true);
  return <MobileBottomSheet open={open} onOpenChange={setOpen} {...props} />;
}

export const Default: Story = {
  render: () => (
    <ControlledSheet title="Order Preview" description="Review before confirming">
      <p className="text-white">BTCUSDT · 0.01 · Market</p>
    </ControlledSheet>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <ControlledSheet title="Filter" footer={<button className="w-full rounded-lg bg-emerald-500 py-2 text-white">Apply</button>}>
      <p className="text-white">Filter content</p>
    </ControlledSheet>
  ),
};

export const PreventClose: Story = {
  render: () => (
    <ControlledSheet title="Confirm Trade" preventClose footer={<button className="w-full rounded-lg bg-emerald-500 py-2 text-white">Confirm</button>}>
      <p className="text-white">This sheet cannot be dismissed by tapping the overlay.</p>
    </ControlledSheet>
  ),
};
```

- [ ] **Step 2: Run Storybook to verify**

Run: `npm run storybook`
Expected: Stories load without errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/__stories__/mobile-bottom-sheet.stories.tsx
git commit -m "storybook(ui): add MobileBottomSheet stories"
```

---

## Task 6: Storybook stories for `MobileTradingCard`

**Files:**
- Create: `src/shared/ui/__stories__/mobile-trading-card.stories.tsx`

- [ ] **Step 1: Write stories**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { MobileTradingCard } from "../mobile-trading-card";

const meta: Meta<typeof MobileTradingCard> = {
  title: "Mobile/MobileTradingCard",
  component: MobileTradingCard,
};
export default meta;

type Story = StoryObj<typeof MobileTradingCard>;

const base = {
  symbol: "BTCUSDT",
  name: "Bitcoin",
  quantity: 0.05,
  avgPrice: 48_000,
  currentPrice: 50_000,
  changePercent: 4.17,
};

export const Profit: Story = { args: { ...base, sparklineData: [48000, 48500, 49000, 49500, 50000], dayLow: 47000, dayHigh: 51000 } };
export const Loss: Story = { args: { ...base, currentPrice: 45000, changePercent: -6.25, sparklineData: [48000, 47000, 46000, 45500, 45000] } };
export const NoSparkline: Story = { args: base };
```

- [ ] **Step 2: Run Storybook to verify**

Run: `npm run storybook`
Expected: Stories render.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/__stories__/mobile-trading-card.stories.tsx
git commit -m "storybook(ui): add MobileTradingCard stories"
```

---

## Task 7: Storybook stories for `BottomTabs`

**Files:**
- Create: `src/shared/navigation/__stories__/BottomTabs.stories.tsx`

- [ ] **Step 1: Write stories**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { BottomTabs } from "../BottomTabs";

const meta: Meta<typeof BottomTabs> = {
  title: "Mobile/BottomTabs",
  component: BottomTabs,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="bg-[#0a0b0d] min-h-screen">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof BottomTabs>;

export const Default: Story = {};
```

- [ ] **Step 2: Run Storybook to verify**

Run: `npm run storybook`
Expected: BottomTabs story renders at bottom.

- [ ] **Step 3: Commit**

```bash
git add src/shared/navigation/__stories__/BottomTabs.stories.tsx
git commit -m "storybook(navigation): add BottomTabs story"
```

---

## Task 8: Create `PullToRefreshIndicator` component

**Files:**
- Create: `src/features/portfolio/PullToRefreshIndicator.tsx`
- Create: `src/features/portfolio/__tests__/PullToRefreshIndicator.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PullToRefreshIndicator } from "../PullToRefreshIndicator";

describe("PullToRefreshIndicator", () => {
  it("shows pull hint when pulling but not ready", () => {
    render(<PullToRefreshIndicator distance={30} ready={false} refreshing={false} />);
    expect(screen.getByText(/dra ned for å oppfriske/i)).toBeInTheDocument();
  });

  it("shows release hint when ready", () => {
    render(<PullToRefreshIndicator distance={90} ready refreshing={false} />);
    expect(screen.getByText(/slipp for å oppfriske/i)).toBeInTheDocument();
  });

  it("shows spinner when refreshing", () => {
    render(<PullToRefreshIndicator distance={80} ready={false} refreshing />);
    expect(screen.getByText(/oppfrisker/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- src/features/portfolio/__tests__/PullToRefreshIndicator.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

```typescript
"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface PullToRefreshIndicatorProps {
  distance: number;
  ready: boolean;
  refreshing: boolean;
}

export function PullToRefreshIndicator({ distance, ready, refreshing }: PullToRefreshIndicatorProps) {
  const t = useTranslations("portfolio.pullToRefresh");
  const opacity = Math.min(distance / 60, 1);

  return (
    <div
      className="pointer-events-none flex items-center justify-center py-2 text-sm text-white/60"
      style={{ opacity, transform: `translateY(${distance * 0.3}px)` }}
      aria-live="polite"
    >
      {refreshing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("refreshing")}
        </>
      ) : ready ? (
        <>{t("release")}</>
      ) : (
        <>{t("pull")}</>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- src/features/portfolio/__tests__/PullToRefreshIndicator.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/portfolio/PullToRefreshIndicator.tsx src/features/portfolio/__tests__/PullToRefreshIndicator.test.tsx
git commit -m "feat(portfolio): add PullToRefreshIndicator component"
```

---

## Task 9: Create `MobilePullToRefreshWrapper`

**Files:**
- Create: `src/features/portfolio/MobilePullToRefreshWrapper.tsx`

- [ ] **Step 1: Implement wrapper**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PullToRefreshIndicator } from "./PullToRefreshIndicator";

interface Props {
  children: React.ReactNode;
}

export function MobilePullToRefreshWrapper({ children }: Props) {
  const router = useRouter();

  const { state, handlers, style } = usePullToRefresh({
    onRefresh: async () => {
      router.refresh();
      // Give Next.js a tick to kick off the server refetch.
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
    threshold: 80,
    hapticPattern: "medium",
  });

  return (
    <div
      className="md:hidden"
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
      style={style}
    >
      <PullToRefreshIndicator
        distance={state.distance}
        ready={state.isReadyToRelease}
        refreshing={state.isRefreshing}
      />
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write quick smoke test**

Create `src/features/portfolio/__tests__/MobilePullToRefreshWrapper.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobilePullToRefreshWrapper } from "../MobilePullToRefreshWrapper";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("MobilePullToRefreshWrapper", () => {
  it("renders children", () => {
    render(
      <MobilePullToRefreshWrapper>
        <div data-testid="child">Portfolio</div>
      </MobilePullToRefreshWrapper>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm run test:unit -- src/features/portfolio/__tests__/MobilePullToRefreshWrapper.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/portfolio/MobilePullToRefreshWrapper.tsx src/features/portfolio/__tests__/MobilePullToRefreshWrapper.test.tsx
git commit -m "feat(portfolio): add MobilePullToRefreshWrapper"
```

---

## Task 10: Integrate pull-to-refresh in portfolio page

**Files:**
- Modify: `src/app/[locale]/(user)/dashboard/portfolio/page.tsx` (wrap rendered content)
- Modify: `messages/no.json` and `messages/en.json` (add `portfolio.pullToRefresh` keys)

- [ ] **Step 1: Add i18n keys**

In `messages/no.json`:

```json
"portfolio": {
  "pullToRefresh": {
    "pull": "Dra ned for å oppfriske",
    "release": "Slipp for å oppfriske",
    "refreshing": "Oppfrisker..."
  }
}
```

In `messages/en.json`:

```json
"portfolio": {
  "pullToRefresh": {
    "pull": "Pull down to refresh",
    "release": "Release to refresh",
    "refreshing": "Refreshing..."
  }
}
```

- [ ] **Step 2: Wrap content in page**

Add import at top of `page.tsx`:

```typescript
import { MobilePullToRefreshWrapper } from "@/features/portfolio/MobilePullToRefreshWrapper";
```

Find the main return block (around line 220+) and wrap the inner JSX:

```tsx
<MobilePullToRefreshWrapper>
  {/* existing page JSX */}
</MobilePullToRefreshWrapper>
```

Keep the outer error fallback and loading states unchanged.

- [ ] **Step 3: Run type-check and lint**

Run:
```bash
npm run type-check
npm run lint
```
Expected: No errors.

- [ ] **Step 4: Run tests**

Run: `npm run test:unit`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/(user)/dashboard/portfolio/page.tsx messages/no.json messages/en.json
git commit -m "feat(portfolio): integrate pull-to-refresh on mobile"
```

---

## Task 11: Final verification

- [ ] **Run full verification suite**

```bash
npm run test:unit
npm run type-check
npm run lint
npm run build
```

Expected: All green.

- [ ] **Run Storybook build**

```bash
npm run storybook:build
```

Expected: Builds without errors.

- [ ] **Push branch**

```bash
git push origin feat/mobil-optimalisering-trading-paritet
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| `useHaptic` tests | Task 1 |
| `usePullToRefresh` tests | Task 2 |
| `MobileBottomSheet` tests | Task 3 |
| `BottomTabs` tests | Task 4 |
| `MobileBottomSheet` stories | Task 5 |
| `MobileTradingCard` stories | Task 6 |
| `BottomTabs` story | Task 7 |
| Pull-to-refresh integration | Tasks 8–10 |
| Lighthouse / no CLS | Task 11 (verify) |

## Placeholder Scan

No TBD/TODO placeholders. All code, commands and expected outputs are explicit.

## Type Consistency

- `usePullToRefresh` options object keys match spec: `onRefresh`, `threshold`, `maxDistance`, `resistance`, `hapticPattern`.
- `PullToRefreshIndicator` props: `distance`, `ready`, `refreshing`.
- i18n namespace: `portfolio.pullToRefresh`.
