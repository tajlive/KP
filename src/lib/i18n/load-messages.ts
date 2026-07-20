/**
 * Load messages for next-intl.
 *
 * Consolidated JSON only — split files are deleted.
 * DO NOT add namespace-based imports; all keys live in messages/{locale}.json.
 */

export async function loadMessagesWithFallback(locale: string): Promise<Record<string, unknown>> {
  try {
    // Load the consolidated messages file
    const messages = await import(`../../../messages/${locale}.json`).then((m) => m.default);
    return messages;
  } catch {
    // Fallback to English if locale not found
    try {
      const fallback = await import(`../../../messages/en.json`).then((m) => m.default);
      return fallback;
    } catch {
      return {};
    }
  }
}
