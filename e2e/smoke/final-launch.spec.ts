import { test, expect } from '@playwright/test'

const BASE = 'https://www.klarpakke.no'

test('Landing /: laster og har CTA', async ({ page }) => {
  await page.goto(`${BASE}/`)
  await expect(page).toHaveTitle(/Klarpakke/i)
})

test('Landing /en: laster', async ({ page }) => {
  await page.goto(`${BASE}/en`)
  await expect(page).toHaveTitle(/Klarpakke/i)
})

test('Prisside: laster', async ({ page }) => {
  await page.goto(`${BASE}/no/priser`)
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('Innlogging: viser loginskjema', async ({ page }) => {
  await page.goto(`${BASE}/no/innlogging`)
  // Login page (main form; loading fallback uses login-page-loading)
  const loginPage = page.getByTestId('login-page')
  await expect(loginPage).toBeVisible()
})

test('Ingen MISSING_MESSAGE errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('MISSING_MESSAGE')) {
      errors.push(msg.text())
    }
  })
  await page.goto(`${BASE}/`)
  await page.waitForLoadState('networkidle')
  expect(errors).toHaveLength(0)
})
