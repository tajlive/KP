// Mock for next-intl
export function useTranslations(_namespace?: string) {
  return function t(key: string) {
    // Return a formatted string based on key
    if (key.includes('.')) {
      return key.split('.').pop() || key;
    }
    return key;
  };
}

export function useLocale() {
  return 'no';
}

export function NextIntlClientProvider({ children }: { children: React.ReactNode }) {
  return children;
}
