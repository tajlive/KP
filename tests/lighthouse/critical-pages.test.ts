/* eslint-disable no-undef */
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const PRODUCTION_URL = "http://localhost:3000"; // Test locally first

async function runLighthouse(url: string) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
  const options = {
    logLevel: "error" as const,
    output: "json" as const,
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options);
  await chrome.kill();

  return runnerResult?.lhr;
}

describe("Lighthouse Performance Tests", () => {
  // Increase timeout for Lighthouse tests
  jest.setTimeout(60000);

  test("Landing page performance", async () => {
    const lhr = await runLighthouse(PRODUCTION_URL);
    if (!lhr) throw new Error("Lighthouse failed");

    expect(lhr.categories.performance.score).toBeGreaterThanOrEqual(0.7); // Lowered for local dev
    expect(lhr.categories.accessibility.score).toBeGreaterThanOrEqual(0.9);
    expect(lhr.categories.seo.score).toBeGreaterThanOrEqual(0.8);
  });

  test("Course page performance", async () => {
    const lhr = await runLighthouse(`${PRODUCTION_URL}/no/kurs`);
    if (!lhr) throw new Error("Lighthouse failed");

    expect(lhr.categories.performance.score).toBeGreaterThanOrEqual(0.7);

    // Core Web Vitals
    const fcp = lhr.audits["first-contentful-paint"].numericValue;
    const lcp = lhr.audits["largest-contentful-paint"].numericValue;

    expect(fcp).toBeLessThan(3000); // Relaxed for local
    expect(lcp).toBeLessThan(4000); // Relaxed for local
  });
});
