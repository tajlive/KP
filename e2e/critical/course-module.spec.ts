import { test, expect, type Page } from "@playwright/test";

// Innlogget setup kan ende på EN; as-needed bruker ofte /kurs/… uten /no/-prefiks.
const MODULE_TITLE = /Hvorfor Priser Beveger Seg|Why Prices Move/i;
const LESSON_1_HEADING = /Tilbud og Etterspørsel|Supply and Demand/i;

/** Første leksjon kan ha duplisert h1 i DOM (strict mode) — alltid én match. */
function firstLessonH1(page: Page) {
  return page
    .getByRole("heading", { level: 1, name: LESSON_1_HEADING })
    .first();
}

async function waitForModuleOverviewShell(page: Page, moduleSlug: string) {
  await page.goto(`/kurs/${moduleSlug}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await expect(page.getByRole("heading", { name: MODULE_TITLE })).toBeVisible({
    timeout: 45_000,
  });
  await page.waitForLoadState("networkidle").catch(() => {});
}

test.describe("Course Module - Hvorfor Priser Beveger Seg", () => {
  const moduleSlug = "hvorfor-priser-beveger-seg";
  const lessonSlugs = [
    "tilbud-og-ettersporsel",
    "markedssykluser",
    "nyheter-regulering",
    "volatilitet-risiko",
    "teknisk-vs-fundamental",
  ];

  test.describe("Module Overview Page", () => {
    test.beforeEach(async ({ page }) => {
      await waitForModuleOverviewShell(page, moduleSlug);
    });

    test("should load module overview and display 5 lessons", async ({
      page,
    }) => {
      const lessonHeadings = page.getByRole("heading", { level: 3 });
      const headingTexts = await lessonHeadings.allTextContents();
      const lessonTitles = headingTexts.filter((t) =>
        /Tilbud|Markeds|Nyheter|Volatilitet|Teknisk/i.test(t),
      );
      expect(lessonTitles.length).toBe(5);

      await expect(page.getByText(/Tilbud og Etterspørsel/i)).toBeVisible();
      await expect(page.getByText(/Markedssykluser/i)).toBeVisible();
      await expect(page.getByText(/Nyheter og Regulering/i)).toBeVisible();
      await expect(page.getByText(/Volatilitet og Risiko/i)).toBeVisible();
      await expect(page.getByText(/Teknisk vs Fundamental/i)).toBeVisible();
    });

    test("should show module metadata correctly", async ({ page }) => {
      await expect(page.getByText("Nybegynner", { exact: true })).toBeVisible({
        timeout: 25_000,
      });

      await expect(page.getByText("Obligatorisk", { exact: true })).toBeVisible(
        { timeout: 25_000 },
      );

      // Gjest: h2 «5 leksjoner». Innlogget: også span «0 av 5 leksjoner» — én stabil h2 unngår strict mode.
      await expect(
        page
          .locator("h2.text-xl.font-semibold")
          .filter({ hasText: /5\s+leksjoner/i }),
      ).toBeVisible({
        timeout: 25_000,
      });
    });

    test("should navigate to first lesson", async ({ page }) => {
      const firstLessonButton = page
        .locator(`a[href$="/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}"]`)
        .first();
      await expect(firstLessonButton).toBeVisible({ timeout: 30_000 });

      await Promise.all([
        page.waitForURL(
          new RegExp(`/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`),
          { timeout: 45_000 },
        ),
        firstLessonButton.click(),
      ]);
    });
  });

  test.describe("Lesson Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(firstLessonH1(page)).toBeVisible({ timeout: 45_000 });
      await page.waitForLoadState("networkidle").catch(() => {});
    });

    test("should display lesson content with markdown", async ({ page }) => {
      await expect(firstLessonH1(page)).toBeVisible();

      await expect(
        page.getByText(/Bitcoin|halving|tilbud|supply/i).first(),
      ).toBeVisible();

      await expect(
        page.getByText(/0 av 5 leksjoner|0 of 5 lessons/i),
      ).toBeVisible();
    });

    test("should display quiz section or login prompt", async ({ page }) => {
      await expect(
        page.getByRole("heading", {
          name: /Test kunnskapen din|Test your knowledge/i,
        }),
      ).toBeVisible();

      const loginPrompt = page.getByText(
        /Logg inn for å ta quiz|Log in to take quiz/i,
      );
      const questionText = page.getByText(/Spørsmål 1 av 5|Question 1 of 5/i);

      const hasLoginPrompt = await loginPrompt
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const hasQuestion = await questionText
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(hasLoginPrompt || hasQuestion).toBe(true);
    });

    test("should navigate between lessons", async ({ page }) => {
      // href-suffiks unngår å treffe annen «Neste»/«Forrige» på siden; Promise.all unngår rase mot client-navigasjon.
      const nextToSecond = page.locator(
        `a[href$="/kurs/${moduleSlug}/leksjon/${lessonSlugs[1]}"]`,
      );
      const prevToFirst = page.locator(
        `a[href$="/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}"]`,
      );

      await expect(nextToSecond).toBeVisible({ timeout: 15_000 });
      await Promise.all([
        page.waitForURL(
          new RegExp(`/kurs/${moduleSlug}/leksjon/${lessonSlugs[1]}`),
          { timeout: 45_000 },
        ),
        nextToSecond.click(),
      ]);

      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await expect(prevToFirst).toBeVisible({ timeout: 15_000 });
      await Promise.all([
        page.waitForURL(
          new RegExp(`/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`),
          { timeout: 45_000 },
        ),
        prevToFirst.click(),
      ]);
    });
  });

  test.describe("Progress Tracking", () => {
    test("should show login prompt for unauthenticated users", async ({
      browser,
    }) => {
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      });
      const page = await context.newPage();
      try {
        // as-needed: kanonisk /kurs/… (ikke /no/kurs/…)
        await page.goto(`/kurs/${moduleSlug}`, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        await page.waitForLoadState("networkidle").catch(() => {});

        // Navbar ligger ofte inne i <main> — ikke bruk bred getByRole her (strict mode).
        const prompt = page.getByTestId("course-module-login-prompt");
        await expect(prompt).toBeVisible({ timeout: 20_000 });
        await expect(
          prompt.getByText(
            /Logg inn for å spore fremgang|Log in to track progress/i,
          ),
        ).toBeVisible();
        await expect(
          prompt.getByRole("link", { name: /^Logg inn$|^Log in$/i }),
        ).toBeVisible();
      } finally {
        await context.close();
      }
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test("should display lesson content on mobile", async ({ page }) => {
      await page.goto(`/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });

      await expect(firstLessonH1(page)).toBeVisible();

      const content = page.locator("main");
      const box = await content.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    });
  });
});
