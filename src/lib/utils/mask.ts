/**
 * Maskerer en API-nøkkel for sikker visning.
 * Viser kun de siste 4 tegnene; resten erstattes med *.
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) return apiKey;
  return `${"*".repeat(apiKey.length - 4)}${apiKey.slice(-4)}`;
}
