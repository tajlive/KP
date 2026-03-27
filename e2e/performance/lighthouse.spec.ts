/**
 * Performance E2E Tests
 * 
 * Tests:
 * - LCP < 2.5s (Largest Contentful Paint)
 * - CLS < 0.1 (Cumulative Layout Shift)
 * - FID < 100ms (First Input Delay) - approximated via TBT
 * - TBT < 200ms (Total Blocking Time)
 * - FCP < 1.8s (First Contentful Paint)
 * - TTFB < 600ms (Time to First Byte)
 * 
 * @performance
 */

import { test, expect } from "@playwright/test";
import type { Page, CDPSession } from "@playwright/test";

interface PerformanceMetrics {
  // Navigation Timing
  ttfb: number;
  fcp: number;
  lcp: number;
  domContentLoaded: number;
  loadComplete: number;
  
  // Web Vitals
  cls: number;
  tbt: number;
  
  // Resource counts
  requestCount: number;
  totalTransferSize: number;
}

/**
 * Collect performance metrics using Chrome DevTools Protocol
 */
async function collectPerformanceMetrics(
  page: Page,
  cdpSession: CDPSession
): Promise<PerformanceMetrics> {
  // Get navigation timing
  const navigationTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType("paint");
    
    const fcpEntry = paint.find((p) => p.name === "first-contentful-paint");
    
    // Get LCP if available
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint") as PerformanceEntry[];
    const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;

    return {
      ttfb: nav.responseStart - nav.startTime,
      fcp: fcpEntry ? fcpEntry.startTime : 0,
      lcp: lcp,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
    };
  });

  // Get layout shift (CLS) - simplified measurement
  const cls = await page.evaluate(() => {
    let clsValue = 0;
    const entries = performance.getEntriesByType("layout-shift") as PerformanceEntry[];
    entries.forEach((entry) => {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    });
    return clsValue;
  });

  // Get resource metrics
  const resourceMetrics = await cdpSession.send("Performance.getMetrics");
  const jsHeapSize = resourceMetrics.metrics.find(
    (m) => m.name === "JSHeapUsedSize"
  )?.value || 0;

  // Count requests and calculate transfer size
  const resources = await page.evaluate(() => {
    return performance.getEntriesByType("resource").map((r) => ({
      name: r.name,
      duration: r.duration,
      transferSize: (r as PerformanceResourceTiming).transferSize || 0,
    }));
  });

  const totalTransferSize = resources.reduce(
    (sum, r) => sum + (r.transferSize || 0),
    0
  );

  // Calculate TBT (Total Blocking Time) approximation
  const tbt = await page.evaluate(() => {
    const longTasks = performance.getEntriesByType("longtask") as PerformanceEntry[];
    // TBT is sum of durations over 50ms, minus 50ms for each
    return longTasks.reduce((sum, task) => {
      const durationOver50 = task.duration - 50;
      return durationOver50 > 0 ? sum + durationOver50 : sum;
    }, 0);
  });

  return {
    ...navigationTiming,
    cls,
    tbt,
    requestCount: resources.length,
    totalTransferSize,
  };
}

