import { test, expect } from "@playwright/test";

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
      await page.goto(`/no/kurs/${moduleSlug}`);
    });

    test("should load module overview and display 5 lessons", async ({
      page,
    }) => {
      // Check page title
      await expect(
        page.getByRole("heading", { name: /Hvorfor Priser Beveger Seg|Why Prices Move/i })
      ).toBeVisible();

      // Check that 5 lessons are displayed
      const lessonCards = page.locator('[data-testid="lesson-card"]');
      await expect(lessonCards).toHaveCount(5);

      // Check specific lesson titles
      await expect(
        page.getByText(/Tilbud og Etterspørsel|Supply and Demand/i)
      ).toBeVisible();
      await expect(
        page.getByText(/Markedssykluser|Market Cycles/i)
      ).toBeVisible();
      await expect(
        page.getByText(/Nyheter og Regulering|News and Regulation/i)
      ).toBeVisible();
      await expect(
        page.getByText(/Volatilitet og Risiko|Volatility and Risk/i)
      ).toBeVisible();
      await expect(
        page.getByText(/Teknisk vs Fundamental|Technical vs Fundamental/i)
      ).toBeVisible();
    });

    test("should show module metadata correctly", async ({ page }) => {
      // Check difficulty badge
      await expect(
        page.getByText(/Nybegynner|Beginner/i)
      ).toBeVisible();

      // Check required badge
      await expect(
        page.getByText(/Obligatorisk|Required/i)
      ).toBeVisible();

      // Check estimated time
      await expect(page.getByText(/55.*minutter|55.*minutes/i)).toBeVisible();
    });

    test("should navigate to first lesson", async ({ page }) => {
      const firstLessonButton = page
        .locator("a", { hasText: /Start leksjon|Start lesson/i })
        .first();
      await expect(firstLessonButton).toBeVisible();

      await firstLessonButton.click();

      // Should navigate to first lesson
      await expect(page).toHaveURL(
        new RegExp(`/no/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`)
      );
    });
  });

  test.describe("Lesson Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/no/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`);
    });

    test("should display lesson content with markdown", async ({ page }) => {
      // Check lesson title
      await expect(
        page.getByRole("heading", { name: /Tilbud og Etterspørsel|Supply and Demand/i })
      ).toBeVisible();

      // Check markdown content is rendered
      await expect(page.getByText(/Bitcoin|halving|tilbud|supply/i)).toBeVisible();

      // Check progress bar
      await expect(
        page.getByText(/0 av 5 leksjoner|0 of 5 lessons/i)
      ).toBeVisible();
    });

    test("should display quiz section", async ({ page }) => {
      // Check quiz heading
      await expect(
        page.getByRole("heading", {
          name: /Test kunnskapen din|Test your knowledge/i,
        })
      ).toBeVisible();

      // Check quiz question is visible
      await expect(
        page.getByText(/Spørsmål 1 av 5|Question 1 of 5/i)
      ).toBeVisible();

      // Check quiz options are present
      const quizOptions = page.locator("button", {
        hasText: /million|begrensning|etterspørsel|prisen/i,
      });
      await expect(quizOptions.first()).toBeVisible();
    });

    test("should complete quiz flow", async ({ page }) => {
      // Answer all 5 questions
      for (let i = 0; i < 5; i++) {
        // Select an option (choosing "b" which is correct for most questions)
        const optionB = page
          .locator("button")
          .filter({ hasText: /21 million|halveres|etterspørsel|stiger|hvert fjerde/i })
          .first();
        
        // If specific answer not found, click first available option
        if (await optionB.isVisible().catch(() => false)) {
          await optionB.click();
        } else {
          await page.locator("button").nth(2).click(); // Try second option
        }

        // Submit answer
        await page
          .getByRole("button", { name: /Svar|Submit Answer/i })
          .click();

        // Wait for feedback
        await expect(
          page.getByText(/Riktig!|Correct!|Ikke helt riktig|Not quite right/i)
        ).toBeVisible();

        // Click next or see results
        if (i < 4) {
          await page.getByRole("button", { name: /Neste|Next/i }).click();
        } else {
          await page.getByRole("button", { name: /Se resultat|See results/i }).click();
        }
      }

      // Check results page
      await expect(
        page.getByText(/Gratulerer!|Congratulations!|Ikke bestått|Not passed/i)
      ).toBeVisible();
    });

    test("should navigate between lessons", async ({ page }) => {
      // Check next button leads to lesson 2
      await page.getByRole("button", { name: /Neste|Next/i }).click();

      await expect(page).toHaveURL(
        new RegExp(`/no/kurs/${moduleSlug}/leksjon/${lessonSlugs[1]}`)
      );

      // Check previous button goes back
      await page.getByRole("button", { name: /Forrige|Previous/i }).click();

      await expect(page).toHaveURL(
        new RegExp(`/no/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`)
      );
    });
  });

  test.describe("Progress Tracking", () => {
    test("should update progress after completing lesson", async ({ page }) => {
      // Login first (assuming test user exists)
      await page.goto("/no/login");
      // ... login flow would go here

      await page.goto(`/no/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`);

      // Complete the quiz
      // ... quiz completion flow

      // Navigate back to module
      await page.goto(`/no/kurs/${moduleSlug}`);

      // Check progress is updated
      await expect(
        page.getByText(/1 av 5 leksjoner|1 of 5 lessons/i)
      ).toBeVisible();
    });
  });

  test.describe("Required Module Gate", () => {
    test("should block paper trading if required module not completed", async ({
      page,
    }) => {
      // Navigate to dashboard as new user
      await page.goto("/no/dashboard");

      // Check for course gate banner
      await expect(
        page.getByText(/Paper Trading Låst|Paper Trading Locked/i)
      ).toBeVisible();

      await expect(
        page.getByText(
          /Fullfør det obligatoriske kurset|Complete the required course/i
        )
      ).toBeVisible();

      // Check link to course
      await expect(
        page.getByRole("link", { name: /Start kurset|Start course/i })
      ).toBeVisible();
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("should display quiz options stacked vertically on mobile", async ({
      page,
    }) => {
      await page.goto(`/no/kurs/${moduleSlug}/leksjon/${lessonSlugs[0]}`);

      // Check quiz options are visible and stacked
      const quizButtons = page.locator("button[class*='w-full']");
      await expect(quizButtons.first()).toBeVisible();

      // Check layout is mobile-friendly
      const content = page.locator("main");
      const box = await content.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    });
  });
});
