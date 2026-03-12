import { test } from '@playwright/test';
import { attachI18nGuard } from '../helpers/i18n-guard';

const CRITICAL_ROUTES = [
  '/no',
  '/en',
  '/no/paper-trading',
  '/en/paper-trading',
  '/no/dashboard',
  '/en/dashboard',
  '/no/priser',
  '/en/priser',
  '/no/innlogging',
  '/en/innlogging',
];

for (const route of CRITICAL_ROUTES) {
  test(`Ingen MISSING_MESSAGE på ${route}`, async ({ page }) => {
    const guard = attachI18nGuard(page);
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    guard.assertNoMissingMessages();
  });
}