test.describe("Performance Metrics @performance", () => {
  let cdpSession: CDPSession;

  test.beforeEach(async ({ page }) => {
    // Create CDP session for performance metrics
    cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send("Performance.enable");
  });

  test("landing page meets Core Web Vitals", async ({ page }) => {
    // Clear cache for consistent results
    await page.context().clearCookies();
    
    // Navigate with timing
    const startTime = Date.now();
    await page.goto("/no", { waitUntil: "networkidle" });
    const loadTime = Date.now() - startTime;

    // Wait for LCP to stabilize
    await page.waitForTimeout(2000);

    const metrics = await collectPerformanceMetrics(page, cdpSession);

    console.log("Landing Page Performance Metrics:");
    console.log(`  TTFB: ${metrics.ttfb.toFixed(0)}ms`);
    console.log(`  FCP: ${metrics.fcp.toFixed(0)}ms`);
    console.log(`  LCP: ${metrics.lcp.toFixed(0)}ms`);
    console.log(`  CLS: ${metrics.cls.toFixed(3)}`);
    console.log(`  TBT: ${metrics.tbt.toFixed(0)}ms`);
    console.log(`  DOM Content Loaded: ${metrics.domContentLoaded.toFixed(0)}ms`);
    console.log(`  Load Complete: ${metrics.loadComplete.toFixed(0)}ms`);
    console.log(`  Request Count: ${metrics.requestCount}`);
    console.log(`  Transfer Size: ${(metrics.totalTransferSize / 1024 / 1024).toFixed(2)}MB`);

    // Core Web Vitals thresholds (Good)
    expect(
      metrics.lcp,
      `LCP should be < 2500ms, got ${metrics.lcp.toFixed(0)}ms`
    ).toBeLessThan(2500);

    expect(
      metrics.cls,
      `CLS should be < 0.1, got ${metrics.cls.toFixed(3)}`
    ).toBeLessThan(0.1);

    expect(
      metrics.ttfb,
      `TTFB should be < 600ms, got ${metrics.ttfb.toFixed(0)}ms`
    ).toBeLessThan(600);

    // Additional thresholds
    expect(
      metrics.fcp,
      `FCP should be < 1800ms, got ${metrics.fcp.toFixed(0)}ms`
    ).toBeLessThan(1800);

    // TBT threshold (approximation)
    expect(
      metrics.tbt,
      `TBT should be < 200ms, got ${metrics.tbt.toFixed(0)}ms`
    ).toBeLessThan(200);
  });

  test("pricing page performance", async ({ page }) => {
    await page.context().clearCookies();
    
    await page.goto("/no/priser", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const metrics = await collectPerformanceMetrics(page, cdpSession);

    console.log("Pricing Page Performance Metrics:");
    console.log(`  LCP: ${metrics.lcp.toFixed(0)}ms`);
    console.log(`  CLS: ${metrics.cls.toFixed(3)}`);
    console.log(`  TTFB: ${metrics.ttfb.toFixed(0)}ms`);

    expect(metrics.lcp).toBeLessThan(2500);
    expect(metrics.cls).toBeLessThan(0.1);
  });

  test("login page performance", async ({ page }) => {
    await page.context().clearCookies();
    
    await page.goto("/no/innlogging", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const metrics = await collectPerformanceMetrics(page, cdpSession);

    console.log("Login Page Performance Metrics:");
    console.log(`  LCP: ${metrics.lcp.toFixed(0)}ms`);
    console.log(`  CLS: ${metrics.cls.toFixed(3)}`);
    console.log(`  TTFB: ${metrics.ttfb.toFixed(0)}ms`);

    expect(metrics.lcp).toBeLessThan(2500);
    expect(metrics.cls).toBeLessThan(0.1);
  });

  test("page load time is acceptable", async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto("/no", { 
      waitUntil: "domcontentloaded",
      timeout: 30000 
    });
    
    const domContentLoadedTime = Date.now() - startTime;
    
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    const fullLoadTime = Date.now() - startTime;

    console.log(`DOM Content Loaded: ${domContentLoadedTime}ms`);
    console.log(`Full Load: ${fullLoadTime}ms`);

    expect(domContentLoadedTime).toBeLessThan(3000);
    expect(fullLoadTime).toBeLessThan(6000);
  });

  test("no excessive JavaScript execution", async ({ page }) => {
    await page.goto("/no", { waitUntil: "networkidle" });
    
    // Check for long tasks
    const longTasks = await page.evaluate(() => {
      return performance.getEntriesByType("longtask").map((t) => ({
        duration: t.duration,
        startTime: t.startTime,
      }));
    });

    console.log(`Found ${longTasks.length} long tasks`);
    
    // Should have minimal long tasks
    expect(longTasks.length).toBeLessThan(10);

    // No individual task should be extremely long
    for (const task of longTasks) {
      expect(task.duration).toBeLessThan(200);
    }
  });

  test("resource loading is optimized", async ({ page }) => {
    const requests: Array<{ url: string; type: string; size: number }> = [];
    
    page.on("response", async (response) => {
      const url = response.url();
      const type = response.headers()["content-type"] || "unknown";
      
      try {
        const body = await response.body();
        requests.push({
          url: url.slice(0, 100), // Truncate for logging
          type: type.split(";")[0],
          size: body?.length || 0,
        });
      } catch {
        // Some responses may not have accessible body
      }
    });

    await page.goto("/no", { waitUntil: "networkidle" });

    // Count by type
    const jsRequests = requests.filter((r) => r.type.includes("javascript"));
    const cssRequests = requests.filter((r) => r.type.includes("css"));
    const imageRequests = requests.filter((r) => r.type.includes("image"));

    console.log(`JS requests: ${jsRequests.length}`);
    console.log(`CSS requests: ${cssRequests.length}`);
    console.log(`Image requests: ${imageRequests.length}`);
    console.log(`Total requests: ${requests.length}`);

    // Basic sanity checks
    expect(jsRequests.length).toBeGreaterThan(0);
    expect(requests.length).toBeLessThan(100); // Sanity limit
  });

  test("images are lazy loaded", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const images = await page.locator("img").all();
    let lazyLoadedCount = 0;

    for (const img of images) {
      const loading = await img.getAttribute("loading");
      if (loading === "lazy") {
        lazyLoadedCount++;
      }
    }

    console.log(`${lazyLoadedCount}/${images.length} images have loading="lazy"`);

    // Most images below the fold should be lazy loaded
    if (images.length > 5) {
      expect(lazyLoadedCount).toBeGreaterThan(images.length * 0.3);
    }
  });
});

test.describe("Performance - Repeat Views @performance", () => {
  test("repeat view is faster (caching)", async ({ page }) => {
    // First view
    const firstViewStart = Date.now();
    await page.goto("/no", { waitUntil: "networkidle" });
    const firstViewTime = Date.now() - firstViewStart;

    // Repeat view
    const repeatViewStart = Date.now();
    await page.goto("/no", { waitUntil: "networkidle" });
    const repeatViewTime = Date.now() - repeatViewStart;

    console.log(`First view: ${firstViewTime}ms`);
    console.log(`Repeat view: ${repeatViewTime}ms`);

    // Repeat view should be faster (at least not significantly slower)
    expect(repeatViewTime).toBeLessThan(firstViewTime * 1.5);
  });
});
