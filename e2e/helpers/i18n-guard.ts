import { Page } from '@playwright/test';

export function attachI18nGuard(page: Page) {
  const errors: string[] = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      if (
        text.includes('MISSING_MESSAGE') ||
        text.includes('Minified React error') ||
        text.includes('Hydration') ||
        text.includes('hydration')
      ) {
        errors.push(`[console.error] ${text}`);
      }
    }
  });

  page.on('response', response => {
    if (response.status() === 404 && response.url().includes('_rsc=')) {
      errors.push(`[404 prefetch] ${response.url()}`);
    }
  });

  return {
    assertNoMissingMessages: () => {
      if (errors.length > 0) {
        throw new Error('Runtime-feil funnet:\n' + errors.join('\n'));
      }
    }
  };
}
