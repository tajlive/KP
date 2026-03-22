import { test, expect, type Page } from "@playwright/test";

const MODULE_TITLE = /Hvorfor Priser Beveger Seg/i;

async function waitForModuleOverviewShell(page: Page, moduleSlug: string) {
  await page.goto(`/no/kurs/${moduleSlug}`, {
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

      await expect(page.getByText(/5\s*leksjoner/i)).toBeVisible({
        timeout: 25_000,
      });
    });

    test("should navigate to first lesson", async ({ page }) => {
      const firstLessonHref = `/no/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`;
      const firstLessonButton = page
        .locator(`a[href="${firstLessonHref}"]`)
        .first();
      await expect(firstLessonButton).toBeVisible({ timeout: 30_000 });

      await firstLessonButton.click();

      await expect(page).toHaveURL(
        new RegExp(`/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`),
      );
    });
  });

  test.describe("Lesson Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/no/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(
        page.locator("h1.text-3xl", { hasText: /Tilbud og Etterspørsel/i }),
      ).toBeVisible({ timeout: 45_000 });
      await page.waitForLoadState("networkidle").catch(() => {});
    });

    test("should display lesson content with markdown", async ({ page }) => {
      await expect(
        page.locator("h1.text-3xl", { hasText: /Tilbud og Etterspørsel/i }),
      ).toBeVisible();

      await expect(
        page.getByText(/Bitcoin|halving|tilbud|supply/i).first(),
      ).toBeVisible();

      await expect(page.getByText(/0 av 5 leksjoner/i)).toBeVisible();
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
      const nextBtn = page.getByRole("link", { name: /Neste/i });
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();

      await expect(page).toHaveURL(
        new RegExp(`/kurs/${moduleSlug}/leksjon/${lessonSlugs[1]}`),
      );

      await page.waitForLoadState("domcontentloaded");
      const prevBtn = page.getByRole("link", { name: /Forrige/i });

      if (await prevBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await prevBtn.click();
        await expect(page).toHaveURL(
          new RegExp(`/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`),
        );
      }
    });
  });

  test.describe("Progress Tracking", () => {
    test("should show login prompt for unauthenticated users", async ({
      page,
    }) => {
      await page.goto(`/no/kurs/${moduleSlug}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });

      await expect(
        page.getByText(/Logg inn for å spore fremgang|Log in to track/i),
      ).toBeVisible();
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test("should display lesson content on mobile", async ({ page }) => {
      await page.goto(`/no/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });

      await expect(
        page.locator("h1.text-3xl", { hasText: /Tilbud og Etterspørsel/i }),
      ).toBeVisible();

      const content = page.locator("main");
      const box = await content.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    });
  });
});
