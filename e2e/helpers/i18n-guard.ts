import { Page } from '@playwright/test';

export function attachI18nGuard(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('MISSING_MESSAGE')) {
      errors.push(msg.text());
    }
  });
  return {
    assertNoMissingMessages: () => {
      if (errors.length > 0) {
        throw new Error(
          'i18n MISSING_MESSAGE funnet:\n' + errors.join('\n')
        );
      }
    }
  };
}
