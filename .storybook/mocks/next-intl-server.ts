// Mock for next-intl/server
export async function getTranslations(_namespace?: string) {
  return function t(key: string) {
    // Return a formatted string based on key
    if (key.includes('.')) {
      return key.split('.').pop() || key;
    }
    return key;
  };
}

export async function getLocale() {
  return 'no';
}

export async function setRequestLocale(_locale: string) {
  // No-op in storybook
}
